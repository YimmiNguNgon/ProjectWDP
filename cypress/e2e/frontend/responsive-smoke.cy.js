describe("Responsive smoke demo", () => {
  it("home page loads on mobile viewport", () => {
    cy.viewport("iphone-x");
    cy.visit("/");
    cy.contains("body", "Shop now").should("be.visible");
  });

  it("help page loads on tablet viewport", () => {
    cy.viewport("ipad-2");
    cy.visit("/help-contact");
    cy.contains("h1", "Help & Contact").should("be.visible");
    cy.get("#subject").should("be.visible");
  });
});
