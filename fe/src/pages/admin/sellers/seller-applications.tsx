import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  LayoutGrid, List, Phone, MapPin, Store,
  Ban, Flag, Eye, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface ShopAddress {
  city?: string; district?: string; ward?: string; street?: string; detail?: string;
}
interface SellerInfo {
  shopName?: string;
  phone?: string;
  shopAddress?: string;
  shopAddressDetail?: string;
  productDescription?: string;
  businessImages?: string[];
}
interface Application {
  _id: string;
  shopName: string;
  phone?: string;
  shopAddress?: ShopAddress;
  productDescription: string;
  businessImages?: string[];
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  createdAt: string;
  user: { _id: string; username: string; email: string; status?: string; sellerInfo?: SellerInfo };
  reviewedBy?: { username: string };
}

/** Prefer current User.sellerInfo over original application data */
function getCurrent(app: Application) {
  const si = app.user?.sellerInfo;
  return {
    phone: si?.phone || app.phone || '',
    description: si?.productDescription || app.productDescription || '',
    address: si?.shopAddressDetail
      ? [si.shopAddressDetail, si.shopAddress].filter(Boolean).join(', ')
      : formatAddress(app.shopAddress),
    images: (si?.businessImages && si.businessImages.length > 0)
      ? si.businessImages
      : (app.businessImages ?? []),
    shopName: si?.shopName || app.shopName || '—',
  };
}

type ModalMode = 'none' | 'detail' | 'ban' | 'report';

const REPORT_REASONS = [
  'Violated platform terms of service',
  'Fraudulent or misleading information',
  'Fake/invalid ID documents',
  'Selling prohibited goods',
  'Abusive behavior toward buyers',
  'Other',
];

function formatAddress(addr?: ShopAddress) {
  if (!addr) return '—';
  return [addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ') || '—';
}

/** Fullscreen image lightbox — rendered in a portal-like fixed div */
function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 z-10 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20" onClick={onClose}>
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <>
          <button className="absolute left-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button className="absolute right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}>
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      <img src={images[idx]} alt={`Photo ${idx + 1}`}
        className="max-w-[88vw] max-h-[82vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <div className="absolute bottom-5 flex gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
      <div className="absolute bottom-5 right-6 text-white/50 text-sm">{idx + 1} / {images.length}</div>
    </div>
  );
}

