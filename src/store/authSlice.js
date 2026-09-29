import { createSlice } from "@reduxjs/toolkit";
import { api, getToken, setToken } from "../services/api";
import { clearJson, loadJson, saveJson } from "../services/storage";
import { setDirectory } from "./directorySlice";
import { setMaterialRequests, setSuppliers } from "./workflowSlice";

const STORAGE_KEY = "servhub_auth_v4";

function loadAuth() {
  return loadJson(STORAGE_KEY);
}

const saved = loadAuth();

const initialState = {
  user: saved?.user || null,
  role: saved?.role || null,
  privileges: saved?.privileges || {},
  error: null,
  loading: false,
};

function persist(state) {
  saveJson(STORAGE_KEY, {
    user: state.user,
    role: state.role,
    privileges: state.privileges,
  });
}

function applySession(state, payload) {
  state.user = payload.user;
  state.role = payload.role;
  state.privileges = payload.privileges || {};
  state.error = null;
  persist(state);
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      applySession(state, action.payload);
    },
    loginFailed(state, action) {
      state.loading = false;
      state.error = action.payload || "Invalid email or password";
    },
    logout(state) {
      state.user = null;
      state.role = null;
      state.privileges = {};
      state.error = null;
      state.loading = false;
      setToken("");
      clearJson(STORAGE_KEY);
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const { sessionStart, loginSuccess, loginFailed, logout, clearError } = authSlice.actions;

function applyDirectory(dispatch, directory) {
  if (directory) dispatch(setDirectory(directory));
}

export const signOut = () => (dispatch) => {
  dispatch(logout());
  dispatch(
    setDirectory({
      users: [],
      roles: [],
      departments: [],
      rolePrivileges: {},
      departmentPrivileges: {},
    })
  );
  dispatch(setMaterialRequests([]));
  dispatch(setSuppliers([]));
};

export const login = ({ email, password }) => async (dispatch) => {
  dispatch(sessionStart());
  try {
    const data = await api.post("/auth/login", { email, password });
    setToken(data.token);
    dispatch(loginSuccess(data));
    applyDirectory(dispatch, data.directory);
  } catch (error) {
    dispatch(loginFailed(error.message));
  }
};

export const restoreSession = () => async (dispatch) => {
  if (!getToken()) return;
  try {
    const data = await api.get("/auth/me");
    dispatch(loginSuccess(data));
    applyDirectory(dispatch, data.directory);
  } catch {
    dispatch(signOut());
  }
};

export const syncCurrentUser = () => async (dispatch) => {
  if (!getToken()) return;
  try {
    const data = await api.get("/auth/me");
    dispatch(loginSuccess(data));
    applyDirectory(dispatch, data.directory);
  } catch {
    dispatch(signOut());
  }
};

export const refreshDirectory = () => async (dispatch) => {
  const data = await api.get("/auth/directory");
  applyDirectory(dispatch, data);
  return data;
};

export default authSlice.reducer;
