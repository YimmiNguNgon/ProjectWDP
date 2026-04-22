# Tài liệu Cypress

## 1. Cypress là gì?

Cypress là công cụ kiểm thử frontend theo hướng end-to-end (E2E), component testing, và một phần integration testing. Nó được dùng để mô phỏng hành vi người dùng thật trên trình duyệt, ví dụ:

- mở trang
- nhập form
- bấm nút
- kiểm tra điều hướng
- kiểm tra nội dung hiển thị
- giả lập request hoặc chặn API

Khác với nhiều framework test web truyền thống, Cypress chạy rất sát với ứng dụng trên trình duyệt và cung cấp giao diện debug trực quan.

## 2. Cypress dùng để làm gì?

Các trường hợp dùng phổ biến:

- test luồng đăng nhập
- test thêm sản phẩm vào giỏ hàng
- test thanh toán
- test phân quyền
- test redirect khi chưa đăng nhập
- test các thao tác form
- test API mock ở frontend

Trong dự án thực tế, Cypress thường được dùng để kiểm tra các luồng quan trọng mà unit test không bao phủ hết.

## 3. Khi nào nên dùng Cypress?

Nên dùng Cypress khi bạn cần:

- kiểm tra toàn bộ flow từ giao diện đến backend
- xác minh UI hoạt động đúng sau khi deploy
- giảm lỗi regression ở các tính năng quan trọng
- debug lỗi frontend theo hành vi người dùng

Không nên lạm dụng Cypress cho các logic quá nhỏ. Những phần đó thường phù hợp hơn với unit test.

## 4. Cypress hoạt động như thế nào?

Cypress mở trình duyệt, tải ứng dụng của bạn, rồi chạy các câu lệnh test như:

```js
cy.visit("/login");
cy.get("input[name=email]").type("test@example.com");
cy.contains("button", "Đăng nhập").click();
cy.url().should("include", "/dashboard");
```

Điểm quan trọng:

- Cypress tự động chờ element xuất hiện trước khi thao tác
- mỗi lệnh `cy.*` được đưa vào command queue
- test chạy tuần tự
- khi test lỗi, bạn có thể xem snapshot từng bước

## 5. Các loại test trong Cypress

### 5.1. E2E Testing

Đây là cách dùng phổ biến nhất. Test mô phỏng người dùng đi qua cả hệ thống.

Ví dụ:

- vào trang login
- nhập email/password
- bấm đăng nhập
- chuyển đến dashboard

### 5.2. Component Testing

Cypress cũng có thể test riêng từng component React/Vue/... Tuy nhiên dự án của bạn hiện mới có cấu hình E2E cơ bản.

## 6. Ưu điểm của Cypress

- cài đặt và chạy nhanh
- debug tốt
- có giao diện trực quan
- tự động retry nhiều thao tác/assertion
- viết test dễ đọc
- phù hợp để test frontend hiện đại như React, Vite

## 7. Hạn chế của Cypress

- chủ yếu mạnh ở frontend/browser flow
- test E2E chậm hơn unit test
- nếu selector viết kém thì test dễ gãy
- cần quản lý tốt dữ liệu test, user test, state test

## 8. Cấu trúc Cypress trong repo này

Trong repo hiện tại, Cypress đang nằm ở thư mục:

- [cypress](C:/Users/Administrator/Documents/WDP/cypress)
- cấu hình ở [cypress.config.js](C:/Users/Administrator/Documents/WDP/cypress.config.js:1)

Cấu trúc hiện có:

- `cypress/e2e/`: chứa file test E2E
- `cypress/fixtures/`: dữ liệu mẫu
- `cypress/support/commands.js`: custom commands
- `cypress/support/e2e.js`: cấu hình chung cho E2E

File test mẫu hiện tại là:

- [cypress/e2e/spec.cy.js](C:/Users/Administrator/Documents/WDP/cypress/e2e/spec.cy.js:1)

## 9. Cài đặt Cypress

Nếu dự án chưa có Cypress:

```powershell
npm install -D cypress
```

Mở Cypress lần đầu:

```powershell
npx cypress open
```

Chạy không giao diện:

```powershell
npx cypress run
```

Trong repo này, Cypress đã được cài ở `package.json` gốc.

## 10. Cách chạy Cypress trong dự án này

### 10.1. Chạy frontend/backend trước

Ví dụ:

```powershell
cd fe
npm run dev
```

Nếu test cần backend:

```powershell
cd be
npm run dev
```

### 10.2. Chạy Cypress

Từ thư mục gốc repo:

```powershell
cd C:\Users\Administrator\Documents\WDP
npx cypress open
```

Hoặc:

```powershell
npx cypress run
```

## 11. File cấu hình `cypress.config.js`

Ví dụ cấu hình hiện tại:

