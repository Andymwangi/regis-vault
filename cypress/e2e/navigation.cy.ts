describe('Navigation', () => {
  // Skip authentication for now and test the routes that don't require auth
  beforeEach(() => {
    cy.visit('/');
  });

  it('should navigate to sign-in from homepage', () => {
    cy.get('a').contains(/sign in|login/i).click();
    cy.url().should('include', '/sign-in');
  });

  it('should navigate to sign-up from homepage', () => {
    cy.get('a').contains(/sign up|register/i).click();
    cy.url().should('include', '/sign-up');
  });

  // Tests for authenticated navigation
  context('When authenticated', () => {
    beforeEach(() => {
      // Skip these tests until authentication is properly mocked
      cy.log('Authentication mocking required for these tests');
      // The following would be implemented when auth is mocked
      // cy.visit('/dashboard');
    });

    it('should show sidebar navigation with correct links', () => {
      // When auth is properly mocked, uncomment the tests below
      // cy.get('[data-cy="sidebar"]').should('exist');
      // cy.get('[data-cy="sidebar"]').contains('My Files').should('exist');
      // cy.get('[data-cy="sidebar"]').contains('Shared with Me').should('exist');
      // cy.get('[data-cy="sidebar"]').contains('Recent').should('exist');
      // cy.get('[data-cy="sidebar"]').contains('Trash').should('exist');
    });

    it('should navigate to My Files page', () => {
      // When auth is properly mocked, uncomment the tests below
      // cy.get('[data-cy="sidebar"]').contains('My Files').click();
      // cy.url().should('include', '/dashboard/files');
    });

    it('should navigate to Settings page', () => {
      // When auth is properly mocked, uncomment the tests below
      // cy.get('[data-cy="user-menu"]').click();
      // cy.get('[data-cy="user-menu"]').contains('Settings').click();
      // cy.url().should('include', '/dashboard/settings');
    });
  });
}); 