describe("Buyer cart and checkout flows", () => {
  beforeEach(() => {
    cy.loginAs("buyerWithCart", "/cart");
  });

  it("shows the shopping cart page", () => {
    cy.contains("h1", "Shopping Cart").should("be.visible");
    cy.get("body").then(($body) => {
      if ($body.find("#select-all-global").length) {
        cy.get("#select-all-global").should("be.visible");
        cy.contains("button", "Go to Checkout").should("be.visible");
      } else {
        cy.contains("body", "Your cart is empty").should("be.visible");
      }
    });
  });

  it("moves from cart to checkout when cart items exist", () => {
    cy.get("#select-all-global", { timeout: 10000 }).should("exist").check({
      force: true,
    });
    cy.contains("button", "Go to Checkout").should("not.be.disabled").click();

    cy.location("pathname").should("eq", "/checkout");
    cy.contains("h1", "Checkout").should("be.visible");
    cy.contains("body", "Delivery Address").should("be.visible");
    cy.contains("body", "Payment Method").should("be.visible");
    cy.contains("body", "Order Summary").should("be.visible");
  });

  it("shows place-order flow with a guaranteed buyer address", () => {
    cy.ensureBuyerAddress();

    cy.get("#select-all-global", { timeout: 10000 }).should("exist").check({
      force: true,
    });
    cy.contains("button", "Go to Checkout").click();

    cy.location("pathname").should("eq", "/checkout");
    cy.contains("button", "Change").should("be.visible");
    cy.contains("button", "Place Order").should("be.visible");
  });
});
