import React from "react";

// NOTE:
// File nay chi de ghi chu cac thay doi can sua cho:
// src/components/address-form.tsx
//
// File goc address-form.tsx KHONG bi sua.
// Hien tai file goc co 2 van de ESLint chinh:
// 1. max-lines-per-function o component AddressForm
// 2. bien `error` trong catch khong duoc su dung

type FixNote = {
  id: string;
  lines: string;
  issue: string;
  plannedFix: string;
  why: string;
};

const fixNotes: FixNote[] = [
  {
    id: "AF01",
    lines: "53",
    issue:
      "Component AddressForm qua dai, bi warning max-lines-per-function (330 dong).",
    plannedFix:
      "Tach thanh cac hook/helper nho hon, vi du: useAddressOptions(), AddressDistrictFields, AddressActions.",
    why:
      "Giam do dai component, de doc hon, de test hon, va het warning max-lines-per-function.",
  },
  {
    id: "AF02",
    lines: "163",
    issue: "catch (error) nhung bien error khong duoc dung.",
    plannedFix:
      "Doi thanh catch { ... } neu khong can log loi, hoac giu catch (error) va log/toast them thong tin loi.",
    why:
      "Loai bo @typescript-eslint/no-unused-vars.",
  },
  {
    id: "AF03",
    lines: "74-96",
    issue: "Logic fetch districts/wards dang nam truc tiep trong component.",
    plannedFix:
      "Tach thanh hook rieng, vi du useVietnamAddressOptions(selectedDistrictCode).",
    why:
      "Giup component ngan hon va gom logic API vao mot cho de tai su dung.",
  },
  {
    id: "AF04",
    lines: "99-130",
    issue: "Logic reset form va pre-fill khi edit dang nam chung trong component.",
    plannedFix:
      "Tach thanh helper resetAddressForm(form, initialData, open) hoac hook useAddressFormSync().",
    why:
      "Lam phan setup form ro hon va giam size component chinh.",
  },
  {
    id: "AF05",
    lines: "199-287",
    issue:
      "Block JSX cho district/ward select kha dai, co the tach thanh component con.",
    plannedFix:
      "Tach thanh component AddressLocationFields de chua district + ward select.",
    why:
      "Giam do dai JSX va de bao tri phan form dia chi.",
  },
  {
    id: "AF06",
    lines: "137-141",
    issue:
      "handleSubmit hien chi toast message chung, khong phan biet loi tu backend hay validation.",
    plannedFix:
      "Neu can, them helper getErrorMessage(error) va hien toast cu the hon.",
    why:
      "Giup UX tot hon va de debug hon khi submit that bai.",
  },
];

function NoteCard({ note }: { note: FixNote }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{note.id}</p>
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

export default function AddressFormFixedNote() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            address-form.tsx - Note Da Sua / Ke Hoach Sua
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            File goc van duoc giu nguyen. Day la note tham khao cho{" "}
            <code>src/components/address-form.tsx</code>.
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
            <li>Sua nhanh loi unused var trong catch.</li>
            <li>Tach logic fetch districts/wards ra custom hook.</li>
            <li>Tach block district/ward select ra component con.</li>
            <li>Tach logic reset/pre-fill form ra helper rieng.</li>
            <li>Neu can, bo sung error handling cu the hon khi submit fail.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
