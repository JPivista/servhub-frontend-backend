import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import DataTable from "../../components/ui/DataTable";
import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";
import { api } from "../../services/api";
import { hasPrivilege } from "../../constants/privileges";
import { fieldClass, ghostBtn, primaryBtn } from "../../components/ui/formStyles";
import { refreshDirectory } from "../../store/authSlice";

export default function AuditsPage() {
  const dispatch = useDispatch();
  const roleKey = useSelector((state) => state.auth.role?.key);
  const privileges = useSelector((state) => state.auth.privileges);
  const users = useSelector((state) => state.directory.users);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [grantAdminId, setGrantAdminId] = useState("");
  const [grantLimit, setGrantLimit] = useState(10);
  const [grantMessage, setGrantMessage] = useState("");
  const isSuperAdmin = roleKey === "super_admin";
  const canView = isSuperAdmin || hasPrivilege(privileges, "audits", "view");

  const admins = useMemo(
    () => users.filter((item) => item.role === "admin"),
    [users]
  );

  const loadAudits = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
      if (moduleFilter && moduleFilter !== "all") params.set("module", moduleFilter);
      if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
      const data = await api.get(`/audits?${params.toString()}`);
      setAudits(data.audits || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    loadAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, moduleFilter, actionFilter]);

  const columns = useMemo(
    () => [
      { accessorKey: "date", header: "When" },
      { accessorKey: "action", header: "Action" },
      { accessorKey: "module", header: "Module" },
      { accessorKey: "summary", header: "Summary" },
      { accessorKey: "actorName", header: "Actor" },
      { accessorKey: "actorRole", header: "Role" },
      { accessorKey: "targetId", header: "Target" },
    ],
    []
  );

  if (!canView) return <Navigate to="/" replace />;

  const grantAuditAccess = async () => {
    setGrantMessage("");
    if (!grantAdminId) {
      setGrantMessage("Select an admin to grant access");
      return;
    }
    try {
      const admin = admins.find((item) => item.id === grantAdminId);
      const allow = new Set(admin?.privileges?.allow || []);
      allow.add("audits.view");
      await api.put(`/users/${grantAdminId}`, {
        privileges: {
          allow: Array.from(allow),
          deny: (admin?.privileges?.deny || []).filter((item) => item !== "audits.view"),
        },
        userCreateLimit: Number(grantLimit) || 5,
      });
      setGrantMessage("Audit access and create limit updated for that admin.");
      await dispatch(refreshDirectory());
    } catch (err) {
      setGrantMessage(err.message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-6.5rem)] flex-col gap-4">
      <PageIntro kicker="Security" title="Audits">
        <p className="mt-1 text-sm text-white/55">
          Full activity log for everyone — logins, logouts, users, departments, material requests,
          and more. Filters default to All.
        </p>
      </PageIntro>

      <GlassPanel className="flex min-h-0 flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">Module</span>
            <select
              className={`${fieldClass} min-w-[10rem]`}
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="auth">Auth</option>
              <option value="users">Users</option>
              <option value="departments">Departments</option>
              <option value="material_requests">Material requests</option>
              <option value="materials">Materials</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">Action</span>
            <select
              className={`${fieldClass} min-w-[10rem]`}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="login_failed">Login failed</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="password_change">Password change</option>
              <option value="request_delete">Delete request</option>
            </select>
          </label>
          <button type="button" className={ghostBtn} onClick={loadAudits}>
            Refresh
          </button>
        </div>
        {error ? <p className="mb-3 text-sm text-red-200">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-white/55">Loading audits…</p>
        ) : (
          <DataTable
            columns={columns}
            data={audits}
            searchPlaceholder="Search all audits"
            pageSize={12}
            fillHeight
          />
        )}
      </GlassPanel>

      {isSuperAdmin ? (
        <GlassPanel className="p-5">
          <h2 className="text-sm font-semibold text-white">Grant access (optional)</h2>
          <p className="mt-1 text-xs text-white/50">
            This does not filter the log above. Use it only when you want a specific admin to open
            Audits, and optionally raise their user-create limit.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block min-w-[12rem] flex-1">
              <span className="mb-1.5 block text-xs text-white/60">Admin</span>
              <select
                className={fieldClass}
                value={grantAdminId}
                onChange={(e) => setGrantAdminId(e.target.value)}
              >
                <option value="">Select admin…</option>
                {admins.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · limit {item.userCreateLimit ?? 5}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-32">
              <span className="mb-1.5 block text-xs text-white/60">Create limit</span>
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={grantLimit}
                onChange={(e) => setGrantLimit(e.target.value)}
              />
            </label>
            <button type="button" className={primaryBtn} onClick={grantAuditAccess}>
              Grant
            </button>
          </div>
          {grantMessage ? <p className="mt-2 text-sm text-white/70">{grantMessage}</p> : null}
        </GlassPanel>
      ) : null}
    </div>
  );
}
