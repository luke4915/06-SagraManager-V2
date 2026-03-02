import React from 'react';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';

const AppearanceSettings = ({ theme, setTheme, isSoundEnabled, setIsSoundEnabled }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black tracking-tighter">IMPOSTAZIONI</h2>
        <p className="text-gray-500 font-medium uppercase text-xs tracking-widest">Personalizza la tua esperienza di cassa</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Tema */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-5xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start mb-10">
            <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-indigo-500 text-white' : 'bg-yellow-400 text-gray-900'}`}>
              {theme === 'dark' ? <Moon size={32} /> : <Sun size={32} />}
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`w-16 h-8 rounded-full relative transition-all ${theme === 'dark' ? 'bg-orange-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-9' : 'left-1'}`} />
            </button>
          </div>
          <h3 className="text-xl font-black mb-2">MODALITÀ {theme === 'dark' ? 'NOTTE' : 'GIORNO'}</h3>
          <p className="text-sm text-gray-500">Ottimizza la visibilità in base alle luci della sagra.</p>
        </div>

        {/* Card Audio */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-5xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start mb-10">
            <div className={`p-4 rounded-3xl ${isSoundEnabled ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
              {isSoundEnabled ? <Volume2 size={32} /> : <VolumeX size={32} />}
            </div>
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`w-16 h-8 rounded-full relative transition-all ${isSoundEnabled ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isSoundEnabled ? 'left-9' : 'left-1'}`} />
            </button>
          </div>
          <h3 className="text-xl font-black mb-2">FEEDBACK AUDIO</h3>
          <p className="text-sm text-gray-500">Riproduce un suono al tocco dei prodotti e all'invio ordine.</p>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;