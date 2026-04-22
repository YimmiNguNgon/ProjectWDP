describe("Protected and role-based routes", () => {
  it("redirects guests from cart to sign-in", () => {
    cy.clearAuthState();
    cy.visit("/cart");
    cy.location("pathname").should("eq", "/auth/sign-in");
    cy.contains("Login to your account").should("be.visible");
  });

  it("prevents seller from entering admin area", () => {
    cy.loginAs("seller", "/admin");
    cy.location("pathname").should("eq", "/unauthorized");
    cy.contains("h1", "Access Denied").should("be.visible");
  });

  it("allows admin to open admin users page", () => {
    cy.loginAs("admin", "/admin/users");
    cy.location("pathname").should("eq", "/admin/users");
    cy.contains("body", "User").should("be.visible");
  });
});
