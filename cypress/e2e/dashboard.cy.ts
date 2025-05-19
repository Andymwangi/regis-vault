describe('Dashboard', () => {
  context('When not authenticated', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
    });

    it('should redirect to login when not authenticated', () => {
      cy.url().should('include', '/sign-in');
    });
  });

  context('When authenticated', () => {
    beforeEach(() => {
      // Instead of using cy.visitAuth, we'll do the auth manually
      // Set the session cookie
      cy.setCookie('session', 'mock-session-token');
      
      // Intercept the auth API
      cy.intercept('/api/auth/me', {
        statusCode: 200,
        body: {
          $id: 'test-user-id',
          fullName: 'Test User',
          email: 'test@example.com',
          role: 'user',
          department: 'test-department',
          departmentId: 'test-department-id',
          avatar: 'https://example.com/avatar.png',
          status: 'active',
          theme: 'light'
        }
      }).as('authCheck');
      
      cy.visit('/dashboard');
      cy.wait('@authCheck');
    });

    it('should display the dashboard when authenticated', () => {
      // Check for dashboard elements - use data-cy attributes when possible
      cy.url().should('include', '/dashboard');
      cy.get('h1').should('exist');
      cy.get('[data-cy="dashboard-stats"], .dashboard-stats').should('exist');
    });

    it('should display user greeting', () => {
      // Check for personalized greeting with the user's name
      cy.get('h1, h2').should('contain', 'Welcome');
    });

    it('should have working navigation in sidebar', () => {
      // Test that sidebar links work
      cy.get('a').contains('My Files').click();
      cy.url().should('include', '/dashboard/files');
      
      cy.get('a').contains('Settings').click();
      cy.url().should('include', '/dashboard/settings');
      
      cy.get('a').contains('Profile').click();
      cy.url().should('include', '/dashboard/profile');
    });
  });
}); 