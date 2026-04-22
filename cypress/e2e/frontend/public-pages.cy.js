describe("Public page demo flows", () => {
  it("renders the home page hero and key sections", () => {
    cy.visit("/");
    cy.contains("button", "Shop now").should("be.visible");
    cy.contains("body", "Free Delivery").should("be.visible");
    cy.contains("body", "Support 24/7").should("be.visible");
  });

  it("renders the help and contact page with support form", () => {
    cy.visit("/help-contact");
    cy.contains("h1", "Help & Contact").should("be.visible");
    cy.contains("body", "Frequently Asked Questions").should("be.visible");
    cy.get("#fullName").should("be.visible");
    cy.get("#email").should("be.visible");
    cy.get("#subject").should("be.visible");
    cy.get("#message").should("be.visible");
    cy.contains("button", "Send Request").should("be.disabled");
  });

  it("renders the unauthorized page clearly", () => {
    cy.visit("/unauthorized");
    cy.contains("h1", "Access Denied").should("be.visible");
    cy.contains("body", "403 - Forbidden").should("be.visible");
    cy.contains("button", "Back to Home").should("be.visible");
  });
});
