describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/sign-in');
  });

  it('should show the sign-in form', () => {
    cy.get('h1').should('contain', 'Sign In');
    cy.get('form').should('exist');
    cy.get('input[type="email"]').should('exist');
  });

  it('should validate email format', () => {
    cy.get('input[type="email"]').type('invalid-email');
    cy.get('button[type="submit"]').click();
    cy.get('form').should('contain', 'valid email');
  });

  it('should have a link to sign up', () => {
    cy.get('a').contains(/sign up|register/i).should('exist');
  });

  it('should navigate to sign-up page', () => {
    cy.get('a').contains(/sign up|register/i).click();
    cy.url().should('include', '/sign-up');
  });
}); 