import { useEffect } from "react";

function InvalidOrderModal({ open, orderNumber, material, onDiscard }) {
  useEffect(() => {
    if (!open) return;
    const keyHandler = (e) => {
      if (e.key === "Enter" || e.key === "Escape") onDiscard();
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [open, onDiscard]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(185, 28, 28, 0.97)" }}
      role="alertdialog"
      aria-modal="true"
    >
      <div className="text-center text-white px-8 w-full max-w-5xl">
        <div className="flex justify-center mb-6">
          <svg
            width="160"
            height="160"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1
          className="font-black uppercase tracking-wider mb-4"
          style={{ fontSize: "72px", lineHeight: 1, color: "white" }}
        >
          Orden incompleta
        </h1>

        <p
          className="font-semibold mb-10"
          style={{ fontSize: "28px", color: "white" }}
        >
          La orden no contiene el componente de compresor (tipo &quot;C&quot;).
          <br />
          No es posible trabajar con esta orden hasta que sea corregida en
          SAP.
        </p>

        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="border-4 border-white rounded-lg p-6 bg-red-800">
            <p
              className="uppercase font-bold mb-3"
              style={{ fontSize: "18px", color: "#fecaca" }}
            >
              Orden
            </p>
            <p
              className="font-mono font-black break-all"
              style={{ fontSize: "40px", color: "white" }}
            >
              {orderNumber || "—"}
            </p>
          </div>

          <div className="border-4 border-white rounded-lg p-6 bg-red-800">
            <p
              className="uppercase font-bold mb-3"
              style={{ fontSize: "18px", color: "#fecaca" }}
            >
              Material
            </p>
            <p
              className="font-mono font-black break-all"
              style={{ fontSize: "40px", color: "white" }}
            >
              {material || "—"}
            </p>
          </div>
        </div>

        <button
          onClick={onDiscard}
          className="px-12 py-5 bg-white text-red-700 font-black uppercase rounded-lg hover:bg-red-50 shadow-2xl"
          style={{ fontSize: "32px", letterSpacing: "2px" }}
          autoFocus
        >
          Seleccionar otra orden
        </button>

        <p
          className="mt-6 opacity-80"
          style={{ fontSize: "14px", color: "white" }}
        >
          Presiona Enter o Esc para descartar la orden
        </p>
      </div>
    </div>
  );
}

export default InvalidOrderModal;
