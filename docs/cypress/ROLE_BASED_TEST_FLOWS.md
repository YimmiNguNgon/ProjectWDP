# Role Based Test Flows

## 1. Muc tieu

Tai lieu nay mo ta cac luong test tu co ban den chinh va regression cho:

- admin
- seller
- buyer

Toi uu cho Cypress E2E.

## 2. Nguon route va phan quyen

Route frontend theo [fe/src/routes/index.tsx](C:/Users/Administrator/Documents/WDP/fe/src/routes/index.tsx:1).

Bao ve route dang nhap theo:

- [fe/src/components/ProtectedRoute.tsx](C:/Users/Administrator/Documents/WDP/fe/src/components/ProtectedRoute.tsx:1)
- [fe/src/components/RoleGuard.tsx](C:/Users/Administrator/Documents/WDP/fe/src/components/RoleGuard.tsx:1)

## 3. Chia nhom test

### 3.1. Smoke

Muc tieu:

- xac nhan login theo role
- xac nhan redirect dung
- xac nhan route private va route role-based hoat dong

### 3.2. Main flow

Muc tieu:

- xac nhan user di qua luong kinh doanh chinh

### 3.3. Negative va regression

Muc tieu:

- xac nhan loi thong dung khong lam vo auth hay navigation

## 4. Luong chung can co cho moi role

### TC-COMMON-01: Mo trang login

Buoc:

1. Vao `/auth/sign-in`
2. Xac nhan form co field username/email
3. Xac nhan co field password
4. Xac nhan co nut `Login`

Ky vong:

- form hien thi day du

### TC-COMMON-02: Login sai mat khau

Buoc:

1. Vao `/auth/sign-in`
2. Nhap account hop le
3. Nhap password sai
4. Submit

Ky vong:

- hien thong bao loi
- khong redirect vao dashboard

### TC-COMMON-03: Truy cap route private khi chua login

Buoc:

1. Xoa `localStorage.token`
2. Vao `/cart`

Ky vong:

- bi redirect ve `/auth/sign-in`

## 5. Luong cho admin

Tai khoan de test:

- `admin / admin`

### 5.1. Smoke admin

#### TC-ADMIN-01: Login admin thanh cong

Buoc:

1. Vao `/auth/sign-in`
2. Nhap `admin`
3. Nhap `admin`
4. Submit

Ky vong:

- redirect sang `/admin`
- thay dashboard admin

#### TC-ADMIN-02: Admin vao Users

Buoc:

1. Login admin
2. Vao `/admin/users`

Ky vong:

- trang mo duoc
- khong bi redirect unauthorized

#### TC-ADMIN-03: Admin vao Products

Buoc:

1. Login admin
2. Vao `/admin/products`

Ky vong:

- trang mo duoc

#### TC-ADMIN-04: Admin vao Orders

Buoc:

1. Login admin
2. Vao `/admin/orders`

Ky vong:

- trang mo duoc

### 5.2. Main flow admin

#### TC-ADMIN-05: Xem dashboard

Tham chieu UI: [fe/src/pages/admin/dashboard.tsx](C:/Users/Administrator/Documents/WDP/fe/src/pages/admin/dashboard.tsx:1)

Buoc:

1. Login admin
2. O lai `/admin`
3. Kiem tra cac block tong quan nhu Users, Products, Orders, Revenue

Ky vong:

- dashboard load data hoac hien thong bao fail hop ly

#### TC-ADMIN-06: Dieu huong tu dashboard sang Users

Buoc:

1. Login admin
2. Tai dashboard, click card `Users` hoac button `Manage Users`

Ky vong:

- sang `/admin/users`

#### TC-ADMIN-07: Dieu huong tu dashboard sang Revenue

Buoc:

1. Login admin
2. Tai dashboard, click card `Revenue`

Ky vong:

- sang `/admin/revenue`

### 5.3. Negative admin

#### TC-ADMIN-08: Seller khong vao duoc admin route

Buoc:

1. Login seller
2. Vao `/admin`

Ky vong:

- bi redirect `/unauthorized`

## 6. Luong cho seller

Tai khoan de test:

- `seller / seller`

### 6.1. Smoke seller

#### TC-SELLER-01: Login seller thanh cong

Buoc:

1. Vao `/auth/sign-in`
2. Nhap `seller`
3. Nhap `seller`
4. Submit

Ky vong:

- redirect sang `/seller`

#### TC-SELLER-02: Seller vao Products

Buoc:

1. Login seller
2. Vao `/seller/products`

Ky vong:

- trang mo duoc

#### TC-SELLER-03: Seller vao Orders

Buoc:

1. Login seller
2. Vao `/seller/orders`

Ky vong:

- trang mo duoc

### 6.2. Main flow seller

#### TC-SELLER-04: Seller vao trang tao san pham

Tham chieu UI: [fe/src/pages/seller/products/AddProduct.tsx](C:/Users/Administrator/Documents/WDP/fe/src/pages/seller/products/AddProduct.tsx:1)

Buoc:

1. Login seller
2. Vao `/seller/products/new`

Ky vong:

- thay form `Add Product`
- thay field ten san pham
- thay category
- thay button `Create Product`

#### TC-SELLER-05: Validation tao san pham khi thieu thong tin

Buoc:

1. Login seller
2. Vao `/seller/products/new`
3. Submit form rong

Ky vong:

- hien toast loi
- khong redirect

