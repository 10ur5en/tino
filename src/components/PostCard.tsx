import { useState, useEffect, useRef } from "react";
import type { PostRecord, PostAttachment } from "../types";
import type { usePostActions } from "../hooks/usePostActions";
import { usePostComments } from "../hooks/usePostComments";
import { shelbyBlobUrl } from "../config";
import { addCommentedPostKey, postKeyFromPost } from "../lib/commentedPosts";

const CONTENT_PREVIEW_LENGTH = 200;
const COMMENT_MAX = 2000;
const ACCEPT_MEDIA = "image/*,video/*,application/pdf";
const MAX_COMMENT_ATTACHMENTS = 2;
const MAX_FILE_MB = 8;

function fileToType(mime: string): "image" | "video" | "pdf" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "pdf";
}

function AttachmentsDisplay({ attachments, compact = false }: { attachments: PostAttachment[]; compact?: boolean }) {
  return (
    <div className={`post-attachments ${compact ? "post-attachments--compact" : ""}`}>
      {attachments.map((a, i) => (
        <div key={`${a.name}-${i}`} className="post-attachment">
          {a.type === "image" && <img src={a.data} alt="" className="post-attachment__img" />}
          {a.type === "video" && (
            <video src={a.data} controls className="post-attachment__video" preload="metadata" />
          )}
          {a.type === "pdf" && (
            <a href={a.data} target="_blank" rel="noopener noreferrer" className="post-attachment__link">
              📄 {a.name}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

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
  /** Feed mode: compact card, truncated content, click to open discussion */
  compact?: boolean;
  /** When compact, called when card is clicked to open full view */
  onSelect?: () => void;
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

function truncateContent(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim() + "…";
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
  compact = false,
  onSelect,
}: Props) {
  const [showComments, setShowComments] = useState(defaultExpandComments);
  const [commentText, setCommentText] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<{ type: "image" | "video" | "pdf"; data: string; mimeType: string; name: string }[]>([]);
  const [showCommentWhy, setShowCommentWhy] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);
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

  const onCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const maxBytes = MAX_FILE_MB * 1024 * 1024;
    for (let i = 0; i < files.length; i++) {
      if (commentAttachments.length >= MAX_COMMENT_ATTACHMENTS) break;
      const file = files[i];
      if (file.size > maxBytes) continue;
      const mime = file.type || "application/octet-stream";
      if (!mime.startsWith("image/") && !mime.startsWith("video/") && mime !== "application/pdf") continue;
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        if (!data) return;
        setCommentAttachments((prev) => {
          if (prev.some((a) => a.name === file.name)) return prev;
          if (prev.length >= MAX_COMMENT_ATTACHMENTS) return prev;
          return [...prev, { type: fileToType(mime), data, mimeType: mime, name: file.name }];
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const onAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submitting) return;
    await addComment(post.index, text, commentAttachments.length ? commentAttachments : undefined);
    if (currentAddress) {
      addCommentedPostKey(String(currentAddress), postKeyFromPost(post.author, post.blobName));
    }
    setCommentText("");
    setCommentAttachments([]);
    if (showComments) loadComments();
  };

  const contentDisplay = compact ? truncateContent(post.content ?? "", CONTENT_PREVIEW_LENGTH) : (post.content ?? "");

  return (
    <article
      className={`post-card post-card--topic ${compact ? "post-card--compact" : ""}`}
      role={compact && onSelect ? "button" : undefined}
      tabIndex={compact && onSelect ? 0 : undefined}
      onClick={compact && onSelect ? (e) => { if (!(e.target as HTMLElement).closest(".post-card__actions")) onSelect(); } : undefined}
      onKeyDown={compact && onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } } : undefined}
    >
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
        <p className="post-card__content">{contentDisplay}</p>
        {post.attachments?.length ? <AttachmentsDisplay attachments={post.attachments} compact={compact} /> : null}
      </div>
      <div className="post-card__actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`post-card__action ${post.hasLiked ? "is-liked" : ""}`}
          onClick={() => hasContract && currentAddress && likePost(post.index)}
          disabled={submitting || !hasContract || !currentAddress}
          title={!currentAddress ? "Connect wallet to like" : "Like"}
        >
          <span className="post-card__action-icon">♥</span>
          <span>{post.likeCount ?? 0}</span>
        </button>
        <button
          type="button"
          className="post-card__action"
          onClick={compact && onSelect ? () => onSelect() : onToggleComments}
          title={compact && onSelect ? "View discussion" : "Show replies"}
        >
          <span className="post-card__action-icon">💬</span>
          <span>{post.commentCount ?? 0} replies</span>
        </button>
        {isAuthor && !compact && (
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
      {compact && onSelect && (
        <p className="post-card__view-hint">View discussion →</p>
      )}
      {showComments && !compact && (
        <div className="post-card__replies">
          {hasContract ? (
            <>
              <p className="post-card__replies-title">Reply to this topic</p>
              {currentAddress ? (
              <>
                <div className="comment-form-hint-wrap">
                  <p className="comment-form-hint">Your wallet will ask for <strong>2 approvals</strong>: 1) store reply (Shelby), 2) publish (Aptos).</p>
                  <button
                    type="button"
                    className="comment-form-why-btn"
                    onClick={() => setShowCommentWhy((v) => !v)}
                    aria-expanded={showCommentWhy}
                  >
                    {showCommentWhy ? "Hide" : "Why?"}
                  </button>
                  {showCommentWhy && (
                    <div className="comment-form-why-content" role="region" aria-label="Why two approvals">
                      <p>Reply is stored on Shelby, then registered on Aptos. Two operations = two signatures.</p>
                    </div>
                  )}
                </div>
                <form onSubmit={onAddComment} className="comment-form">
                <div className="comment-form-body-wrap">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write your reply…"
                    rows={2}
                    maxLength={COMMENT_MAX}
                    disabled={submitting}
                  />
                  <span className={`char-counter char-counter--comment ${commentText.length >= COMMENT_MAX ? "char-counter--at-limit" : ""}`} aria-live="polite">
                    {commentText.length}/{COMMENT_MAX}
                  </span>
                </div>
                <div className="comment-form-attachments">
                  <input
                    ref={commentFileRef}
                    type="file"
                    accept={ACCEPT_MEDIA}
                    multiple
                    onChange={onCommentFileChange}
                    className="create-post-file-input"
                    aria-label="Add image, video or PDF"
                  />
                  <button
                    type="button"
                    className="comment-form-add-media"
                    onClick={() => commentFileRef.current?.click()}
                    disabled={submitting || commentAttachments.length >= MAX_COMMENT_ATTACHMENTS}
                  >
                    + Media
                  </button>
                  {commentAttachments.length > 0 && (
                    <ul className="create-post-attachment-list create-post-attachment-list--small">
                      {commentAttachments.map((a) => (
                        <li key={a.name} className="create-post-attachment-item">
                          {a.type === "image" ? (
                            <img src={a.data} alt="" className="create-post-attachment-preview" />
                          ) : (
                            <span className="create-post-attachment-icon">{a.type === "video" ? "🎬" : "📄"}</span>
                          )}
                          <span className="create-post-attachment-name" title={a.name}>{a.name}</span>
                          <button type="button" className="create-post-attachment-remove" onClick={() => setCommentAttachments((p) => p.filter((x) => x.name !== a.name))} aria-label={`Remove ${a.name}`}>×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="comment-form-actions">
                  <button type="submit" disabled={submitting || !commentText.trim()}>
                    Reply
                  </button>
                </div>
              </form>
              </>
              ) : (
                <p className="post-card__connect-to-reply">Connect your wallet to reply to this topic.</p>
              )}
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
                    {c.attachments?.length ? <AttachmentsDisplay attachments={c.attachments} compact /> : null}
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
