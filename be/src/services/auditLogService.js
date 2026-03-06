const AuditLog = require("../models/AuditLog");

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const normalizeId = (value) => {
  if (!value) return "";
  return String(value);
};

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const clone = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
};

const extractByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return String(path)
    .split(".")
    .reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), obj);
};

const inferActionFromRequest = ({ method, path }) => {
  const normalizedMethod = String(method || "").toUpperCase();
  const normalizedPath = String(path || "").toLowerCase();

  if (normalizedPath.includes("/ban")) return "ban";
  if (normalizedPath.includes("/unban")) return "unban";
  if (normalizedPath.includes("/approve")) return "approve";
  if (normalizedPath.includes("/reject")) return "reject";
  if (normalizedPath.includes("/review")) return "review";
  if (normalizedPath.includes("/status")) return "status_change";

  if (normalizedMethod === "POST") return "create";
  if (normalizedMethod === "DELETE") return "delete";
  if (normalizedMethod === "PUT" || normalizedMethod === "PATCH") return "update";

  return "write";
};

const diffObjects = (before, after, prefix = "") => {
  const diffs = [];
  const beforeObj = isObject(before) ? before : {};
  const afterObj = isObject(after) ? after : {};
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const key of keys) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const oldVal = beforeObj[key];
    const newVal = afterObj[key];

    const bothObjects = isObject(oldVal) && isObject(newVal);
    if (bothObjects) {
      diffs.push(...diffObjects(oldVal, newVal, fieldPath));
      continue;
    }

    const oldSerialized = JSON.stringify(oldVal === undefined ? null : oldVal);
    const newSerialized = JSON.stringify(newVal === undefined ? null : newVal);
    if (oldSerialized !== newSerialized) {
      diffs.push({
        field: fieldPath,
        before: clone(oldVal),
        after: clone(newVal),
      });
    }
  }

  return diffs;
};

const buildChangedFields = ({ before, after, fallbackBody }) => {
  if (before && after) {
    return diffObjects(before, after);
  }

  if (!fallbackBody || !isObject(fallbackBody)) {
    return [];
  }

  return Object.keys(fallbackBody).map((key) => ({
    field: key,
    before: null,
    after: clone(fallbackBody[key]),
  }));
};

const pickResourceId = ({ req, resBody, opts }) => {
  if (opts?.resourceIdResolver && typeof opts.resourceIdResolver === "function") {
    const resolved = opts.resourceIdResolver(req, resBody);
    if (resolved) return normalizeId(resolved);
  }

  if (opts?.resourceIdParam && req?.params?.[opts.resourceIdParam]) {
    return normalizeId(req.params[opts.resourceIdParam]);
  }

  if (opts?.resourceIdBodyKey) {
    const bodyValue = extractByPath(req.body, opts.resourceIdBodyKey);
    if (bodyValue) return normalizeId(bodyValue);
  }

  const responseId =
    extractByPath(resBody, "data._id") ||
    extractByPath(resBody, "data.id") ||
    extractByPath(resBody, "_id") ||
    extractByPath(resBody, "id");

  return normalizeId(responseId);
};

const fetchResourceSnapshot = async ({ model, resourceId }) => {
  if (!model || !resourceId) return null;
  try {
    const doc = await model.findById(resourceId).lean();
    return clone(doc);
  } catch (_) {
    return null;
  }
};

const shouldLogRequest = ({ req, opts }) => {
  const method = String(req?.method || "").toUpperCase();
  if (!WRITE_METHODS.has(method)) return false;

  if (opts?.actorRoles && Array.isArray(opts.actorRoles) && opts.actorRoles.length > 0) {
    const actorRole = String(req?.user?.role || "");
    if (!opts.actorRoles.includes(actorRole)) return false;
  }

  return true;
};

const writeAuditLog = async (payload) => {
  try {
    await AuditLog.create(payload);
  } catch (error) {
    console.error("Audit log write failed:", error?.message || error);
  }
};

module.exports = {
  clone,
  diffObjects,
  extractByPath,
  fetchResourceSnapshot,
  inferActionFromRequest,
  pickResourceId,
  shouldLogRequest,
  writeAuditLog,
  buildChangedFields,
};
