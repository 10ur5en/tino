import { useState } from "react";
import type { usePostActions } from "../hooks/usePostActions";

type Props = {
  createPost: ReturnType<typeof usePostActions>["createPost"];
  submitting: boolean;
  error: string | null;
};

export function CreatePost({ createPost, submitting, error }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    if (!t || !c || submitting) return;
    await createPost(t, c);
    setTitle("");
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="create-post">
      <span className="create-post-label">Start a discussion</span>
      <input
        type="text"
        className="create-post-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Topic title"
        maxLength={120}
        disabled={submitting}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your topic…"
        rows={3}
        maxLength={500}
        disabled={submitting}
      />
      <p className="create-post-wallet-hint">
        Your wallet will ask for 2 approvals: one to store content (Shelby), one to publish to the feed (Aptos).
      </p>
      <div className="create-post-actions">
        <span className="char-count">{title.length}/120 · {content.length}/500</span>
        <button type="submit" disabled={submitting || !title.trim() || !content.trim()}>
          {submitting ? "Posting…" : "Post topic"}
        </button>
      </div>
      {error && (
        <div className="error-block">
          <p className="error">{error}</p>
          <p className="error-hint">
            Did you approve in the wallet? Enough testnet APT and ShelbyUSD?
          </p>
        </div>
      )}
    </form>
  );
}
