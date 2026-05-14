import { createAction, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { endpointsCodes } from './endpointCodes';
import { notifyError, notifyErrorInSAP, notifyGenealogyNotFound, notifyProductAlreadyMounted, notifyProductMounted, notifyProductUnmounted, notifyProductsJoined, notifySuccesInSAP } from '../../partials/paletization/Toasts';
import { tailwindConfig } from '../../utils/Utils';
import { API_BASE } from '../../utils/apiBase';

const initialState = {
    pallet: {},
    components : [],
    componentsJoined: false,
    genealogyData: {},
    loadingProcessInSap: false,
    palletNotified: {},
    componentsCount: 0,
    componentsInOrderList: [],
    logs: [],
    chartDataOrderProgress: {
        labels: [
          ''
        ],
        datasets: [
          // Blue bars
          {
            label: 'Planeado',
            data: [
              0
            ],
            backgroundColor: tailwindConfig().theme.colors.blue[500],
            hoverBackgroundColor: tailwindConfig().theme.colors.indigo[600],
            categoryPercentage: 0.66,
          },
          // Light blue bars
          {
            label: 'Apuntado',
            data: [
              0
            ],
            backgroundColor: tailwindConfig().theme.colors.sky[400],
            hoverBackgroundColor: tailwindConfig().theme.colors.sky[500],
            categoryPercentage: 0.66,
          },
          {
            label: 'Realizado',
            data: [
              0,
            ],
            backgroundColor: '#009B4A',
            hoverBackgroundColor: '#009B4A',
            categoryPercentage: 0.66,
          },
        ],
    }
}

const palletsSlice = createSlice({
    initialState,
    name: 'pallets',
    extraReducers: (builder) => {
    },
    reducers: {
        setPallet: (state, action) => {
          state.pallet = action.payload;
        },
        setComponents: (state, action) => {
          state.components = action.payload;
        },
        setNotFound: (state, action) => {
            state.notFound = action.payload;
          },
        unmountComponent: (state, action) => {
            const component = action.payload;
            state.components = state.components.filter((component) => component.id !== component.id);
           
        },
        setComponentsJoined: (state, action) => {
          state.componentsJoined = action.payload;
        },
        setGenealogyData: (state, action) => {
          state.genealogyData = action.payload;
        },
        setLoadingProcessInSap: (state, action) => {
          state.loadingProcessInSap = action.payload;
        },
        setPalletNotified: (state, action) => {
          state.palletNotified = action.payload;
        },
        setComponentsCount: (state, action) => {
          state.componentsCount = action.payload;
        },
        setComponentsInOrderList: (state, action) => {
          state.componentsInOrderList = action.payload;
        },
        setChartDataOrderProgress: (state, action) => {
          state.chartDataOrderProgress = action.payload;
        }
      },
});

export const {
    setPallet,
    setComponents,
    unmountComponent,
    setComponentsJoined,
    setGenealogyData,
    setLoadingProcessInSap,
    setPalletNotified,
    setComponentsCount,
    setComponentsInOrderList,
    setChartDataOrderProgress
  } = palletsSlice.actions;
  

export const selectPallet = (state) => state.pallets.pallet;

export const selectComponents = (state) => state.pallets.components;

export const selectComponentsJoined = (state) => state.pallets.componentsJoined;

export const selectGenealogyData = (state) => state.pallets.genealogyData;

export const selectLoadingProcessInSap = (state) => state.pallets.loadingProcessInSap;

export const selectPalletNotified = (state) => state.pallets.palletNotified;

export const selectComponentsCount = (state) => state.pallets.componentsCount;

export const selectComponentsInOrderList = (state) => state.pallets.componentsInOrderList;

export const selectChartDataOrderProgress = (state) => state.pallets.chartDataProgress;

export const selectLogs = (state) => state.pallets.logs;

export default palletsSlice.reducer;

export const joinComponents = (payload) => (dispatch) => {
 
  axios
    .post(`${API_BASE()}/api/v1/genealogy/component/`, payload)
    .then((response) => {
      if (response.status === 201) {
        notifyProductsJoined(payload.condenser_unit_serial)
        dispatch(setComponentsJoined(true));
        dispatch(countComponentsJoinedInOrder(payload.order));
        dispatch(componentsInOrderList(payload.order));
        
      } 
    })
    .catch((error) => {
      if (error.response.status === 404) {
      } else if (error.response.status == 400){
        dispatch(setComponentsJoined(true));
        dispatch(notifyProductsJoined(payload.condenser_unit_serial));
      }
      console.log(error.response.status);
      // Manejo de errores, si es necesario
    });
    
};

export const countComponentsJoinedInOrder = (order) => (dispatch) => {

  axios
    .get(`${API_BASE()}/api/v1/genealogy/component/?order=${order}&mode=count`,)
    .then((response) => {
      if (response.status === 200) {
        console.log(response.data.total);

        if('total' in response.data){
          dispatch(setComponentsCount(response.data.total));
        }
        
      } 
    })
    .catch((error) => {
      if (error.response.status === 404) {
      } else if (error.response.status == 400){
      }
      console.log(error.response.status);
      // Manejo de errores, si es necesario
    });
    
};

export const componentsInOrderList = (order) => (dispatch) => {

  axios
    .get(`${API_BASE()}/api/v1/genealogy/component/?order=${order}&mode=list`,)
    .then((response) => {
      if (response.status === 200) {
        console.log(response.data);

        if(response.data.length > 0) {
          dispatch(setComponentsInOrderList(response.data));
        }
        
      } 
    })
    .catch((error) => {
      if (error.response.status === 404) {
      } else if (error.response.status == 400){
      }
      console.log(error.response.status);
      // Manejo de errores, si es necesario
    });
    
};

export const getCompressor = (condenserSerial) => async (dispatch) => {
  try {
    console.log("Validando condenser serial");
    const response = await axios.get(`${API_BASE()}/api/v1/genealogy/component/?condenser_unit_serial=${condenserSerial}`);
    if (response.status === 200) {
      // dispatch(setGenealogyData(response.data));
      // dispatch(setComponentsJoined(true));
      return response.data;
    } else if (response.status === 404) {
      console.log("No se encontró genealogía");
      notifyGenealogyNotFound(condenserSerial);
    }
  } catch (error) {
    console.log("Error al obtener la genealogía", error);
    notifyGenealogyNotFound(condenserSerial);
    // Manejo de errores, si es necesario
  }
};


export const createPallet = (order, barcode, product, quantity) => (dispatch) => {
    //dispatch(setLoading(true));
    // const startFetchOrders = {
    //   text: 'Obteniendo órdenes desde SAP',
    //   timestamp: new Date().toISOString(),
    // };
    // dispatch(addEvent(startFetchOrders));
    const palletData = {
        workstation: "MXCDU01",
        order: order,
        identifier: barcode,
        product: product,
        quantity: quantity
    }
    axios
      .post(`${API_BASE()}/api/v1/paletization/pallets/`, palletData)
      .then((response) => {
        if (response.status === 201) {
          console.log("Pallet creado con éxito:", response.data);
          dispatch(setPallet(response.data));
        } else if (response.status === 200){
          console.log("Se encontró registro de Pallet:", response.data);
          dispatch(setPallet(response.data));
          const palletIdentifier = response.data.identifier;
          dispatch(getAllComponents(palletIdentifier));
        }
        const pallet = response.data;
        if (pallet?.send_to_sap && pallet?.sap_success) {
          dispatch(setPalletNotified({ ICharg: pallet.identifier }));
        } else {
          dispatch(setPalletNotified({}));
        }
      })
      .catch((error) => endpointsCodes(error, dispatch, setNotFound));
  };

  export const getAllComponents = (palletIdentifier) => (dispatch) => {
    //dispatch(setLoading(true));
    // const startFetchOrders = {
    //   text: 'Obteniendo órdenes desde SAP',
    //   timestamp: new Date().toISOString(),
    // };
    // dispatch(addEvent(startFetchOrders));
    axios
     .get(`${API_BASE()}/api/v1/paletization/pallets/${palletIdentifier}/components/`)
     .then((response) => {
        if (response.status === 200) {
          //dispatch(setLoading(false));
          console.log(response.data);
          dispatch(setComponents(response.data));
          //console.log(response.data.global_status);
          //dispatch(setGlobalStatus(response.data.global_status));
        }
      })
     .catch((error) => endpointsCodes(error, dispatch, setNotFound));
  }

  export const mountComponent = (payload) => (dispatch) => {
    const palletId = payload.palette;
    const data = {
            pallet_id: payload.palette,
            condenser_unit_serial: payload.condenser,
            condenser_material_code: payload.condenserMaterial,
            compressor_unit_serial: payload.compressor,
            compressor_material_code: payload.compressorMaterial,
            material_type: "-"
    }
    console.log("Montando componente + ", data);
    axios
      .post(`${API_BASE()}/api/v1/paletization/pallets/${palletId}/components/add/`, data)
      .then((response) => {
        console.log(response.status);
        console.log("MANDANDO A ACTUALIZAR LOS COMPONENTS")
        if (response.status === 201) {
            notifyProductMounted(payload.condenser)
            dispatch(getAllComponents(palletId));
        } else if (response.status === 400){
          console.log(response.status);
          notifyProductAlreadyMounted();
        }
        else {
          console.log(response.status)
          dispatch(setError('Hubo un error al montar el componente.'));
        }
      })
      .catch((error) => {
        // Manejo de errores, si es necesario
        console.log(error)
        if(error.response.status === 400) {
          notifyProductAlreadyMounted();
        }
      });
      
  };
  

  export const unmountComponentAPI = (palletIdentifier, component) => (dispatch) => {
    // Realiza una solicitud DELETE para desmontar el componente
    axios
      .delete(`${API_BASE()}/api/v1/paletization/pallets/${palletIdentifier}/components/${component.id}/dismount/`)
      .then((response) => {
        if (response.status === 204) {
            notifyProductUnmounted(component.compUnitSerial);
          // La solicitud DELETE se completó con éxito (código de estado 204)
          // Actualiza la lista de componentes
          dispatch(getAllComponents(palletIdentifier));
        }
      })
      .catch((error) => {
        // Maneja los errores, como lo hiciste anteriormente
        endpointsCodes(error, dispatch, setNotFound);
      });
  };

  export const getLogs = () => (dispatch) => {
    //dispatch(setLoading(true));
    // const startFetchOrders = {
    //   text: 'Obteniendo órdenes desde SAP',
    //   timestamp: new Date().toISOString(),
    // };
    // dispatch(addEvent(startFetchOrders));
    axios
     .get(`${API_BASE()}/api/v1/paletization/logs/?workstation=MXCDU01&page=1&page_size=10`)
     .then((response) => {
        if (response.status === 200) {
          //dispatch(setLoading(false));
          console.log(response.data);
          dispatch(setLogs(response.data));
          //console.log(response.data.global_status);
          //dispatch(setGlobalStatus(response.data.global_status));
        }
      })
     .catch((error) => endpointsCodes(error, dispatch, setNotFound));
  }

  export const reprocessPallet = (palletIdentifier, qty, interfaceVal, fase, complemento) => async (dispatch) => {
    const data = {
      pallet: palletIdentifier,
      qty,
      ...(interfaceVal !== undefined && { interface: interfaceVal }),
      ...(fase !== undefined && { fase }),
      ...(complemento !== undefined && { complemento }),
    }
    try {
      const response = await axios.post(`${API_BASE()}/api/v1/paletization/reprocess/`, data);
      dispatch(setLoadingProcessInSap(false));
      if (response.status === 200) {
        if (response.data.EMessage === "Process Notification executed successfully") {
          notifySuccesInSAP(palletIdentifier, response.data.EMessage);
          dispatch(addEventToPaletizationLog({
            text: "Pallet notificado: " + palletIdentifier,
            timestamp: new Date().toISOString(),
          }));
          dispatch(setPalletNotified({ ICharg: palletIdentifier }));
        } else {
          notifyErrorInSAP(palletIdentifier, response.data.EMessage);
        }
      }
    } catch (error) {
      notifyErrorInSAP(palletIdentifier, error.message);
      endpointsCodes(error, dispatch, setNotFound);
    }
  };

  export const processInSAP = (orderSelected, pallet, components) => async (dispatch) => {
    dispatch(setLoadingProcessInSap(true));
    const currentDatetime = new Date();
    const currentDate = currentDatetime.toISOString().split('T')[0];
    const currentTime = currentDatetime.toLocaleTimeString('en-US', { hour12: false });
    const ItJsonInst = components.filter((component) => !component.send_to_sap).map((component) => ({
      sernr: component.condenser_unit_serial.slice(-8),
      serfi: component.compressor_unit_serial.slice(-8),
      matnr: component.condenser_material_code,
      matfi: component.compressor_material_code,
      tipo: "S"
    }));

    const xmlData = {
      IArbpl: "MXCDU01",
      IAufnr: orderSelected.aufnr,
      IMatnrDestino: orderSelected.matnr.slice(-9),
      ICharg: pallet.identifier,
      IDataProd: currentDate,
      IHoraProd: currentTime,
      IQuantProd: ItJsonInst.length,
      INumin: "F",
      ItJsonInst: ItJsonInst
    };

    try {
      const response = await axios.post(`${API_BASE()}/api/v1/paletization/pallets/sap/notifiy/`, xmlData);
      if (response.status === 200) {
        if (response.data.EMessage === "Process Notification executed successfully") {
          notifySuccesInSAP(xmlData.ICharg, response.data.EMessage);
          dispatch(setPalletNotified({ ICharg: xmlData.ICharg }));
          dispatch(getAllComponents(pallet.identifier));
        } else {
          notifyErrorInSAP(xmlData.ICharg, response.data.EMessage);
        }
      }
    } catch (error) {
      console.log(error);
      notifyErrorInSAP(xmlData.ICharg, error.message);
    } finally {
      dispatch(setLoadingProcessInSap(false));
    }
  }