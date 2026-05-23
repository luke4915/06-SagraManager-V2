import React from 'react';
import { LayoutDashboard, UtensilsCrossed, BarChart3, Settings, Database, ChevronLeft, ChevronRight } from 'lucide-react';

const Sidebar = ({ view, setView, isOpen, toggleSidebar, currentUser }) => {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Cassa', roles: ['admin', 'cassa'] },
    { id: 'kitchen', icon: <UtensilsCrossed size={20} />, label: 'Cucina', roles: ['admin', 'cucina'] },
    { id: 'statistics', icon: <BarChart3 size={20} />, label: 'Stats', roles: ['admin'] },
    { id: 'config', icon: <Database size={20} />, label: 'Menu', roles: ['admin'] },
    { id: 'setup', icon: <Settings size={20} />, label: 'Sistema', roles: ['admin', 'cassa'] },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-white dark:bg-[#16181d] border-r border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out z-50 flex flex-col items-center py-6 ${isOpen ? 'w-64' : 'w-20'}`}>

      {/* Logo Uniformato */}
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/20 mb-10 flex-shrink-0">
        S
      </div>

      <nav className="flex-1 w-full px-3 space-y-2">
        {menuItems.filter(item => item.roles.includes(currentUser?.role)).map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center p-3.5 rounded-xl transition-all relative group
              ${view === item.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            <span className={`ml-4 font-black uppercase text-[10px] tracking-widest transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
              {isOpen && item.label}
            </span>
          </button>
        ))}
      </nav>

      <button onClick={toggleSidebar} className="mt-auto p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>
    </aside>
  );
};

export default Sidebar;