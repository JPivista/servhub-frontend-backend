import { createSlice } from "@reduxjs/toolkit";

function withPayment(record, status) {
  if (status === "Ordered" || status === "PO Issued") {
    return { ...record, status, paymentStatus: "Open", supplier: record.supplier || "OfficeMart" };
  }
  if (status === "Delivered" || status === "Closed") {
    return { ...record, status, paymentStatus: "Released" };
  }
  return { ...record, status };
}

const workflowSlice = createSlice({
  name: "workflow",
  initialState: {
    materialRequests: [],
    suppliers: [],
  },
  reducers: {
    setMaterialRequests(state, action) {
      state.materialRequests = Array.isArray(action.payload) ? action.payload : [];
    },
    saveMaterialRequest(state, action) {
      const record = action.payload;
      const index = state.materialRequests.findIndex((item) => item.id === record.id);
      if (index >= 0) state.materialRequests[index] = record;
      else state.materialRequests.unshift(record);
    },
    updateMaterialStatus(state, action) {
      const { id, status } = action.payload;
      const index = state.materialRequests.findIndex((item) => item.id === id);
      if (index < 0) return;
      state.materialRequests[index] = withPayment(state.materialRequests[index], status);
    },
    deleteMaterialRequest(state, action) {
      state.materialRequests = state.materialRequests.filter((item) => item.id !== action.payload);
    },
    setSuppliers(state, action) {
      state.suppliers = Array.isArray(action.payload) ? action.payload : [];
    },
    saveSupplier(state, action) {
      const record = action.payload;
      const index = state.suppliers.findIndex((item) => item.id === record.id);
      if (index >= 0) state.suppliers[index] = record;
      else state.suppliers.push(record);
    },
  },
});

export const {
  setMaterialRequests,
  saveMaterialRequest,
  updateMaterialStatus,
  deleteMaterialRequest,
  setSuppliers,
  saveSupplier,
} = workflowSlice.actions;
export default workflowSlice.reducer;
