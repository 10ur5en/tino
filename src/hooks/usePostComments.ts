import { useState, useCallback } from "react";
import { getCommentsFromContract } from "../lib/feed";
import { downloadBlob } from "../lib/shelby";
import type { CommentRecord } from "../types";
import { hasContractConfig } from "../lib/feed";

export function usePostComments(postIndex: number) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!hasContractConfig()) {
      setComments([]);
      return;
    }
    setLoading(true);
    try {
      const refs = await getCommentsFromContract(postIndex);
      const withContent: CommentRecord[] = await Promise.all(
        refs.map(async (r) => {
          try {
            const bytes = await downloadBlob(r.commenter, r.blobName);
            const text = new TextDecoder().decode(bytes);
            const parsed = JSON.parse(text) as { content: string; timestamp: number };
            return {
              postIndex,
              commenter: r.commenter,
              blobName: r.blobName,
              timestamp: r.timestamp,
              content: parsed.content,
            };
          } catch {
            return {
              postIndex,
              commenter: r.commenter,
              blobName: r.blobName,
              timestamp: r.timestamp,
              content: "[Reply could not be loaded]",
            };
          }
        })
      );
      setComments(withContent);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postIndex]);

  return { comments, loading, load };
}
