import { createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_BASE } from '../../utils/apiBase';
import { notifyError, notifyConfigSaved, notifyConfigDeleted } from '../../partials/paletization/Toasts';

// Configuración de genealogía extendida por SKU (material del condensador).
// configBySku es una caché: undefined = no consultado, null = sin configuración (404).
// loading = consulta por SKU (Genealogía); listLoading = listado completo
// (pantalla de Configuración). Van separados para que no se pisen.
const initialState = {
    configBySku: {},
    list: [],
    loading: false,
    listLoading: false,
    saving: false,
}

// Evita que un backend inalcanzable deje la UI "cargando" indefinidamente.
const REQUEST_TIMEOUT_MS = 10000;

const genealogyConfigSlice = createSlice({
    initialState,
    name: 'genealogyConfig',
    reducers: {
        setConfigForSku: (state, action) => {
          const { sku, config } = action.payload;
          state.configBySku[sku] = config;
        },
        setConfigLoading: (state, action) => {
          state.loading = action.payload;
        },
        setConfigListLoading: (state, action) => {
          state.listLoading = action.payload;
        },
        setConfigList: (state, action) => {
          state.list = action.payload;
          // Mantener la caché coherente con el listado completo
          action.payload.forEach((cfg) => {
            state.configBySku[cfg.material_code] = cfg;
          });
        },
        setConfigSaving: (state, action) => {
          state.saving = action.payload;
        },
      },
});

export const {
    setConfigForSku,
    setConfigLoading,
    setConfigListLoading,
    setConfigList,
    setConfigSaving,
  } = genealogyConfigSlice.actions;

export const selectGenealogyConfigBySku = (state) => state.genealogyConfig.configBySku;
export const selectGenealogyConfigList = (state) => state.genealogyConfig.list;
export const selectGenealogyConfigLoading = (state) => state.genealogyConfig.loading;
export const selectGenealogyConfigListLoading = (state) => state.genealogyConfig.listLoading;
export const selectGenealogyConfigSaving = (state) => state.genealogyConfig.saving;

export default genealogyConfigSlice.reducer;

const configUrl = (materialCode) =>
  materialCode
    ? `${API_BASE()}/api/v1/genealogy/config/${materialCode}/`
    : `${API_BASE()}/api/v1/genealogy/config/`;

const errorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  // Errores de validación del serializer: { campo: ["msg"] }
  const first = Object.entries(data)[0];
  if (first) return `${first[0]}: ${[].concat(first[1]).join(' ')}`;
  return fallback;
};

// Consulta la configuración del SKU de la orden seleccionada. No repite la
// consulta si ya está en caché (incluido null); un error de red no se cachea
// para que el siguiente intento vuelva a preguntar.
export const fetchGenealogyConfig = (sku) => async (dispatch, getState) => {
  if (!sku) return;
  if (sku in getState().genealogyConfig.configBySku) return;
  dispatch(setConfigLoading(true));
  try {
    const response = await axios.get(`${API_BASE()}/api/v1/genealogy/config/`, {
      params: { material: sku },
      timeout: REQUEST_TIMEOUT_MS,
    });
    dispatch(setConfigForSku({ sku, config: response.data }));
  } catch (error) {
    if (error?.response?.status === 404) {
      dispatch(setConfigForSku({ sku, config: null }));
    } else {
      console.log('Error al consultar configuración de genealogía', error);
      notifyError('No se pudo consultar la configuración de genealogía del SKU ' + sku);
    }
  } finally {
    dispatch(setConfigLoading(false));
  }
};

export const fetchAllConfigs = () => async (dispatch) => {
  dispatch(setConfigListLoading(true));
  try {
    const response = await axios.get(`${API_BASE()}/api/v1/genealogy/config/`, {
      timeout: REQUEST_TIMEOUT_MS,
    });
    dispatch(setConfigList(Array.isArray(response.data) ? response.data : []));
  } catch (error) {
    console.log('Error al listar configuraciones de genealogía', error);
    notifyError('No se pudo obtener el listado de configuraciones.');
  } finally {
    dispatch(setConfigListLoading(false));
  }
};

// Alta (POST) o edición (PUT) según exista ya el SKU. Devuelve true si se guardó.
export const saveConfig = (data, isEdit) => async (dispatch) => {
  dispatch(setConfigSaving(true));
  try {
    const response = isEdit
      ? await axios.put(configUrl(data.material_code), data, { timeout: REQUEST_TIMEOUT_MS })
      : await axios.post(configUrl(), data, { timeout: REQUEST_TIMEOUT_MS });
    dispatch(setConfigForSku({ sku: response.data.material_code, config: response.data }));
    notifyConfigSaved(response.data.material_code);
    await dispatch(fetchAllConfigs());
    return true;
  } catch (error) {
    console.log('Error al guardar configuración de genealogía', error);
    notifyError(errorMessage(error, 'No se pudo guardar la configuración.'));
    return false;
  } finally {
    dispatch(setConfigSaving(false));
  }
};

export const deleteConfig = (materialCode) => async (dispatch) => {
  dispatch(setConfigSaving(true));
  try {
    await axios.delete(configUrl(materialCode), { timeout: REQUEST_TIMEOUT_MS });
    dispatch(setConfigForSku({ sku: materialCode, config: null }));
    notifyConfigDeleted(materialCode);
    await dispatch(fetchAllConfigs());
    return true;
  } catch (error) {
    console.log('Error al eliminar configuración de genealogía', error);
    notifyError(errorMessage(error, 'No se pudo eliminar la configuración.'));
    return false;
  } finally {
    dispatch(setConfigSaving(false));
  }
};
