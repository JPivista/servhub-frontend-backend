export const PRIVILEGE_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "approve",
  "reject",
];

export function resolvePrivileges(user, catalog = {}, departmentCatalog = {}) {
  const privileges = JSON.parse(
    JSON.stringify({
      ...(catalog[user.role] || {}),
    })
  );

  const departmentMap =
    user.role === "admin" ? departmentCatalog[user.department] || {} : {};
  Object.entries(departmentMap).forEach(([moduleKey, actions]) => {
    if (!privileges[moduleKey]) privileges[moduleKey] = [];
    (actions || []).forEach((action) => {
      if (action && !privileges[moduleKey].includes(action)) privileges[moduleKey].push(action);
    });
  });

  (user.privileges?.allow || []).forEach((item) => {
    const [moduleKey, action] = item.split(".");
    if (!moduleKey || !action) return;
    if (!privileges[moduleKey]) privileges[moduleKey] = [];
    if (!privileges[moduleKey].includes(action)) {
      privileges[moduleKey].push(action);
    }
  });

  (user.privileges?.deny || []).forEach((item) => {
    const [moduleKey, action] = item.split(".");
    if (!moduleKey || !action || !privileges[moduleKey]) return;
    privileges[moduleKey] = privileges[moduleKey].filter(
      (value) => value !== action
    );
  });

  return privileges;
}

export function hasPrivilege(privileges, moduleKey, action = "view") {
  return Boolean(privileges?.[moduleKey]?.includes(action));
}

export function togglePrivilege(privileges, moduleKey, action) {
  const next = JSON.parse(JSON.stringify(privileges || {}));
  const current = next[moduleKey] || [];
  next[moduleKey] = current.includes(action)
    ? current.filter((item) => item !== action)
    : [...current, action];
  if (next[moduleKey].length === 0) delete next[moduleKey];
  return next;
}
