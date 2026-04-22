describe("Login failure flow", () => {
  it("shows an error and does not store token when password is wrong", () => {


    cy.visit("/auth/sign-in");
   cy.get('[name="username"]').type("admin");
    cy.get('[name="password"]')
      .should("be.visible")
      .clear()
      .type("wrong-password");
    cy.contains("button", "Login").click();

    cy.contains("Invalid").should("be.visible");
    cy.location("pathname").should("eq", "/auth/sign-in");
  
  });
});
