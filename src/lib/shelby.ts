import {
  ShelbyClient,
  createDefaultErasureCodingProvider,
  generateCommitments,
  expectedTotalChunksets,
  ShelbyBlobClient,
} from "@shelby-protocol/sdk/browser";
import { Network } from "@aptos-labs/ts-sdk";
import { SHELBY_API_KEY } from "../config";

// Shelby: using testnet (not shelbynet)
const shelbyNetwork = Network.TESTNET;

let shelbyClient: ShelbyClient | null = null;

export function getShelbyClient(): ShelbyClient {
  if (!shelbyClient) {
    shelbyClient = new ShelbyClient({
      network: shelbyNetwork,
      apiKey: SHELBY_API_KEY || undefined,
    });
  }
  return shelbyClient;
}

export async function uploadBlob(
  accountAddress: string,
  blobName: string,
  data: Uint8Array,
  signAndSubmitTransaction: (tx: { data: unknown }) => Promise<{ hash: string }>
): Promise<void> {
  const client = getShelbyClient();
  const provider = await createDefaultErasureCodingProvider();
  const commitments = await generateCommitments(provider, data);

  const expirationMicros = (Date.now() / 1000 + 60 * 60 * 24 * 30) * 1_000_000; // 30 days

  const payload = ShelbyBlobClient.createRegisterBlobPayload({
    account: accountAddress as unknown as import("@aptos-labs/ts-sdk").AccountAddress,
    blobName,
    blobSize: commitments.raw_data_size,
    blobMerkleRoot: commitments.blob_merkle_root,
    numChunksets: expectedTotalChunksets(commitments.raw_data_size),
    expirationMicros,
    encoding: 0,
  });

  let hash: string;
  try {
    const result = await signAndSubmitTransaction({ data: payload });
    hash = result.hash;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Chain registration failed (check wallet approval / APT / ShelbyUSD): ${msg}`);
  }

  const { Aptos, AptosConfig } = await import("@aptos-labs/ts-sdk");
  const aptos = new Aptos(
    new AptosConfig({
      network: Network.TESTNET,
      clientConfig: undefined,
    })
  );
  try {
    await aptos.waitForTransaction({ transactionHash: hash });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      "Aptos waitForTransaction failed (e.g. API key or network). Waiting 4s then continuing. Transaction was already submitted by the wallet.",
      msg
    );
    await new Promise((r) => setTimeout(r, 4000));
  }

  try {
    await client.rpc.putBlob({
      account: accountAddress as unknown as import("@aptos-labs/ts-sdk").AccountAddress,
      blobName,
      blobData: data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Shelby upload failed: ${msg}`);
  }
}

const accountAddressType = (addr: string) =>
  addr as unknown as import("@aptos-labs/ts-sdk").AccountAddress;

async function downloadBlobOnce(
  client: ShelbyClient,
  accountAddress: string,
  blobName: string
): Promise<Uint8Array> {
  const blob = await client.download({
    account: accountAddressType(accountAddress),
    blobName,
  });
  const stream = blob.readable;
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Downloads blob; retries with short delays for propagation. */
export async function downloadBlob(
  accountAddress: string,
  blobName: string,
  options?: { retries?: number; delayMs?: number }
): Promise<Uint8Array> {
  const client = getShelbyClient();
  const retries = options?.retries ?? 3;
  const delayMs = options?.delayMs ?? 1500;
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await downloadBlobOnce(client, accountAddress, blobName);
    } catch (e) {
      lastError = e;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  console.warn("downloadBlob failed after retries:", accountAddress, blobName, lastError);
  throw lastError;
}
