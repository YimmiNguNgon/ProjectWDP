import { useEffect, useState } from "react";
import {
  getAuditLogDetail,
  getAuditLogs,
  type AuditLogDetail,
  type AuditLogRow,
  type GetAuditLogsParams,
} from "@/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_FILTERS: GetAuditLogsParams = {
  actorRole: "",
  resourceType: "",
  action: "",
  statusCode: undefined,
  dateFrom: "",
  dateTo: "",
  search: "",
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const toJson = (value: unknown) => JSON.stringify(value ?? null, null, 2);

export default function AdminAuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [filters, setFilters] = useState<GetAuditLogsParams>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLogs = async (nextPage = page, nextFilters = filters) => {
    try {
      setLoading(true);
      const res = await getAuditLogs({
        page: nextPage,
        limit: 20,
        ...nextFilters,
      });
      setRows(res.data || []);
      setPage(res.pagination?.page || 1);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApplyFilters = () => {
    fetchLogs(1, filters);
  };

  const onResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    fetchLogs(1, DEFAULT_FILTERS);
  };

  const onOpenDetail = async (logId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedLog(null);
    try {
      const res = await getAuditLogDetail(logId);
      setSelectedLog(res.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load audit log detail");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track critical write actions from admin and seller accounts.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchLogs(page, filters)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Input
              placeholder="Actor role"
              value={filters.actorRole || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, actorRole: e.target.value }))
              }
            />
            <Input
              placeholder="Resource type"
              value={filters.resourceType || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, resourceType: e.target.value }))
              }
            />
            <Input
              placeholder="Action"
              value={filters.action || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, action: e.target.value }))
              }
            />
            <Input
              placeholder="Status code"
              value={filters.statusCode || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  statusCode: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
            <Input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
              }
            />
            <Input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search actor/path/resource..."
              value={filters.search || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") onApplyFilters();
              }}
            />
            <Button onClick={onApplyFilters}>Apply</Button>
            <Button variant="outline" onClick={onResetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log Entries ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading audit logs...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Actor</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">Resource</th>
                    <th className="py-2 pr-3">Result</th>
                    <th className="py-2 pr-3">Path</th>
                    <th className="py-2 pr-3">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatTime(row.createdAt)}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{row.actorUsername || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">{row.actorRole}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{row.action}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <div>{row.resourceType}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.resourceId || "-"}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge
                          className={
                            row.success
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {row.statusCode}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {row.method} {row.path}
                      </td>
                      <td className="py-2 pr-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenDetail(row._id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => fetchLogs(page - 1, filters)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => fetchLogs(page + 1, filters)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !selectedLog ? (
            <p className="text-sm text-muted-foreground">No detail data</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Info label="Actor" value={`${selectedLog.actorUsername} (${selectedLog.actorRole})`} />
                <Info label="Action" value={selectedLog.action} />
                <Info label="Resource" value={`${selectedLog.resourceType} / ${selectedLog.resourceId || "-"}`} />
                <Info label="Status" value={`${selectedLog.statusCode}`} />
                <Info label="Path" value={`${selectedLog.method} ${selectedLog.path}`} />
                <Info label="Time" value={formatTime(selectedLog.createdAt)} />
                <Info label="IP" value={selectedLog.ip || "-"} />
                <Info label="Duration" value={`${selectedLog.durationMs || 0}ms`} />
              </div>

              {selectedLog.errorMessage ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                  <div className="font-semibold">Error</div>
                  <div className="mt-1">{selectedLog.errorMessage}</div>
                </div>
              ) : null}

              <JsonBlock title="Request Body (Raw)" value={selectedLog.requestBodyRaw} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <JsonBlock title="Before" value={selectedLog.before} />
                <JsonBlock title="After" value={selectedLog.after} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Changed Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedLog.changedFields && selectedLog.changedFields.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="py-2 pr-2">Field</th>
                            <th className="py-2 pr-2">Before</th>
                            <th className="py-2 pr-2">After</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLog.changedFields.map((item, index) => (
                            <tr key={`${item.field}-${index}`} className="border-b align-top">
                              <td className="py-2 pr-2 font-medium">{item.field}</td>
                              <td className="py-2 pr-2">
                                <pre className="whitespace-pre-wrap break-all">{toJson(item.before)}</pre>
                              </td>
                              <td className="py-2 pr-2">
                                <pre className="whitespace-pre-wrap break-all">{toJson(item.after)}</pre>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No changed fields captured.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value || "-"}</div>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs whitespace-pre-wrap break-all rounded-md border bg-gray-50 p-3">
          {toJson(value)}
        </pre>
      </CardContent>
    </Card>
  );
}
