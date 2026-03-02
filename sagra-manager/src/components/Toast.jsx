import { useEffect, useState } from 'react';

const Toast = ({ message, type = 'success', duration = 2000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // attende dissolvenza prima di rimuovere
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Colori per tipo
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type] || 'bg-gray-500';

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded shadow-lg transform transition-all duration-300 ease-in-out z-[50]
        max-w-xs whitespace-nowrap overflow-hidden
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {message}
    </div>
  );
};

export default Toast;
