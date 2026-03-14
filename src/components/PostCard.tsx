import { useState, useEffect } from "react";
import type { PostRecord } from "../types";
import type { usePostActions } from "../hooks/usePostActions";
import { usePostComments } from "../hooks/usePostComments";
import { shelbyBlobUrl } from "../config";
import { addCommentedPostKey, postKeyFromPost } from "../lib/commentedPosts";

type Props = {
  post: PostRecord;
  likePost: ReturnType<typeof usePostActions>["likePost"];
  addComment: ReturnType<typeof usePostActions>["addComment"];
  deletePost: ReturnType<typeof usePostActions>["deletePost"];
  submitting: boolean;
  hasContract: boolean;
  /** Current wallet address; only author can delete */
  currentAddress?: string | null;
  /** When topic is opened alone, show replies immediately */
  defaultExpandComments?: boolean;
  /** Called after topic is deleted (e.g. clear selection) */
  onDeleted?: () => void;
};

function shortAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function PostCard({
  post,
  likePost,
  addComment,
  deletePost,
  submitting,
  hasContract,
  currentAddress = null,
  defaultExpandComments = false,
  onDeleted,
}: Props) {
  const [showComments, setShowComments] = useState(defaultExpandComments);
  const [commentText, setCommentText] = useState("");
  const { comments, loading: commentsLoading, load: loadComments } = usePostComments(post.index);
  const isAuthor = currentAddress ? String(currentAddress) === String(post.author) : false;

  const onDelete = async () => {
    if (!isAuthor || submitting) return;
    if (!confirm("Delete this topic? This cannot be undone.")) return;
    await deletePost(post.index, post.author, post.blobName);
    onDeleted?.();
  };

  useEffect(() => {
    if (defaultExpandComments && hasContract) loadComments();
  }, [defaultExpandComments, hasContract, post.index]);

  const onToggleComments = () => {
    if (!showComments && hasContract) loadComments();
    setShowComments((v) => !v);
  };

  const onAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submitting) return;
    await addComment(post.index, text);
    if (currentAddress) {
      addCommentedPostKey(String(currentAddress), postKeyFromPost(post.author, post.blobName));
    }
    setCommentText("");
    if (showComments) loadComments();
  };

  return (
    <article className="post-card post-card--topic">
      <header className="post-card__header">
        <div className="post-card__avatar" aria-hidden>
          {shortAddress(post.author).slice(0, 2).toUpperCase()}
        </div>
        <div className="post-card__meta">
          <span className="post-card__author" title={post.author}>
            {shortAddress(post.author)}
          </span>
          <time className="post-card__time">{formatTime(post.timestamp)}</time>
        </div>
      </header>
      <div className="post-card__body">
        {post.title ? (
          <h2 className="post-card__title">{post.title}</h2>
        ) : null}
        <p className="post-card__content">{post.content}</p>
      </div>
      <div className="post-card__actions">
        <button
          type="button"
          className={`post-card__action ${post.hasLiked ? "is-liked" : ""}`}
          onClick={() => hasContract && likePost(post.index)}
          disabled={submitting || !hasContract}
          title="Like"
        >
          <span className="post-card__action-icon">♥</span>
          <span>{post.likeCount ?? 0}</span>
        </button>
        <button
          type="button"
          className="post-card__action"
          onClick={onToggleComments}
          title="Show replies"
        >
          <span className="post-card__action-icon">💬</span>
          <span>{post.commentCount ?? 0} replies</span>
        </button>
        {isAuthor && (
          <button
            type="button"
            className="post-card__action post-card__action--delete"
            onClick={onDelete}
            disabled={submitting}
            title="Delete topic"
          >
            <span className="post-card__action-icon">🗑</span>
            <span>Delete</span>
          </button>
        )}
      </div>
      {showComments && (
        <div className="post-card__replies">
          {hasContract ? (
            <>
              <p className="post-card__replies-title">Reply to this topic</p>
              <p className="comment-form-hint">Your wallet will ask for 2 approvals: one to store the reply (Shelby), one to publish it (Aptos).</p>
              <form onSubmit={onAddComment} className="comment-form">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write your reply…"
                  maxLength={300}
                  disabled={submitting}
                />
                <button type="submit" disabled={submitting || !commentText.trim()}>
                  Reply
                </button>
              </form>
            </>
          ) : (
            <div className="post-card__replies-cta">
              <p>Replies are enabled when the feed contract is deployed.</p>
              <p>Deploy the contract (see README) so anyone can reply to topics.</p>
            </div>
          )}
          {commentsLoading ? (
            <p className="comments-loading">Loading replies…</p>
          ) : comments.length > 0 ? (
            <>
              <p className="post-card__replies-title">Replies</p>
              <ul className="comment-list">
                {comments.map((c, i) => (
                  <li key={`${c.commenter}-${c.timestamp}-${i}`} className="comment-item">
                    <div className="comment-item__head">
                      <span className="comment-author" title={c.commenter}>
                        {shortAddress(c.commenter)}
                      </span>
                      <a
                        href={shelbyBlobUrl(c.commenter, c.blobName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="comment-item__link"
                        title="View blob on Shelby Explorer"
                      >
                        Shelby
                      </a>
                    </div>
                    <span className="comment-content">{c.content}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}
    </article>
  );
}
