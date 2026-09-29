import { useSelector } from "react-redux";
import { Navigate, useSearchParams } from "react-router-dom";
import UserManager from "../../features/users/UserManager";
import { PageIntro } from "../../components/ui/GlassPanel";
import { hasPrivilege } from "../../constants/privileges";

const ROLE_TITLES = {
  admin: "Admins",
  requestor: "Requestors",
  manager: "Department Managers",
  procurement: "Procurement",
  department_head: "Department Heads",
  finance: "Finance",
  supplier: "Suppliers",
  in_charge: "Department Incharge",
  back_office: "Back Office",
  user: "Requestors (legacy)",
};

export default function Users() {
  const [params] = useSearchParams();
  const role = params.get("role");
  const privileges = useSelector((state) => state.auth.privileges);
  if (!hasPrivilege(privileges, "users", "view")) return <Navigate to="/" replace />;

  const title = role ? ROLE_TITLES[role] || "Users" : "Users";

  return (
    <div className="space-y-5">
      <PageIntro kicker="Directory" title={title}>
        {!role ? (
          <p className="mt-1 text-sm text-white/55">
            All workspace roles — requestors, managers, procurement, finance, and more.
          </p>
        ) : null}
      </PageIntro>
      <UserManager title={title} roleKeys={role ? [role] : null} />
    </div>
  );
}
