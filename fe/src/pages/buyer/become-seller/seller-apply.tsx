import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/axios";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChevronLeft,
  CheckCircle2,
  Zap,
  ShieldAlert,
  TrendingUp,
  Star,
  Package,
  Clock,
  MailCheck,
  ImagePlus,
  X,
  Phone,
  MapPin,
} from "lucide-react";

const PROBATION_LIMITS = [
  { icon: Package, label: "Max 5 products/day" },
  { icon: Clock, label: "Max 10 orders/day" },
  { icon: ShieldAlert, label: "Cannot list high-risk categories" },
];

const UPGRADE_CONDITIONS = [
  { label: "≥ 20 successful orders" },
  { label: "Average rating ≥ 4.5 ⭐" },
  { label: "Return rate < 5%" },
  { label: "Account age > 30 days" },
  { label: "No serious reports" },
];

interface Province { code: number; name: string; }
interface District { code: number; name: string; }
interface Ward { code: number; name: string; }

export default function SellerApplyPage() {
  const navigate = useNavigate();
  const { user, fetchMe } = useAuth();

  const [form, setForm] = useState({
    shopName: "",
    phone: "",
    productDescription: "",
  });
  const [address, setAddress] = useState({
    city: "", cityName: "",
    district: "", districtName: "",
    ward: "", wardName: "",
    street: "",
    detail: "",
  });
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  // 2 images
  const [images, setImages] = useState<{ file: File | null; preview: string; url: string }[]>([
    { file: null, preview: "", url: "" },
    { file: null, preview: "", url: "" },
  ]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth/sign-in"); return; }
    if (user.role === "seller") { navigate("/seller"); return; }
    if (user.role === "admin") { navigate("/"); return; }
    api.get("/api/seller-applications/my")
      .then((res) => { if (res.data.data) navigate("/seller"); })
      .catch(() => {})
      .finally(() => setCheckingStatus(false));
  }, [user, navigate]);

  useEffect(() => {
    axios.get("https://provinces.open-api.vn/api/p/").then((res) => setProvinces(res.data)).catch(() => {});
  }, []);

  const handleProvinceChange = async (code: string) => {
    const prov = provinces.find((p) => String(p.code) === code);
    setAddress((a) => ({ ...a, city: code, cityName: prov?.name || "", district: "", districtName: "", ward: "", wardName: "" }));
    setDistricts([]); setWards([]);
    try {
      const res = await axios.get(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
      setDistricts(res.data.districts || []);
    } catch {}
  };

  const handleDistrictChange = async (code: string) => {
    const dist = districts.find((d) => String(d.code) === code);
    setAddress((a) => ({ ...a, district: code, districtName: dist?.name || "", ward: "", wardName: "" }));
    setWards([]);
    try {
      const res = await axios.get(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
      setWards(res.data.wards || []);
    } catch {}
  };

  const handleWardChange = (code: string) => {
    const ward = wards.find((w) => String(w.code) === code);
    setAddress((a) => ({ ...a, ward: code, wardName: ward?.name || "" }));
  };

  const handleImageSelect = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      next[idx] = { file, preview, url: "" };
      return next;
    });
    // Upload to Cloudinary
    setUploadingIdx(idx);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "");
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );
      setImages((prev) => {
        const next = [...prev];
        next[idx] = { file, preview, url: res.data.secure_url };
        return next;
      });
    } catch {
      toast.error("Image upload failed. Please try again.");
      setImages((prev) => {
        const next = [...prev];
        next[idx] = { file: null, preview: "", url: "" };
        return next;
      });
    } finally {
      setUploadingIdx(null);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const next = [...prev];
      next[idx] = { file: null, preview: "", url: "" };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isEmailVerified) {
      toast.error("Please verify your email before registering as a seller");
      return;
    }
    if (form.productDescription.length < 20) {
      toast.error("Shop description must be at least 20 characters");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (!address.cityName) {
      toast.error("Please select your city/province");
      return;
    }
    const uploadedUrls = images.map((img) => img.url).filter(Boolean);
    if (uploadedUrls.length < 2) {
      toast.error("Please upload both required business photos");
      return;
    }
    if (uploadingIdx !== null) {
      toast.error("Please wait for images to finish uploading");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/seller-applications", {
        shopName: form.shopName,
        phone: form.phone,
        productDescription: form.productDescription,
        shopAddress: {
          city: address.cityName,
          district: address.districtName,
          ward: address.wardName,
          street: address.street,
          detail: address.detail,
        },
        businessImages: uploadedUrls,
      });
      await fetchMe();
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed, please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Checking status...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 flex flex-col items-center gap-6 text-center px-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div>
          <Badge className="mb-3 bg-blue-100 text-blue-700 hover:bg-blue-100">Auto-approved</Badge>
          <h2 className="text-2xl font-bold text-foreground mb-2">🎉 Congratulations! You are now a Seller</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your account has been successfully upgraded. <strong>A confirmation email</strong> has been sent to your inbox.
          </p>
        </div>
        <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">PROBATION Stage – Limits currently applied</span>
          </div>
          <div className="flex flex-col gap-2">
            {PROBATION_LIMITS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2 text-sm text-amber-700">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 text-left">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-700" />
            <span className="text-sm font-semibold text-green-800">Conditions to upgrade to NORMAL</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {UPGRADE_CONDITIONS.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm text-green-700">
                <Star className="h-3 w-3 flex-shrink-0" />
                <span>{c.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-green-600 mt-3">The system automatically checks and upgrades daily.</p>
        </div>
        <Button id="go-to-seller-panel-btn" size="lg" className="w-full cursor-pointer" onClick={() => navigate("/seller")}>
          Go to Seller Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <button
        onClick={() => navigate("/become-seller")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 cursor-pointer transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Go back
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Register to become a Seller</h1>
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Zap className="h-3 w-3 mr-1" />
            Auto-approved
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Fill in the information below. Your account will be upgraded <strong>instantly</strong> upon submission.
        </p>
      </div>

      {user && !user.isEmailVerified && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <MailCheck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Please <strong>verify your email</strong> before registering as a seller. Check your inbox.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Basic Info ── */}
        <div className="bg-white rounded-2xl border border-border/60 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Shop Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shopName">Shop name <span className="text-destructive">*</span></Label>
              <Input
                id="shopName"
                placeholder="e.g. ABC Fashion Store"
                value={form.shopName}
                onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))}
                required
                disabled={!user?.isEmailVerified}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">
                <Phone className="inline h-3.5 w-3.5 mr-1" />
                Phone number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 0912345678"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                required
                disabled={!user?.isEmailVerified}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="productDescription">Shop description <span className="text-destructive">*</span></Label>
            <Textarea
              id="productDescription"
              placeholder="Describe your shop and what you sell. e.g. Premium women's fashion, luxury handbags..."
              value={form.productDescription}
              onChange={(e) => setForm((p) => ({ ...p, productDescription: e.target.value }))}
              required
              rows={3}
              disabled={!user?.isEmailVerified}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters. Current: {form.productDescription.length} characters.
            </p>
          </div>
        </div>

        {/* ── Section 2: Address ── */}
        <div className="bg-white rounded-2xl border border-border/60 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Shop Address
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Province / City <span className="text-destructive">*</span></Label>
              <Select value={address.city} onValueChange={handleProvinceChange} disabled={!user?.isEmailVerified}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.code} value={String(p.code)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>District</Label>
              <Select value={address.district} onValueChange={handleDistrictChange} disabled={!address.city || !user?.isEmailVerified}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.code} value={String(d.code)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Ward</Label>
              <Select value={address.ward} onValueChange={handleWardChange} disabled={!address.district || !user?.isEmailVerified}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((w) => (
                    <SelectItem key={w.code} value={String(w.code)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="street">Street / House number</Label>
              <Input
                id="street"
                placeholder="e.g. 123 Nguyen Hue"
                value={address.street}
                onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                disabled={!user?.isEmailVerified}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail">Address detail</Label>
              <Input
                id="detail"
                placeholder="e.g. Floor 2, Building A"
                value={address.detail}
                onChange={(e) => setAddress((a) => ({ ...a, detail: e.target.value }))}
                disabled={!user?.isEmailVerified}
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Business Photos ── */}
        <div className="bg-white rounded-2xl border border-border/60 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Business Photos</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Upload 2 photos of your business (storefront, products, etc.) to verify your shop.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {images.map((img, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Photo {idx + 1} <span className="text-destructive">*</span></p>
                {img.preview ? (
                  <div className="relative group aspect-video rounded-xl overflow-hidden border border-border bg-gray-50">
                    <img src={img.preview} alt={`Business photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {uploadingIdx === idx && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <p className="text-white text-xs font-medium">Uploading...</p>
                      </div>
                    )}
                    {uploadingIdx !== idx && (
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {img.url && (
                      <div className="absolute bottom-2 right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ✓
                      </div>
                    )}
                  </div>
                ) : (
                  <label className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${!user?.isEmailVerified ? "opacity-50 cursor-not-allowed" : "border-border hover:border-orange-400 hover:bg-orange-50"}`}>
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Click to upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!user?.isEmailVerified}
                      onChange={(e) => handleImageSelect(idx, e)}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Info box */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold text-foreground mb-2">
            ℹ️ After registration, you will be in the <strong>PROBATION</strong> stage:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
            <li>Cannot list high-risk categories</li>
            <li>Existing products (if any) remain visible as normal</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            The system automatically upgrades to <strong>NORMAL</strong> when conditions are met.
          </p>
        </div>

        <Button
          type="submit"
          id="submit-seller-application-btn"
          size="lg"
          disabled={loading || !user?.isEmailVerified || uploadingIdx !== null}
          className="w-full cursor-pointer"
        >
          {loading ? "Processing..." : "Register as Seller now"}
        </Button>
      </form>
    </div>
  );
}
