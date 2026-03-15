import { useState, useRef } from "react";
import type { usePostActions } from "../hooks/usePostActions";

const TITLE_MAX = 120;
const CONTENT_MAX = 2000;
const ACCEPT_MEDIA = "image/*,video/*,application/pdf";
const MAX_ATTACHMENTS = 3;
const MAX_FILE_MB = 8;

export type AttachmentPayload = {
  type: "image" | "video" | "pdf";
  data: string;
  mimeType: string;
  name: string;
};

function fileToType(mime: string): "image" | "video" | "pdf" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "pdf";
}

type Props = {
  createPost: ReturnType<typeof usePostActions>["createPost"];
  submitting: boolean;
  error: string | null;
};

export function CreatePost({ createPost, submitting, error }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showWhy, setShowWhy] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    if (!t || !c || submitting) return;
    await createPost(t, c, attachments.length ? attachments : undefined);
    setTitle("");
    setContent("");
    setAttachments([]);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const maxBytes = MAX_FILE_MB * 1024 * 1024;
    for (let i = 0; i < files.length; i++) {
      if (attachments.length >= MAX_ATTACHMENTS) break;
      const file = files[i];
      if (file.size > maxBytes) continue;
      const mime = file.type || "application/octet-stream";
      if (!mime.startsWith("image/") && !mime.startsWith("video/") && mime !== "application/pdf") continue;
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        if (!data) return;
        setAttachments((prev) => {
          if (prev.some((a) => a.name === file.name)) return prev;
          if (prev.length >= MAX_ATTACHMENTS) return prev;
          return [...prev, { type: fileToType(mime), data, mimeType: mime, name: file.name }];
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeAttachment = (name: string) => {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  };

  return (
    <form onSubmit={handleSubmit} className="create-post">
      <span className="create-post-label">Start a discussion</span>
      <div className="create-post-title-wrap">
        <input
          type="text"
          className="create-post-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Topic title"
          maxLength={TITLE_MAX}
          disabled={submitting}
        />
        <span className={`char-counter char-counter--title ${title.length >= TITLE_MAX ? "char-counter--at-limit" : ""}`} aria-live="polite">
          {title.length}/{TITLE_MAX}
        </span>
      </div>
      <div className="create-post-body-wrap">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your topic…"
          rows={3}
          maxLength={CONTENT_MAX}
          disabled={submitting}
        />
        <span className={`char-counter char-counter--body ${content.length >= CONTENT_MAX ? "char-counter--at-limit" : ""}`} aria-live="polite">
          {content.length.toLocaleString()}/{CONTENT_MAX.toLocaleString()}
        </span>
      </div>
      <div className="create-post-attachments">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MEDIA}
          multiple
          onChange={onFileChange}
          className="create-post-file-input"
          aria-label="Add image, video or PDF"
        />
        <button
          type="button"
          className="create-post-add-media"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting || attachments.length >= MAX_ATTACHMENTS}
          title="Image, video or PDF (max 3, 8MB each)"
        >
          + Image / Video / PDF
        </button>
        {attachments.length > 0 && (
          <ul className="create-post-attachment-list">
            {attachments.map((a) => (
              <li key={a.name} className="create-post-attachment-item">
                {a.type === "image" ? (
                  <img src={a.data} alt="" className="create-post-attachment-preview" />
                ) : (
                  <span className="create-post-attachment-icon">{a.type === "video" ? "🎬" : "📄"}</span>
                )}
                <span className="create-post-attachment-name" title={a.name}>{a.name}</span>
                <button type="button" className="create-post-attachment-remove" onClick={() => removeAttachment(a.name)} aria-label={`Remove ${a.name}`}>×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="create-post-wallet-hint-wrap">
        <p className="create-post-wallet-hint">
          Your wallet will ask for <strong>2 approvals</strong>: 1) store content (Shelby), 2) publish to the feed (Aptos).
        </p>
        <button
          type="button"
          className="create-post-why-btn"
          onClick={() => setShowWhy((v) => !v)}
          aria-expanded={showWhy}
        >
          {showWhy ? "Hide" : "Why two approvals?"}
        </button>
        {showWhy && (
          <div className="create-post-why-content" role="region" aria-label="Why two approvals">
            <p>Content is stored on Shelby (decentralized storage) and the feed entry is recorded on Aptos. These are two separate on-chain operations, so the wallet asks you to sign twice.</p>
          </div>
        )}
      </div>
      <div className="create-post-actions">
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
