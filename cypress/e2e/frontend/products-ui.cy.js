describe("Products page UI demo", () => {
  it("renders product page filter sidebar and sort control", () => {
    cy.visit("/products");
    cy.contains("body", "Shop by Category").should("be.visible");
    cy.contains("button", "Apply Filters").should("be.visible");
    cy.contains("button", "Reset").should("be.visible");
    cy.contains("body", "Sort by").should("be.visible");
  });

  it("can reset filters after changing rating", () => {
    cy.visit("/products");
    cy.contains("button", "& up").first().click();
    cy.contains("button", "Reset").click();
    cy.contains("button", "Apply Filters").should("be.visible");
  });
});
