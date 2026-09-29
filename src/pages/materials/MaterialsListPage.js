import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import ActionMenu from "../../components/ui/ActionMenu";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DataTable from "../../components/ui/DataTable";
import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";
import { ghostBtn, primaryBtn } from "../../components/ui/formStyles";
import { hasPrivilege } from "../../constants/privileges";
import { homePathForRole } from "../../constants/nav";
import { api } from "../../services/api";

export default function MaterialsListPage() {
  const navigate = useNavigate();
  const privileges = useSelector((state) => state.auth.privileges);
  const roleKey = useSelector((state) => state.auth.role?.key);
  const canView = roleKey === "super_admin" || hasPrivilege(privileges, "materials", "view");
  const canCreate = roleKey === "super_admin" || hasPrivilege(privileges, "materials", "create");
  const canEdit = roleKey === "super_admin" || hasPrivilege(privileges, "materials", "edit");
  const canDelete = roleKey === "super_admin" || hasPrivilege(privileges, "materials", "delete");
  const [materials, setMaterials] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState("");

  const departmentName = useCallback(
    (key) => departments.find((item) => item.key === key)?.name || key || "—",
    [departments]
  );

  const load = async () => {
    const [materialResponse, departmentResponse] = await Promise.all([
      api.get("/materials"),
      api.get("/departments"),
    ]);
    setMaterials(materialResponse.materials || []);
    setDepartments((departmentResponse.departments || []).filter((item) => item.key !== "testing"));
  };

  useEffect(() => {
    if (!canView) return;
    load().catch((err) => setError(err.message || "Failed to load materials"));
  }, [canView]);

  const columns = useMemo(
    () => [
      { accessorKey: "productId", header: "P. id" },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "project", header: "Project" },
      {
        accessorKey: "department",
        header: "Department",
        cell: (info) => departmentName(info.getValue()),
      },
      { accessorKey: "unit", header: "Unit" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <ActionMenu
            items={[
              canEdit
                ? {
                    label: "Edit",
                    tone: "edit",
                    onClick: () => navigate(`/materials/${row.original.id}/edit`),
                  }
                : null,
              canDelete
                ? { label: "Delete", tone: "delete", onClick: () => setPendingDelete(row.original) }
                : null,
            ].filter(Boolean)}
          />
        ),
      },
    ],
    [canDelete, canEdit, departmentName, navigate]
  );

  if (!canView) return <Navigate to={homePathForRole(roleKey)} replace />;

  return (
    <div className="flex min-h-[calc(100vh-6.5rem)] flex-col gap-4">
      <PageIntro kicker="Catalog" title="Materials" />
      {canCreate ? (
        <GlassPanel className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-lg font-semibold">Add materials</h2>
            <p className="mt-1 text-sm text-white/55">
              Open the form to save product ids for a project and department.
            </p>
          </div>
          <button type="button" className={primaryBtn} onClick={() => navigate("/materials/new")}>
            Add materials
          </button>
        </GlassPanel>
      ) : null}
      <GlassPanel className="flex min-h-0 flex-1 flex-col p-5">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <p className="text-sm text-white/50">{materials.length} materials</p>
          {canCreate ? (
            <button type="button" className={ghostBtn} onClick={() => navigate("/materials/new")}>
              Open form
            </button>
          ) : null}
        </div>
        {error ? <p className="mb-3 shrink-0 text-sm text-red-200">{error}</p> : null}
        <div className="min-h-0 flex-1">
          <DataTable
            columns={columns}
            data={materials}
            searchPlaceholder="Filter materials"
            pageSize={12}
            fillHeight
          />
        </div>
      </GlassPanel>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete material"
        message={pendingDelete ? `Delete ${pendingDelete.productId}?` : ""}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await api.del(`/materials/${pendingDelete.id}`);
            setMaterials((current) => current.filter((item) => item.id !== pendingDelete.id));
            setPendingDelete(null);
          } catch (err) {
            setError(err.message);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
