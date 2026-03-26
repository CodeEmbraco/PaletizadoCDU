import { createAction, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { endpointsCodes } from './endpointCodes';

const initialState = {
    orderSelected : {},
    metadataOrderSelected: []
}

const orderSelectedSlice = createSlice({
    initialState,
    name: 'orderSelected',
    extraReducers: (builder) => {
    },
    reducers: {
      setOrderSelected: (state, action) => {
        state.orderSelected = action.payload;
      },
      setMetadataOrderSelected: (state, action) => {
        state.metadataOrderSelected = action.payload;
      }
    },
  });

export const {
  setOrderSelected,
  setMetadataOrderSelected
} = orderSelectedSlice.actions;

export const selectOrderSelected = (state) => state.orderSelected.orderSelected;
export const metadataOrderSelected = (state) => state.orderSelected.metadataOrderSelected;

export const getMetadataFromOrder = (idMaterial) => (dispatch) => {
  //dispatch(setLoading(true));
  // const startFetchOrders = {
  //   text: 'Obteniendo órdenes desde SAP',
  //   timestamp: new Date().toISOString(),
  // };
  // dispatch(addEvent(startFetchOrders));

  axios
    .get(`http://10.13.225.20:8001/api/v1/material-metadata?id_material=${idMaterial}`)
    .then((response) => {
      if (response.status === 200) {
        //dispatch(setLoading(false));
        const desiredCaractIDs = [151, 119, 3, 4, 119, 118, 1, 120, 181, 115, 185];
        const selecteCaract = response.data.filter(obj => desiredCaractIDs.includes(obj.ID_CARACTMATERIAL));
        console.log(selecteCaract)
        dispatch(setMetadataOrderSelected(selecteCaract));
      }
    })
    .catch((error) => endpointsCodes(error, dispatch, setNotFound));
};


export default orderSelectedSlice.reducer;