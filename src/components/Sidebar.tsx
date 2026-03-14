import { useState, useMemo, useEffect, useRef } from "react";
import type { PostRecord } from "../types";
import { getCommentedPostKeys, postKeyFromPost } from "../lib/commentedPosts";

const CONTENT_FAILED = "[Content could not be loaded]";

export type SidebarTab = "all" | "liked" | "commented";

type Props = {
  posts: PostRecord[];
  selectedPostKey: string | null;
  onSelectPost: (post: PostRecord) => void;
  onNewTopic: () => void;
  onRefresh: () => void;
  loading: boolean;
  currentAddress: string | null;
};

const MAX_PREVIEW = 48;
const PAGE_SIZE = 10;

function truncate(str: string, max: number) {
  const t = str.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

function matchesSearch(post: PostRecord, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const title = (post.title ?? "").toLowerCase();
  const content = (post.content ?? "").toLowerCase();
  const blobName = (post.blobName ?? "").toLowerCase();
  const effectiveContent = content === CONTENT_FAILED ? "" : content;
  return title.includes(q) || effectiveContent.includes(q) || blobName.includes(q);
}

function getTopicLabel(post: PostRecord): string {
  if (post.title?.trim()) return truncate(post.title.trim(), MAX_PREVIEW);
  if (post.content?.trim() && post.content !== CONTENT_FAILED) return truncate(post.content.trim(), MAX_PREVIEW);
  if (post.blobName) {
    const name = post.blobName.split("/").pop() || post.blobName;
    return truncate(name, MAX_PREVIEW);
  }
  return "Untitled";
}

export function Sidebar({
  posts,
  selectedPostKey,
  onSelectPost,
  onNewTopic,
  onRefresh,
  loading,
  currentAddress,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<SidebarTab>("all");
  const prevLengthRef = useRef(posts.length);

  const commentedKeys = useMemo(
    () => (currentAddress ? getCommentedPostKeys(currentAddress) : []),
    [currentAddress]
  );

  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return posts;
    if (activeTab === "liked") return posts.filter((p) => p.hasLiked);
    if (activeTab === "commented") {
      return posts.filter((p) => commentedKeys.includes(postKeyFromPost(p.author, p.blobName)));
    }
    return posts;
  }, [posts, activeTab, commentedKeys]);

  const filtered = useMemo(
    () => tabFiltered.filter((p) => matchesSearch(p, searchQuery)),
    [tabFiltered, searchQuery]
  );

  useEffect(() => {
    if (posts.length > prevLengthRef.current) {
      setSearchQuery("");
      setCurrentPage(1);
    }
    prevLengthRef.current = posts.length;
  }, [posts.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pagePosts = useMemo(
    () => filtered.slice(start, start + PAGE_SIZE),
    [filtered, start]
  );

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <aside className="sidebar">
      <button type="button" className="sidebar-new-topic" onClick={onNewTopic}>
        + New topic
      </button>
      <button type="button" className="sidebar-refresh" onClick={onRefresh} disabled={loading} aria-label="Refresh topics">
        ↻ Refresh
      </button>
      <div className="sidebar-divider" />
      <div className="sidebar-tabs" role="tablist" aria-label="Topic filters">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "all"}
          className={`sidebar-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "liked"}
          className={`sidebar-tab ${activeTab === "liked" ? "active" : ""}`}
          onClick={() => setActiveTab("liked")}
        >
          Liked
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "commented"}
          className={`sidebar-tab ${activeTab === "commented" ? "active" : ""}`}
          onClick={() => setActiveTab("commented")}
        >
          Commented
        </button>
      </div>
      <h2 className="sidebar-heading">Topics</h2>
      <div className="sidebar-search-wrap">
        <input
          type="search"
          className="sidebar-search"
          placeholder="Search topics…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search topics"
        />
      </div>
      {loading ? (
        <p className="sidebar-loading">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="sidebar-empty">
          {searchQuery.trim()
            ? "No topics match your search"
            : activeTab === "liked"
              ? "No liked topics yet"
              : activeTab === "commented"
                ? "No topics you commented on yet"
                : "No topics yet"}
        </p>
      ) : (
        <>
          <ul className="sidebar-topic-list">
            {pagePosts.map((post) => {
              const key = `${post.author}-${post.blobName}`;
              const isSelected = selectedPostKey === key;
              const label = getTopicLabel(post);
              const titleAttr = post.title ? `${post.title}\n${post.content ?? ""}` : (post.content !== CONTENT_FAILED ? post.content ?? "" : "");
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={`sidebar-topic-item ${isSelected ? "selected" : ""}`}
                    onClick={() => onSelectPost(post)}
                    title={titleAttr || post.blobName || undefined}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <div className="sidebar-pagination">
              <button
                type="button"
                className="sidebar-pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                ← Prev
              </button>
              <span className="sidebar-pagination-info">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="sidebar-pagination-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
