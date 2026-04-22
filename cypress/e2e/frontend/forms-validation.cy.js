describe("Frontend form validation demo", () => {
  it("shows signup validation messages on empty submit", () => {
    cy.visit("/auth/sign-up");
    cy.contains("button", "Create Account").click();
    cy.contains("Username must be at least 3 characters").should("be.visible");
    cy.contains("Invalid email address").should("be.visible");
    cy.contains("Password must be at least 6 characters").should("be.visible");
  });

  it("enables support request submit when fields become valid", () => {
    cy.visit("/help-contact");

    cy.get("#fullName").clear().type("Demo User");
    cy.get("#email").clear().type("demo@example.com");
    cy.get("#subject").type("Need support");
    cy.get("#message").type(
      "This is a simple frontend UX validation test for the support form.",
    );

    cy.contains("button", "Send Request").should("not.be.disabled");
  });
});
