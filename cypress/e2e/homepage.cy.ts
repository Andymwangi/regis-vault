describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the homepage', () => {
    cy.get('h1').should('be.visible');
  });

  it('should contain navigation links', () => {
    cy.get('nav').should('exist');
  });
}); 