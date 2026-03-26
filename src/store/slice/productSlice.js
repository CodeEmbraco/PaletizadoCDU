import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    selectedProduct: null,
    selectedAccessories: null,
    qrCode: ''
};

const productSlice = createSlice({
    name: 'product',
    initialState,
    reducers: {
        setSelectedAccessories(state, action){
            state.selectedAccessories = action.payload;
        },

        setSelectedProduct(state, action) {
            state.selectedProduct = action.payload;
        },
        addSerial(state, action) {
            state.qrCode += `${action.payload}|`;
        },
        clearQRCode(state, action){
            state.qrCode = '';
        }
    }
});


export const { setSelectedProduct, addSerial, clearQRCode } = productSlice.actions;
export const { setSelectedAccessories, addSerialAccessories } = productSlice.actions;
export const selectSelectedProduct = (state) => state.product.selectedProduct;
export const selectSelectedAccessories = (state) => state.product.selectedAccessories;
export const selectQrCode = (state) => state.product.qrCode;

export default productSlice.reducer;
