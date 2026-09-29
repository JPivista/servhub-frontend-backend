import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";
import { primaryBtn } from "../../components/ui/formStyles";
import { hasPrivilege } from "../../constants/privileges";
import { api } from "../../services/api";
import { refreshDirectory } from "../../store/authSlice";
import { setMaterialRequests } from "../../store/workflowSlice";

export default function Reports() {
  const dispatch = useDispatch();
  const privileges = useSelector((state) => state.auth.privileges);
  const users = useSelector((state) => state.directory.users);
  const roles = useSelector((state) => state.directory.roles);
  const rolePrivileges = useSelector((state) => state.directory.rolePrivileges);
  const mrs = useSelector((state) => state.workflow.materialRequests);
  const canExport = hasPrivilege(privileges, "reports", "export");

  useEffect(() => {
    dispatch(refreshDirectory());
    api
      .get("/material-requests")
      .then((response) => dispatch(setMaterialRequests(response.materialRequests || [])))
      .catch(() => dispatch(setMaterialRequests([])));
  }, [dispatch]);

  if (!hasPrivilege(privileges, "reports", "view")) return <Navigate to="/" replace />;

  const rows = [
    { label: "Users", value: users.length },
    { label: "Roles", value: roles.length },
    { label: "Material requests", value: mrs.length },
    { label: "Closed MRs", value: mrs.filter((item) => item.status === "Closed").length },
  ];

  const exportReport = () => {
    const blob = new Blob(
      [JSON.stringify({ users, roles, rolePrivileges, materialRequests: mrs }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "servhub-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageIntro kicker="Insights" title="Reports" />
        {canExport ? (
          <button type="button" className={primaryBtn} onClick={exportReport}>
            Export
          </button>
        ) : null}
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <GlassPanel as="article" key={row.label} className="p-5">
            <p className="text-sm text-white/55">{row.label}</p>
            <p className="mt-3 text-3xl font-semibold">{row.value}</p>
          </GlassPanel>
        ))}
      </section>
    </div>
  );
}
