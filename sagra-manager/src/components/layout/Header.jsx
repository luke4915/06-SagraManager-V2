import React from "react";
import { LogOut, Settings, Menu } from "lucide-react";

const Header = ({ toggleSidebar, currentUser, onLogoutClick, onProfileClick, sessionName, wsConnected }) => (
  <header className="flex items-center justify-between px-4 py-3 bg-transparent shrink-0">

    {/* Sinistra: hamburger + breadcrumb */}
    <div className="flex items-center gap-3">
      <button
        onClick={toggleSidebar}
        className="xl:hidden p-2.5 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] rounded-2xl active:scale-95 transition-all"
        aria-label="Menu"
      >
        <Menu size={20} />
      </button>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span className="hidden sm:inline">Stand Manager</span>
          <span className="hidden sm:inline">/</span>
          <span className="font-medium text-[var(--text-main)] truncate max-w-[140px] sm:max-w-none">
            {sessionName || "Dashboard"}
          </span>
        </div>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[var(--text-main)] leading-tight">
          Stand Manager
        </h1>
      </div>
    </div>

    {/* Destra: profilo compatto */}
    {currentUser && (
      <div className="flex items-center gap-1.5 bg-[var(--bg-card)] px-2 py-1.5 rounded-2xl border border-[var(--border)] shadow-sm">
        {/* Avatar + status — sempre visibile */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-card-2)] rounded-full">
          <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] text-white font-bold shrink-0">
            {currentUser.username[0].toUpperCase()}
          </div>
          {/* Username — nascosto su schermi molto piccoli */}
          <span className="hidden sm:block text-sm font-semibold text-[var(--text-main)]">
            {currentUser.username}
          </span>
          <span
            title={wsConnected ? 'Connesso' : 'Non raggiungibile'}
            className={`w-2 h-2 rounded-full shrink-0 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
        </div>
        <button
          onClick={onProfileClick}
          className="p-2 hover:bg-[var(--bg-card-2)] rounded-full transition-all text-[var(--text-muted)] hover:text-[var(--text-main)] min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={onLogoutClick}
          className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <LogOut size={18} />
        </button>
      </div>
    )}
  </header>
);

export default Header;