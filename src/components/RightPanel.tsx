import type { PostRecord } from "../types";
import { SHELBY_EXPLORER_BASE } from "../config";

const CONTENT_FAILED = "[Content could not be loaded]";
const MAX_ITEMS = 5;
const MAX_TITLE_LEN = 36;

function getLabel(post: PostRecord): string {
  const title = (post.title ?? "").trim();
  if (title) return title.length > MAX_TITLE_LEN ? title.slice(0, MAX_TITLE_LEN) + "…" : title;
  const content = (post.content ?? "").trim();
  if (content && content !== CONTENT_FAILED) return content.length > MAX_TITLE_LEN ? content.slice(0, MAX_TITLE_LEN) + "…" : content;
  return "Untitled";
}

function formatRelativeTime(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Props = {
  posts: PostRecord[];
  onSelectPost: (post: PostRecord) => void;
  loading?: boolean;
};

export function RightPanel({ posts, onSelectPost, loading }: Props) {
  const mostLiked = [...posts]
    .filter((p) => (p.likeCount ?? 0) > 0)
    .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
    .slice(0, MAX_ITEMS);

  const newest = [...posts]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ITEMS);

  return (
    <aside className="right-panel" aria-label="Discover and shortcuts">
      <div className="right-panel__about">
        <p className="right-panel__about-text">
          Content on Shelby, interactions on Aptos. Decentralized discussions.
        </p>
        <a
          href={SHELBY_EXPLORER_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="right-panel__about-link"
        >
          Shelby Explorer →
        </a>
      </div>

      <div className="right-panel__section">
        <h2 className="right-panel__title">
          <span className="right-panel__title-dot" aria-hidden />
          Trending
        </h2>
        {loading ? (
          <p className="right-panel__loading">Loading…</p>
        ) : mostLiked.length === 0 ? (
          <p className="right-panel__empty">Like topics to see them here.</p>
        ) : (
          <ol className="right-panel__list" start={1}>
            {mostLiked.map((post, i) => (
              <li key={`${post.author}-${post.blobName}`}>
                <button
                  type="button"
                  className="right-panel__item right-panel__item--rank"
                  onClick={() => onSelectPost(post)}
                  title={post.title ?? post.content ?? ""}
                >
                  <span className="right-panel__rank" aria-hidden>{i + 1}</span>
                  <span className="right-panel__item-content">
                    <span className="right-panel__item-label">{getLabel(post)}</span>
                    <span className="right-panel__item-meta">♥ {post.likeCount ?? 0}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="right-panel__section">
        <h2 className="right-panel__title">
          <span className="right-panel__title-dot" aria-hidden />
          Latest
        </h2>
        {loading ? (
          <p className="right-panel__loading">Loading…</p>
        ) : newest.length === 0 ? (
          <p className="right-panel__empty">No topics yet.</p>
        ) : (
          <ol className="right-panel__list" start={1}>
            {newest.map((post, i) => (
              <li key={`${post.author}-${post.blobName}`}>
                <button
                  type="button"
                  className="right-panel__item right-panel__item--rank"
                  onClick={() => onSelectPost(post)}
                  title={post.title ?? post.content ?? ""}
                >
                  <span className="right-panel__rank" aria-hidden>{i + 1}</span>
                  <span className="right-panel__item-content">
                    <span className="right-panel__item-label">{getLabel(post)}</span>
                    <span className="right-panel__item-meta">{formatRelativeTime(post.timestamp)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
