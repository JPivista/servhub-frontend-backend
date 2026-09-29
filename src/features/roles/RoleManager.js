import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { hasPrivilege } from "../../constants/privileges";
import { refreshDirectory, syncCurrentUser } from "../../store/authSlice";
import { api } from "../../services/api";
import ActionMenu from "../../components/ui/ActionMenu";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DataTable from "../../components/ui/DataTable";
import GlassPanel from "../../components/ui/GlassPanel";
import { fieldClass, ghostBtn, primaryBtn } from "../../components/ui/formStyles";

export default function RoleManager() {
  const dispatch = useDispatch();
  const roles = useSelector((state) => state.directory.roles);
  const users = useSelector((state) => state.directory.users);
  const rolePrivileges = useSelector((state) => state.directory.rolePrivileges);
  const privileges = useSelector((state) => state.auth.privileges);
  const canCreate = hasPrivilege(privileges, "roles", "create");
  const canEdit = hasPrivilege(privileges, "roles", "edit");
  const canDelete = hasPrivilege(privileges, "roles", "delete");
  const [form, setForm] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    dispatch(refreshDirectory());
  }, [dispatch]);

  const openCreate = () => setForm({ name: "", key: "" });

  const openEdit = (role) =>
    setForm({
      id: role.id,
      name: role.name,
      key: role.key,
      previousKey: role.key,
    });

  const onSave = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      key: form.key,
      previousKey: form.previousKey,
    };
    if (form.id) {
      await api.put(`/roles/${form.id}`, payload);
    } else {
      await api.post("/roles", payload);
    }
    await dispatch(refreshDirectory());
    await dispatch(syncCurrentUser());
    setForm(null);
  };

  const data = useMemo(
    () =>
      roles.map((role) => ({
        ...role,
        assigned: users.filter((user) => user.role === role.key).length,
        moduleCount: Object.keys(rolePrivileges[role.key] || {}).length,
      })),
    [rolePrivileges, roles, users]
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "key", header: "Key" },
      { accessorKey: "assigned", header: "Users" },
      { accessorKey: "moduleCount", header: "Modules" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const role = row.original;
          return (
            <ActionMenu
              items={[
                canEdit ? { label: "Edit", tone: "edit", onClick: () => openEdit(role) } : null,
                canDelete && role.assigned === 0
                  ? { label: "Delete", tone: "delete", onClick: () => setPendingDelete(role) }
                  : null,
              ]}
            />
          );
        },
      },
    ],
    [canDelete, canEdit]
  );

  return (
    <GlassPanel as="article" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="text-sm text-white/50">{roles.length} roles</p>
        </div>
        {canCreate ? (
          <button type="button" className={primaryBtn} onClick={openCreate}>
            Add role
          </button>
        ) : null}
      </div>

      <DataTable columns={columns} data={data} searchPlaceholder="Search roles" />

      {form ? (
        <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={onSave}>
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
            <span className="mb-1.5 block text-sm text-white/70">Key</span>
            <input
              className={fieldClass}
              value={form.key}
              onChange={(e) =>
                setForm({ ...form, key: e.target.value.trim().replace(/\s+/g, "_") })
              }
              required
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={primaryBtn}>
              Save
            </button>
            <button type="button" className={ghostBtn} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete role"
        message={`Delete ${pendingDelete?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          await api.del(`/roles/${pendingDelete.id}`);
          await dispatch(refreshDirectory());
          await dispatch(syncCurrentUser());
          setPendingDelete(null);
        }}
      />
    </GlassPanel>
  );
}
