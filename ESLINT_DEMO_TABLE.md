# ESLint Demo Table

Dung trong thu muc `fe`.

## Bang tong hop

| # | Loai loi | Y nghia | Do phuc tap |
| --- | --- | --- | --- |
| 1 | `Parsing error` | File parse khong qua, de hong build | Cao |
| 2 | `react-hooks/exhaustive-deps` | Hook thieu dependency | Cao |
| 3 | `react-refresh/only-export-components` | Export khong dung mau Fast Refresh | Trung binh |
| 4 | `no-useless-catch` | `try/catch` du thua | Thap |
| 5 | `no-explicit-any` | Mat an toan type | Trung binh |
| 6 | `no-unused-vars` | Bien khai bao nhung khong dung | Thap |
| 7 | `no-unsafe-function-type` | Dung kieu `Function` qua chung | Trung binh |
| 8 | `no-irregular-whitespace` | Co ky tu trang bat thuong | Thap |
| 9 | `no-unused-expressions` | Bieu thuc khong co tac dung | Trung binh |
| 10 | `no-empty` | Co block rong | Thap |
| 11 | `unused eslint-disable` | Co `eslint-disable` thua | Thap |
| 12 | `no-alert` | Dung `alert()` trong UI | Thap |
| 13 | `no-console` | Con log debug trong code | Thap |
| 14 | `no-nested-ternary` | Toan tu 3 ngoi long nhau | Trung binh |
| 15 | `complexity` | Do phuc tap logic qua cao | Cao |
| 16 | `max-lines-per-function` | Ham qua dai | Trung binh |
| 17 | `max-statements` | Ham co qua nhieu lenh | Cao |

## File demo

| Loai loi | File demo | Lenh chay |
| --- | --- | --- |
| `Parsing error` | `src/services/api.js` | `eslint src/services/api.js` |
| `react-hooks/exhaustive-deps` | `src/components/ProtectedRoute.tsx` | `eslint src/components/ProtectedRoute.tsx` |
| `react-refresh/only-export-components` | `src/components/PermissionGate.tsx` | `eslint src/components/PermissionGate.tsx` |
| `no-useless-catch` | `src/api/user.ts` | `eslint src/api/user.ts` |
| `no-explicit-any` | `src/api/orders.ts` | `eslint src/api/orders.ts` |
| `no-unused-vars` | `src/components/address-form.tsx` | `eslint src/components/address-form.tsx` |
| `no-unsafe-function-type` | `src/components/notification-bell.tsx` | `eslint src/components/notification-bell.tsx` |
| `no-irregular-whitespace` | `src/components/user-profile.tsx` | `eslint src/components/user-profile.tsx` |
| `no-unused-expressions` | `src/pages/public/products.tsx` | `eslint src/pages/public/products.tsx` |
| `no-empty` | `src/pages/buyer/become-seller/seller-apply.tsx` | `eslint src/pages/buyer/become-seller/seller-apply.tsx` |
| `unused eslint-disable` | `src/layouts/shipper.tsx` | `eslint src/layouts/shipper.tsx` |
| `no-alert` | `src/components/chat/conversation-list.tsx` | `eslint src/components/chat/conversation-list.tsx` |
| `no-console` | `src/components/chat/conversation-list.tsx` | `eslint src/components/chat/conversation-list.tsx` |
| `no-nested-ternary` | `src/components/cart/cart-dropdown.tsx` | `eslint src/components/cart/cart-dropdown.tsx` |
| `complexity` | `src/api/search.ts` | `eslint src/api/search.ts` |
| `max-lines-per-function` | `src/components/address-form.tsx` | `eslint src/components/address-form.tsx` |
| `max-statements` | `src/components/seller/seller-information.tsx` | `eslint src/components/seller/seller-information.tsx` |

## Lenh chung

```powershell
cd fe
.\node_modules\.bin\eslint.cmd src
```
