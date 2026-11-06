// Catálogo de partes de la genealogía y validación de los códigos escaneados.
//
// Formatos reales (el escáner emite material Embraco de 9 dígitos + serial):
//   Condensador  515380042826MHTNC      (17)
//   Fan          519700042GC6QL8W7      (17, DataMatrix)
//   Inversor     5193012017000000123    (19 dígitos, código de barras Code128)
//   Inversor     519601201766863300L0   (20, serial alfanumérico, otro modelo)
// El serial cambia de largo y de formato según el modelo, así que solo se
// exige material de 9 dígitos + serial alfanumérico; la validación fuerte es
// el material contra la configuración del SKU.
// El DataMatrix del inversor NO trae serial (ej. "FMX51930999925/10/22") y
// por eso se rechaza: empieza con letras.

export const PART_DEFS = {
  compressor: { label: "Compresor", placeholder: "Escanea compresor" },
  inverter: {
    label: "Inversor",
    placeholder: "Escanea inversor",
    regex: /^\d{9}[A-Z0-9]{4,}$/,
    formatHint: "material de 9 dígitos seguido del serial (código de barras)",
    requiresKey: "requires_inverter",
    materialKey: "inverter_material",
  },
  fan: {
    label: "Fan",
    placeholder: "Escanea fan",
    regex: /^\d{9}[A-Z0-9]{4,}$/,
    formatHint: "material de 9 dígitos seguido del serial (DataMatrix)",
    requiresKey: "requires_fan",
    materialKey: "fan_material",
  },
  condenser: { label: "Condensador", placeholder: "Escanea condensador" },
};

// Partes adicionales (las que dependen de la configuración por SKU).
export const EXTRA_PARTS = ["inverter", "fan"];

// Material Embraco de 9 chars: el matnr de SAP trae ceros a la izquierda.
export const normalizeMaterial = (material) =>
  String(material ?? "").trim().slice(-9);

// En todos los escaneos el material va en los primeros 9 caracteres.
export const materialOf = (code) => String(code ?? "").slice(0, 9);

export const isConfigActive = (config) => !!config && config.active !== false;

// Lista ordenada de partes a escanear para la configuración dada.
// Sin configuración (o inactiva) es el flujo clásico: compresor + condensador.
export const requiredParts = (config) => [
  "compressor",
  ...EXTRA_PARTS.filter(
    (k) => isConfigActive(config) && config[PART_DEFS[k].requiresKey]
  ),
  "condenser",
];

// Auto-detección SOLO de inversor/fan por el material del escaneo; compresor
// y condensador se siguen resolviendo por el paso activo (flujo clásico).
export const resolvePart = (code, activeMode, config) => {
  if (!isConfigActive(config)) return activeMode;
  const scannedMaterial = materialOf(code);
  for (const k of EXTRA_PARTS) {
    const def = PART_DEFS[k];
    if (
      config[def.requiresKey] &&
      scannedMaterial === normalizeMaterial(config[def.materialKey])
    ) {
      return k;
    }
  }
  return activeMode;
};

// Valida el formato y el material de una parte adicional contra la configuración.
// Devuelve { ok: true } o { ok: false, reason, expected, scanned, hint }.
export const validatePart = (part, code, config) => {
  const def = PART_DEFS[part];
  if (!def?.regex) return { ok: true };

  const expected = normalizeMaterial(config?.[def.materialKey]);
  const scanned = materialOf(code);

  if (part === "inverter" && /^[A-Z]/i.test(code)) {
    return {
      ok: false,
      reason: "datamatrix",
      expected,
      scanned,
      hint:
        "Parece el DataMatrix del inversor, que no trae el serial. Escanea el código de barras de la etiqueta.",
    };
  }
  if (!def.regex.test(code)) {
    return {
      ok: false,
      reason: "format",
      expected,
      scanned,
      hint: `Formato inválido: se esperaban ${def.formatHint}.`,
    };
  }
  if (expected && scanned !== expected) {
    return { ok: false, reason: "material", expected, scanned, hint: "" };
  }
  return { ok: true };
};
