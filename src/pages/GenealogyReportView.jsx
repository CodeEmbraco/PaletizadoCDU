import { useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowLeft2,
  ArrowRight2,
  DocumentDownload,
  DocumentText,
  SearchNormal1,
} from "iconsax-react";

import { API_BASE } from "../utils/apiBase";
import { notifyError } from "../partials/paletization/Toasts";
import DateRangePicker from "../components/DateRangePicker";

// Columnas del CSV (clave en la respuesta del back → encabezado).
const CSV_COLUMNS = [
  ["order", "Orden"],
  ["condenser_material_code", "Material UC"],
  ["condenser_unit_serial", "Serial UC"],
  ["compressor_material_code", "Material compresor"],
  ["compressor_unit_serial", "Serial compresor"],
  ["inverter_material", "Material inversor"],
  ["inverter_serial", "Serial inversor"],
  ["fan_material", "Material fan"],
  ["fan_serial", "Serial fan"],
  ["datetime_created", "Fecha de genealogía"],
];

// Partes mostradas en la tabla: serial + material en una misma celda.
const PART_COLUMNS = [
  { key: "condenser", label: "Unidad condensadora", serial: "condenser_unit_serial", material: "condenser_material_code" },
  { key: "compressor", label: "Compresor", serial: "compressor_unit_serial", material: "compressor_material_code" },
  { key: "inverter", label: "Inversor", serial: "inverter_serial", material: "inverter_material" },
  { key: "fan", label: "Fan", serial: "fan_serial", material: "fan_material" },
];

const PAGE_SIZES = [25, 50, 100];

