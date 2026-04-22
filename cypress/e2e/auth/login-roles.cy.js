describe("Role login flows", () => {
  it("logs in as admin and redirects to admin dashboard", () => {
    cy.loginViaUi("admin", "admin");
    cy.location("pathname").should("eq", "/admin");
    cy.contains("h1", "Dashboard Overview").should("be.visible");
  });

  it("logs in as seller and redirects to seller overview", () => {
    cy.loginViaUi("seller", "seller");
    cy.location("pathname").should("eq", "/seller");
    cy.contains("h1", "Overview").should("be.visible");
    cy.contains("button", "Refresh").should("be.visible");
  });

  it("logs in as buyer and redirects to home page", () => {
    cy.loginViaUi("buyer1@wdp.com", "password123");
    cy.location("pathname").should("eq", "/");
    cy.contains("body", "Products").should("be.visible");
  });
  it("shows error message on failed login attempt", () => {
  cy
    cy.contains("Invalid email or password").should("be.visible");
  });
});