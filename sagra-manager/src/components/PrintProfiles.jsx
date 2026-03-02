import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const copyTypes = [
  { name: "Cucina" },
  { name: "Cliente" },
  { name: "Ritiro Gastronomia" },
  { name: "Ritiro Bar" },
];

const PrintProfiles = () => {
  const [printers, setPrinters] = useState([]);
  const [copiesAssignments, setCopiesAssignments] = useState({});

  useEffect(() => {
    fetchPrinters();
    fetchCopiesSettings();
  }, []);

  const fetchPrinters = async () => {
    try {
      const res = await fetch(`${API_URL}/printers`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      const data = await res.json();
      setPrinters(data);
    } catch (err) {
      console.error("Errore fetch stampanti:", err);
    }
  };

  const fetchCopiesSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/profile/print-settings`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      const data = await res.json();

      const initialAssignments = copyTypes.reduce((acc, ct) => {
        const setting = data.find(d => d.copy_type === ct.name) || {};
        acc[ct.name] = {
          enabled: setting.enabled || false,
          printerName: setting.printer_name || "",
        };
        return acc;
      }, {});

      setCopiesAssignments(initialAssignments);
    } catch (err) {
      console.error("Errore fetch impostazioni copie:", err);
    }
  };

  const updateCopyAssignment = async (copyType, enabled, printerName) => {
    try {
      const res = await fetch(`${API_URL}/profile/print-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ copy_type: copyType, enabled, printer_name: printerName }),
      });

      if (!res.ok) throw new Error("Errore aggiornamento impostazioni stampa");

      setCopiesAssignments(prev => ({
        ...prev,
        [copyType]: { enabled, printerName },
      }));
    } catch (err) {
      console.error("Errore aggiornamento assegnazione copia:", err);
    }
  };

  return (
    <div className="mt-6 p-6 border rounded-lg bg-white dark:bg-gray-800 shadow-lg">
      <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Impostazioni di stampa
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {copyTypes.map(ct => (
          <div key={ct.name} className="flex flex-col gap-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium">{ct.name}</span>
              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={copiesAssignments[ct.name]?.enabled || false}
                  onChange={(e) =>
                    updateCopyAssignment(
                      ct.name,
                      e.target.checked,
                      copiesAssignments[ct.name]?.printerName || ""
                    )
                  }
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-gray-600 peer-checked:bg-blue-600 transition"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition"></div>
              </label>
            </div>

            {/* Dropdown per stampante */}
            <select
              value={copiesAssignments[ct.name]?.printerName || ""}
              disabled={!copiesAssignments[ct.name]?.enabled}
              onChange={(e) =>
                updateCopyAssignment(
                  ct.name,
                  copiesAssignments[ct.name]?.enabled || false,
                  e.target.value
                )
              }
              className={`px-3 py-2 border rounded dark:bg-gray-700 dark:text-gray-100 ${
                !copiesAssignments[ct.name]?.enabled ? "bg-gray-200 dark:bg-gray-600 cursor-not-allowed" : ""
              }`}
            >
              <option value="">Seleziona stampante</option>
              {printers.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrintProfiles;
