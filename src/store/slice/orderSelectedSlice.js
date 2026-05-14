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
        const desiredCaractIDs = [1, 3, 4, 115, 118, 119, 120, 151, 181, 185, 299];
        const selecteCaract = response.data.filter(obj => desiredCaractIDs.includes(obj.ID_CARACTMATERIAL));
        console.log(selecteCaract)
        dispatch(setMetadataOrderSelected(selecteCaract));
      }
    })
    .catch((error) => endpointsCodes(error, dispatch, setNotFound));
};


export default orderSelectedSlice.reducer;