#### TC-SELLER-06: Seller vao Trust Score

Buoc:

1. Login seller
2. Vao `/seller/trust-score`

Ky vong:

- trang mo duoc

#### TC-SELLER-07: Seller vao Refunds

Buoc:

1. Login seller
2. Vao `/seller/refunds`

Ky vong:

- trang mo duoc

### 6.3. Negative seller

#### TC-SELLER-08: Buyer khong vao duoc seller route

Buoc:

1. Login buyer
2. Vao `/seller`

Ky vong:

- neu page co role check o layout/logic, khong duoc dung duoc nhu seller
- toi thieu khong duoc thuc hien tac vu seller

Ghi chu:

Route `/seller` trong router hien tai khong boc bang `RoleGuard`, nen day la khu vuc can uu tien verify bang test that. Day la test quan trong vi co the lo hong phan quyen.

## 7. Luong cho buyer

Tai khoan de test khuyen nghi:

- `buyer1@wdp.com / password123`

Neu ban da tu tao `buyer / buyer`, co the thay the toan bo buyer flow ben duoi bang account do.

### 7.1. Smoke buyer

#### TC-BUYER-01: Login buyer thanh cong

Buoc:

1. Vao `/auth/sign-in`
2. Nhap buyer account
3. Submit

Ky vong:

- redirect ve `/`

#### TC-BUYER-02: Buyer vao cart

Buoc:

1. Login buyer
2. Vao `/cart`

Ky vong:

- trang mo duoc neu da dang nhap

#### TC-BUYER-03: Buyer vao purchases

Buoc:

1. Login buyer
2. Vao `/my-ebay/activity/purchases`

Ky vong:

- trang mo duoc

### 7.2. Main flow buyer

#### TC-BUYER-04: Buyer xem danh sach san pham

Buoc:

1. Login buyer
2. Vao `/products`

Ky vong:

- danh sach san pham hien thi

#### TC-BUYER-05: Buyer vao product detail

Buoc:

1. Login buyer
2. Vao `/products/:productId` voi 1 product hop le

Ky vong:

- trang chi tiet hien thi

#### TC-BUYER-06: Buyer vao cart va xem subtotal

Tham chieu UI: [fe/src/pages/buyer/cart.tsx](C:/Users/Administrator/Documents/WDP/fe/src/pages/buyer/cart.tsx:1)

Buoc:

1. Login buyer
2. Vao `/cart`
3. Chon item neu cart co san pham

Ky vong:

- hien subtotal
- nut checkout hoat dong khi co item duoc chon

#### TC-BUYER-07: Buyer vao checkout

Tham chieu UI: [fe/src/pages/buyer/orders/checkout.tsx](C:/Users/Administrator/Documents/WDP/fe/src/pages/buyer/orders/checkout.tsx:1)

Buoc:

1. Login buyer
2. Tu cart bam checkout hoac vao `/checkout` voi `location.state` hop le

Ky vong:

- trang checkout load duoc preview
- thay section dia chi, shipping, payment, order summary

#### TC-BUYER-08: Checkout khi chua co dia chi

Buoc:

1. Login buyer khong co dia chi
2. Vao checkout
3. Bam `Place Order`

Ky vong:

- hien loi `Please select a shipping address`

#### TC-BUYER-09: Checkout happy path

Buoc:

1. Login buyer co dia chi va co item hop le
2. Vao checkout
3. Chon dia chi
4. Chon shipping
5. Chon payment `cod`
6. Bam `Place Order`

Ky vong:

- hien toast thanh cong
- redirect `/checkout/success`

### 7.3. Regression buyer

#### TC-BUYER-10: Vao checkout truc tiep khi khong co state

Buoc:

1. Login buyer
2. Vao thang `/checkout`

Ky vong:

- app xu ly hop ly, khong crash
- neu khong load duoc preview thi hien thong bao that bai co kiem soat

#### TC-BUYER-11: Buyer chua login vao cart

Buoc:

1. Xoa token
2. Vao `/cart`

Ky vong:

- redirect `/auth/sign-in`

## 8. Thu tu uu tien de viet Cypress

1. `auth/login` cho admin, seller, buyer
2. `auth/authorization` cho private route va role route
3. `admin/dashboard`
4. `seller/add-product`
5. `buyer/cart`
6. `buyer/checkout`

## 9. Nhom test de debug nhanh khi suite vo

### Nhom A: Auth

- login admin
- login seller
- login buyer
- protected route redirect

### Nhom B: Role

- seller vao `/admin`
- buyer vao `/admin`
- admin vao `/seller`

### Nhom C: Buyer commerce

- cart load
- checkout load
- place order validation

## 10. Mau ten file Cypress de to chuc suite

```text
cypress/e2e/
  auth/
    login-roles.cy.js
    protected-routes.cy.js
  admin/
    dashboard.cy.js
    navigation.cy.js
  seller/
    add-product.cy.js
    seller-navigation.cy.js
  buyer/
    cart.cy.js
    checkout.cy.js
```

## 11. Ghi chu ky thuat quan trong

De bo test on dinh hon, nen bo sung `data-cy` vao:

- form login
- nut submit
- menu dieu huong chinh
- card dashboard
- form add product
- cart checkbox
- nut checkout
- form dia chi
- nut place order

Neu khong co `data-cy`, Cypress van test duoc, nhung selector se de gay hon khi UI doi.
