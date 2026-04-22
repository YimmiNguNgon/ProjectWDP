# Test Accounts And Environment

## 1. Muc dich

Tai lieu nay chot cac tai khoan test va cach dung moi truong de chay Cypress on dinh.

## 2. Cac tai khoan da co trong code

### 2.1. Tai khoan mac dinh do backend tu tao

Theo [be/src/server.js](C:/Users/Administrator/Documents/WDP/be/src/server.js:158), backend tu dam bao co:

- `admin / admin`
- `seller / seller`

Hai tai khoan nay duoc tao khi server khoi dong va khong tim thay user tuong ung.

### 2.2. Tai khoan buyer trong du lieu seed

Repo hien khong tu tao `buyer / buyer`.

Theo [be/src/scripts/seed.js](C:/Users/Administrator/Documents/WDP/be/src/scripts/seed.js:1181), cac buyer seed hien co:

- `buyer1@wdp.com / password123`
- `buyer2@wdp.com / password123`
- `buyer3@wdp.com / password123`
- `buyer4@wdp.com / password123`
- `buyer5@wdp.com / password123`

Neu ban can viet tai lieu theo ten gon:

- `buyer` = tai khoan buyer test logic

nhung khi chay that, nen map sang:

- `buyer1@wdp.com / password123`

## 3. Khuyen nghi chinh thuc cho bo test

Dung bo account sau:

- Admin: `admin / admin`
- Seller: `seller / seller`
- Buyer: `buyer1@wdp.com / password123`

Neu ban bat buoc muon test dung ten `buyer / buyer`, hay tao them account nay truoc khi chay test.

## 4. Route va auth da xac nhan

### 4.1. Route login

Frontend:

- `/auth/sign-in`

Theo [fe/src/routes/index.tsx](C:/Users/Administrator/Documents/WDP/fe/src/routes/index.tsx:1)

### 4.2. API login

Backend:

- `POST /api/auth/login`

Theo [be/src/routes/authRoutes.js](C:/Users/Administrator/Documents/WDP/be/src/routes/authRoutes.js:1)

### 4.3. Redirect sau login

Theo [fe/src/components/sign-in-form.tsx](C:/Users/Administrator/Documents/WDP/fe/src/components/sign-in-form.tsx:1):

- admin -> `/admin`
- seller -> `/seller`
- shipper -> `/shipper`
- buyer -> `/`

### 4.4. Session tren frontend

Theo [fe/src/main.tsx](C:/Users/Administrator/Documents/WDP/fe/src/main.tsx:1):

- access token duoc luu trong `localStorage` key `token`
- frontend goi `/api/users/me` de lay user profile sau login

Day la thong tin quan trong de debug khi login fail hoac redirect sai.

## 5. Cach khoi dong moi truong truoc khi chay Cypress

### 5.1. Backend

```powershell
cd C:\Users\Administrator\Documents\WDP\be
npm install
npm run dev
```

Mac dinh backend dung port `5000` neu env khong override.

### 5.2. Frontend

```powershell
cd C:\Users\Administrator\Documents\WDP\fe
npm install
npm run dev
```

Mac dinh Vite thuong dung `5173`.

### 5.3. Cypress

```powershell
cd C:\Users\Administrator\Documents\WDP
npx cypress open
```

hoac

```powershell
npx cypress run
```

## 6. Dieu kien de role-based test chay on dinh

### 6.1. Admin

Can co:

- dashboard tai `/admin`
- truy cap duoc cac trang `/admin/users`, `/admin/products`, `/admin/orders`

### 6.2. Seller

Can co:

- dashboard tai `/seller`
- truy cap duoc `/seller/products`, `/seller/orders`

### 6.3. Buyer

Can co:

- login thanh cong va ve `/`
- truy cap duoc `/cart`, `/checkout`, `/my-ebay/activity/purchases`

## 7. De xuat bien moi truong cho Cypress

Nen cau hinh `baseUrl` ve frontend, vi route UI hien tai dua tren React Router:

```js
e2e: {
  baseUrl: "http://localhost:5173"
}
```

Neu frontend goi backend qua `VITE_API_URL`, hay dam bao file env da tro dung backend dang chay.

## 8. Quy uoc ten test account trong tai lieu

De tranh nham:

- "admin" nghia la tai khoan `admin / admin`
- "seller" nghia la tai khoan `seller / seller`
- "buyer" nghia la vai tro buyer; khi chay that dung `buyer1@wdp.com / password123` tru khi ban da tao `buyer / buyer`

## 9. Pre-flight checklist truoc khi chay suite

- backend len thanh cong
- frontend len thanh cong
- mo duoc `/auth/sign-in`
- login `admin/admin` pass
- login `seller/seller` pass
- buyer test account ton tai
- neu test checkout: buyer phai co dia chi va cart item hoac du lieu buy-now hop le
