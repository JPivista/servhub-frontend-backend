import { approveBtn, deleteBtn, editBtn, rejectBtn } from "../../components/ui/formStyles";

/**
 * Mirrors backend/src/workflow/materialRequestFlow.js (DAAM-FM-SRS-MR-2026-001).
 * Keep transitions in sync with the backend source of truth.
 */

export const STATUSES = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  SOURCING: "Sourcing",
  RFQ_ISSUED: "RFQ Issued",
  PENDING_COMMERCIAL: "Pending Commercial",
  PENDING_FINANCE: "Pending Finance",
  PENDING_PO: "Pending PO",
  ORDERED: "Ordered",
  PO_REJECTED: "PO Rejected",
  IN_TRANSIT: "In transit",
  PENDING_RECEIPT: "Pending Receipt",
  DISCREPANCY: "Discrepancy",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
};

export const roleActions = {
  requestor: {
    Draft: [{ label: "Send for approval", status: "Requested", tone: "edit" }],
    Returned: [{ label: "Resubmit", status: "Requested", tone: "edit" }],
  },
  user: {
    Draft: [{ label: "Send for approval", status: "Requested", tone: "edit" }],
    Returned: [{ label: "Resubmit", status: "Requested", tone: "edit" }],
  },
  requester: {
    Draft: [{ label: "Send for approval", status: "Requested", tone: "edit" }],
    Returned: [{ label: "Resubmit", status: "Requested", tone: "edit" }],
  },
  manager: {
    Requested: [
      { label: "Approve", status: "Approved", tone: "approve" },
      { label: "Return", status: "Returned", tone: "reject" },
      { label: "Reject", status: "Rejected", tone: "reject" },
    ],
  },
  procurement: {
    Approved: [{ label: "Validate & start sourcing", status: "Sourcing", tone: "edit" }],
    Sourcing: [
      { label: "Issue RFQ", status: "RFQ Issued", tone: "edit" },
      { label: "Recommend (framework / direct)", status: "Pending Commercial", tone: "approve" },
    ],
    "RFQ Issued": [
      {
        label: "Recommend with quotation",
        status: "Pending Commercial",
        tone: "approve",
        requiresQuotation: true,
      },
    ],
    "Pending PO": [{ label: "Create & issue PO", status: "Ordered", tone: "approve" }],
    "PO Rejected": [{ label: "Re-select supplier", status: "Sourcing", tone: "edit" }],
    Delivered: [{ label: "Verify & close MR", status: "Closed", tone: "approve" }],
  },
  department_head: {
    "Pending Commercial": [
      { label: "Approve commercial", status: "Pending Finance", tone: "approve" },
      { label: "Return to sourcing", status: "Sourcing", tone: "reject" },
    ],
  },
  finance: {
    "Pending Finance": [
      { label: "Approve budget", status: "Pending PO", tone: "approve" },
      { label: "Return for commercial review", status: "Pending Commercial", tone: "reject" },
    ],
  },
  supplier: {
    "RFQ Issued": [
      {
        label: "Submit quotation",
        status: "RFQ Issued",
        tone: "edit",
        requiresQuotation: true,
      },
    ],
    Ordered: [
      { label: "Accept PO & dispatch", status: "In transit", tone: "approve" },
      { label: "Reject PO", status: "PO Rejected", tone: "reject" },
    ],
    "In transit": [{ label: "Mark arriving", status: "Pending Receipt", tone: "approve" }],
  },
  in_charge: {
    "Pending Receipt": [
      { label: "Accept delivery (GRN)", status: "Delivered", tone: "approve" },
      { label: "Reject material", status: "Discrepancy", tone: "reject" },
    ],
    Discrepancy: [{ label: "Accept after resolution", status: "Delivered", tone: "approve" }],
  },
  super_admin: {},
  admin: {},
};

export function normalizeRole(role) {
  if (role === "user" || role === "requester") return "requestor";
  return role;
}

export function actionsFor(role, status) {
  const key = normalizeRole(role);
  if (role === "super_admin") {
    const seen = new Set();
    return Object.values(roleActions)
      .flatMap((group) => group[status] || [])
      .filter((item) => {
        const id = `${item.label}→${item.status}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }
  return roleActions[key]?.[status] || roleActions[role]?.[status] || [];
}

export function materialRequestHref(id) {
  return `/material-requests/${encodeURIComponent(id)}`;
}

export const actionClass = {
  edit: editBtn,
  approve: approveBtn,
  reject: rejectBtn,
  delete: deleteBtn,
};

export const stageStatuses = {
  material_requests: null,
  approvals: ["Requested", "Returned", "Rejected", "Approved", "Pending Commercial", "Pending Finance"],
  procurement: ["Approved", "Sourcing", "RFQ Issued", "Pending Commercial", "Pending PO", "PO Rejected"],
  purchase_orders: ["RFQ Issued", "Ordered", "In transit", "PO Rejected"],
  deliveries: ["In transit", "Pending Receipt", "Discrepancy", "Delivered", "Closed"],
  payments: ["Ordered", "In transit", "Pending Receipt", "Delivered", "Closed"],
};

/** Role-specific inbox filters for stage pages (DAAM flow). */
export function statusesForStage(moduleKey, roleKey) {
  const role =
    roleKey === "user" || roleKey === "requester" ? "requestor" : roleKey;

  if (moduleKey === "approvals") {
    if (role === "manager") return ["Requested", "Returned", "Rejected", "Approved"];
    if (role === "department_head") return ["Pending Commercial"];
    if (role === "finance") return ["Pending Finance"];
  }
  if (moduleKey === "procurement" && role === "procurement") {
    return ["Approved", "Sourcing", "RFQ Issued", "Pending Commercial", "Pending PO", "PO Rejected", "Delivered"];
  }
  if (moduleKey === "purchase_orders" && role === "supplier") {
    return ["RFQ Issued", "Ordered", "In transit", "PO Rejected"];
  }
  if (moduleKey === "deliveries" && role === "in_charge") {
    return ["Pending Receipt", "Discrepancy", "Delivered"];
  }
  return stageStatuses[moduleKey];
}

export function isEditableStatus(status) {
  return status === "Draft" || status === "Returned";
}

export const WORKFLOW_ROLE_OPTIONS = [
  { key: "admin", name: "Admin" },
  { key: "requestor", name: "Requestor" },
  { key: "manager", name: "Department Manager" },
  { key: "procurement", name: "Procurement" },
  { key: "department_head", name: "Department Head" },
  { key: "finance", name: "Finance" },
  { key: "supplier", name: "Supplier" },
  { key: "in_charge", name: "Department Incharge" },
  { key: "back_office", name: "Back Office" },
];
