import { createSlice } from "@reduxjs/toolkit";
import { loadJson, saveJson } from "../services/storage";

const SETTINGS_KEY = "servhub_settings_v1";
const defaultSettings = { orgName: "ServHub", theme: "day" };

function loadSettings() {
  return { ...defaultSettings, ...(loadJson(SETTINGS_KEY) || {}) };
}

function uniqueUsers(users) {
  const seen = new Set();
  return (users || []).filter((user) => {
    const key = String(user?.email || user?.id || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const directorySlice = createSlice({
  name: "directory",
  initialState: {
    users: [],
    roles: [],
    departments: [],
    rolePrivileges: {},
    departmentPrivileges: {},
    collections: {},
    settings: loadSettings(),
  },
  reducers: {
    setDirectory(state, action) {
      const { users, roles, rolePrivileges, departments, departmentPrivileges } = action.payload || {};
      if (Array.isArray(users)) state.users = uniqueUsers(users);
      if (roles) state.roles = roles;
      if (rolePrivileges) state.rolePrivileges = rolePrivileges;
      if (Array.isArray(departments)) {
        state.departments = departments.filter((item) => item.key !== "testing");
      }
      if (departmentPrivileges) state.departmentPrivileges = departmentPrivileges;
    },
    saveUser(state, action) {
      const user = action.payload;
      const index = state.users.findIndex((item) => item.id === user.id);
      if (index >= 0) state.users[index] = user;
      else state.users.push(user);
      state.users = uniqueUsers(state.users);
    },
    deleteUser(state, action) {
      state.users = state.users.filter((item) => item.id !== action.payload);
    },
    saveRole(state, action) {
      const { role, previousKey, privileges } = action.payload;
      const index = state.roles.findIndex((item) => item.id === role.id);
      if (index >= 0) {
        const oldKey = previousKey || state.roles[index].key;
        state.roles[index] = role;
        if (oldKey !== role.key) {
          state.rolePrivileges[role.key] = privileges || state.rolePrivileges[oldKey] || {};
          delete state.rolePrivileges[oldKey];
          state.users.forEach((user) => {
            if (user.role === oldKey) user.role = role.key;
          });
        } else if (privileges) {
          state.rolePrivileges[role.key] = privileges;
        }
      } else {
        state.roles.push(role);
        state.rolePrivileges[role.key] = privileges || { dashboard: ["view"] };
      }
    },
    deleteRole(state, action) {
      const role = state.roles.find((item) => item.id === action.payload);
      if (!role) return;
      state.roles = state.roles.filter((item) => item.id !== role.id);
      delete state.rolePrivileges[role.key];
    },
    saveRecord(state, action) {
      const { collection, record } = action.payload;
      if (!state.collections[collection]) state.collections[collection] = [];
      const list = state.collections[collection];
      const index = list.findIndex((item) => item.id === record.id);
      if (index >= 0) list[index] = record;
      else list.push(record);
    },
    deleteRecord(state, action) {
      const { collection, id } = action.payload;
      if (!state.collections[collection]) return;
      state.collections[collection] = state.collections[collection].filter((item) => item.id !== id);
    },
    saveSettings(state, action) {
      state.settings = { ...state.settings, ...action.payload };
      saveJson(SETTINGS_KEY, state.settings);
    },
  },
});

export const {
  setDirectory,
  saveUser,
  deleteUser,
  saveRole,
  deleteRole,
  saveRecord,
  deleteRecord,
  saveSettings,
} = directorySlice.actions;
export default directorySlice.reducer;
