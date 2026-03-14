import { useState, useCallback } from "react";
import {
  getPostsFromContract,
  getLikesCountFromContract,
  hasLikedFromContract,
  getCommentsFromContract,
  hasContractConfig,
} from "../lib/feed";
import type { PostEntryWithIndex } from "../lib/feed";
import { downloadBlob } from "../lib/shelby";
import type { PostRecord } from "../types";

export function useFeed(currentAddress?: string | null) {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasContract = hasContractConfig();

  const loadPostContent = useCallback(
    async (entry: PostEntryWithIndex): Promise<PostRecord> => {
      try {
        const bytes = await downloadBlob(entry.author, entry.blobName);
        const text = new TextDecoder().decode(bytes);
        const parsed = JSON.parse(text) as { title?: string; content: string; timestamp: number };
        let likeCount = 0;
        let hasLiked = false;
        let commentCount = 0;
        if (hasContract) {
          likeCount = await getLikesCountFromContract(entry.index);
          hasLiked = currentAddress
            ? await hasLikedFromContract(entry.index, currentAddress)
            : false;
          const comments = await getCommentsFromContract(entry.index);
          commentCount = comments.length;
        }
        return {
          index: entry.index,
          author: entry.author,
          blobName: entry.blobName,
          timestamp: entry.timestamp,
          title: parsed.title ?? "",
          content: parsed.content ?? "",
          likeCount,
          hasLiked,
          commentCount,
        };
      } catch {
        return {
          index: entry.index,
          author: entry.author,
          blobName: entry.blobName,
          timestamp: entry.timestamp,
          title: "",
          content: "[Content could not be loaded]",
          likeCount: 0,
          hasLiked: false,
          commentCount: 0,
        };
      }
    },
    [hasContract, currentAddress]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await getPostsFromContract();
      const withContent = await Promise.all(entries.map(loadPostContent));
      setPosts(withContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feed");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [loadPostContent]);

  return { posts, loading, error, refresh, hasContract };
}