function formatDateTime(value) {
  if (!value) return { date: "—", time: "" };
  const date = new Date(value);
  if (isNaN(date.getTime())) return { date: value, time: "" };
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return { date: `${dd}/${mm}/${date.getFullYear()}`, time: `${hh}:${mi}:${ss}` };
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Reporte del detalle de genealogía (compresor + inversor + fan por unidad
// condensadora). Solo lectura; consulta GET /api/v1/genealogy/report/.
// Nota: #root centra el texto y el letter-spacing global es negativo, por eso
// esta vista fija text-left y tracking-normal en las celdas monoespaciadas.
function GenealogyReportView() {
  const [order, setOrder] = useState("");
  const [serial, setSerial] = useState("");
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(null);
  const [generatedAt, setGeneratedAt] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const hasFilter =
    order.trim() !== "" || serial.trim() !== "" || (dateFrom && dateTo);

  async function handleSearch() {
    if (!hasFilter) {
      notifyError("Indica una orden, un serial o un rango de fechas.");
      return;
    }
    if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
      notifyError("Indica fecha inicial y fecha final.");
      return;
    }
    const params = {};
    if (order.trim()) params.order = order.trim();
    if (serial.trim()) params.serial = serial.trim();
    if (dateFrom && dateTo) {
      params.date_from = dateFrom;
      params.date_to = dateTo;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE()}/api/v1/genealogy/report/`, { params });
      const results = Array.isArray(response.data?.results) ? response.data.results : [];
      setRows(results);
      setCount(response.data?.count ?? results.length);
      setGeneratedAt(response.data?.generated_at ?? "");
      setPage(1);
    } catch (error) {
      const data = error?.response?.data;
      notifyError(data?.msg || data?.error || "No se pudo consultar el reporte.");
      setRows([]);
      setCount(null);
      setGeneratedAt("");
    } finally {
      setLoading(false);
    }
  }

  // CSV con BOM y ';' para que Excel en español lo abra directo.
  function handleExport() {
    if (rows.length === 0) return;
    const escape = (v) => {
      const s = v == null ? "" : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = CSV_COLUMNS.map(([, label]) => label).join(";");
    const body = rows
      .map((r) =>
        CSV_COLUMNS.map(([key]) => {
          if (key === "datetime_created") {
            const { date, time } = formatDateTime(r[key]);
            return escape(time ? `${date} ${time}` : date);
          }
          return escape(r[key]);
        }).join(";")
      )
      .join("\n");
    const blob = new Blob(["﻿" + header + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genealogia_${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const withParts = useMemo(
    () => rows.filter((r) => r.inverter_serial || r.fan_serial).length,
    [rows]
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstRow = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRow = Math.min(currentPage * pageSize, rows.length);
  const generated = formatDateTime(generatedAt);

  const label = "block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5";
  const input =
    "w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400";
  const th = "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-left whitespace-nowrap";
  const mono = "font-mono tracking-normal";

  return (
    <div className="text-left px-6 lg:px-10 pt-8 pb-12 w-full">
      {/* Barra superior */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
            <DocumentText size={20} color="#009B4A" variant="Bold" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-tight">
              Reporte de genealogía
            </h1>
            <p className="text-sm text-slate-500">
              Compresor, inversor y fan unidos a cada unidad condensadora
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="h-10 px-4 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 inline-flex items-center hover:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
        >
          <DocumentDownload size={18} className="mr-2" color="currentColor" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-3 items-end">
          <div className="col-span-2 md:col-span-2">
            <label className={label}>Orden</label>
            <input
              className={input}
              placeholder="Ej. 1000123"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className={label}>Serial (UC, compresor, inversor o fan)</label>
            <input
              className={`${input} ${mono}`}
              placeholder="Ej. 515380042826MHTNC"
              value={serial}
              onChange={(e) => setSerial(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className={label}>Rango de fechas (hora de planta)</label>
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              maxDays={31}
              onChange={({ from, to }) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
          </div>
          <div className="col-span-2 md:col-span-3">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full h-10 rounded-md bg-primary text-white text-sm font-semibold inline-flex items-center justify-center hover:bg-green-600 disabled:opacity-60"
            >
              <SearchNormal1 size={16} className="mr-2" color="#fff" />
              {loading ? "Consultando…" : "Buscar"}
            </button>
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {/* Cabecera de la tabla: resumen + paginación */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-slate-200 bg-white">
          <div className="flex items-center text-sm text-slate-600 space-x-3">
            {count === null ? (
              <span className="text-slate-400">Sin consulta</span>
            ) : (
              <>
                <span>
                  <span className="font-semibold text-slate-900">{count}</span>{" "}
                  {count === 1 ? "unidad" : "unidades"}
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  <span className="font-semibold text-slate-900">{withParts}</span> con inversor / fan
                </span>
                {generatedAt && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">
                      generado {generated.date} {generated.time}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center text-sm text-slate-600 space-x-3">
            <select
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-primary"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n} por página</option>
              ))}
            </select>
            <span className="text-xs text-slate-500 tabular-nums">
              {firstRow}–{lastRow} de {rows.length}
            </span>
            <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
              <button
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                aria-label="Página anterior"
              >
                <ArrowLeft2 size={14} color="#334155" />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center border-l border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                aria-label="Página siguiente"
              >
                <ArrowRight2 size={14} color="#334155" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-12" />
              <col className="w-36" />
              <col />
              <col />
              <col />
              <col />
              <col className="w-32" />
            </colgroup>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={`${th} pl-5`}>#</th>
                <th className={th}>Orden</th>
                {PART_COLUMNS.map((c) => (
                  <th key={c.key} className={th}>{c.label}</th>
                ))}
                <th className={`${th} pr-5`}>Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={PART_COLUMNS.length + 3} className="px-5 py-16">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <SearchNormal1 size={20} color="#94a3b8" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {count === null ? "Sin resultados todavía" : "Sin resultados para los filtros indicados"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {count === null
                          ? "Captura una orden, un serial o un rango de fechas y presiona Buscar."
                          : "Prueba con otro rango de fechas, orden o serial."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {pageRows.map((r, i) => {
                const { date, time } = formatDateTime(r.datetime_created);
                const n = (currentPage - 1) * pageSize + i + 1;
                return (
                  <tr key={r.id ?? `${r.condenser_unit_serial}-${n}`} className="odd:bg-white even:bg-slate-50/60 hover:bg-primary/5">
                    <td className="pl-5 pr-4 py-3 text-xs text-slate-400 tabular-nums align-middle">{n}</td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`${mono} text-[13px] font-medium text-slate-800`}>{r.order || "—"}</span>
                    </td>
                    {PART_COLUMNS.map((c) => {
                      const s = r[c.serial];
                      const m = r[c.material];
                      return (
                        <td key={c.key} className="px-4 py-3 align-middle">
                          {s ? (
                            <div className="leading-tight">
                              <div className={`${mono} text-[13px] text-slate-900 truncate`} title={s}>{s}</div>
                              <div className={`${mono} text-[11px] text-slate-400 mt-0.5`}>{m || "—"}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">— no aplica</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="pl-4 pr-5 py-3 align-middle whitespace-nowrap">
                      <div className="text-[13px] text-slate-800 tabular-nums leading-tight">{date}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">{time}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <svg className="animate-spin w-6 h-6 fill-current text-primary" viewBox="0 0 16 16">
                <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
              </svg>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default GenealogyReportView;
