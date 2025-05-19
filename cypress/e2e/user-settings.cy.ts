describe('User Settings', () => {
  context('When not authenticated', () => {
    beforeEach(() => {
      cy.visit('/dashboard/settings');
    });

    it('should redirect to login when not authenticated', () => {
      cy.url().should('include', '/sign-in');
    });
  });

  context('When authenticated', () => {
    beforeEach(() => {
      // Set auth cookie
      cy.setCookie('session', 'mock-session-token');
      
      // Mock auth API response
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
      
      // Mock user settings API
      cy.intercept('/api/user/settings*', {
        statusCode: 200,
        body: {
          theme: 'light',
          notificationsEnabled: true,
          emailNotifications: true
        }
      }).as('userSettings');
      
      cy.visit('/dashboard/settings');
      cy.wait('@authCheck');
    });

    it('should display user settings form', () => {
      cy.get('[data-cy="settings-form"], form').should('exist');
    });

    it('should have theme selection controls', () => {
      cy.get('[data-cy="theme-settings"], [id*="theme"]').should('exist');
    });

    it('should have notification settings', () => {
      cy.get('[data-cy="notification-settings"], [id*="notif"]').should('exist');
    });
  });
});

describe('User Profile', () => {
  context('When not authenticated', () => {
    beforeEach(() => {
      cy.visit('/dashboard/profile');
    });

    it('should redirect to login when not authenticated', () => {
      cy.url().should('include', '/sign-in');
    });
  });

  context('When authenticated', () => {
    beforeEach(() => {
      // Set auth cookie
      cy.setCookie('session', 'mock-session-token');
      
      // Mock auth API response
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
      
      cy.visit('/dashboard/profile');
      cy.wait('@authCheck');
    });

    it('should display user profile information', () => {
      cy.contains('Test User').should('exist');
      cy.contains('test@example.com').should('exist');
    });

    it('should have profile edit button', () => {
      cy.get('[data-cy="edit-profile"], button:contains("Edit")').should('exist');
    });

    it('should have avatar upload option', () => {
      cy.get('[data-cy="avatar-upload"], [aria-label*="avatar"], [id*="avatar"]').should('exist');
    });
  });
}); 