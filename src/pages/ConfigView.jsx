import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Add, Edit2, Lock1, Setting2, Trash } from "iconsax-react";

import { REPROCESS_PASSWORD } from "../utils/passwords";
import { PART_DEFS, EXTRA_PARTS, PART_PREFIX_MAX_LENGTH } from "../utils/genealogyParts";
import {
  fetchAllConfigs,
  saveConfig,
  deleteConfig,
  selectGenealogyConfigList,
  selectGenealogyConfigListLoading,
  selectGenealogyConfigSaving,
} from "../store/slice/genealogyConfigSlice";
import { selectOrderSelected } from "../store/slice/orderSelectedSlice";
import { addEventToGenealogyLog } from "../store/slice/eventsLogSlice";

// Material Embraco de 9 caracteres; puede ser alfanumérico (hay fans con letras).
const MATERIAL_REGEX = /^[A-Z0-9]{9}$/;
// Prefijo esperado de inversor/fan: material Embraco (9) o modelo del
// fabricante (p. ej. AFL25AUHWG04), de largo variable.
const PART_PREFIX_REGEX = new RegExp(`^[A-Z0-9]{1,${PART_PREFIX_MAX_LENGTH}}$`);
const cleanMaterial = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

const emptyForm = {
  material_code: "",
  active: true,
  requires_inverter: false,
  inverter_material: "",
  requires_fan: false,
  fan_material: "",
};

function formatDate(value) {
  if (!value) return { date: "—", time: "" };
  const date = new Date(value);
  if (isNaN(date.getTime())) return { date: "—", time: "" };
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return { date: `${dd}/${mm}/${date.getFullYear()}`, time: `${hh}:${mi}` };
}