```js
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,

  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
```

Bạn thường sẽ mở rộng file này với các cấu hình như:

- `baseUrl`
- `viewportWidth`
- `viewportHeight`
- `video`
- `screenshotsFolder`
- `retries`

Ví dụ:

```js
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    viewportWidth: 1440,
    viewportHeight: 900,
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
```

Khi có `baseUrl`, bạn có thể viết:

```js
cy.visit("/login");
```

thay vì:

```js
cy.visit("http://localhost:5173/login");
```

## 12. Cấu trúc một file test Cypress

Ví dụ:

```js
describe("Login", () => {
  it("dang nhap thanh cong", () => {
    cy.visit("/login");
    cy.get("[data-cy=email]").type("test@example.com");
    cy.get("[data-cy=password]").type("123456");
    cy.get("[data-cy=submit]").click();
    cy.url().should("include", "/dashboard");
  });
});
```

Ý nghĩa:

- `describe()`: nhóm test
- `it()`: một test case
- `cy.*`: câu lệnh Cypress
- `should()`: assertion

## 13. Các lệnh Cypress cơ bản

### 13.1. `cy.visit()`

Mở một trang:

```js
cy.visit("/login");
```

### 13.2. `cy.get()`

Tìm phần tử bằng CSS selector:

```js
cy.get("input[name=email]");
cy.get("[data-cy=submit]");
```

### 13.3. `cy.contains()`

Tìm phần tử theo text:

```js
cy.contains("Đăng nhập");
cy.contains("button", "Thanh toán");
```

### 13.4. `type()`

Nhập dữ liệu:

```js
cy.get("input[name=email]").type("test@example.com");
```

### 13.5. `click()`

Click phần tử:

```js
cy.contains("button", "Lưu").click();
```

### 13.6. `should()`

Kiểm tra điều kiện:

```js
cy.get(".error").should("be.visible");
cy.url().should("include", "/dashboard");
cy.get("[data-cy=username]").should("contain", "Admin");
```

### 13.7. `select()`

Chọn option:

```js
cy.get("select").select("VN");
```

### 13.8. `check()` và `uncheck()`

Tương tác checkbox/radio:

```js
cy.get("[type=checkbox]").check();
cy.get("[type=checkbox]").uncheck();
```

### 13.9. `clear()`

Xóa nội dung input:

```js
cy.get("input[name=keyword]").clear();
```

## 14. Assertion trong Cypress

Cypress dùng assertion để xác nhận trạng thái UI đúng như mong muốn.

Ví dụ:

```js
cy.get(".toast").should("be.visible");
cy.get(".toast").should("contain", "Lưu thành công");
cy.get("button").should("be.disabled");
cy.get("input").should("have.value", "abc");
```

Một số assertion thường dùng:

- `be.visible`
- `exist`
- `not.exist`
- `contain`
- `have.text`
- `have.value`
- `be.checked`
- `be.disabled`

## 15. Hooks trong Cypress

Bạn có thể dùng:

- `before()`
- `beforeEach()`
- `after()`
- `afterEach()`

Ví dụ:

```js
describe("Dashboard", () => {
  beforeEach(() => {
    cy.visit("/login");
    cy.get("[data-cy=email]").type("admin@test.com");
    cy.get("[data-cy=password]").type("123456");
    cy.get("[data-cy=submit]").click();
  });

  it("mo duoc dashboard", () => {
    cy.url().should("include", "/dashboard");
  });
});
```

## 16. Fixtures

Fixtures là dữ liệu test mẫu đặt trong `cypress/fixtures/`.

Ví dụ file `cypress/fixtures/user.json`:

