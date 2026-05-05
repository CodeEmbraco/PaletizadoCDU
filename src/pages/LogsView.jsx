import { useState } from "react";
import { Code } from "iconsax-react";
import LogsTable from "../partials/logs/LogsTable";

const DEV_PASSWORD = "dev1234";

function LogsView() {
  const [devModeActive, setDevModeActive] = useState(
    () => localStorage.getItem("devMode") === "true"
  );
  const [devPasswordInput, setDevPasswordInput] = useState("");
  const [devPasswordModalOpen, setDevPasswordModalOpen] = useState(false);

  const activateDevMode = () => {
    localStorage.setItem("devMode", "true");
    setDevModeActive(true);
  };
  const deactivateDevMode = () => {
    localStorage.removeItem("devMode");
    setDevModeActive(false);
  };

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-2 w-full max-w-10xl mx-auto">
        <div className="max-w-full mx-4 py-0 sm:mx-auto sm:px-6 lg:px-4">
          <header>
            <div className="mt-8">
              <div className="flex items-center justify-between h-16 -mb-px">
                <h3 className="text-black text-2xl capitalize font-semibold text-gray-400 tracking-tight">
                  Logs
                </h3>
                <button
                  onClick={() => {
                    if (devModeActive) {
                      deactivateDevMode();
                    } else {
                      setDevPasswordInput("");
                      setDevPasswordModalOpen(true);
                    }
                  }}
                  title="Modo desarrollador"
                  className={`border rounded w-10 h-12 flex items-center justify-center ${
                    devModeActive
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-300"
                  }`}
                >
                  <Code size={18} color={devModeActive ? "#d97706" : "#94a3b8"} />
                </button>
              </div>
            </div>
          </header>
        </div>
        <LogsTable devMode={devModeActive} />
      </div>

      {devPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Modo desarrollador</h3>
            <p className="text-sm text-slate-500 mb-4">Ingresa la contraseña para activar.</p>
            <input
              type="password"
              autoFocus
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3 outline-none focus:border-amber-400"
              placeholder="Contraseña"
              value={devPasswordInput}
              onChange={(e) => setDevPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (devPasswordInput === DEV_PASSWORD) {
                    activateDevMode();
                    setDevPasswordModalOpen(false);
                  } else {
                    setDevPasswordInput("");
                  }
                }
                if (e.key === "Escape") setDevPasswordModalOpen(false);
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50"
                onClick={() => setDevPasswordModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-amber-400 text-white rounded hover:bg-amber-500"
                onClick={() => {
                  if (devPasswordInput === DEV_PASSWORD) {
                    activateDevMode();
                    setDevPasswordModalOpen(false);
                  } else {
                    setDevPasswordInput("");
                  }
                }}
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LogsView;
