describe("Seller product flows", () => {
  beforeEach(() => {
    cy.loginAs("seller", "/seller/products/new");
  });

  it("opens the add product form", () => {
    cy.contains("h1", "Add Product").should("be.visible");
    cy.contains("label", "Product Name").should("be.visible");
    cy.contains("label", "Category").should("be.visible");
    cy.contains("button", "Create Product").should("be.visible");
  });

  it("keeps the seller on the form when required fields are missing", () => {
    cy.contains("button", "Create Product").click();
    cy.location("pathname").should("eq", "/seller/products/new");
    cy.contains("body", "Add Product").should("be.visible");
  });

  it("opens the seller trust score page", () => {
    cy.loginAs("seller", "/seller/trust-score");
    cy.location("pathname").should("eq", "/seller/trust-score");
    cy.contains(/score/i).should("be.visible");
  });
});
