import React from 'react';
import { LayoutDashboard, UtensilsCrossed, BarChart3, Settings, Database, ChevronLeft, ChevronRight, Power } from 'lucide-react';

const Sidebar = ({ view, setView, isOpen, toggleSidebar, currentUser, sessionActive, setSessionActive }) => {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={24} />, label: 'Cassa', roles: ['admin', 'cassa'] },
    { id: 'kitchen', icon: <UtensilsCrossed size={24} />, label: 'Cucina', roles: ['admin', 'cucina'] },
    { id: 'statistics', icon: <BarChart3 size={24} />, label: 'Stats', roles: ['admin'] },
    { id: 'config', icon: <Database size={24} />, label: 'Menu', roles: ['admin'] },
    { id: 'setup', icon: <Settings size={24} />, label: 'Sistema', roles: ['admin', 'cassa'] },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-[var(--bg-card)] border-r border-[var(--border)] transition-all duration-500 ease-in-out z-50 flex flex-col items-center py-8 ${isOpen ? 'w-64' : 'w-20'}`}>

      <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-orange-500/30 mb-12">S</div>

      <nav className="flex-1 w-full px-3 space-y-4">
        {menuItems.filter(item => item.roles.includes(currentUser?.role)).map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center p-4 rounded-3xl transition-all relative group
              ${view === item.id ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/40' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-2)] hover:text-[var(--text-main)]'}`}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            <span className={`ml-4 font-black uppercase text-xs tracking-widest transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
              {isOpen && item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* MODIFICA LOGICA: Interruttore di Sessione Interattivo */}
      <div className="w-full px-3 mb-2">
        <button
          onClick={() => setSessionActive(prev => !prev)}
          className={`w-full flex items-center p-4 rounded-3xl transition-all border ${sessionActive
              ? 'bg-green-50 dark:bg-green-950/10 border-green-500/30 text-green-500'
              : 'bg-red-50 dark:bg-red-950/10 border-red-500/30 text-red-500'
            }`}
        >
          <div className="flex-shrink-0">
            <Power size={20} />
          </div>
          <span className={`ml-4 font-black uppercase text-xs tracking-widest transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {isOpen && (sessionActive ? 'Chiudi Sess.' : 'Apri Sess.')}
          </span>
        </button>
      </div>

      <button onClick={toggleSidebar} className="mt-auto p-4 text-gray-400 hover:text-orange-500 transition-colors">
        {isOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>
    </aside>
  );
};

export default Sidebar;