/** Generic Modal shell — replaces shadcn Dialog to avoid z-index conflicts */
function Modal({ open, onClose, children, maxWidth = 'max-w-lg' }: {
  open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: React.ReactNode; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
      <div>
        <div className="text-base font-semibold text-gray-900">{title}</div>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="ml-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AdminSellerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // single modal state
  const [mode, setMode] = useState<ModalMode>('none');
  const [selected, setSelected] = useState<Application | null>(null);

  // lightbox (z-200, above modals)
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // ban
  const [banNote, setBanNote] = useState('');
  const [banLoading, setBanLoading] = useState(false);

  // report
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportMessage, setReportMessage] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const closeModal = () => { setMode('none'); };
  const openModal = (app: Application, m: ModalMode) => { setSelected(app); setMode(m); };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/seller-applications');
      setApplications(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Unable to load applications'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchApplications(); }, []);

  const handleBan = async () => {
    if (!selected) return;
    const isBanned = selected.user.status === 'banned';
    setBanLoading(true);
    try {
      await api.post(`/api/admin/users/${selected.user._id}/${isBanned ? 'unban' : 'ban'}`, { reason: banNote });
      const newStatus = isBanned ? 'active' : 'banned';
      // Optimistic update — no re-fetch needed
      setApplications((prev) =>
        prev.map((a) =>
          a.user._id === selected.user._id
            ? { ...a, user: { ...a.user, status: newStatus } }
            : a
        )
      );
      setSelected((prev) => prev ? { ...prev, user: { ...prev.user, status: newStatus } } : prev);
      toast.success(isBanned ? 'Seller unbanned' : 'Seller banned');
      closeModal(); setBanNote('');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBanLoading(false); }
  };

  const handleReport = async () => {
    if (!selected) return;
    setReportLoading(true);
    try {
      await api.post(`/api/admin/users/${selected.user._id}/report`, { reason: reportReason, message: reportMessage.trim() });
      toast.success(`Warning sent to seller "@${selected.user.username}"`);
      closeModal(); setReportMessage('');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setReportLoading(false); }
  };

  /** Action buttons row */
  const ActionButtons = ({ app }: { app: Application }) => {
    const isBanned = app.user?.status === 'banned';
    return (
      <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <button
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          onClick={() => openModal(app, 'detail')}
        >
          <Eye className="h-3 w-3" /> View
        </button>
        <button
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors text-white ${isBanned ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
          onClick={() => { setBanNote(''); openModal(app, 'ban'); }}
        >
          <Ban className="h-3 w-3" /> {isBanned ? 'Unban' : 'Ban'}
        </button>
        <button
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          onClick={() => { setReportReason(REPORT_REASONS[0]); setReportMessage(''); openModal(app, 'report'); }}
        >
          <Flag className="h-3 w-3" /> Report
        </button>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Lightbox — z-200, never conflicts with modals */}
      {lightboxImages.length > 0 && (
        <Lightbox images={lightboxImages} startIndex={lightboxIdx} onClose={() => setLightboxImages([])} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Review seller applications and registration details</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">{total} applications</span>
          {(['grid', 'list'] as const).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`p-2 rounded-lg border transition-colors ${viewMode === v ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              {v === 'grid' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No applications found</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {applications.map((app) => {
            const cur = getCurrent(app);
            const isBanned = app.user?.status === 'banned';
            return (
              <div key={app._id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md ${isBanned ? 'border-red-200 opacity-80' : 'border-border/60'}`}>
                {/* Photo strip */}
                <div className="grid grid-cols-2 bg-gray-100 cursor-pointer overflow-hidden"
                  style={{ height: '160px' }}
                  onClick={() => cur.images.length > 0 && (setLightboxImages(cur.images), setLightboxIdx(0))}>
                  {[0, 1].map((i) =>
                    cur.images[i] ? (
                      <div key={i} className={`relative overflow-hidden ${i === 1 ? 'border-l border-white/20' : ''}`}>
                        <img src={cur.images[i]} alt={`Photo ${i + 1}`}
                          className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div key={i} className={`flex items-center justify-center bg-gray-50 ${i === 1 ? 'border-l' : ''}`}>
                        <Store className="h-8 w-8 text-gray-200" />
                      </div>
                    )
                  )}
                </div>
                {/* Info */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{cur.shopName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{app.user?.username} · {app.user?.email}</p>
                    </div>
                    {isBanned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 flex-shrink-0">
                        <Ban className="w-3 h-3" /> Banned
                      </span>
                    )}
                  </div>
                  {cur.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{cur.phone}</p>}
                  {cur.address && cur.address !== '—' && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-shrink-0" />{cur.address}</p>
                  )}
                  {cur.description && <p className="text-xs text-gray-400 line-clamp-2">{cur.description}</p>}
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString('en-US')}</span>
                    <ActionButtons app={app} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="text-left px-5 py-3">Seller</th>
                <th className="text-left px-5 py-3">Shop</th>
                <th className="text-left px-5 py-3">Contact</th>
                <th className="text-left px-5 py-3">Photos</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {applications.map((app) => {
                const cur = getCurrent(app);
                const isBanned = app.user?.status === 'banned';
                return (
                  <tr key={app._id} className={`hover:bg-gray-50 transition-colors ${isBanned ? 'opacity-70' : ''}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{app.user?.username}</p>
                      <p className="text-xs text-muted-foreground">{app.user?.email}</p>
                      {isBanned && <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-600"><Ban className="w-2.5 h-2.5" />Banned</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{cur.shopName}</p>
                      {cur.address && cur.address !== '—' && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{cur.address}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{cur.phone || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        {cur.images.slice(0, 2).map((url, i) => (
                          <img key={i} src={url} alt="" className="h-10 w-10 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                            onClick={() => { setLightboxImages(cur.images); setLightboxIdx(i); }} />
                        ))}
                        {cur.images.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString('en-US')}</td>
                    <td className="px-5 py-3.5 text-right"><ActionButtons app={app} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <Modal open={mode === 'detail'} onClose={closeModal} maxWidth="max-w-2xl">
        {selected && (() => {
          const cur = getCurrent(selected);
          const isBanned = selected.user?.status === 'banned';
          return (
          <>
            <ModalHeader
              title={<span className="flex items-center gap-2">
                <Store className="h-4 w-4 text-orange-500" />{cur.shopName}
                {isBanned && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"><Ban className="w-3 h-3" />Banned</span>}
              </span>}
              subtitle={`@${selected.user?.username} · ${selected.user?.email}`}
              onClose={closeModal}
            />
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Photos */}
              {cur.images.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ID / Business Photos</p>
                  <div className="grid grid-cols-2 gap-3">
                    {cur.images.map((url, i) => (
                      <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-gray-50 cursor-pointer group"
                        onClick={() => { setLightboxImages(cur.images); setLightboxIdx(i); }}>
                        <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-1">Photo {i + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-400 mb-0.5">Phone</p><p className="font-medium">{cur.phone || '—'}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">Submitted</p><p className="font-medium">{new Date(selected.createdAt).toLocaleDateString('en-US')}</p></div>
                {cur.address && cur.address !== '—' && (
                  <div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">Address</p><p className="font-medium">{cur.address}</p></div>
                )}
              </div>

              {cur.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Shop Description</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 border leading-relaxed">{cur.description}</p>
                </div>
              )}
              {selected.adminNote && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Admin Note</p>
                  <p className="text-sm text-gray-700 bg-blue-50 rounded-xl p-3 border border-blue-100">{selected.adminNote}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={closeModal}>Close</Button>
              <button
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${selected.user?.status === 'banned' ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={() => { setBanNote(''); setMode('ban'); }}
              >
                <Ban className="h-3.5 w-3.5" />
                {selected.user?.status === 'banned' ? 'Unban' : 'Ban'}
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                onClick={() => { setReportReason(REPORT_REASONS[0]); setReportMessage(''); setMode('report'); }}
              >
                <Flag className="h-3.5 w-3.5" /> Report
              </button>
            </div>
          </>
          );
        })()}
      </Modal>

      {/* ── Ban Modal ── */}
      <Modal open={mode === 'ban'} onClose={closeModal}>
        {selected && (
          <>
            <ModalHeader
              title={<span className="flex items-center gap-2 text-red-700"><Ban className="h-4 w-4" />{selected.user?.status === 'banned' ? 'Unban seller' : 'Ban seller'}</span>}
              subtitle={selected.user?.status === 'banned'
                ? `Restore access for "${selected.shopName}" (@${selected.user?.username})?`
                : `Ban "${selected.shopName}" (@${selected.user?.username})?`}
              onClose={closeModal}
            />
            <div className="px-6 py-4">
              {selected.user?.status !== 'banned' && (
                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Textarea value={banNote} onChange={(e) => setBanNote(e.target.value)}
                    placeholder="e.g. Violated platform terms of service" rows={3} />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button
                className={selected.user?.status === 'banned' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}
                onClick={handleBan} disabled={banLoading}>
                {banLoading ? 'Processing...' : selected.user?.status === 'banned' ? 'Confirm Unban' : 'Confirm Ban'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Report Modal — same pattern as report product ── */}
      <Modal open={mode === 'report'} onClose={closeModal}>
        {selected && (
          <>
            <ModalHeader
              title={<span className="flex items-center gap-2"><Flag className="h-4 w-4 text-orange-500" />Report Seller</span>}
              subtitle="A warning will be sent directly to the seller via system notifications"
              onClose={closeModal}
            />
            <div className="px-6 py-4 space-y-4">
              {/* Seller info chip */}
              <div className="p-3 bg-gray-50 rounded-xl border text-sm">
                <p className="font-medium">{selected.shopName}</p>
                <p className="text-gray-500">@{selected.user?.username}</p>
              </div>

              <div className="space-y-1.5">
                <Label>Reason <span className="text-red-500">*</span></Label>
                <select
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Details (optional)</Label>
                <Textarea rows={4} placeholder="Describe the violation in detail..."
                  value={reportMessage} onChange={(e) => setReportMessage(e.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button className="bg-orange-500 hover:bg-orange-600"
                onClick={handleReport} disabled={reportLoading}>
                {reportLoading ? 'Sending...' : 'Send warning to seller'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
