import { useCallback, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { uploadBlob } from "../lib/shelby";
import { TINO_FEED_OWNER } from "../config";
import {
  appendDemoPost,
  removeDemoPost,
  hasContractConfig,
  buildRegisterPostPayload,
  buildLikePostPayload,
  buildRegisterCommentPayload,
  buildDeletePostPayload,
  waitForTransaction,
} from "../lib/feed";

export type NewPostData = {
  title: string;
  content: string;
  timestamp: number;
  attachments?: { type: string; data: string; mimeType: string; name: string }[];
  author: string;
  blobName: string;
};

type UsePostActionsOptions = {
  onSuccess?: () => void;
  onPostCreated?: (data: NewPostData) => void | Promise<void>;
};

export function usePostActions(options?: UsePostActionsOptions) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasContract = hasContractConfig();
  const onSuccess = options?.onSuccess;
  const onPostCreated = options?.onPostCreated;

  const createPost = useCallback(
    async (title: string, content: string, attachments?: { type: string; data: string; mimeType: string; name: string }[]) => {
      if (!account?.address) {
        setError("Wallet not connected");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const timestamp = Date.now();
        const blobName = `tino/posts/${String(account.address)}_${timestamp}.json`;
        const payload: { title: string; content: string; timestamp: number; attachments?: unknown[] } = {
          title: title.trim(),
          content: content.trim(),
          timestamp,
        };
        if (attachments?.length) payload.attachments = attachments;
        const data = new TextEncoder().encode(JSON.stringify(payload));
        await uploadBlob(
          String(account.address),
          blobName,
          data,
          signAndSubmitTransaction as (tx: { data: unknown }) => Promise<{ hash: string }>
        );
        if (hasContract && TINO_FEED_OWNER) {
          const registerPayload = buildRegisterPostPayload(
            TINO_FEED_OWNER,
            blobName,
            timestamp
          );
          const result = await signAndSubmitTransaction({
            data: {
              function: registerPayload.function,
              functionArguments: registerPayload.functionArguments,
            },
          } as Parameters<typeof signAndSubmitTransaction>[0]);
          const hash = (result as { hash?: string })?.hash ?? (result as { transactionHash?: string })?.transactionHash;
          if (hash) {
            await waitForTransaction(hash);
          }
          if (onPostCreated) {
            const newPostData: NewPostData = {
              title: title.trim(),
              content: content.trim(),
              timestamp,
              attachments,
              author: String(account.address),
              blobName,
            };
            await onPostCreated(newPostData);
          } else {
            setTimeout(() => onSuccess?.(), 1500);
          }
        } else {
          appendDemoPost({ author: String(account.address), blobName, timestamp });
          setTimeout(() => onSuccess?.(), 1500);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Post error:", e);
        setError(msg || "Failed to create post");
      } finally {
        setSubmitting(false);
      }
    },
    [account?.address, hasContract, signAndSubmitTransaction, onSuccess, onPostCreated]
  );

  const likePost = useCallback(
    async (postIndex: number) => {
      if (!account?.address || !hasContract || !TINO_FEED_OWNER) return;
      setSubmitting(true);
      setError(null);
      try {
        const payload = buildLikePostPayload(TINO_FEED_OWNER, postIndex);
        await signAndSubmitTransaction({
          data: {
            function: payload.function,
            functionArguments: payload.functionArguments,
          },
        } as Parameters<typeof signAndSubmitTransaction>[0]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to like");
      } finally {
        setSubmitting(false);
      }
    },
    [account?.address, hasContract, signAndSubmitTransaction]
  );

  const addComment = useCallback(
    async (postIndex: number, content: string, attachments?: { type: string; data: string; mimeType: string; name: string }[]) => {
      if (!account?.address) {
        setError("Wallet not connected");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const timestamp = Date.now();
        const blobName = `tino/comments/${String(account.address)}_${postIndex}_${timestamp}.json`;
        const payload: { content: string; timestamp: number; attachments?: unknown[] } = { content, timestamp };
        if (attachments?.length) payload.attachments = attachments;
        const data = new TextEncoder().encode(JSON.stringify(payload));
        await uploadBlob(
          String(account.address),
          blobName,
          data,
          signAndSubmitTransaction as (tx: { data: unknown }) => Promise<{ hash: string }>
        );
        if (hasContract && TINO_FEED_OWNER) {
          const payload = buildRegisterCommentPayload(
            TINO_FEED_OWNER,
            postIndex,
            blobName,
            timestamp
          );
          await signAndSubmitTransaction({
            data: {
              function: payload.function,
              functionArguments: payload.functionArguments,
            },
          } as Parameters<typeof signAndSubmitTransaction>[0]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add reply");
      } finally {
        setSubmitting(false);
      }
    },
    [account?.address, hasContract, signAndSubmitTransaction]
  );

  const deletePost = useCallback(
    async (postIndex: number, author: string, blobName: string) => {
      if (!account?.address) {
        setError("Wallet not connected");
        return;
      }
      if (author !== String(account.address)) {
        setError("Only the topic author can delete it");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        if (hasContract && TINO_FEED_OWNER) {
          const payload = buildDeletePostPayload(TINO_FEED_OWNER, postIndex);
          await signAndSubmitTransaction({
            data: {
              function: payload.function,
              functionArguments: payload.functionArguments,
            },
          } as Parameters<typeof signAndSubmitTransaction>[0]);
        } else {
          removeDemoPost(author, blobName);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete topic");
      } finally {
        setSubmitting(false);
      }
    },
    [account?.address, hasContract, signAndSubmitTransaction]
  );

  return { createPost, likePost, addComment, deletePost, submitting, error };
}
