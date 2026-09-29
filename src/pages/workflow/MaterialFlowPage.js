import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import ActionMenu from "../../components/ui/ActionMenu";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DataTable from "../../components/ui/DataTable";
import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";
import StatusBadge from "../../components/ui/StatusBadge";
import { fieldClass, ghostBtn, primaryBtn } from "../../components/ui/formStyles";
import {
  deleteMaterialRequest,
  saveMaterialRequest,
  setMaterialRequests,
  updateMaterialStatus,
} from "../../store/workflowSlice";
import { hasPrivilege } from "../../constants/privileges";
import { actionsFor, isEditableStatus, materialRequestHref, statusesForStage } from "../../features/workflow/workflow";
import { homePathForRole } from "../../constants/nav";
import { api } from "../../services/api";

export default function MaterialFlow({
  moduleKey,
  title,
  kicker,
  allowCreate = false,
  showPayment = false,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const privileges = useSelector((state) => state.auth.privileges);
  const roleKey = useSelector((state) => state.auth.role?.key || state.auth.user?.role);
  const currentUser = useSelector((state) => state.auth.user);
  const rows = useSelector((state) => state.workflow.materialRequests);
  const departments = useSelector((state) => state.directory.departments);
  const isRequestor = roleKey === "user" || roleKey === "requestor" || roleKey === "requester";
  const canCreate =
    allowCreate &&
    (hasPrivilege(privileges, "material_requests", "create") ||
      hasPrivilege(privileges, moduleKey, "create"));
  const canEdit =
    hasPrivilege(privileges, "material_requests", "edit") || hasPrivilege(privileges, moduleKey, "edit");
  const canDelete = hasPrivilege(privileges, "material_requests", "delete");
  const [pending, setPending] = useState(null);
  const [quotationText, setQuotationText] = useState("");
  const [error, setError] = useState("");
  const needsQuote = Boolean(pending?.action?.requiresQuotation);

  const statuses = statusesForStage(moduleKey, roleKey);
  const scopedRows = isRequestor
    ? rows.filter(
        (item) =>
          item.requestedById === currentUser?.id ||
          item.createdById === currentUser?.id ||
          (!item.requestedById && item.requestedBy === currentUser?.name)
      )
    : rows;
  const data = statuses ? scopedRows.filter((item) => statuses.includes(item.status)) : scopedRows;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get("/material-requests");
        if (cancelled) return;
        dispatch(setMaterialRequests(response.materialRequests || []));
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load material requests");
        if (isRequestor) dispatch(setMaterialRequests([]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, isRequestor]);

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
      { accessorKey: "assignedTo", header: "Assigned manager" },
      { accessorKey: "quantity", header: "Products" },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => <StatusBadge value={info.getValue()} />,
      },
      ...(showPayment
        ? [
            {
              accessorKey: "paymentStatus",
              header: "Payment",
              cell: (info) => <StatusBadge value={info.getValue()} />,
            },
          ]
        : []),
      { accessorKey: "date", header: "Date" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const record = row.original;
          const actions = actionsFor(roleKey, record.status);
          return (
            <ActionMenu
              items={[
                {
                  label: "View details",
                  onClick: () => navigate(materialRequestHref(record.id)),
                },
                canEdit && isEditableStatus(record.status)
                  ? {
                      label: "Edit",
                      tone: "edit",
                      onClick: () => navigate(`/material-requests/${record.id}/edit`),
                    }
                  : null,
                ...actions.map((action) => ({
                  label: action.label,
                  tone: action.tone,
                  onClick: () => {
                    setQuotationText(record.quotation || "");
                    setPending({ record, action });
                  },
                })),
                canDelete || (isRequestor && isEditableStatus(record.status))
                  ? {
                      label: "Delete",
                      tone: "delete",
                      onClick: () =>
                        setPending({
                          record,
                          action: { label: "Delete", type: "delete", tone: "delete" },
                        }),
                    }
                  : null,
              ]}
            />
          );
        },
      },
    ],
    [canDelete, canEdit, departments, isRequestor, navigate, roleKey, showPayment]
  );

  if (!hasPrivilege(privileges, moduleKey, "view")) {
    return <Navigate to={homePathForRole(roleKey)} replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-6.5rem)] flex-col gap-4">
      <PageIntro kicker={kicker} title={title} />

      {canCreate ? (
        <GlassPanel className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-lg font-semibold">New material request</h2>
            <p className="mt-1 text-sm text-white/55">
              Open the form to add products row by row. MR number is generated automatically.
            </p>
          </div>
          <button
            type="button"
            className={primaryBtn}
            onClick={() => navigate("/material-requests/new")}
          >
            Create MR
          </button>
        </GlassPanel>
      ) : null}

      <GlassPanel className="flex min-h-0 flex-1 flex-col p-5">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <p className="text-sm text-white/50">{data.length} records in this stage</p>
          {canCreate ? (
            <button
              type="button"
              className={ghostBtn}
              onClick={() => navigate("/material-requests/new")}
            >
              Open form
            </button>
          ) : null}
        </div>
        {error ? <p className="mb-3 shrink-0 text-sm text-red-200">{error}</p> : null}
        <div className="min-h-0 flex-1">
          <DataTable
            columns={columns}
            data={data}
            searchPlaceholder="Filter material requests"
            pageSize={12}
            fillHeight
            onRowClick={(record) => navigate(materialRequestHref(record.id))}
          />
        </div>
      </GlassPanel>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.action?.label || "Confirm"}
        message={
          pending?.action?.type === "delete"
            ? `Delete ${pending?.record?.id}?`
            : needsQuote
              ? "Enter the supplier quotation in the box below (price, terms, notes)."
              : `Move ${pending?.record?.id} to ${pending?.action?.status}?`
        }
        confirmLabel={pending?.action?.label || "Confirm"}
        danger={pending?.action?.tone === "reject" || pending?.action?.type === "delete"}
        onCancel={() => {
          setPending(null);
          setQuotationText("");
        }}
        onConfirm={async () => {
          try {
            if (pending.action.type === "delete") {
              await api.del(`/material-requests/${pending.record.id}`);
              dispatch(deleteMaterialRequest(pending.record.id));
            } else {
              if (needsQuote && !quotationText.trim()) {
                setError("Quotation text is required");
                return;
              }
              const payload = {};
              if (pending.action.status && pending.action.status !== pending.record.status) {
                payload.status = pending.action.status;
              }
              if (needsQuote) payload.quotation = quotationText.trim();
              const response = await api.put(`/material-requests/${pending.record.id}`, payload);
              dispatch(saveMaterialRequest(response.materialRequest));
              if (payload.status) {
                dispatch(
                  updateMaterialStatus({ id: pending.record.id, status: payload.status })
                );
              }
            }
            setPending(null);
            setQuotationText("");
          } catch (err) {
            setError(err.message);
            setPending(null);
          }
        }}
      >
        {needsQuote ? (
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/70">Quotation</span>
            <textarea
              className={`${fieldClass} min-h-[7rem]`}
              value={quotationText}
              onChange={(e) => setQuotationText(e.target.value)}
              placeholder="e.g. Unit price 1200, delivery 7 days, warranty 1 year…"
              autoFocus
            />
          </label>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
