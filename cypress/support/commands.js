const TEST_USERS = {
  admin: {
    username: "admin",
    password: "admin",
    landingPath: "/admin",
  },
  seller: {
    username: "seller",
    password: "seller",
    landingPath: "/seller",
  },
  buyer: {
    username: "buyer1@wdp.com",
    password: "password123",
    landingPath: "/",
  },
  buyerWithCart: {
    username: "buyer3@wdp.com",
    password: "password123",
    landingPath: "/",
  },
};

const DEFAULT_ADDRESS = {
  fullName: "Buyer Test",
  phone: "0900000001",
  country: "Vietnam",
  city: "Ho Chi Minh City",
  district: "District 1",
  ward: "Ben Nghe",
  street: "1 Le Loi",
  detail: "Cypress Test Address",
  isDefault: true,
};

const getApiUrl = () => {
  const apiUrl =
    Cypress.config("apiUrl") ||
    window.Cypress?.config?.("apiUrl") ||
    "http://localhost:8080";
  expect(apiUrl, "configured Cypress apiUrl").to.be.a("string").and.not.be.empty;
  return apiUrl;
};

Cypress.Commands.add("clearAuthState", () => {
  cy.clearCookies();
  cy.clearLocalStorage();
});

Cypress.Commands.add("loginViaUi", (username, password) => {
  cy.clearAuthState();
  cy.visit("/auth/sign-in");
  cy.get("#identifier").should("be.visible").clear().type(username);
  cy.get("#password").should("be.visible").clear().type(password, {
    log: false,
  });
  cy.contains("button", "Login").click();
  cy.window()
    .its("localStorage")
    .invoke("getItem", "token")
    .should("be.a", "string")
    .and("not.be.empty");
});

Cypress.Commands.add("loginByApi", (username, password, path = "/") => {
  cy.clearAuthState();
  cy.request("POST", `${getApiUrl()}/api/auth/login`, {
    username,
    password,
  }).then(({ body }) => {
    const token = body?.data?.token;
    expect(token, "access token").to.be.a("string").and.not.be.empty;

    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", token);
      },
    });
  });
});

Cypress.Commands.add("loginAs", (role, path) => {
  const user = TEST_USERS[role];
  expect(user, `known test user for role "${role}"`).to.exist;
  cy.loginByApi(user.username, user.password, path || user.landingPath);
});

Cypress.Commands.add("ensureBuyerAddress", (address = DEFAULT_ADDRESS) => {
  cy.window().then((win) => {
    const token = win.localStorage.getItem("token");
    expect(token, "buyer access token").to.be.a("string").and.not.be.empty;
    const apiUrl = getApiUrl();

    cy.request({
      method: "GET",
      url: `${apiUrl}/api/addresses`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((response) => {
      const addresses = response.body?.data || [];
      if (addresses.length > 0) return;

      cy.request({
        method: "POST",
        url: `${apiUrl}/api/addresses`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: address,
      });
    });
  });
});

Cypress.Commands.add("ensureBuyerCartHasItem", () => {
  cy.window().then((win) => {
    const token = win.localStorage.getItem("token");
    expect(token, "buyer access token").to.be.a("string").and.not.be.empty;
    const apiUrl = getApiUrl();

    cy.request({
      method: "GET",
      url: `${apiUrl}/api/cart`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((cartResponse) => {
      const cart = cartResponse.body?.cart;
      const items = cart?.items || [];
      const activeItems = items.filter((item) => !item.savedForLater);

      if (activeItems.length > 0) return;

      cy.request({
        method: "GET",
        url: `${apiUrl}/api/products?search=${encodeURIComponent("7-in-1 USB-C Hub Aluminum")}`,
      }).then((productResponse) => {
        const products = productResponse.body?.data || [];
        const product = products[0];
        expect(product, "seed product for buyer cart test").to.exist;

        cy.request({
          method: "POST",
          url: `${apiUrl}/api/cart`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: {
            productId: product._id,
            quantity: 1,
          },
        });
      });
    });
  });
});
