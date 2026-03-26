import { createAction, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { endpointsCodes } from './endpointCodes';

const initialState = {
    globalStatus : '',
    testResults : []
}

const testResultsSlice = createSlice({
    initialState,
    name: 'testResults',
    extraReducers: (builder) => {
    },
    reducers: {
        setTestResults: (state, action) => {
          console.log("Setting test results")
          state.testResults = action.payload;
        },
        setGlobalStatus: (state, action) => {
            state.globalStatus = action.payload;
          }
      },
});

export const {
    setTestResults,
    setGlobalStatus
  } = testResultsSlice.actions;
  

export const selectTestResults = (state) => state.testResults.testResults;

export const selectGlobalStatus = (state) => state.testResults.globalStatus;

export default testResultsSlice.reducer;

export const getTestResults = (barcode) => (dispatch) => {
    //dispatch(setLoading(true));
    // const startFetchOrders = {
    //   text: 'Obteniendo órdenes desde SAP',
    //   timestamp: new Date().toISOString(),
    // };
    // dispatch(addEvent(startFetchOrders));
    axios
      .get('http://em10vs0010.embraco.com:8001/api/v1/test-result?barcode='+barcode)
      .then((response) => {
        if (response.status === 200) {
          //dispatch(setLoading(false));
          //console.log(response.data);
          dispatch(setTestResults(response.data.results));
          console.log(response.data.global_status);
          dispatch(setGlobalStatus(response.data.global_status));
        }
      })
      .catch((error) => endpointsCodes(error, dispatch, setNotFound));
  };
  