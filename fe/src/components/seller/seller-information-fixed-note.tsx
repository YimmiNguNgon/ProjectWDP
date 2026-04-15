import React from "react";

// NOTE:
// File nay chi de ghi chu cac thay doi can sua cho:
// src/components/seller/seller-information.tsx
//
// File goc seller-information.tsx KHONG bi sua.
// Muc dich:
// 1. Danh dau dung vi tri dang bi ESLint bao loi.
// 2. Ghi ro can sua gi o tung nhom.
// 3. Lam tai lieu tham khao truoc khi tach component/logic that su.

type FixNote = {
  id: string;
  area: string;
  lines: string;
  issue: string;
  plannedFix: string;
  why: string;
};

const fixNotes: FixNote[] = [
  {
    id: "SI01",
    area: "Unused imports",
    lines: "8, 11-17, 19, 23, 25-26, 32, 42",
    issue:
      "Nhieu import khong duoc dung: ScrollArea, CheckCircle, Zap, Clock, Eye, TrendingUp, ShoppingBag, Store, Share2, Flag, TabsList, TabsTrigger, Avatar, AvatarFallback.",
    plannedFix:
      "Xoa cac import thua neu khong can, hoac dua vao UI neu thuc su se dung.",
    why:
      "Giam @typescript-eslint/no-unused-vars va lam phan dau file de doc hon.",
  },
  {
    id: "SI02",
    area: "Type variants",
    lines: "106",
    issue: "variants: any[]",
    plannedFix:
      "Dinh nghia type VariantItem hoac dung unknown[] tam thoi neu chua ro shape.",
    why:
      "Loai bo @typescript-eslint/no-explicit-any o model SellerProduct.",
  },
  {
    id: "SI03",
    area: "Error handling reviews",
    lines: "243",
    issue: "catch (err: any)",
    plannedFix:
      "Doi sang catch (err: unknown) va doc message qua helper getErrorMessage().",
    why:
      "Loai bo any trong block fetch reviews.",
  },
  {
    id: "SI04",
    area: "Saved sellers",
    lines: "279",
    issue: "saved.some((s: any) => s._id === sellerId)",
    plannedFix:
      "Dinh nghia type SavedSeller = { _id: string } va cast mang saved.",
    why:
      "Loai bo any trong effect load follow state.",
  },
  {
    id: "SI05",
    area: "Fallback categories",
    lines: "346",
    issue: "fallbackRes.data.data.forEach((product: any) => ...)",
    plannedFix:
      "Tao type ProductCategorySource cho product trong fallback categories.",
    why:
      "Loai bo any va ro rang shape du lieu category fallback.",
  },
  {
    id: "SI06",
    area: "Products query params",
    lines: "396",
    issue: "const params: any = { ... }",
    plannedFix:
      "Dinh nghia type ProductQueryParams voi page, limit, sort, search?, categoryId?.",
    why:
      "Loai bo any cho params request.",
  },
  {
    id: "SI07",
    area: "Fetch products catch",
    lines: "419",
    issue: "catch (err: any)",
    plannedFix:
      "Doi sang unknown va su dung helper lay error message neu can.",
    why:
      "Loai bo any va thong nhat cach xu ly loi.",
  },
  {
    id: "SI08",
    area: "Memo dependency",
    lines: "435-454",
    issue:
      "allReviews duoc khoi tao bang logical expression, lam dependency useMemo thay doi moi render.",
    plannedFix:
      "Boc allReviews vao useMemo rieng hoac dat thanh bien derived on dinh tu allData.",
    why:
      "Loai warning react-hooks/exhaustive-deps.",
  },
  {
    id: "SI09",
    area: "Unused computed values",
    lines: "437, 464, 506",
    issue:
      "thisItemReviews, formatDate, handleShare duoc khai bao nhung khong su dung.",
    plannedFix:
      "Xoa neu khong can, hoac dua vao UI/flow thuc te.",
    why:
      "Loai bo @typescript-eslint/no-unused-vars.",
  },
  {
    id: "SI10",
    area: "Main component too large",
    lines: "173-1278",
    issue:
      "SellerInformationPage qua dai, qua nhieu statements va complexity rat cao.",
    plannedFix:
      "Tach thanh cac phan: useSellerReviews, useSellerProducts, useSellerFollow, SellerSidebar, SellerFeedbackTab, SellerProductsTab, SellerAboutTab.",
    why:
      "Giai quyet dong thoi max-lines-per-function, max-statements, complexity.",
  },
  {
    id: "SI11",
    area: "Nested ternary in product cards",
    lines: "646, 704, 893, 905, 1334, 1336",
    issue: "Nhieu nested ternary trong JSX.",
    plannedFix:
      "Dua logic ra bien trung gian truoc return, hoac doi sang helper function.",
    why:
      "Loai warning no-nested-ternary va JSX de doc hon.",
  },
  {
    id: "SI12",
    area: "Text mojibake / font issues",
    lines: "Comment + UI text nhieu cho",
    issue:
      "Con mot so comment/text bi loi ma hoa: vi du 'Tá»•ng sá»‘ sáº£n pháº©m...' , 'Â·', 'â‚«'.",
    plannedFix:
      "Chuan hoa lai text/comment ve UTF-8 dung, uu tien comment truoc, sau do den label UI.",
    why:
      "Giup code de doc, tranh nham lan khi demo hoac bao cao.",
  },
  {
    id: "SI13",
    area: "Suggested first split",
    lines: "Sidebar block, Feedback tab, Products tab, About tab",
    issue: "Mot component dang vua fetch data vua render qua nhieu khu vuc UI.",
    plannedFix:
      "Tach 4 component con: SellerSidebarCard, SellerFeedbackPanel, SellerProductsPanel, SellerAboutPanel.",
    why:
      "Day la cach nhanh nhat de giam size file ma khong doi behavior qua nhieu.",
  },
];

function NoteCard({ note }: { note: FixNote }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{note.id}</p>
          <p className="text-xs text-gray-500">{note.area}</p>
        </div>
        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium">
          Line {note.lines}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-medium">Issue:</span> {note.issue}
        </p>
        <p>
          <span className="font-medium">Planned fix:</span> {note.plannedFix}
        </p>
        <p>
          <span className="font-medium">Why:</span> {note.why}
        </p>
      </div>
    </div>
  );
}

export default function SellerInformationFixedNote() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            seller-information.tsx - Note Da Sua / Ke Hoach Sua
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            File goc van giu nguyen. Day la danh sach cac diem can sua neu tiep
            tuc don dep ESLint cho{" "}
            <code>src/components/seller/seller-information.tsx</code>.
          </p>
        </div>

        <div className="grid gap-4">
          {fixNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Thu tu sua de xuat</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Xoa import/variable thua de giam loi nhanh.</li>
            <li>Thay toan bo <code>any</code> bang type cu the.</li>
            <li>On dinh bien derived nhu <code>allReviews</code>.</li>
            <li>Tach component lon thanh cac panel rieng.</li>
            <li>Tach cac hook fetch data rieng cho reviews/products/follow.</li>
            <li>Don dep nested ternary va chuoi text bi loi font.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
