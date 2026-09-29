import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { refreshDirectory, syncCurrentUser } from "../../store/authSlice";
import { setDirectory } from "../../store/directorySlice";
import { api } from "../../services/api";
import { hasPrivilege } from "../../constants/privileges";
import { assignableRoles, usersHomeHref } from "../../features/users/userRoutes";
import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";
import RolePrivilegePicker from "../../features/users/RolePrivilegePicker";
import { fieldClass, ghostBtn, primaryBtn } from "../../components/ui/formStyles";
import { generatePassword } from "../../utils/password";

export default function UserForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const users = useSelector((state) => state.directory.users);
  const departments = useSelector((state) => state.directory.departments);
  const rolePrivileges = useSelector((state) => state.directory.rolePrivileges);
  const actorRole = useSelector((state) => state.auth.role?.key);
  const actorDepartment = useSelector((state) => state.auth.user?.department);
  const privileges = useSelector((state) => state.auth.privileges);
  const isEdit = Boolean(id);
  const isSuperAdmin = actorRole === "super_admin";
  const canCreate = hasPrivilege(privileges, "users", "create");
  const canEdit = hasPrivilege(privileges, "users", "edit");
  const roleOptions = assignableRoles(actorRole);
  const presetRole = params.get("role");
  const existing = users.find((item) => item.id === id);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [privilegeMode, setPrivilegeMode] = useState("default");
  const [newDepartment, setNewDepartment] = useState("");
  const [quota, setQuota] = useState(null);
  const departmentOptions = departments;

  useEffect(() => {
    if (isEdit || isSuperAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/users/create-quota");
        if (!cancelled) setQuota(data);
      } catch {
        if (!cancelled) setQuota(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, isSuperAdmin]);

  useEffect(() => {
    dispatch(refreshDirectory());
    (async () => {
      try {
        const data = await api.get("/departments");
        dispatch(setDirectory({ departments: data.departments || [] }));
      } catch (err) {
        setError(err.message || "Failed to load departments");
      }
    })();
  }, [dispatch]);

  useEffect(() => {
    const options = assignableRoles(actorRole);
    if (isEdit) {
      if (!existing) return;
      const extras = existing.privileges || { allow: [], deny: [] };
      setPrivilegeMode(extras.allow?.length || extras.deny?.length ? "custom" : "default");
      setForm({
        name: existing.name,
        email: existing.email,
        password: "",
        role: existing.role || "requestor",
        department: existing.department || actorDepartment || departmentOptions[0]?.key || "",
        privileges: extras,
        userCreateLimit: existing.userCreateLimit ?? 5,
      });
      return;
    }
    const fallback = options[0]?.key || "requestor";
    const role = options.some((item) => item.key === presetRole) ? presetRole : fallback;
    const department = isSuperAdmin
      ? departmentOptions[0]?.key || ""
      : actorDepartment || departmentOptions[0]?.key || "";
    setForm((prev) => {
      if (prev) return { ...prev, department: prev.department || department };
      return {
        name: "",
        email: "",
        password: generatePassword(),
        role,
        department,
        privileges: { allow: [], deny: [] },
        userCreateLimit: 5,
      };
    });
  }, [actorDepartment, actorRole, departmentOptions, departments, existing, isEdit, isSuperAdmin, presetRole]);

  if (isEdit && !canEdit) return <Navigate to="/users" replace />;
  if (!isEdit && !canCreate) return <Navigate to="/users" replace />;
  if (isEdit && users.length && !existing) return <Navigate to="/users" replace />;
  if (!form) return null;

  const onSave = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        department: isSuperAdmin ? form.department : actorDepartment,
        privileges:
          isSuperAdmin && privilegeMode === "custom"
            ? form.privileges || { allow: [], deny: [] }
            : { allow: [], deny: [] },
      };
      if (isSuperAdmin && (form.role === "admin" || existing?.role === "admin")) {
        payload.userCreateLimit = Number(form.userCreateLimit) || 5;
      }
      if (form.password) payload.password = form.password;
      if (isEdit) {
        await api.put(`/users/${id}`, payload);
      } else {
        if (!form.password) {
          setError("Password is required");
          return;
        }
        await api.post("/users", { ...payload, password: form.password });
      }
      await dispatch(refreshDirectory());
      await dispatch(syncCurrentUser());
      navigate(usersHomeHref());
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageIntro kicker="Directory" title={isEdit ? "Edit user" : "Create user"} />
      <GlassPanel as="article" className="p-5">
        {error ? <p className="mb-3 text-sm text-red-200">{error}</p> : null}
        {!isEdit && quota && !quota.unlimited ? (
          <p className="mb-3 text-sm text-white/60">
            You can create {quota.remaining} more user{quota.remaining === 1 ? "" : "s"} (
            {quota.createdCount}/{quota.userCreateLimit}). Super Admin can raise this limit.
          </p>
        ) : null}
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSave}>
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/70">Name</span>
            <input
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/70">Email</span>
            <input
              type="email"
              className={fieldClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/70">
              Password {isEdit ? "(leave blank to keep)" : "(auto-generated, editable)"}
            </span>
            <div className="flex gap-2">
              <input
                className={fieldClass}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!isEdit}
                minLength={isEdit && !form.password ? undefined : 6}
              />
              <button
                type="button"
                className={`${ghostBtn} shrink-0`}
                onClick={() => setForm({ ...form, password: generatePassword() })}
              >
                Generate
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/70">Role</span>
            <select
              className={fieldClass}
              value={form.role}
              onChange={(e) => {
                setPrivilegeMode("default");
                setForm({
                  ...form,
                  role: e.target.value,
                  privileges: { allow: [], deny: [] },
                });
              }}
            >
              {roleOptions.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/70">Department</span>
              <select
                className={fieldClass}
                value={form.department}
                disabled={!isSuperAdmin}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              >
                <option value="">Select department</option>
                {departmentOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {isSuperAdmin ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  className={`${fieldClass} max-w-xs`}
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Add another department"
                />
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={async () => {
                    const name = newDepartment.trim();
                    if (!name) return;
                    setError("");
                    try {
                      const data = await api.post("/departments", { name });
                      const created = data.department;
                      const next = [
                        ...departmentOptions.filter((item) => item.key !== created.key),
                        created,
                      ];
                      dispatch(setDirectory({ departments: next }));
                      setForm({ ...form, department: created.key });
                      setNewDepartment("");
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Add department
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => navigate("/departments")}
                >
                  Open departments page
                </button>
              </div>
            ) : null}
          </div>
          {isSuperAdmin && form.role === "admin" ? (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm text-white/70">
                User create limit (default 5 — only Super Admin can raise)
              </span>
              <input
                type="number"
                min={0}
                className={`${fieldClass} max-w-xs`}
                value={form.userCreateLimit ?? 5}
                onChange={(e) => setForm({ ...form, userCreateLimit: e.target.value })}
              />
            </label>
          ) : null}
          {isSuperAdmin ? (
            <RolePrivilegePicker
              roleKey={form.role}
              rolePrivileges={rolePrivileges}
              mode={privilegeMode}
              showAllModules
              onModeChange={(mode) => {
                setPrivilegeMode(mode);
                if (mode === "default") {
                  setForm({ ...form, privileges: { allow: [], deny: [] } });
                }
              }}
              custom={form.privileges || { allow: [], deny: [] }}
              onCustomChange={(next) => setForm({ ...form, privileges: next })}
            />
          ) : null}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={primaryBtn}>
              Save
            </button>
            <button
              type="button"
              className={ghostBtn}
              onClick={() => navigate(usersHomeHref())}
            >
              Cancel
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}
