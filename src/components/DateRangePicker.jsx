import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft2, ArrowRight2, Calendar } from "iconsax-react";

// Selector de rango de fechas propio (sin dependencias). Trabaja con cadenas
// ISO "AAAA-MM-DD" en hora local; el calendario está en español.
//
// Props:
//   from, to      → "AAAA-MM-DD" o ""
//   onChange      → ({ from, to }) => void
//   maxDays       → máximo de días del rango (incluyendo ambos extremos)
//   className     → clases extra del botón disparador

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const pad = (n) => String(n).padStart(2, "0");
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const diffDays = (a, b) => Math.round((b - a) / 86400000);
const sameDay = (a, b) => a && b && toISO(a) === toISO(b);
const formatShort = (s) => {
  const d = fromISO(s);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "";
};

function buildPresets(maxDays) {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthStart = new Date(t.getFullYear(), t.getMonth(), 1);
  const span = Math.min(maxDays, 7);
  return [
    { label: "Hoy", from: t, to: t },
    { label: "Ayer", from: addDays(t, -1), to: addDays(t, -1) },
    { label: `Últimos ${span} días`, from: addDays(t, -(span - 1)), to: t },
    { label: "Este mes", from: monthStart, to: t },
  ];
}

function DateRangePicker({ from, to, onChange, maxDays = 31, className = "" }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = fromISO(from) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  // Mientras se elige el fin: fecha de inicio ya pulsada y día bajo el cursor
  const [pendingStart, setPendingStart] = useState(null);
  const [hoverDay, setHoverDay] = useState(null);
  const rootRef = useRef(null);

  const fromDate = fromISO(from);
  const toDate = fromISO(to);
  const presets = useMemo(() => buildPresets(maxDays), [maxDays]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setPendingStart(null);
    setHoverDay(null);
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    const base = fromDate ?? new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  }

  function applyRange(a, b) {
    const [s, e] = a <= b ? [a, b] : [b, a];
    onChange({ from: toISO(s), to: toISO(e) });
    close();
  }

  function handleDayClick(day) {
    if (!pendingStart) {
      setPendingStart(day);
      return;
    }
    if (isDisabled(day)) return;
    applyRange(pendingStart, day);
  }

  // Al elegir el fin, no se permite exceder maxDays desde el inicio pulsado
  function isDisabled(day) {
    if (!pendingStart) return false;
    return Math.abs(diffDays(pendingStart, day)) >= maxDays;
  }

  // Rango que se pinta: el confirmado, o el provisional mientras se elige el fin
  const previewStart = pendingStart ?? fromDate;
  const previewEnd = pendingStart ? hoverDay ?? pendingStart : toDate;
  const [rangeA, rangeB] =
    previewStart && previewEnd && previewStart > previewEnd
      ? [previewEnd, previewStart]
      : [previewStart, previewEnd];

  const grid = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [viewMonth]);

  const today = new Date();
  const label =
    from && to
      ? from === to
        ? formatShort(from)
        : `${formatShort(from)} — ${formatShort(to)}`
      : "Selecciona un rango";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={`w-full h-10 rounded-md border bg-white px-3 text-sm text-left inline-flex items-center justify-between outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          open ? "border-primary ring-2 ring-primary/20" : "border-slate-300"
        } ${className}`}
      >
        <span className={`inline-flex items-center ${from && to ? "text-slate-900" : "text-slate-400"}`}>
          <Calendar size={16} className="mr-2" color="#64748b" />
          <span className="tabular-nums">{label}</span>
        </span>
        <span className="text-slate-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-slate-200 rounded-lg shadow-xl flex text-left">
          {/* Atajos */}
          <div className="w-40 border-r border-slate-200 py-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary"
                onClick={() => applyRange(p.from, p.to)}
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-slate-200 mt-2 pt-2">
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                onClick={() => {
                  onChange({ from: "", to: "" });
                  close();
                }}
              >
                Sin fechas
              </button>
            </div>
          </div>

          {/* Calendario */}
          <div className="p-3 w-72">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                aria-label="Mes anterior"
              >
                <ArrowLeft2 size={14} color="#334155" />
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </span>
              <button
                type="button"
                className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                aria-label="Mes siguiente"
              >
                <ArrowRight2 size={14} color="#334155" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {grid.map((day) => {
                const inMonth = day.getMonth() === viewMonth.getMonth();
                const isStart = sameDay(day, rangeA);
                const isEnd = sameDay(day, rangeB);
                const inRange = rangeA && rangeB && day > rangeA && day < rangeB;
                const disabled = isDisabled(day);
                const isToday = sameDay(day, today);
                return (
                  <button
                    key={toISO(day)}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => pendingStart && setHoverDay(day)}
                    className={[
                      "h-9 text-sm tabular-nums relative",
                      inRange ? "bg-primary/10" : "",
                      isStart ? "rounded-l-md" : "",
                      isEnd ? "rounded-r-md" : "",
                      isStart || isEnd ? "bg-primary text-white font-semibold" : "",
                      !isStart && !isEnd && !inRange ? "hover:bg-slate-100 rounded-md" : "",
                      !inMonth && !isStart && !isEnd ? "text-slate-300" : "",
                      inMonth && !isStart && !isEnd ? "text-slate-700" : "",
                      disabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : "",
                    ].join(" ")}
                  >
                    {day.getDate()}
                    {isToday && !isStart && !isEnd && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 mt-2 h-4">
              {pendingStart
                ? `Inicio ${formatShort(toISO(pendingStart))} · elige el fin (máx. ${maxDays} días)`
                : "Haz clic en el día de inicio y luego en el de fin"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
