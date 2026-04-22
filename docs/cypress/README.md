# Cypress Docs For This Repo

## Muc tieu

Bo tai lieu nay dung de test cac luong chinh cua du an WDP bang Cypress theo 3 nhom tai khoan:

- `admin`
- `seller`
- `buyer`

Tai lieu nay bam theo code hien tai cua repo, khong viet chung chung.

## Tai lieu trong thu muc nay

- [TEST_ACCOUNTS_AND_ENV.md](C:/Users/Administrator/Documents/WDP/docs/cypress/TEST_ACCOUNTS_AND_ENV.md): moi truong, tai khoan test, cach khoi dong app
- [ROLE_BASED_TEST_FLOWS.md](C:/Users/Administrator/Documents/WDP/docs/cypress/ROLE_BASED_TEST_FLOWS.md): ma tran luong test va test case cho admin, seller, buyer
- [DEBUG_GUIDE.md](C:/Users/Administrator/Documents/WDP/docs/cypress/DEBUG_GUIDE.md): quy trinh debug khi Cypress fail

Ngoai ra da co nhom demo frontend de test nhanh UI/UX trong:

- `cypress/e2e/frontend/public-pages.cy.js`
- `cypress/e2e/frontend/forms-validation.cy.js`
- `cypress/e2e/frontend/products-ui.cy.js`
- `cypress/e2e/frontend/responsive-smoke.cy.js`

## Nhung diem quan trong da xac nhan tu code

- Dang nhap frontend nam o `/auth/sign-in` theo [fe/src/routes/index.tsx](C:/Users/Administrator/Documents/WDP/fe/src/routes/index.tsx:1)
- Form dang nhap redirect theo role:
  - `admin` -> `/admin`
  - `seller` -> `/seller`
  - `shipper` -> `/shipper`
  - role khac -> `/`
  theo [fe/src/components/sign-in-form.tsx](C:/Users/Administrator/Documents/WDP/fe/src/components/sign-in-form.tsx:1)
- Backend tu tao tai khoan mac dinh:
  - `admin/admin`
  - `seller/seller`
  theo [be/src/server.js](C:/Users/Administrator/Documents/WDP/be/src/server.js:158)
- Repo khong tu tao `buyer/buyer`. Buyer test account hien co trong seed data, xem [be/src/scripts/seed.js](C:/Users/Administrator/Documents/WDP/be/src/scripts/seed.js:1181)

## Thu tu trien khai Cypress de xai duoc nhanh

1. Chay backend `be`.
2. Chay frontend `fe`.
3. Xac nhan login bang 1 tai khoan admin va 1 tai khoan seller.
4. Neu can luong buyer day du, nap seed data de co buyer va order/cart mau.
5. Bat dau viet smoke test truoc.
6. Sau do viet role test va checkout/order test.

## Bo test nen co theo giai doan

### Giai doan 1: Smoke

- login thanh cong theo role
- user sai role bi chan route
- route private yeu cau dang nhap

### Giai doan 2: Main flow

- admin vao dashboard va cac trang quan ly chinh
- seller tao san pham, xem don hang
- buyer xem san pham, vao cart, checkout

### Giai doan 3: Regression va debug

- test loi login sai mat khau
- test unauthorized route
- test checkout khong co dia chi
- test UI khi API loi

## Ghi chu thuc dung

Neu ban muon giu dung ten tai khoan `buyer/buyer` cho tai lieu noi bo, co 2 cach:

1. Tao them 1 buyer test account rieng trong database.
2. Dung tai khoan seed co san nhu `buyer1@wdp.com / password123`.

Trong bo tai lieu nay, toi viet ro ca hai cach de tranh nham lan giua "tai khoan mong muon" va "tai khoan dang ton tai that trong repo".