// Configuración de genealogía extendida por SKU: qué SKUs (material del
// condensador) exigen escanear inversor y/o fan además del compresor.
// Nota: #root centra el texto y el letter-spacing global es negativo, por eso
// esta vista fija text-left y tracking-normal en los códigos.
function ConfigView() {
  const dispatch = useDispatch();
  const configs = useSelector(selectGenealogyConfigList);
  const loading = useSelector(selectGenealogyConfigListLoading);
  const saving = useSelector(selectGenealogyConfigSaving);
  const orderSelected = useSelector(selectOrderSelected);

  // Candado: la pantalla queda bloqueada hasta validar la contraseña de
  // administrador (misma que Reprocesar en Logs). Solo dura mientras se
  // permanece en la pantalla.
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (unlocked) dispatch(fetchAllConfigs());
  }, [unlocked]);

  // Esc cierra el formulario o la confirmación de eliminación
  useEffect(() => {
    if (!formOpen && !deleteTarget) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setFormOpen(false);
        setDeleteTarget(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [formOpen, deleteTarget]);

  const handleValidatePassword = () => {
    if (passwordInput !== REPROCESS_PASSWORD) {
      setPasswordError(true);
      return;
    }
    setUnlocked(true);
    setPasswordInput("");
    setPasswordError(false);
    dispatch(
      addEventToGenealogyLog({
        text: "Pantalla de configuración de genealogía desbloqueada con contraseña.",
        timestamp: new Date().toISOString(),
      })
    );
  };

  const selectedSku = orderSelected?.matnr?.slice(-9) ?? "";

  function openNew() {
    setForm({ ...emptyForm });
    setFormErrors({});
    setEditing(false);
    setFormOpen(true);
  }

  function openEdit(cfg) {
    setForm({
      material_code: cfg.material_code,
      active: cfg.active !== false,
      requires_inverter: !!cfg.requires_inverter,
      inverter_material: cfg.inverter_material ?? "",
      requires_fan: !!cfg.requires_fan,
      fan_material: cfg.fan_material ?? "",
    });
    setFormErrors({});
    setEditing(true);
    setFormOpen(true);
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validateForm() {
    const errors = {};
    if (!MATERIAL_REGEX.test(form.material_code)) {
      errors.material_code = "El SKU debe tener 9 caracteres (letras o números).";
    }
    EXTRA_PARTS.forEach((k) => {
      const def = PART_DEFS[k];
      if (form[def.requiresKey] && !PART_PREFIX_REGEX.test(form[def.materialKey])) {
        errors[def.materialKey] = `El material/modelo de ${def.label.toLowerCase()} debe tener de 1 a ${PART_PREFIX_MAX_LENGTH} caracteres (letras o números).`;
      }
    });
    if (!form.requires_inverter && !form.requires_fan) {
      errors.parts = "Selecciona al menos una parte adicional (inversor o fan).";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    const payload = {
      material_code: form.material_code.trim(),
      active: form.active,
      requires_inverter: form.requires_inverter,
      inverter_material: form.requires_inverter ? form.inverter_material.trim() : "",
      requires_fan: form.requires_fan,
      fan_material: form.requires_fan ? form.fan_material.trim() : "",
    };
    const ok = await dispatch(saveConfig(payload, editing));
    if (!ok) return;
    dispatch(
      addEventToGenealogyLog({
        text:
          (editing ? "Configuración editada" : "Configuración creada") +
          " para SKU " +
          payload.material_code +
          ": inversor " +
          (payload.requires_inverter ? payload.inverter_material : "no") +
          " | fan " +
          (payload.requires_fan ? payload.fan_material : "no") +
          (payload.active ? "" : " (inactiva)"),
        timestamp: new Date().toISOString(),
      })
    );
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const ok = await dispatch(deleteConfig(deleteTarget.material_code));
    if (ok) {
      dispatch(
        addEventToGenealogyLog({
          text: "Configuración eliminada para SKU " + deleteTarget.material_code,
          timestamp: new Date().toISOString(),
        })
      );
    }
    setDeleteTarget(null);
  }

  const label = "block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5";
  const input =
    "w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400";
  const th = "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-left whitespace-nowrap";
  const mono = "font-mono tracking-normal";
  const activeCount = configs.filter((c) => c.active !== false).length;

  return (
    <div className="text-left px-6 lg:px-10 pt-8 pb-12 w-full">
      {/* Barra superior */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
            <Setting2 size={20} color="#009B4A" variant="Bold" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-tight">Configuración</h1>
            <p className="text-sm text-slate-500">
              SKUs que requieren genealogía extendida (inversor / fan)
            </p>
          </div>
        </div>
        {unlocked && (
          <button
            onClick={openNew}
            className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold inline-flex items-center hover:bg-green-600"
          >
            <Add size={18} className="mr-2" color="#fff" />
            Nuevo SKU
          </button>
        )}
      </div>

      {/* Candado: panel de contraseña hasta desbloquear */}
      {!unlocked ? (
        <section className="rounded-lg border border-slate-200 bg-white py-16 flex justify-center">
          <div className="w-96">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Lock1 size={22} color="#d97706" variant="Bold" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              Ingresa la contraseña de administrador para ver y editar la
              configuración de genealogía.
            </p>
            <label className={label}>Contraseña</label>
            <input
              type="password"
              autoFocus
              className={input}
              placeholder="••••••••"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (passwordError) setPasswordError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleValidatePassword();
                }
              }}
            />
            <div className="h-5 mt-1.5">
              {passwordError && (
                <p className="text-xs text-red-500">Contraseña incorrecta.</p>
              )}
            </div>
            <button
              className="w-full h-10 rounded-md bg-primary text-white text-sm font-semibold hover:bg-green-600"
              onClick={handleValidatePassword}
            >
              Desbloquear
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 h-12 border-b border-slate-200">
            <div className="text-sm text-slate-600 inline-flex items-center">
              <span className="font-semibold text-slate-900">{configs.length}</span>&nbsp;
              {configs.length === 1 ? "SKU configurado" : "SKUs configurados"}
              <span className="text-slate-300 mx-2">·</span>
              <span className="font-semibold text-slate-900">{activeCount}</span>&nbsp;activos
              {loading && (
                <span className="inline-flex items-center ml-3 text-xs text-slate-400">
                  <svg className="animate-spin w-3.5 h-3.5 fill-current text-primary mr-1.5" viewBox="0 0 16 16">
                    <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                  </svg>
                  Actualizando…
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">
              Un SKU sin configuración sigue el flujo estándar (compresor + condensador)
            </span>
          </div>

          <div className="relative overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-40" />
                <col className="w-28" />
                <col />
                <col />
                <col className="w-40" />
                <col className="w-44" />
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={`${th} pl-5`}>SKU</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Inversor</th>
                  <th className={th}>Fan</th>
                  <th className={th}>Actualizado</th>
                  <th className={`${th} pr-5 text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {configs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <Setting2 size={20} color="#94a3b8" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">
                          {loading ? "Cargando configuraciones…" : "No hay SKUs configurados"}
                        </p>
                        {!loading && (
                          <p className="text-xs text-slate-400 mt-1">
                            Usa "Nuevo SKU" para dar de alta el primero.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {configs.map((cfg) => {
                  const updated = formatDate(cfg.updated_at);
                  const isActive = cfg.active !== false;
                  return (
                    <tr key={cfg.material_code} className="odd:bg-white even:bg-slate-50/60 hover:bg-primary/5">
                      <td className="pl-5 pr-4 py-3 align-middle">
                        <span className={`${mono} text-[13px] font-semibold text-slate-900`}>{cfg.material_code}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? "bg-green-500" : "bg-slate-400"}`} />
                          {isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      {EXTRA_PARTS.map((k) => {
                        const def = PART_DEFS[k];
                        const required = !!cfg[def.requiresKey];
                        return (
                          <td key={k} className="px-4 py-3 align-middle">
                            {required ? (
                              <div className="leading-tight">
                                <div className={`${mono} text-[13px] text-slate-900`}>{cfg[def.materialKey] || "—"}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">material esperado</div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">— no requiere</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <div className="text-[13px] text-slate-800 tabular-nums leading-tight">{updated.date}</div>
                        <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">{updated.time}</div>
                      </td>
                      <td className="pl-4 pr-5 py-3 align-middle text-right whitespace-nowrap">
                        <button
                          className="inline-flex items-center h-8 px-2.5 mr-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                          onClick={() => openEdit(cfg)}
                        >
                          <Edit2 size={14} className="mr-1" color="currentColor" /> Editar
                        </button>
                        <button
                          className="inline-flex items-center h-8 px-2.5 text-xs font-medium rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget(cfg)}
                        >
                          <Trash size={14} className="mr-1" color="currentColor" /> Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Formulario de alta / edición */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 text-left">
          <div className="bg-white rounded-lg shadow-2xl w-[32rem] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {editing ? "Editar SKU " + form.material_code : "Nuevo SKU"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                El SKU es el material del condensador: los últimos 9 caracteres del material de la orden.
              </p>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className={label}>SKU (material del condensador)</label>
                <div className="flex space-x-2">
                  <input
                    className={`${input} ${mono}`}
                    placeholder="Ej. 515380042"
                    maxLength={9}
                    disabled={editing}
                    value={form.material_code}
                    onChange={(e) => setField("material_code", cleanMaterial(e.target.value))}
                  />
                  {!editing && selectedSku && (
                    <button
                      type="button"
                      title={"Usar el producto de la orden " + (orderSelected.aufnr ?? "")}
                      className="h-10 whitespace-nowrap px-3 text-xs font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                      onClick={() => setField("material_code", selectedSku)}
                    >
                      Usar orden · {selectedSku}
                    </button>
                  )}
                </div>
                {formErrors.material_code && (
                  <p className="text-xs text-red-500 mt-1.5">{formErrors.material_code}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {EXTRA_PARTS.map((k) => {
                  const def = PART_DEFS[k];
                  const on = !!form[def.requiresKey];
                  return (
                    <div
                      key={k}
                      className={`rounded-md border p-4 ${on ? "border-primary/40 bg-primary/5" : "border-slate-200"}`}
                    >
                      <label className="flex items-center text-sm font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mr-2 accent-[#009B4A]"
                          checked={on}
                          onChange={(e) => setField(def.requiresKey, e.target.checked)}
                        />
                        Requiere {def.label.toLowerCase()}
                      </label>
                      <label className={`${label} mt-3`}>Material o modelo esperado (inicio del código)</label>
                      <input
                        className={`${input} ${mono}`}
                        placeholder={k === "inverter" ? "519301201" : "519700042 o AFL25AUHWG04"}
                        maxLength={PART_PREFIX_MAX_LENGTH}
                        disabled={!on}
                        value={form[def.materialKey]}
                        onChange={(e) => setField(def.materialKey, cleanMaterial(e.target.value))}
                      />
                      {formErrors[def.materialKey] && (
                        <p className="text-xs text-red-500 mt-1.5">{formErrors[def.materialKey]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {formErrors.parts && (
                <p className="text-xs text-red-500 -mt-2">{formErrors.parts}</p>
              )}

              <label className="flex items-center text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 accent-[#009B4A]"
                  checked={form.active}
                  onChange={(e) => setField("active", e.target.checked)}
                />
                Configuración activa
                <span className="text-xs text-slate-400 ml-2">(inactiva = flujo estándar)</span>
              </label>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                className="h-9 px-4 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className="h-9 px-4 text-sm font-semibold rounded-md bg-primary text-white hover:bg-green-600 disabled:opacity-60"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 text-left">
          <div className="bg-white rounded-lg shadow-2xl w-[26rem] overflow-hidden">
            <div className="px-6 py-5">
              <h3 className="text-base font-semibold text-slate-900">Eliminar configuración</h3>
              <p className="text-sm text-slate-500 mt-2">
                El SKU{" "}
                <span className={`${mono} font-semibold text-slate-900`}>{deleteTarget.material_code}</span>{" "}
                volverá al flujo estándar (compresor + condensador). Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                className="h-9 px-4 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className="h-9 px-4 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigView;
