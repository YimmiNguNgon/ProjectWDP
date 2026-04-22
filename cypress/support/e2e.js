import "./commands";

beforeEach(() => {
  cy.viewport(1440, 900);
});

Cypress.on("uncaught:exception", (err) => {
  if (
    err.message.includes("ResizeObserver loop completed") ||
    err.message.includes("ResizeObserver loop limit exceeded")
  ) {
    return false;
  }
});
