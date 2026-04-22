# Cypress Debug Guide

## 1. Muc tieu

Tai lieu nay dung de debug nhanh khi test Cypress fail, dac biet voi cac luong:

- login
- redirect theo role
- private route
- cart
- checkout

## 2. Thu tu debug khuyen nghi

1. Xac nhan backend dang chay.
2. Xac nhan frontend dang chay.
3. Thu login tay trong browser.
4. Kiem tra network request login.
5. Kiem tra `localStorage.token`.
6. Kiem tra request `/api/users/me`.
7. Kiem tra redirect cuoi cung.

Neu bo qua thu tu nay, ban se de debug nham tu UI sang selector trong khi loi that nam o auth hoac data.

## 3. Debug login fail

### Trieu chung

- submit login xong khong vao dashboard
- hien toast sai mat khau
- test bi dung o `/auth/sign-in`

### Kiem tra

1. Request `POST /api/auth/login` co status bao nhieu.
2. Response co `data.user.role` va `data.token` hay khong.
3. Sau login, `localStorage` co key `token` hay khong.
4. Request `/api/users/me` co thanh cong hay khong.

### Nguon code lien quan

- [fe/src/components/sign-in-form.tsx](C:/Users/Administrator/Documents/WDP/fe/src/components/sign-in-form.tsx:1)
- [fe/src/main.tsx](C:/Users/Administrator/Documents/WDP/fe/src/main.tsx:108)
- [be/src/controller/authController.js](C:/Users/Administrator/Documents/WDP/be/src/controller/authController.js:97)

### Nguyen nhan thuong gap

- account khong ton tai
- buyer account ban dang dung khong phai account co that trong DB
- token tao duoc nhung `/api/users/me` fail
- env frontend tro sai API URL

## 4. Debug redirect sai role

### Trieu chung

- login admin nhung khong vao `/admin`
- login seller nhung o lai `/`
- login buyer vao route la

### Kiem tra

1. Xem `res.data.data.user.role` cua API login.
2. Xem logic redirect trong form login.
3. Kiem tra user profile tra ve role gi o `/api/users/me`.

### Logic redirect da xac nhan

Theo [fe/src/components/sign-in-form.tsx](C:/Users/Administrator/Documents/WDP/fe/src/components/sign-in-form.tsx:1):

- `shipper` -> `/shipper`
- `admin` -> `/admin`
- `seller` -> `/seller`
- con lai -> `/`

Neu redirect sai, uu tien nghi ngo role tra ve sai hoac auth state chua cap nhat dung luc.

## 5. Debug private route fail

### Trieu chung

- da login nhung vao `/cart` van bi day ve login
- test fail do route redirect lap

### Kiem tra

1. `localStorage.token` co ton tai khong.
2. Token co bi xoa sau khi page reload khong.
3. `ProtectedRoute` da goi `refresh()` hay `fetchMe()` ra sao.

### Nguon code

- [fe/src/components/ProtectedRoute.tsx](C:/Users/Administrator/Documents/WDP/fe/src/components/ProtectedRoute.tsx:1)
- [fe/src/main.tsx](C:/Users/Administrator/Documents/WDP/fe/src/main.tsx:24)

## 6. Debug role guard fail

### Trieu chung

- seller vao `/admin` ma khong bi chan
- buyer vao route role-based nhung app khong redirect

### Kiem tra

1. Route do co boc `RoleGuard` hay chi la page thuong.
2. Role user dang co trong context la gi.
3. Trang can test co dung thuoc route duoc bao ve hay khong.

### Nguon code

- [fe/src/components/RoleGuard.tsx](C:/Users/Administrator/Documents/WDP/fe/src/components/RoleGuard.tsx:1)
- [fe/src/routes/index.tsx](C:/Users/Administrator/Documents/WDP/fe/src/routes/index.tsx:1)

### Ghi chu quan trong

Trong router hien tai, `/admin` co `RoleGuard requireRole="admin"`.

Nhung `/seller` dang duoc render bang `SellerLayout` truc tiep trong router, khong thay boc `RoleGuard` ngay tai dinh nghia route. Day la diem can test ky, vi no co the la lo hong phan quyen neu layout khong tu chan ben trong.

## 7. Debug cart va checkout fail

### Trieu chung cart

- cart trong khi ban nghi la da co item
- checkbox khong tick duoc
- checkout button bi disable

### Trieu chung checkout

- vao `/checkout` bi bao `Unable to load checkout data`
- bam `Place Order` thi bao thieu dia chi
- order summary khong load

### Kiem tra cart

1. Buyer dang login dung account co cart hay khong.
2. API cart tra item hay khong.
3. Item co dang `savedForLater` hoac out-of-stock khong.

### Kiem tra checkout

1. Ban vao `/checkout` tu cart hay vao truc tiep.
2. `location.state` co `cartItemIds` hoac `items` hay khong.
3. Buyer da co address hay chua.
4. API preview checkout co tra loi khong.

### Nguon code

- [fe/src/pages/buyer/cart.tsx](C:/Users/Administrator/Documents/WDP/fe/src/pages/buyer/cart.tsx:1)
- [fe/src/pages/buyer/orders/checkout.tsx](C:/Users/Administrator/Documents/WDP/fe/src/pages/buyer/orders/checkout.tsx:1)

## 8. Cac lenh Cypress nen dung khi debug

### `cy.pause()`

Dung de dung test tai cho va thao tac tay trong runner.

### `cy.intercept()`

Dung de bat request:

```js
cy.intercept("POST", "/api/auth/login").as("login");
cy.intercept("GET", "/api/users/me").as("me");
```

Sau do:

```js
cy.wait("@login");
cy.wait("@me");
```

### `cy.location()`

Dung de kiem tra redirect:

```js
cy.location("pathname").should("eq", "/admin");
```

### `cy.window()`

Dung de xem token:

```js
cy.window().then((win) => {
  expect(win.localStorage.getItem("token")).to.exist;
});
```

## 9. Quy trinh debug de xuat theo tung nhom loi

### 9.1. Auth loi

1. Intercept login
2. Wait login
3. Assert status code
4. Assert token trong localStorage
5. Assert `/api/users/me`
6. Assert route cuoi

### 9.2. Unauthorized loi

1. Login account
2. Assert role thuc te
3. Di vao route bi nghi co loi
4. Assert redirect `/unauthorized` hoac `/auth/sign-in`

### 9.3. Checkout loi

1. Assert account co cart
2. Assert da chon item
3. Assert vao checkout voi state hop le
4. Assert API preview pass
5. Assert address ton tai
6. Moi toi buoc place order

## 10. Flaky test checklist

- co dung `cy.wait(5000)` khong can thiet khong
- selector co qua phu thuoc CSS class khong
- du lieu test co thay doi theo ngay gio khong
- account test co bi side effect tu lan chay truoc khong
- test co phu thuoc vao test truoc khong

## 11. Selector checklist

Neu test fail vi khong tim thay element:

1. Xem element do co render tre khong.
2. Xem text UI co doi khong.
3. Xem route co dung khong.
4. Xem co modal/loading che element khong.
5. Uu tien them `data-cy` thay vi bam theo class dai.

## 12. Muc tieu debug thuc dung

Khi test vo, ban can tra loi nhanh 3 cau hoi:

1. Loi nam o du lieu, auth, hay UI?
2. Loi do selector, route, hay API?
3. Day la bug that cua app hay chi la test viet chua on?

Neu 3 cau nay chua ro, dung mo rong suite. Hay sua xong smoke test truoc roi moi sua tiep main flow.
