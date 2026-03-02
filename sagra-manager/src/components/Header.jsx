import React from "react";
import { X, Menu, User } from "lucide-react";

const Header = ({ title, toggleSidebar, isSidebarOpen, currentUser, onLogoutClick, onProfileClick, sessionName }) => (
  <div className="flex items-stretch gap-2">

    {/* Hamburger separato */}
    <div className="flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700
      rounded-xl shadow-md">
      <button
        onClick={toggleSidebar}
        className="p-1 w-8 h-8 rounded hover:bg-gray-700 transition-colors"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>

    {/* Header vero e proprio */}
    <header className="flex-1 flex items-center justify-between bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700
      shadow-md rounded-xl px-4 h-12">
      <h1 className="text-xl font-bold">
        {sessionName ? `Sagra Manager – ${sessionName}` : title}
      </h1>

      {currentUser && (
        <div className="flex items-center gap-4">
          <span className="font-medium">{currentUser.username}</span>

          <button
            onClick={onProfileClick}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <User size={22} />
          </button>

          <button
            onClick={onLogoutClick}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-white font-semibold transition-all"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  </div>
);

export default Header;
