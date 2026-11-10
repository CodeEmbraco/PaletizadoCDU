// Catálogo de partes de la genealogía y validación de los códigos escaneados.
//
// Formatos reales (el escáner emite un prefijo + serial):
//   Condensador  515380042826MHTNC          (material 9 + serial 8)
//   Fan          519700042GC6QL8W7          (material 9 + serial 8, DataMatrix)
//   Fan          AFL25AUHWG046107F76R0809   (modelo 12 + serial 12, otro modelo)
//   Inversor     5193012017000000123        (material 9 + serial 10, Code128)
//   Inversor     519601201766863300L0       (material 9 + serial 11, otro modelo)
// El prefijo normalmente es el material Embraco de 9, pero hay fans cuya
// etiqueta trae el modelo del fabricante, y el serial cambia de largo y de
// formato según el modelo. Por eso el "material esperado" configurado para
// inversor/fan es un prefijo alfanumérico de largo variable (hasta 20) y la
// validación fuerte es que el código escaneado empiece con ese prefijo.
// El DataMatrix del inversor NO trae serial (ej. "FMX51930999925/10/22") y
// por eso se rechaza: empieza con letras.

export const PART_DEFS = {
  compressor: { label: "Compresor", placeholder: "Escanea compresor" },
  inverter: {
    label: "Inversor",
    placeholder: "Escanea inversor",
    regex: /^[A-Z0-9]{2,}$/,
    formatHint: "material/modelo configurado seguido del serial (código de barras)",
    requiresKey: "requires_inverter",
    materialKey: "inverter_material",
  },
  fan: {
    label: "Fan",
    placeholder: "Escanea fan",
    regex: /^[A-Z0-9]{2,}$/,
    formatHint: "material/modelo configurado seguido del serial (DataMatrix)",
    requiresKey: "requires_fan",
    materialKey: "fan_material",
  },
  condenser: { label: "Condensador", placeholder: "Escanea condensador" },
};

// Partes adicionales (las que dependen de la configuración por SKU).
export const EXTRA_PARTS = ["inverter", "fan"];

// Material Embraco de 9 chars (SKU): el matnr de SAP trae ceros a la izquierda.
export const normalizeMaterial = (material) =>
  String(material ?? "").trim().slice(-9);

// Prefijo configurado para inversor/fan: se compara completo, sin recortar.
export const PART_PREFIX_MAX_LENGTH = 20;
export const normalizePartPrefix = (prefix) =>
  String(prefix ?? "").trim().toUpperCase();

// Inicio del código escaneado, del largo del prefijo esperado (9 por defecto).
export const materialOf = (code, expected = "") =>
  String(code ?? "").slice(0, normalizePartPrefix(expected).length || 9);

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
  for (const k of EXTRA_PARTS) {
    const def = PART_DEFS[k];
    const expected = normalizePartPrefix(config[def.materialKey]);
    if (
      config[def.requiresKey] &&
      expected &&
      String(code ?? "").startsWith(expected)
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

  const expected = normalizePartPrefix(config?.[def.materialKey]);
  const scanned = materialOf(code, expected);

  // DataMatrix del inversor: "FMX" + material + fecha con diagonales. No se
  // puede usar "empieza con letra" porque un material puede ser alfanumérico.
  if (part === "inverter" && (/^FMX/i.test(code) || code.includes("/"))) {
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
  // Después del prefijo debe venir el serial (al menos un carácter).
  if (expected && code.length <= expected.length) {
    return {
      ok: false,
      reason: "format",
      expected,
      scanned,
      hint: `Formato inválido: el código trae el material/modelo ${expected} pero no el serial.`,
    };
  }
  return { ok: true };
};
