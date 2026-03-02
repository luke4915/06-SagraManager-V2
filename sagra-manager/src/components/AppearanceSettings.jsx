import React from 'react';

const AppearanceSettings = ({ theme, setTheme }) => {
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex items-center justify-between transition-colors duration-500 ease-in-out h-12 mt-4">
      <h2 className="text font-semibold text-gray-900 dark:text-gray-100">
        Tema dell’app
      </h2>

      <div className="flex items-center gap-2">
        <span className="text-gray-700 dark:text-gray-300 text-sm">Chiaro</span>

        <button
          onClick={toggleTheme}
          className={`relative w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-500
            ${theme === 'dark' ? 'bg-gray-600 justify-end' : 'bg-blue-500 justify-start'}`}
        >
          <div className={`absolute w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-500 ease-in-out`}></div>
        </button>

        <span className="text-gray-700 dark:text-gray-300 text-sm">Scuro</span>
      </div>
    </div>
  );
};

export default AppearanceSettings;
