import React from "react";
import { LogOut, Settings } from "lucide-react";

const Header = ({ title, toggleSidebar, currentUser, onLogoutClick, onProfileClick, sessionName }) => (
  <header className="flex items-center justify-between px-6 py-4 bg-transparent">
    <div className="flex flex-col">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span>Sagra Manager</span>
        <span>/</span>
        <span className="font-medium text-[var(--text-main)]">{sessionName || "Dashboard"}</span>
      </div>
      <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">{title}</h1>
    </div>
    <div className="flex items-center gap-3 bg-[var(--bg-card)] p-2 rounded-4xl border border-[var(--border)] shadow-sm transition-[background-color,border-color] duration-300">
      {currentUser && (
        <>
          <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-card-2)] rounded-full transition-colors duration-300">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] text-white font-bold">
              {currentUser.username[0].toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-[var(--text-main)]">{currentUser.username}</span>
          </div>
          <button onClick={onProfileClick} className="p-2 hover:bg-[var(--bg-card-2)] rounded-full transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <Settings size={20} />
          </button>
          <button onClick={onLogoutClick} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-full transition-all">
            <LogOut size={20} />
          </button>
        </>
      )}
    </div>
  </header>
);

export default Header;
