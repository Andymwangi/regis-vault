/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// Mock authentication by setting the necessary cookies/localStorage
Cypress.Commands.add('mockAuth', (userRole = 'user') => {
  // This is a simplified example
  // You'll need to adapt this based on how your app handles authentication

  // Mock a session cookie - adjust based on your actual auth implementation
  cy.setCookie('session', 'mock-session-token');
  
  // Mock user data in localStorage if your app uses it
  const mockUser = {
    $id: 'test-user-id',
    fullName: 'Test User',
    email: 'test@example.com',
    role: userRole,
    department: 'test-department',
    departmentId: 'test-department-id',
    avatar: 'https://example.com/avatar.png',
    status: 'active',
    theme: 'light'
  };
  
  localStorage.setItem('user', JSON.stringify(mockUser));
  
  // Intercept API calls that check for authentication
  cy.intercept('/api/auth/me', {
    statusCode: 200,
    body: mockUser
  }).as('authCheck');
  
  // Intercept requests to user data
  cy.intercept('GET', '**/user*', {
    body: mockUser
  }).as('userData');
});

// Visit a page as an authenticated user
Cypress.Commands.add('visitAuth', (url: string, userRole = 'user') => {
  cy.mockAuth(userRole);
  cy.visit(url);
  cy.wait('@authCheck');
});

declare global {
  namespace Cypress {
    interface Chainable {
      mockAuth(userRole?: string): Chainable<void>
      visitAuth(url: string, userRole?: string): Chainable<void>
    }
  }
}