```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

Sử dụng:

```js
cy.fixture("user").then((user) => {
  cy.get("[data-cy=email]").type(user.email);
  cy.get("[data-cy=password]").type(user.password);
});
```

## 17. Custom Commands

Khi có thao tác lặp đi lặp lại, nên tạo custom command trong `cypress/support/commands.js`.

Ví dụ:

```js
Cypress.Commands.add("login", (email, password) => {
  cy.visit("/login");
  cy.get("[data-cy=email]").type(email);
  cy.get("[data-cy=password]").type(password);
  cy.get("[data-cy=submit]").click();
});
```

Sử dụng:

```js
cy.login("admin@test.com", "123456");
```

Lợi ích:

- test ngắn hơn
- dễ tái sử dụng
- dễ bảo trì

## 18. Intercept API với `cy.intercept()`

`cy.intercept()` dùng để:

- chặn request
- mock response
- theo dõi API call

Ví dụ theo dõi request:

```js
cy.intercept("POST", "/api/login").as("loginRequest");
cy.get("[data-cy=submit]").click();
cy.wait("@loginRequest");
```

Ví dụ mock dữ liệu:

```js
cy.intercept("GET", "/api/products", {
  statusCode: 200,
  body: [
    { "id": 1, "name": "Product A" },
    { "id": 2, "name": "Product B" }
  ]
});
```

Khi nào nên mock:

- frontend đang phát triển trước backend
- muốn test UI ổn định
- muốn kiểm soát dữ liệu test

Khi nào không nên mock:

- khi bạn muốn kiểm tra luồng thật toàn hệ thống

## 19. Ví dụ test đăng nhập hoàn chỉnh

```js
describe("Login flow", () => {
  it("dang nhap thanh cong", () => {
    cy.visit("http://localhost:5173/login");
    cy.get("[data-cy=email]").type("admin@test.com");
    cy.get("[data-cy=password]").type("123456");
    cy.contains("button", "Đăng nhập").click();
    cy.url().should("include", "/dashboard");
    cy.contains("Dashboard").should("be.visible");
  });
});
```

## 20. Ví dụ test thất bại đăng nhập

```js
describe("Login validation", () => {
  it("hien loi khi sai mat khau", () => {
    cy.visit("/login");
    cy.get("[data-cy=email]").type("admin@test.com");
    cy.get("[data-cy=password]").type("wrong-password");
    cy.get("[data-cy=submit]").click();
    cy.contains("Sai tài khoản hoặc mật khẩu").should("be.visible");
  });
});
```

## 21. `data-cy` và selector tốt

Khi viết Cypress, không nên phụ thuộc quá nhiều vào:

- class CSS dễ thay đổi
- text UI dễ đổi
- cấu trúc DOM dễ gãy

Nên thêm attribute dành riêng cho test:

```html
<input data-cy="email" />
<input data-cy="password" />
<button data-cy="submit">Đăng nhập</button>
```

Sau đó test bằng:

```js
cy.get("[data-cy=email]");
```

Đây là cách ổn định nhất cho E2E test.

## 22. Retry tự động của Cypress

Cypress tự retry nhiều lệnh như:

- `cy.get()`
- `cy.contains()`
- `should()`

Điều này giúp giảm việc phải thêm `setTimeout` hay sleep thủ công.

Không nên viết:

```js
cy.wait(5000);
```

trừ khi bạn thực sự cần. Nên ưu tiên:

```js
cy.get(".loading").should("not.exist");
cy.contains("Lưu thành công").should("be.visible");
```

## 23. `cy.wait()` dùng khi nào?

`cy.wait()` có 2 kiểu:

### 23.1. Chờ alias request

```js
cy.intercept("GET", "/api/orders").as("getOrders");
cy.visit("/orders");
cy.wait("@getOrders");
```

### 23.2. Chờ theo thời gian

```js
cy.wait(1000);
```

Cách thứ hai nên hạn chế vì dễ làm test chậm và không ổn định.

## 24. Debug trong Cypress

Cypress mạnh ở khả năng debug.

Bạn có thể:

- xem từng bước chạy
- xem request/response
- xem DOM tại thời điểm lỗi
- dùng `cy.pause()`
- dùng `cy.log()`
- mở DevTools trong cửa sổ Cypress

Ví dụ:

```js
cy.log("Bat dau login");
cy.pause();
```

## 25. Chạy test headless và CI

Chạy headless:

```powershell
npx cypress run
```

Chạy trên Chrome:

```powershell
npx cypress run --browser chrome
```

Cypress thường được tích hợp vào CI/CD để:

- chạy test sau mỗi pull request
- ngăn merge khi flow chính bị lỗi

## 26. Test độc lập và dữ liệu test

Mỗi test nên:

- tự setup dữ liệu nếu cần
- không phụ thuộc test trước
- có thể chạy độc lập

Không nên viết test kiểu:

- test B chỉ pass nếu test A chạy trước

Điều này làm suite không ổn định.

## 27. Best practices

- dùng `data-cy` cho selector
- giữ mỗi test ngắn và rõ mục tiêu
- dùng custom commands cho thao tác lặp lại
- ưu tiên `beforeEach()` hợp lý
- tránh `cy.wait(time)` nếu không cần
- mock API khi cần ổn định frontend
- tách test happy path và error path
- không để test phụ thuộc lẫn nhau
- chỉ test các luồng quan trọng bằng E2E

## 28. Những lỗi thường gặp

### 28.1. Selector dễ gãy

Ví dụ:

```js
cy.get(".btn-primary.mt-4.w-full");
```

Selector này rất dễ vỡ khi UI đổi class.

### 28.2. Dùng `cy.wait(5000)` quá nhiều

Làm test:

- chậm
- flaky
- khó bảo trì

### 28.3. Test phụ thuộc dữ liệu thật không ổn định

Ví dụ:

- API lúc có dữ liệu, lúc không
- user test bị khóa
- database đổi trạng thái

Cần có môi trường test hoặc mock hợp lý.

### 28.4. Viết một test quá dài

Một test làm quá nhiều việc sẽ:

- khó đọc
- khó debug
- khó xác định nguyên nhân lỗi

## 29. Gợi ý áp dụng cho dự án này

Dự án của bạn có `be/` và `fe/`, nên Cypress phù hợp để test:

- login/logout
- route cần quyền truy cập
- tìm kiếm sản phẩm
- thêm vào giỏ hàng
- checkout
- quản trị sản phẩm nếu có trang admin ở frontend chính

Thứ tự ưu tiên nên là:

1. login thành công/thất bại
2. redirect khi chưa đăng nhập
3. cart flow
4. checkout flow
5. permission flow

## 30. Mẫu tổ chức test đề xuất

Bạn có thể tổ chức như sau:

```text
cypress/
  e2e/
    auth/
      login.cy.js
      logout.cy.js
    cart/
      add-to-cart.cy.js
      checkout.cy.js
    product/
      product-list.cy.js
      product-detail.cy.js
  fixtures/
    users.json
    products.json
  support/
    commands.js
    e2e.js
