import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { TINO_FEED_OWNER, TINO_MODULE_ADDRESS } from "../config";

const DEMO_FEED_KEY = "tino_demo_feed";

export interface DemoPostEntry {
  author: string;
  blobName: string;
  timestamp: number;
}

function getAptosClient(): Aptos {
  return new Aptos(
    new AptosConfig({
      network: Network.TESTNET,
      clientConfig: undefined,
    })
  );
}

export function hasContractConfig(): boolean {
  return Boolean(TINO_FEED_OWNER && TINO_MODULE_ADDRESS);
}

/** Wait for a transaction to be committed (so view state is updated). Uses public endpoint to avoid 401 from API key. */
export async function waitForTransaction(transactionHash: string): Promise<void> {
  const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET, clientConfig: undefined }));
  try {
    await aptos.waitForTransaction({ transactionHash });
  } catch (e) {
    console.warn("Aptos waitForTransaction failed, waiting 4s:", e instanceof Error ? e.message : e);
    await new Promise((r) => setTimeout(r, 4000));
  }
}

export interface PostEntryWithIndex extends DemoPostEntry {
  index: number;
}

function toNumber(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return Number(v);
  if (typeof v === "bigint") return Number(v);
  return 0;
}

/** Returns current number of posts (for optimistic prepend). */
export async function getPostsCount(): Promise<number> {
  if (!TINO_FEED_OWNER || !TINO_MODULE_ADDRESS) {
    return getDemoFeed().length;
  }
  const aptos = getAptosClient();
  const countResult = await aptos.view({
    payload: {
      function: `${TINO_MODULE_ADDRESS}::feed::get_posts_count`,
      functionArguments: [TINO_FEED_OWNER],
    },
  }).catch((err) => {
    console.error("[getPostsCount] error:", err);
    return [0];
  });
  return toNumber(Array.isArray(countResult) ? countResult[0] : 0);
}

export async function getPostsFromContract(): Promise<PostEntryWithIndex[]> {
  if (!TINO_FEED_OWNER || !TINO_MODULE_ADDRESS) {
    return getDemoFeed().map((p, i) => ({ ...p, index: i }));
  }
  const aptos = getAptosClient();
  const moduleAddr = TINO_MODULE_ADDRESS;
  const count = await getPostsCount();

  const posts: PostEntryWithIndex[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const row = await aptos.view({
        payload: {
          function: `${moduleAddr}::feed::get_post`,
          functionArguments: [TINO_FEED_OWNER, String(i)],
        },
      });
      const arr = Array.isArray(row) ? row : [];
      const actualIndex = toNumber(arr[0]);
      const author = typeof arr[1] === "string" ? arr[1] : String(arr[1] ?? "");
      const blobName = typeof arr[2] === "string" ? arr[2] : String(arr[2] ?? "");
      const timestamp = toNumber(arr[3]);
      posts.push({ author, blobName, timestamp, index: actualIndex });
    } catch (err) {
      console.warn("[getPostsFromContract] get_post error for index", i, err);
    }
  }
  return posts.reverse();
}

export async function getLikesCountFromContract(postIndex: number): Promise<number> {
  if (!TINO_FEED_OWNER || !TINO_MODULE_ADDRESS) return 0;
  const aptos = getAptosClient();
  const [count] = await aptos.view<[string]>({
    payload: {
      function: `${TINO_MODULE_ADDRESS}::feed::get_likes_count`,
      functionArguments: [TINO_FEED_OWNER, String(postIndex)],
    },
  }).catch(() => ["0"]);
  return Number(count);
}

export async function hasLikedFromContract(
  postIndex: number,
  address: string
): Promise<boolean> {
  if (!TINO_FEED_OWNER || !TINO_MODULE_ADDRESS) return false;
  const aptos = getAptosClient();
  const [v] = await aptos.view<[boolean]>({
    payload: {
      function: `${TINO_MODULE_ADDRESS}::feed::has_liked`,
      functionArguments: [TINO_FEED_OWNER, String(postIndex), address],
    },
  }).catch(() => [false]);
  return Boolean(v);
}

export async function getCommentsFromContract(
  postIndex: number
): Promise<{ commenter: string; blobName: string; timestamp: number }[]> {
  if (!TINO_FEED_OWNER || !TINO_MODULE_ADDRESS) return [];
  const aptos = getAptosClient();
  const total = await aptos.view<[string]>({
    payload: {
      function: `${TINO_MODULE_ADDRESS}::feed::get_comments_count`,
      functionArguments: [TINO_FEED_OWNER],
    },
  }).then((r) => Number(r[0])).catch(() => 0);

  const out: { commenter: string; blobName: string; timestamp: number }[] = [];
  for (let i = 0; i < total; i++) {
    const [pIdx, commenter, blobName, timestamp] = await aptos.view<[string, string, string, string]>({
      payload: {
        function: `${TINO_MODULE_ADDRESS}::feed::get_comment`,
        functionArguments: [TINO_FEED_OWNER, String(i)],
      },
    });
    if (Number(pIdx) === postIndex) {
      out.push({
        commenter: commenter as string,
        blobName: blobName as string,
        timestamp: Number(timestamp),
      });
    }
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

export function getDemoFeed(): DemoPostEntry[] {
  try {
    const raw = localStorage.getItem(DEMO_FEED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DemoPostEntry[];
  } catch {
    return [];
  }
}

export function appendDemoPost(entry: DemoPostEntry): void {
  const feed = getDemoFeed();
  feed.push(entry);
  localStorage.setItem(DEMO_FEED_KEY, JSON.stringify(feed));
}

export function removeDemoPost(author: string, blobName: string): void {
  const feed = getDemoFeed().filter(
    (p) => !(p.author === author && p.blobName === blobName)
  );
  localStorage.setItem(DEMO_FEED_KEY, JSON.stringify(feed));
}

export function buildRegisterPostPayload(
  feedOwner: string,
  blobName: string,
  timestamp: number
): { function: string; functionArguments: unknown[] } {
  return {
    function: `${TINO_MODULE_ADDRESS}::feed::register_post`,
    functionArguments: [feedOwner, blobName, String(timestamp)],
  };
}

export function buildLikePostPayload(
  feedOwner: string,
  postIndex: number
): { function: string; functionArguments: unknown[] } {
  return {
    function: `${TINO_MODULE_ADDRESS}::feed::like_post`,
    functionArguments: [feedOwner, String(postIndex)],
  };
}

export function buildRegisterCommentPayload(
  feedOwner: string,
  postIndex: number,
  blobName: string,
  timestamp: number
): { function: string; functionArguments: unknown[] } {
  return {
    function: `${TINO_MODULE_ADDRESS}::feed::register_comment`,
    functionArguments: [feedOwner, String(postIndex), blobName, String(timestamp)],
  };
}

export function buildDeletePostPayload(
  feedOwner: string,
  postIndex: number
): { function: string; functionArguments: unknown[] } {
  return {
    function: `${TINO_MODULE_ADDRESS}::feed::delete_post`,
    functionArguments: [feedOwner, String(postIndex)],
  };
}
