import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { refreshDirectory, syncCurrentUser } from "../../store/authSlice";
import { menuGroups } from "../../constants/nav";
import { api } from "../../services/api";
import { hasPrivilege } from "../../constants/privileges";
import GlassPanel from "../../components/ui/GlassPanel";
import { primaryBtn } from "../../components/ui/formStyles";
import PrivilegeAccordion from "./PrivilegeAccordion";

export default function PrivilegeManager() {
  const dispatch = useDispatch();
  const roles = useSelector((state) => state.directory.roles).filter(
    (role) => role.key !== "super_admin" && role.key !== "user"
  );
  const rolePrivileges = useSelector((state) => state.directory.rolePrivileges);
  const privileges = useSelector((state) => state.auth.privileges);
  const canEdit = hasPrivilege(privileges, "privileges", "edit");
  const canCreate = hasPrivilege(privileges, "privileges", "create");
  const canChange = canEdit || canCreate;
  const [params, setParams] = useSearchParams();
  const selectedKey = params.get("role") || roles[0]?.key || "";
  const selectedRole = roles.find((role) => role.key === selectedKey) || roles[0];
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    dispatch(refreshDirectory());
  }, [dispatch]);

  useEffect(() => {
    setDraft(null);
    setError("");
    setMessage("");
  }, [selectedKey]);

  const current = useMemo(
    () => draft || rolePrivileges[selectedRole?.key] || { dashboard: ["view"] },
    [draft, rolePrivileges, selectedRole]
  );

  const enabledCount = Object.values(current).reduce(
    (sum, actions) => sum + (actions?.length || 0),
    0
  );

  const selectRole = (key) => {
    setDraft(null);
    setParams({ role: key });
  };

  const save = async () => {
    if (!selectedRole || !canChange) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await api.put(`/roles/${selectedRole.id}`, {
        name: selectedRole.name,
        key: selectedRole.key,
        previousKey: selectedRole.key,
        privileges: current,
      });
      await dispatch(refreshDirectory());
      await dispatch(syncCurrentUser());
      setDraft(null);
      setMessage("Saved changes successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <GlassPanel as="aside" className="h-fit p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Roles</p>
        <h2 className="mt-1 text-lg font-semibold">Pick a role</h2>
        <p className="mt-2 text-sm text-white/50">
          Super Admin always has full access and is not listed here.
        </p>
        <div className="mt-4 space-y-2">
          {roles.map((role) => {
            const active = selectedRole?.key === role.key;
            const count = Object.values(rolePrivileges[role.key] || {}).reduce(
              (sum, actions) => sum + (actions?.length || 0),
              0
            );
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => selectRole(role.key)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                  active
                    ? "bg-brand-blue text-white shadow-[0_8px_20px_rgba(4,114,223,0.35)]"
                    : "bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-medium">{role.name}</span>
                <span className={`text-xs ${active ? "text-white/80" : "text-white/45"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel as="article" className="p-5 sm:p-6">
        {error ? <p className="mb-3 text-sm text-red-200">{error}</p> : null}
        {message ? <p className="mb-3 text-sm font-medium text-brand-teal">{message}</p> : null}

        <div className="mb-6 border-b border-white/10 pb-5">
          <p className="mb-1.5 text-sm text-white/70">Role</p>
          <p className="inline-flex rounded-2xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(4,114,223,0.28)]">
            {selectedRole?.name || "Select a role"}
          </p>
        </div>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Access permissions</h3>
            <p className="mt-1 text-sm text-white/50">
              Open a section, then a page, and turn actions on or off.
            </p>
          </div>
          <p className="rounded-full bg-[#e8eef4] px-3 py-1 text-xs font-semibold text-[#334155]">
            {enabledCount} enabled
          </p>
        </div>

        <PrivilegeAccordion
          groups={menuGroups}
          current={current}
          canChange={canChange}
          onChange={setDraft}
        />

        <div className="mt-8 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-5">
          {canChange && selectedRole ? (
            <button type="button" className={primaryBtn} disabled={saving} onClick={save}>
              {saving ? "Saving..." : "Save privileges"}
            </button>
          ) : null}
        </div>
      </GlassPanel>
    </div>
  );
}