```

## 31. Ví dụ custom command phù hợp cho repo này

```js
Cypress.Commands.add("loginAsAdmin", () => {
  cy.visit("/login");
  cy.get("[data-cy=email]").type("admin@test.com");
  cy.get("[data-cy=password]").type("123456");
  cy.get("[data-cy=submit]").click();
  cy.url().should("include", "/dashboard");
});
```

Sau đó dùng:

```js
beforeEach(() => {
  cy.loginAsAdmin();
});
```

## 32. Quy trình viết một test Cypress đúng cách

1. Xác định rõ flow cần test.
2. Xác định dữ liệu test.
3. Gắn `data-cy` vào UI nếu cần.
4. Viết test ngắn, dễ đọc.
5. Chạy bằng `cypress open`.
6. Sửa selector hoặc flow nếu flaky.
7. Khi ổn định thì thêm vào CI.

## 33. So sánh nhanh Cypress với unit test

Unit test:

- nhanh hơn
- test logic nhỏ
- ít phụ thuộc UI

Cypress E2E:

- chậm hơn
- test flow thật
- phát hiện lỗi tích hợp tốt hơn

Hai loại này không thay thế nhau. Chúng bổ sung cho nhau.

## 34. So sánh nhanh Cypress với Playwright

Cypress:

- trải nghiệm debug rất tốt
- dễ bắt đầu với frontend team
- command model đặc trưng riêng

Playwright:

- mạnh ở multi-browser, multi-tab, automation rộng hơn
- linh hoạt hơn trong một số bài toán phức tạp

Nếu mục tiêu của bạn là test flow UI trong dự án React/Vite ở mức thực dụng, Cypress vẫn là lựa chọn tốt.

## 35. Kết luận

Cypress là công cụ rất phù hợp để kiểm thử các luồng quan trọng của ứng dụng web. Trong repo này, bạn đã có sẵn cấu hình cơ bản, nên bước tiếp theo hợp lý là:

- thêm `baseUrl` vào `cypress.config.js`
- thay test mẫu bằng test thật của dự án
- thêm `data-cy` cho các thành phần quan trọng
- bắt đầu từ login, auth, cart, checkout

## 36. Lệnh nhanh cần nhớ

```powershell
npx cypress open
npx cypress run
npx cypress run --browser chrome
```

## 37. Tài liệu nội bộ liên quan

Tài liệu này được viết dựa trên trạng thái hiện tại của repo:

- [cypress.config.js](C:/Users/Administrator/Documents/WDP/cypress.config.js:1)
- [cypress/e2e/spec.cy.js](C:/Users/Administrator/Documents/WDP/cypress/e2e/spec.cy.js:1)
- [cypress/support/commands.js](C:/Users/Administrator/Documents/WDP/cypress/support/commands.js:1)
- [cypress/support/e2e.js](C:/Users/Administrator/Documents/WDP/cypress/support/e2e.js:1)

Tai lieu mo rong cho repo nay:

- [docs/cypress/README.md](C:/Users/Administrator/Documents/WDP/docs/cypress/README.md:1)
- [docs/cypress/TEST_ACCOUNTS_AND_ENV.md](C:/Users/Administrator/Documents/WDP/docs/cypress/TEST_ACCOUNTS_AND_ENV.md:1)
- [docs/cypress/ROLE_BASED_TEST_FLOWS.md](C:/Users/Administrator/Documents/WDP/docs/cypress/ROLE_BASED_TEST_FLOWS.md:1)
- [docs/cypress/DEBUG_GUIDE.md](C:/Users/Administrator/Documents/WDP/docs/cypress/DEBUG_GUIDE.md:1)
