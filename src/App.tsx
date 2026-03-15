import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useFeed } from "./hooks/useFeed";
import { usePostActions } from "./hooks/usePostActions";
import { CreatePost } from "./components/CreatePost";
import { PostCard } from "./components/PostCard";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import { WalletConnect } from "./components/WalletConnect";
import { getCommentedPostKeys, postKeyFromPost } from "./lib/commentedPosts";
import { getPostsCount } from "./lib/feed";
import { shelbyBlobUrl } from "./config";
import type { PostRecord } from "./types";
import type { SidebarTab } from "./components/Sidebar";
import "./App.css";

function postKey(post: PostRecord) {
  return `${post.author}-${post.blobName}`;
}

function App() {
  const { account, connected } = useWallet();
  const currentAddress = account?.address != null ? String(account.address) : null;
  const { posts, loading, error, refresh, prependPost, hasContract } = useFeed(currentAddress);
  const { createPost, likePost, addComment, deletePost, submitting, error: actionError } = usePostActions({
    onSuccess: refresh,
    onPostCreated: async (data) => {
      const count = await getPostsCount();
      const newPost: PostRecord = {
        index: count - 1,
        author: data.author,
        blobName: data.blobName,
        timestamp: data.timestamp,
        title: data.title,
        content: data.content,
        attachments: data.attachments as PostRecord["attachments"],
        likeCount: 0,
        commentCount: 0,
        hasLiked: false,
      };
      prependPost(newPost);
    },
  });
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [feedFilter, setFeedFilter] = useState<SidebarTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const commentedKeys = useMemo(
    () => (currentAddress ? getCommentedPostKeys(currentAddress) : []),
    [currentAddress]
  );

  const tabFiltered = useMemo(() => {
    if (feedFilter === "all") return posts;
    if (feedFilter === "liked") return posts.filter((p) => p.hasLiked);
    return posts.filter((p) => commentedKeys.includes(postKeyFromPost(p.author, p.blobName)));
  }, [posts, feedFilter, commentedKeys]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? tabFiltered
      : tabFiltered.filter((p) => {
          const title = (p.title ?? "").toLowerCase();
          const content = (p.content ?? "").toLowerCase();
          return title.includes(q) || content.includes(q);
        });
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [tabFiltered, searchQuery]);

  useEffect(() => {
    if (selectedPost && !posts.some((p) => postKey(p) === postKey(selectedPost))) {
      setSelectedPost(null);
    }
  }, [posts, selectedPost]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <img src="/mascot.png" alt="Tino" className="header-mascot" />
          <h1 className="logo">Tino</h1>
        </div>
        <WalletConnect />
      </header>

      <div className="layout">
        <Sidebar
          activeTab={feedFilter}
          onTabChange={setFeedFilter}
          onGoHome={() => setSelectedPost(null)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewTopic={() => {
            setSelectedPost(null);
            setTimeout(() => {
              document.getElementById("feed-compose-area")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
          onRefresh={refresh}
          loading={loading}
          connected={connected}
        />

        <main className="main">
          {connected && !hasContract && (
            <p className="demo-notice">
              Demo mode: Deploy the feed contract (see README) so others can like and reply to topics.
            </p>
          )}

          {selectedPost ? (
                <section className="topic-view">
                  <div className="topic-view__bar">
                    <button
                      type="button"
                      className="back-to-topics"
                      onClick={() => setSelectedPost(null)}
                    >
                      ← Back to topics
                    </button>
                    <span className="topic-view__label">Discussion</span>
                  </div>
                  <div className="topic-view__body">
                    <div className="topic-view__main">
                      <PostCard
                        post={selectedPost}
                        likePost={likePost}
                        addComment={addComment}
                        deletePost={deletePost}
                        submitting={submitting}
                        hasContract={hasContract}
                        currentAddress={account?.address != null ? String(account.address) : null}
                        defaultExpandComments
                        onDeleted={() => {
                          setSelectedPost(null);
                          refresh();
                        }}
                      />
                    </div>
                    <aside className="topic-view__aside">
                      <div className="topic-view__meta-card">
                        <p className="topic-view__meta-title">Topic</p>
                        <div className="topic-view__author-block">
                          <div
                            className="topic-view__author-avatar"
                            aria-hidden
                          >
                            {String(selectedPost.author).slice(2, 4).toUpperCase()}
                          </div>
                          <div className="topic-view__author-info">
                            <span className="topic-view__author-label">Started by</span>
                            <span className="topic-view__author-address" title={selectedPost.author}>
                              {selectedPost.author.slice(0, 6)}…{selectedPost.author.slice(-4)}
                            </span>
                          </div>
                        </div>
                        <dl className="topic-view__stats">
                          <div className="topic-view__stat">
                            <dt>Replies</dt>
                            <dd>{selectedPost.commentCount ?? 0}</dd>
                          </div>
                          <div className="topic-view__stat">
                            <dt>Likes</dt>
                            <dd>{selectedPost.likeCount ?? 0}</dd>
                          </div>
                        </dl>
                        <p className="topic-view__meta-time">
                          {new Date(selectedPost.timestamp).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="topic-view__explorer-links">
                          <a
                            href={shelbyBlobUrl(selectedPost.author, selectedPost.blobName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="topic-view__explorer-link"
                          >
                            Shelby · Blob
                          </a>
                        </div>
                      </div>
                    </aside>
                  </div>
                </section>
          ) : (
            <section className="feed-flow" id="feed-compose-area">
              <div className="feed-compose">
                {connected ? (
                  <CreatePost
                    createPost={createPost}
                    submitting={submitting}
                    error={actionError}
                  />
                ) : (
                  <div className="connect-cta">
                    <p className="connect-cta__text">Connect your wallet to start a new topic, reply, or like.</p>
                    <p className="connect-cta__hint">Use <strong>Connect wallet</strong> in the header above.</p>
                  </div>
                )}
              </div>
              <div className="feed-timeline">
                    {loading && <p className="feed-loading">Loading…</p>}
                    {error && <p className="error">{error}</p>}
                    {!loading && !error && filteredPosts.length === 0 && (
                      <p className="empty-feed">
                        {searchQuery.trim()
                          ? "No topics match your search."
                          : feedFilter === "liked"
                            ? "No liked topics yet."
                            : feedFilter === "commented"
                              ? "No topics you commented on yet."
                              : "No topics yet. Start the first one above."}
                      </p>
                    )}
                    {!loading && filteredPosts.length > 0 && (
                      <ul className="feed-list" aria-label="Feed">
                        {filteredPosts.map((post) => (
                          <li key={postKey(post)}>
                            <PostCard
                              post={post}
                              likePost={likePost}
                              addComment={addComment}
                              deletePost={deletePost}
                              submitting={submitting}
                              hasContract={hasContract}
                              currentAddress={account?.address != null ? String(account.address) : null}
                              compact
                              onSelect={() => setSelectedPost(post)}
                            />
                          </li>
                        ))}
                      </ul>
                )}
              </div>
            </section>
          )}
        </main>

        <RightPanel posts={posts} onSelectPost={setSelectedPost} loading={loading} />
      </div>
    </div>
  );
}

export default App;
