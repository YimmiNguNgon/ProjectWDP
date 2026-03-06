const {
  buildChangedFields,
  clone,
  fetchResourceSnapshot,
  inferActionFromRequest,
  pickResourceId,
  shouldLogRequest,
  writeAuditLog,
} = require("../services/auditLogService");

const captureResponseBody = (res) => {
  let capturedBody = null;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = (body) => {
    capturedBody = body;
    return originalJson(body);
  };

  res.send = (body) => {
    if (capturedBody === null) {
      capturedBody = body;
    }
    return originalSend(body);
  };

  return () => capturedBody;
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "";
};

const withAuditLog = (opts = {}) => {
  return async (req, res, next) => {
    if (!shouldLogRequest({ req, opts })) {
      return next();
    }

    const getCapturedBody = captureResponseBody(res);
    const startedAt = Date.now();
    const requestBodyRaw = clone(req.body || {});

    let resourceId = "";
    let beforeSnapshot = null;
    if (opts?.resourceIdParam && req.params?.[opts.resourceIdParam]) {
      resourceId = String(req.params[opts.resourceIdParam]);
      beforeSnapshot = await fetchResourceSnapshot({
        model: opts?.model,
        resourceId,
      });
    }

    res.on("finish", async () => {
      const statusCode = Number(res.statusCode || 0);
      const isSuccess = statusCode >= 200 && statusCode < 400;
      const responseBody = getCapturedBody();

      const effectiveResourceId =
        resourceId ||
        pickResourceId({
          req,
          resBody: responseBody,
          opts,
        });

      const afterSnapshot =
        isSuccess && opts?.model
          ? await fetchResourceSnapshot({
              model: opts.model,
              resourceId: effectiveResourceId,
            })
          : null;

      const changedFields = buildChangedFields({
        before: beforeSnapshot,
        after: afterSnapshot,
        fallbackBody: requestBodyRaw,
      });

      const action = opts?.action || inferActionFromRequest({
        method: req.method,
        path: req.originalUrl,
      });

      const errorMessage =
        !isSuccess && responseBody && typeof responseBody === "object"
          ? String(responseBody.message || responseBody.error || "")
          : "";

      await writeAuditLog({
        actorId: req.user?._id || null,
        actorRole: String(req.user?.role || ""),
        actorUsername: String(req.user?.username || req.user?.email || ""),
        action,
        resourceType: opts.resourceType || "unknown",
        resourceId: String(effectiveResourceId || ""),
        method: String(req.method || ""),
        path: String(req.originalUrl || req.url || ""),
        statusCode,
        ip: getClientIp(req),
        userAgent: String(req.headers["user-agent"] || ""),
        requestBodyRaw,
        before: beforeSnapshot,
        after: afterSnapshot,
        changedFields,
        errorMessage,
        success: isSuccess,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  };
};

module.exports = {
  withAuditLog,
};
