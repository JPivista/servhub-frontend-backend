import { hasPrivilege, resolvePrivileges } from "../constants/privileges";
import rolePrivileges from "../data/rolePrivileges.json";

test("super admin keeps users delete", () => {
  const privileges = resolvePrivileges(
    {
      role: "super_admin",
      privileges: { allow: [], deny: [] },
    },
    rolePrivileges
  );
  expect(hasPrivilege(privileges, "users", "delete")).toBe(true);
  expect(hasPrivilege(privileges, "material_requests", "view")).toBe(true);
  expect(hasPrivilege(privileges, "privileges", "edit")).toBe(true);
});

test("manager can approve material requests", () => {
  const privileges = resolvePrivileges(
    {
      role: "manager",
      privileges: { allow: [], deny: [] },
    },
    rolePrivileges
  );
  expect(hasPrivilege(privileges, "approvals", "approve")).toBe(true);
  expect(hasPrivilege(privileges, "users", "view")).toBe(false);
});

test("requestor can create MRs only", () => {
  const privileges = resolvePrivileges(
    {
      role: "requestor",
      privileges: { allow: [], deny: [] },
    },
    rolePrivileges
  );
  expect(hasPrivilege(privileges, "material_requests", "create")).toBe(true);
  expect(hasPrivilege(privileges, "approvals", "view")).toBe(false);
});

test("workspace user can create material requests", () => {
  const privileges = resolvePrivileges(
    {
      role: "user",
      privileges: { allow: [], deny: [] },
    },
    rolePrivileges
  );
  expect(hasPrivilege(privileges, "material_requests", "create")).toBe(true);
  expect(hasPrivilege(privileges, "users", "view")).toBe(false);
});
