import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { CompletionRing, DonutChart, OverviewBarChart } from "../../components/charts/Charts";
import DataTable from "../../components/ui/DataTable";
import GlassPanel from "../../components/ui/GlassPanel";
import StatusBadge from "../../components/ui/StatusBadge";
import { icons } from "../../components/icons";
import { flattenNavItems, getNavItems } from "../../constants/nav";
import { hasPrivilege } from "../../constants/privileges";
import { materialRequestHref } from "../../features/workflow/workflow";
import { usersListHref } from "../../features/users/userRoutes";
import { formatDateLabel, formatTimeLabel, greetingForNow } from "../../utils/greeting";

function countBy(list, key) {
  const map = {};
  list.forEach((item) => {
    const name = item[key] || "Unknown";
    map[name] = (map[name] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);
  const privileges = useSelector((state) => state.auth.privileges);
  const users = useSelector((state) => state.directory.users);
  const rolePrivileges = useSelector((state) => state.directory.rolePrivileges);
  const mrs = useSelector((state) => state.workflow.materialRequests);
  const departments = useSelector((state) => state.directory.departments);
  const roleKey = role?.key;
  const isSuperAdmin = roleKey === "super_admin";
  const items = flattenNavItems(getNavItems(privileges, roleKey)).filter((item) => item.to !== "/");
  const firstName = user?.name?.split(" ")[0] || "";
  const canReports = hasPrivilege(privileges, "reports", "view");
  const canMrs = hasPrivilege(privileges, "material_requests", "view");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const adminCount = users.filter((item) => item.role === "admin" || item.role === "super_admin").length;
  const userCount = users.length;
  const privilegeCount = Object.values(rolePrivileges || {}).reduce(
    (sum, actions) => sum + Object.values(actions || {}).reduce((total, list) => total + (list?.length || 0), 0),
    0
  );

  const workflowKpis = [
    {
      key: "material_requests",
      label: "Material Requests",
      to: "/material-requests",
      icon: "clipboard",
      value: mrs.length,
    },
    {
      key: "approvals",
      label: "Pending Approval",
      to: "/approvals",
      icon: "check",
      value: mrs.filter((item) => String(item.status || "").includes("Pending")).length,
    },
    {
      key: "purchase_orders",
      label: "Purchase Orders",
      to: "/purchase-orders",
      icon: "cart",
      value: mrs.filter((item) => String(item.status || "").includes("PO") || item.status === "In Delivery").length,
    },
    {
      key: "deliveries",
      label: "Deliveries",
      to: "/deliveries",
      icon: "truck",
      value: mrs.filter((item) => ["In Delivery", "Pending Receipt", "Discrepancy"].includes(item.status)).length,
    },
  ].filter((item) => hasPrivilege(privileges, item.key, "view"));

  const adminKpis = [
    {
      key: "admins",
      label: "Admins",
      to: usersListHref("admin"),
      icon: "users",
      value: adminCount,
    },
    {
      key: "users",
      label: "Users",
      to: usersListHref(),
      icon: "users",
      value: userCount,
    },
    {
      key: "privileges",
      label: "Privileges",
      to: "/privileges",
      icon: "check",
      value: privilegeCount,
    },
  ].filter((item) => item.key === "admins" || hasPrivilege(privileges, item.key, "view"));

  const kpis = isSuperAdmin ? adminKpis : workflowKpis;

  const statusChart = countBy(mrs, "status");
  const closed = mrs.filter((item) => item.status === "Closed").length;
  const inProgress = mrs.filter((item) => item.status !== "Closed" && item.status !== "Rejected").length;
  const overdue = mrs.filter((item) => item.status === "Discrepancy" || item.status === "Returned").length;
  const percent = mrs.length ? Math.round((closed / mrs.length) * 100) : 0;

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "MR No.",
        cell: (info) => (
          <Link
            to={materialRequestHref(info.getValue())}
            className="text-brand-teal hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      },
      { accessorKey: "project", header: "Project" },
      {
        accessorKey: "department",
        header: "Department",
        cell: (info) =>
          departments.find((item) => item.key === info.getValue())?.name || info.getValue() || "—",
      },
      { accessorKey: "createdBy", header: "Created by" },
      { accessorKey: "requestedBy", header: "Created for" },
      { accessorKey: "status", header: "Status", cell: (info) => <StatusBadge value={info.getValue()} /> },
      { accessorKey: "date", header: "Date" },
    ],
    [departments]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-teal">{role?.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {greetingForNow(now)}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-white/55">
            {formatDateLabel(now)} · {formatTimeLabel(now)}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {isSuperAdmin
              ? "Manage admins, users, and privileges first."
              : "Material request and procurement workflow."}
          </p>
        </div>
        {canReports ? (
          <Link
            to="/reports"
            className="rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(4,114,223,0.35)]"
          >
            View reports
          </Link>
        ) : null}
      </div>

      <section className={`grid gap-4 sm:grid-cols-2 ${isSuperAdmin ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
        {kpis.map((kpi) => (
          <Link key={kpi.key} to={kpi.to}>
            <GlassPanel as="article" className="p-5 transition hover:bg-white/10">
              <div className="flex items-start justify-between">
                <p className="text-sm text-white/55">{kpi.label}</p>
                <span className="rounded-xl bg-white/10 p-2 text-brand-teal">{icons[kpi.icon]}</span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{kpi.value}</p>
            </GlassPanel>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <GlassPanel as="article" className="cursor-pointer p-5" onClick={() => navigate("/material-requests")}>
          <h2 className="text-lg font-semibold">Request status</h2>
          <p className="text-sm text-white/50">{mrs.length} total MRs</p>
          <DonutChart data={statusChart} />
        </GlassPanel>
        <GlassPanel as="article" className="cursor-pointer p-5" onClick={() => navigate("/procurement")}>
          <h2 className="text-lg font-semibold">Stage volume</h2>
          <OverviewBarChart
            data={items.slice(0, 6).map((item) => ({
              name: item.label,
              value: item.key === "material_requests" ? mrs.length : (privileges[item.key] || []).length,
            }))}
          />
        </GlassPanel>
        <GlassPanel as="article" className="p-5">
          <h2 className="text-lg font-semibold">Overall completion</h2>
          <CompletionRing percent={percent} completed={closed} inProgress={inProgress} overdue={overdue} />
        </GlassPanel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <GlassPanel as="article" className="p-5 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent material requests</h2>
              <p className="text-sm text-white/50">Click a row to open details</p>
            </div>
            {canMrs ? (
              <Link to="/material-requests" className="text-sm text-brand-teal hover:underline">
                View all
              </Link>
            ) : null}
          </div>
          <DataTable
            columns={columns}
            data={mrs}
            showSearch={false}
            pageSize={5}
            onRowClick={(record) => canMrs && navigate(materialRequestHref(record.id))}
          />
        </GlassPanel>
        <GlassPanel as="article" className="p-5">
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <div className="mt-3 space-y-2">
            {items.slice(0, 6).map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className="block rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm hover:bg-brand-blue/30"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </GlassPanel>
      </section>
    </div>
  );
}
