export type SidebarTab = "all" | "liked" | "commented";

type Props = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewTopic: () => void;
  onRefresh: () => void;
  loading: boolean;
};

export function Sidebar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onNewTopic,
  onRefresh,
  loading,
}: Props) {
  return (
    <aside className="sidebar sidebar--nav" aria-label="Navigation">
      <div className="sidebar__search-block">
        <label className="sidebar__label" htmlFor="sidebar-search-input">
          Search
        </label>
        <div className="sidebar-search-wrap">
          <span className="sidebar-search-icon" aria-hidden>🔍</span>
          <input
            id="sidebar-search-input"
            type="search"
            className="sidebar-search"
            placeholder="Topics…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search topics"
          />
        </div>
      </div>
      <div className="sidebar__nav-block">
        <span className="sidebar__label">Feed</span>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav__item ${activeTab === "all" ? "active" : ""}`}
            onClick={() => onTabChange("all")}
            aria-current={activeTab === "all" ? "page" : undefined}
          >
            <span className="sidebar-nav__icon" aria-hidden>🏠</span>
            <span className="sidebar-nav__text">Home</span>
          </button>
          <button
            type="button"
            className={`sidebar-nav__item ${activeTab === "liked" ? "active" : ""}`}
            onClick={() => onTabChange("liked")}
            aria-current={activeTab === "liked" ? "page" : undefined}
          >
            <span className="sidebar-nav__icon" aria-hidden>♥</span>
            <span className="sidebar-nav__text">Liked</span>
          </button>
          <button
            type="button"
            className={`sidebar-nav__item ${activeTab === "commented" ? "active" : ""}`}
            onClick={() => onTabChange("commented")}
            aria-current={activeTab === "commented" ? "page" : undefined}
          >
            <span className="sidebar-nav__icon" aria-hidden>💬</span>
            <span className="sidebar-nav__text">Commented</span>
          </button>
        </nav>
      </div>
      <div className="sidebar__actions-block">
        <span className="sidebar__label">Actions</span>
        <button type="button" className="sidebar-nav__cta" onClick={onNewTopic}>
          + New topic
        </button>
        <button
          type="button"
          className="sidebar-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh feed"
          title="Refresh feed"
        >
          <span className="sidebar-refresh-icon" aria-hidden>
            {loading ? "⋯" : "↻"}
          </span>
          <span className="sidebar-refresh-label">Refresh</span>
        </button>
      </div>
    </aside>
  );
}
