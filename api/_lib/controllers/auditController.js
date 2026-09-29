const Audit = require("../models/auditModel");
const { hasPrivilege } = require("../utils/privileges");

function toPublic(record) {
  return {
    id: record._id.toString(),
    action: record.action,
    module: record.module || "",
    summary: record.summary,
    actorName: record.actorName || "",
    actorEmail: record.actorEmail || "",
    actorRole: record.actorRole || "",
    targetType: record.targetType || "",
    targetId: record.targetId || "",
    meta: record.meta || {},
    createdAt: record.createdAt,
    date: record.createdAt
      ? record.createdAt.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "",
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const listAudits = async (req, res) => {
  try {
    if (!hasPrivilege(req.user, "audits", "view")) {
      return res.status(403).json({ message: "You do not have access to audits" });
    }
    const query = String(req.query.q || req.query.search || "").trim();
    const limit = Math.min(Number(req.query.limit) || (query ? 2000 : 200), query ? 2000 : 500);
    const filter = {};
    if (req.query.module) filter.module = String(req.query.module);
    if (req.query.action) filter.action = String(req.query.action);
    if (query) {
      const pattern = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ actorName: pattern }, { actorEmail: pattern }, { summary: pattern }];
    }
    const rows = await Audit.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ audits: rows.map(toPublic) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listAudits };
