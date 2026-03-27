import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/axios";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, MapPin, Phone, FileText, ImagePlus, Loader2, Store } from "lucide-react";

interface Province { code: number; name: string; }
interface District { code: number; name: string; }
interface Ward { code: number; name: string; }

interface ImageSlot { preview: string; url: string; uploading: boolean; }

export default function SellerProfile() {
  const { user } = useAuth();

  // ── loaded state ─────────────────────────────────────────────────────────────
  const [info, setInfo] = useState({
    shopName: "",
    phone: "",
    description: "",
    shopAddress: "",
    shopAddressDetail: "",
    businessImages: ["", ""] as [string, string],
  });

  // ── edit: phone ──────────────────────────────────────────────────────────────
  const [editPhone, setEditPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // ── edit: description ────────────────────────────────────────────────────────
  const [editDesc, setEditDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  // ── edit: address ────────────────────────────────────────────────────────────
  const [editAddr, setEditAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selProvinceCode, setSelProvinceCode] = useState<number | null>(null);
  const [selProvince, setSelProvince] = useState("");
  const [selDistrictCode, setSelDistrictCode] = useState<number | null>(null);
  const [selDistrict, setSelDistrict] = useState("");
  const [selWard, setSelWard] = useState("");
  const [selStreet, setSelStreet] = useState("");

  // ── edit: images ─────────────────────────────────────────────────────────────
  const [editImages, setEditImages] = useState(false);
  const [imgSlots, setImgSlots] = useState<[ImageSlot, ImageSlot]>([
    { preview: "", url: "", uploading: false },
    { preview: "", url: "", uploading: false },
  ]);
  const [savingImages, setSavingImages] = useState(false);

  // ── load user info ────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/api/users/me").then((res) => {
      const si = res.data?.user?.sellerInfo ?? res.data?.sellerInfo ?? {};
      const imgs = si.businessImages ?? [];
      setInfo({
        shopName: si.shopName || user?.sellerInfo?.shopName || user?.username || "",
        phone: si.phone ?? "",
        description: si.productDescription ?? "",
        shopAddress: si.shopAddress ?? "",
        shopAddressDetail: si.shopAddressDetail ?? "",
        businessImages: [imgs[0] ?? "", imgs[1] ?? ""],
      });
    }).catch(() => {});
  }, [user]);

  // ── load provinces ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/?depth=1")
      .then((r) => r.json()).then((d: Province[]) => setProvinces(d)).catch(() => {});
  }, []);

  const fetchDistricts = useCallback((code: number) => {
    setDistricts([]); setWards([]);
    setSelDistrict(""); setSelDistrictCode(null); setSelWard("");
    fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
      .then((r) => r.json()).then((d: { districts: District[] }) => setDistricts(d.districts || [])).catch(() => {});
  }, []);

  const fetchWards = useCallback((code: number) => {
    setWards([]); setSelWard("");
    fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
      .then((r) => r.json()).then((d: { wards: Ward[] }) => setWards(d.wards || [])).catch(() => {});
  }, []);

  // ── save helpers ──────────────────────────────────────────────────────────────
  const patch = (body: Record<string, unknown>) =>
    api.put("/api/users/update-user-profile", { username: user?.username ?? "", ...body });

  const validatePhone = (val: string) => {
    if (!val) return "Phone number is required";
    if (!/^(0[3|5|7|8|9][0-9]{8}$|^\+84[3|5|7|8|9][0-9]{8})$/.test(val.trim()))
      return "Invalid phone number (e.g. 0912345678 or +84912345678)";
    return "";
  };

  const handleSavePhone = async () => {
    const err = validatePhone(phoneDraft);
    if (err) { setPhoneError(err); return; }
    setSavingPhone(true);
    try {
      await patch({ phone: phoneDraft.trim() });
      setInfo((p) => ({ ...p, phone: phoneDraft.trim() }));
      setEditPhone(false);
      setPhoneError("");
      toast.success("Phone updated");
    } catch { toast.error("Failed to update"); }
    finally { setSavingPhone(false); }
  };

  const handleSaveDesc = async () => {
    setSavingDesc(true);
    try {
      await patch({ productDescription: descDraft });
      setInfo((p) => ({ ...p, description: descDraft }));
      setEditDesc(false);
      toast.success("Description updated");
    } catch { toast.error("Failed to update"); }
    finally { setSavingDesc(false); }
  };

  const handleSaveAddr = async () => {
    if (!selProvince) { toast.error("Please select a province/city"); return; }
    setSavingAddr(true);
    const detail = [selStreet, selWard, selDistrict].filter(Boolean).join(", ");
    try {
      await patch({ shopAddress: selProvince, shopAddressDetail: detail });
      setInfo((p) => ({ ...p, shopAddress: selProvince, shopAddressDetail: detail }));
      setEditAddr(false);
      toast.success("Address updated");
    } catch { toast.error("Failed to update"); }
    finally { setSavingAddr(false); }
  };

  const handleOpenEditAddr = () => {
    setSelProvince(info.shopAddress); setSelProvinceCode(null);
    setSelDistrict(""); setSelDistrictCode(null); setSelWard(""); setSelStreet("");
    setDistricts([]); setWards([]);
    setEditAddr(true);
  };

  // ── image upload ──────────────────────────────────────────────────────────────
  const handleOpenEditImages = () => {
    setImgSlots([
      { preview: info.businessImages[0], url: info.businessImages[0], uploading: false },
      { preview: info.businessImages[1], url: info.businessImages[1], uploading: false },
    ]);
    setEditImages(true);
  };

  const handleImagePick = async (idx: 0 | 1, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImgSlots((prev) => {
      const next: [ImageSlot, ImageSlot] = [...prev] as [ImageSlot, ImageSlot];
      next[idx] = { preview, url: "", uploading: true };
      return next;
    });
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "");
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        fd
      );
      setImgSlots((prev) => {
        const next: [ImageSlot, ImageSlot] = [...prev] as [ImageSlot, ImageSlot];
        next[idx] = { preview, url: res.data.secure_url, uploading: false };
        return next;
      });
    } catch {
      toast.error("Image upload failed");
      setImgSlots((prev) => {
        const next: [ImageSlot, ImageSlot] = [...prev] as [ImageSlot, ImageSlot];
        next[idx] = { preview: info.businessImages[idx], url: info.businessImages[idx], uploading: false };
        return next;
      });
    }
  };

  const handleSaveImages = async () => {
    if (imgSlots.some((s) => s.uploading)) { toast.error("Please wait for uploads to finish"); return; }
    setSavingImages(true);
    try {
      const urls = imgSlots.map((s) => s.url).filter(Boolean);
      await patch({ businessImages: urls });
      setInfo((p) => ({ ...p, businessImages: [urls[0] ?? "", urls[1] ?? ""] }));
      setEditImages(false);
      toast.success("Photos updated");
    } catch { toast.error("Failed to save photos"); }
    finally { setSavingImages(false); }
  };

  const fullAddress = [info.shopAddressDetail, info.shopAddress].filter(Boolean).join(", ");

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Shop Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4 text-green-600" />
                Shop Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Shop name */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5 uppercase tracking-wide">Shop Name</p>
                <p className="text-base font-semibold text-gray-900">{info.shopName || "—"}</p>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Phone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone Number
                  </p>
                  {!editPhone && (
                    <button onClick={() => { setPhoneDraft(info.phone); setEditPhone(true); }}
                      className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  )}
                </div>
                {editPhone ? (
                  <div className="space-y-2 mt-2">
                    <input type="tel"
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${phoneError ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-green-400'}`}
                      placeholder="e.g. 0912345678"
                      value={phoneDraft}
                      onChange={(e) => { setPhoneDraft(e.target.value); if (phoneError) setPhoneError(""); }}
                    />
                    {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSavePhone} disabled={savingPhone}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditPhone(false); setPhoneError(""); }}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-800 mt-1">
                    {info.phone || <span className="text-gray-400 italic">Not set</span>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-green-600" />
                  Shop Description
                </CardTitle>
                {!editDesc && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => { setDescDraft(info.description); setEditDesc(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editDesc ? (
                <div className="space-y-2">
                  <Textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Describe your shop to buyers..." rows={4} className="resize-none" maxLength={500} />
                  <p className="text-xs text-gray-400 text-right">{descDraft.length}/500</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDesc} disabled={savingDesc}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditDesc(false)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {info.description || <span className="text-gray-400 italic">No description yet.</span>}
                </p>
              )}
            </CardContent>
          </Card>

        </div>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Address */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-green-600" />
                  Shop Address
                </CardTitle>
                {!editAddr && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleOpenEditAddr}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editAddr ? (
                <div className="space-y-3">
                  {/* Province */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Province / City <span className="text-red-500">*</span></label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      value={selProvinceCode ?? ""}
                      onChange={(e) => {
                        const code = Number(e.target.value);
                        const found = provinces.find((p) => p.code === code);
                        setSelProvinceCode(code || null);
                        setSelProvince(found?.name ?? "");
                        if (code) fetchDistricts(code);
                      }}
                    >
                      <option value="">Select province / city</option>
                      {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </select>
                  </div>
                  {/* District */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">District</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400"
                      value={selDistrictCode ?? ""}
                      disabled={districts.length === 0}
                      onChange={(e) => {
                        const code = Number(e.target.value);
                        const found = districts.find((d) => d.code === code);
                        setSelDistrictCode(code || null);
                        setSelDistrict(found?.name ?? "");
                        if (code) fetchWards(code);
                      }}
                    >
                      <option value="">Select district</option>
                      {districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                    </select>
                  </div>
                  {/* Ward */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ward / Commune</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400"
                      value={selWard}
                      disabled={wards.length === 0}
                      onChange={(e) => setSelWard(e.target.value)}
                    >
                      <option value="">Select ward / commune</option>
                      {wards.map((w) => <option key={w.code} value={w.name}>{w.name}</option>)}
                    </select>
                  </div>
                  {/* Street */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Street / House number</label>
                    <input type="text"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      placeholder="e.g. 123 Nguyen Trai"
                      value={selStreet}
                      onChange={(e) => setSelStreet(e.target.value)}
                    />
                  </div>
                  {selProvince && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      📍 {[selStreet, selWard, selDistrict, selProvince].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveAddr} disabled={savingAddr}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditAddr(false)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700">
                  {fullAddress || <span className="text-gray-400 italic">No address yet.</span>}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ID / Business Photos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImagePlus className="h-4 w-4 text-green-600" />
                  ID / Business Photos
                </CardTitle>
                {!editImages && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleOpenEditImages}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editImages ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {([0, 1] as (0 | 1)[]).map((idx) => {
                      const slot = imgSlots[idx];
                      return (
                        <div key={idx} className="space-y-2">
                          <p className="text-xs font-medium text-gray-500">Photo {idx + 1}</p>
                          <label className="relative block aspect-[4/3] rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-green-400 transition-colors group">
                            {slot.preview ? (
                              <>
                                <img src={slot.preview} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ImagePlus className="h-6 w-6 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <ImagePlus className="h-7 w-7 mb-1" />
                                <span className="text-xs">Click to upload</span>
                              </div>
                            )}
                            {slot.uploading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                              </div>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => handleImagePick(idx, e)} />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveImages}
                      disabled={savingImages || imgSlots.some((s) => s.uploading)}>
                      {savingImages ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Saving...</> : <><Check className="h-3.5 w-3.5 mr-1" />Save</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditImages(false)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {([0, 1] as const).map((idx) =>
                    info.businessImages[idx] ? (
                      <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-gray-50">
                        <img src={info.businessImages[idx]} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-1">
                          Photo {idx + 1}
                        </div>
                      </div>
                    ) : (
                      <div key={idx} className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-300">
                        <ImagePlus className="h-7 w-7 mb-1" />
                        <span className="text-xs">No photo</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
