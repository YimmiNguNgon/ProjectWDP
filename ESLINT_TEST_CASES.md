# ESLint Test Cases

Ap dung trong thu muc `fe`.

## Danh sach 20 test case

| ID | Muc tieu | Buoc thuc hien | Ket qua mong doi |
| --- | --- | --- | --- |
| TC01 | Kiem tra ESLint chay toan bo frontend | Chay `eslint src` | ESLint quet toan bo `src` va hien danh sach loi/warning |
| TC02 | Kiem tra parse error | Chay `eslint src/services/api.js` | Bao `Parsing error: Duplicate export 'productAPI'` |
| TC03 | Kiem tra hook dependency | Chay `eslint src/components/ProtectedRoute.tsx` | Bao `react-hooks/exhaustive-deps` |
| TC04 | Kiem tra Fast Refresh export | Chay `eslint src/components/PermissionGate.tsx` | Bao `react-refresh/only-export-components` |
| TC05 | Kiem tra try/catch du thua | Chay `eslint src/api/user.ts` | Bao `no-useless-catch` |
| TC06 | Kiem tra dung `any` trong API | Chay `eslint src/api/orders.ts` | Bao `@typescript-eslint/no-explicit-any` |
| TC07 | Kiem tra bien khong su dung | Chay `eslint src/components/address-form.tsx` | Bao `@typescript-eslint/no-unused-vars` |
| TC08 | Kiem tra kieu `Function` khong an toan | Chay `eslint src/components/notification-bell.tsx` | Bao `@typescript-eslint/no-unsafe-function-type` |
| TC09 | Kiem tra ky tu trang bat thuong | Chay `eslint src/components/user-profile.tsx` | Bao `no-irregular-whitespace` |
| TC10 | Kiem tra bieu thuc khong co tac dung | Chay `eslint src/pages/public/products.tsx` | Bao `@typescript-eslint/no-unused-expressions` |
| TC11 | Kiem tra block rong | Chay `eslint src/pages/buyer/become-seller/seller-apply.tsx` | Bao `no-empty` |
| TC12 | Kiem tra eslint-disable thua | Chay `eslint src/layouts/shipper.tsx` | Bao `Unused eslint-disable directive` |
| TC13 | Kiem tra `alert()` trong UI | Chay `eslint src/components/chat/conversation-list.tsx` | Bao `no-alert` |
| TC14 | Kiem tra log debug trong code | Chay `eslint src/components/chat/conversation-list.tsx` | Bao `no-console` |
| TC15 | Kiem tra ternary long nhau | Chay `eslint src/components/cart/cart-dropdown.tsx` | Bao `no-nested-ternary` |
| TC16 | Kiem tra do phuc tap logic | Chay `eslint src/api/search.ts` | Bao `complexity` |
| TC17 | Kiem tra ham qua dai | Chay `eslint src/components/address-form.tsx` | Bao `max-lines-per-function` |
| TC18 | Kiem tra ham qua nhieu lenh | Chay `eslint src/components/seller/seller-information.tsx` | Bao `max-statements` |
| TC19 | Kiem tra mot file co nhieu loi cung luc | Chay `eslint src/api/user.ts` | Hien nhieu loi trong cung 1 file, gom `no-useless-catch` va `no-explicit-any` |
| TC20 | Kiem tra tong hop nhieu rule moi | Chay `eslint src/components/chat/conversation-list.tsx` | Hien dong thoi `no-alert`, `no-console`, `no-explicit-any` neu co |

## Lenh mau

```powershell
cd fe
.\node_modules\.bin\eslint.cmd src
```

## Lenh chay tung case

```powershell
eslint src/services/api.js
eslint src/components/ProtectedRoute.tsx
eslint src/components/PermissionGate.tsx
eslint src/api/user.ts
eslint src/api/orders.ts
eslint src/components/address-form.tsx
eslint src/components/notification-bell.tsx
eslint src/components/user-profile.tsx
eslint src/pages/public/products.tsx
eslint src/pages/buyer/become-seller/seller-apply.tsx
eslint src/layouts/shipper.tsx
eslint src/components/chat/conversation-list.tsx
eslint src/components/cart/cart-dropdown.tsx
eslint src/api/search.ts
eslint src/components/seller/seller-information.tsx
```
