import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteRecord, saveRecord } from "../../store/directorySlice";
import { hasPrivilege } from "../../constants/privileges";
import ActionMenu from "../../components/ui/ActionMenu";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DataTable from "../../components/ui/DataTable";
import GlassPanel from "../../components/ui/GlassPanel";
import StatusBadge from "../../components/ui/StatusBadge";
import { fieldClass, ghostBtn, primaryBtn } from "../../components/ui/formStyles";

export default function RecordManager({ moduleKey, config }) {
  const dispatch = useDispatch();
  const rows = useSelector((state) => state.directory.collections[moduleKey] || []);
  const privileges = useSelector((state) => state.auth.privileges);
  const canCreate = hasPrivilege(privileges, moduleKey, "create");
  const canEdit = hasPrivilege(privileges, moduleKey, "edit");
  const canDelete = hasPrivilege(privileges, moduleKey, "delete");
  const canApprove = hasPrivilege(privileges, moduleKey, "approve");
  const canReject = hasPrivilege(privileges, moduleKey, "reject");
  const [form, setForm] = useState(null);
  const [pending, setPending] = useState(null);

  const blank = config.fields.reduce((acc, field) => {
    acc[field.key] = field.options ? field.options[0] : "";
    return acc;
  }, {});

  const onSave = (event) => {
    event.preventDefault();
    const id = form.id || Math.max(0, ...rows.map((item) => item.id)) + 1;
    dispatch(saveRecord({ collection: moduleKey, record: { ...form, id } }));
    setForm(null);
  };

  const columns = useMemo(
    () => [
      ...config.fields.map((field) => ({
        accessorKey: field.key,
        header: field.label,
        cell: (info) =>
          field.key === "status" ? <StatusBadge value={info.getValue()} /> : info.getValue(),
      })),
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <ActionMenu
              items={[
                canEdit ? { label: "Edit", tone: "edit", onClick: () => setForm(record) } : null,
                config.workflow && canApprove
                  ? { label: "Approve", tone: "approve", onClick: () => setPending({ type: "approve", record }) }
                  : null,
                config.workflow && canReject
                  ? { label: "Reject", tone: "reject", onClick: () => setPending({ type: "reject", record }) }
                  : null,
                canDelete
                  ? { label: "Delete", tone: "delete", onClick: () => setPending({ type: "delete", record }) }
                  : null,
              ]}
            />
          );
        },
      },
    ],
    [canApprove, canDelete, canEdit, canReject, config.fields, config.workflow]
  );

  const confirmCopy = {
    delete: {
      title: "Delete record",
      message: `Delete this ${config.title.toLowerCase()} item?`,
      confirmLabel: "Delete",
      danger: true,
    },
    approve: {
      title: "Approve",
      message: "Mark this item as Approved?",
      confirmLabel: "Approve",
      danger: false,
    },
    reject: {
      title: "Reject",
      message: "Mark this item as Rejected?",
      confirmLabel: "Reject",
      danger: true,
    },
  };

  return (
    <GlassPanel as="article" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{config.title}</h2>
          <p className="text-sm text-white/50">{rows.length} records from the server</p>
        </div>
        {canCreate ? (
          <button type="button" className={primaryBtn} onClick={() => setForm(blank)}>
            Add
          </button>
        ) : null}
      </div>

      <DataTable columns={columns} data={rows} searchPlaceholder={`Search ${config.title.toLowerCase()}`} />

      {form ? (
        <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={onSave}>
          {config.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-sm text-white/70">{field.label}</span>
              {field.type === "select" ? (
                <select
                  className={fieldClass}
                  value={form[field.key] || ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={fieldClass}
                  value={form[field.key] || ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  required
                />
              )}
            </label>
          ))}
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
        open={Boolean(pending)}
        title={confirmCopy[pending?.type]?.title}
        message={confirmCopy[pending?.type]?.message}
        confirmLabel={confirmCopy[pending?.type]?.confirmLabel}
        danger={confirmCopy[pending?.type]?.danger}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending.type === "delete") {
            dispatch(deleteRecord({ collection: moduleKey, id: pending.record.id }));
          } else {
            dispatch(
              saveRecord({
                collection: moduleKey,
                record: {
                  ...pending.record,
                  status: pending.type === "approve" ? "Approved" : "Rejected",
                },
              })
            );
          }
          setPending(null);
        }}
      />
    </GlassPanel>
  );
}
