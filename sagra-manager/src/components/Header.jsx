// Header.jsx
import React from "react";
import { Menu, User, LogOut, Settings } from "lucide-react";

const Header = ({ title, toggleSidebar, currentUser, onLogoutClick, onProfileClick, sessionName }) => (
  <header className="flex items-center justify-between px-6 py-4 bg-transparent">
    {/* Titolo e Breadcrumb style */}
    <div className="flex flex-col">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>Sagra Manager</span>
        <span>/</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{sessionName || "Dashboard"}</span>
      </div>
      <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
        {title}
      </h1>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-2 rounded-4xl border border-white/20 shadow-sm">
      {currentUser && (
        <>
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-700 rounded-full shadow-sm">
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] text-white font-bold">
              {currentUser.username[0].toUpperCase()}
            </div>
            <span className="text-sm font-semibold">{currentUser.username}</span>
          </div>

          <button onClick={onProfileClick} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-all">
            <Settings size={20} />
          </button>

          <button onClick={onLogoutClick} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-full transition-all">
            <LogOut size={20} />
          </button>
        </>
      )}
      <button onClick={toggleSidebar} className="md:hidden p-2">
        <Menu />
      </button>
    </div>
  </header>
);

export default Header;