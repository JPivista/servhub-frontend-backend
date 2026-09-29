export const userGroups = {
  admins: ["super_admin", "admin"],
  employees: [
    "admin",
    "purchase",
    "hr",
    "manager",
    "development_tl",
    "design_tl",
    "testing_tl",
    "store_manager",
    "worker",
    "user",
  ],
  managers: ["manager"],
  team_leads: ["development_tl", "design_tl", "testing_tl"],
  workers: ["worker"],
};

export const recordModules = {
  departments: {
    title: "Departments",
    fields: [
      { key: "name", label: "Name" },
      { key: "lead", label: "Lead" },
    ],
  },
  requests: {
    title: "Requests",
    fields: [
      { key: "title", label: "Title" },
      { key: "department", label: "Department" },
      { key: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Rejected"] },
    ],
    workflow: true,
  },
  purchase: {
    title: "Purchase",
    fields: [
      { key: "item", label: "Item" },
      { key: "vendor", label: "Vendor" },
      { key: "amount", label: "Amount" },
    ],
  },
  vendors: {
    title: "Vendors",
    fields: [
      { key: "name", label: "Name" },
      { key: "contact", label: "Contact" },
    ],
  },
  attendance: {
    title: "Attendance",
    fields: [
      { key: "name", label: "Employee" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", type: "select", options: ["Present", "Absent", "Leave"] },
    ],
  },
  leave: {
    title: "Leave",
    fields: [
      { key: "name", label: "Employee" },
      { key: "days", label: "Days" },
      { key: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Rejected"] },
    ],
    workflow: true,
  },
  tasks: {
    title: "Tasks",
    fields: [
      { key: "title", label: "Title" },
      { key: "assignee", label: "Assignee" },
      { key: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Done"] },
    ],
  },
  testing: {
    title: "Testing",
    fields: [
      { key: "title", label: "Case" },
      { key: "status", label: "Status", type: "select", options: ["Queued", "Passed", "Failed"] },
    ],
  },
  inventory: {
    title: "Inventory",
    fields: [
      { key: "item", label: "Item" },
      { key: "quantity", label: "Quantity" },
    ],
  },
  stock: {
    title: "Stock",
    fields: [
      { key: "item", label: "Item" },
      { key: "quantity", label: "Quantity" },
    ],
  },
};

export const defaultCollections = {
  departments: [],
  requests: [],
  purchase: [],
  vendors: [],
  attendance: [],
  leave: [],
  tasks: [],
  testing: [],
  inventory: [],
  stock: [],
};
