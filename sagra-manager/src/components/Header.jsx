import React from "react";
import { LogOut, Settings, Menu } from "lucide-react"; // Aggiunto Menu

const Header = ({ title, toggleSidebar, isSidebarOpen, currentUser, onLogoutClick, onProfileClick, sessionName, wsConnected }) => (
  <header className="flex items-center justify-between px-6 py-4 bg-transparent">

    {/* Contenitore di sinistra: allinea l'hamburger e i testi su mobile */}
    <div className="flex items-center gap-4">

      {/* ☰ TOGGLE SIDEBAR MOBILE: Visibile solo sotto il breakpoint xl (xl:hidden) */}
      <button
        onClick={toggleSidebar}
        className="xl:hidden p-2.5 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] rounded-2xl active:scale-95 transition-all shadow-xs"
        aria-label="Apri menu"
      >
        <Menu size={22} />
      </button>

      {/* Blocco testi originale */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span>Sagra Manager</span>
          <span>/</span>
          <span className="font-medium text-[var(--text-main)]">{sessionName || "Dashboard"}</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">{title}</h1>
      </div>

    </div>

    {/* Contenitore di destra: Profilo e Logout (Identico al tuo) */}
    <div className="flex items-center gap-3 bg-[var(--bg-card)] p-2 rounded-4xl border border-[var(--border)] shadow-sm transition-[background-color,border-color] duration-300">
      {currentUser && (
        <>
          <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-card-2)] rounded-full transition-colors duration-300">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] text-white font-bold">
              {currentUser.username[0].toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-[var(--text-main)]">{currentUser.username}</span>
            <span
              title={wsConnected ? 'Server connesso' : 'Server non raggiungibile'}
              className={`w-2 h-2 rounded-full shrink-0 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
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