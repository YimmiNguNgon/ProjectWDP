describe("Admin dashboard", () => {
  beforeEach(() => {
    cy.loginAs("admin", "/admin");
  });

  it("shows the main admin dashboard widgets", () => {
    cy.contains("h1", "Dashboard Overview").should("be.visible");
    cy.contains("Users").should("be.visible");
    cy.contains("Products").should("be.visible");
    cy.contains("Orders").should("be.visible");
    cy.contains("Revenue").should("be.visible");
  });

  it("navigates from the dashboard to the users page", () => {
    cy.contains("button", "Manage Users").click();
    cy.location("pathname").should("eq", "/admin/users");
    cy.contains("body", "User").should("be.visible");
  });
});
