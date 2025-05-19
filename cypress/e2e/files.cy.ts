describe('File Management', () => {
  context('When not authenticated', () => {
    beforeEach(() => {
      cy.visit('/dashboard/files');
    });

    it('should redirect to login when not authenticated', () => {
      // When not authenticated, any dashboard page should redirect to sign-in
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
      
      // Mock file data API response
      cy.intercept('/api/files*', {
        statusCode: 200,
        body: {
          files: [
            {
              id: 'file-1',
              name: 'Document.pdf',
              type: 'application/pdf',
              size: 1024000,
              createdAt: new Date().toISOString(),
              owner: 'Test User'
            },
            {
              id: 'file-2',
              name: 'Image.jpg',
              type: 'image/jpeg',
              size: 512000,
              createdAt: new Date().toISOString(),
              owner: 'Test User'
            }
          ]
        }
      }).as('fileData');
      
      cy.visit('/dashboard/files');
      cy.wait('@authCheck');
    });

    it('should display file list', () => {
      cy.get('[data-cy="file-list"], .file-list, table').should('exist');
    });

    it('should have upload button', () => {
      cy.get('[data-cy="upload-button"], button:contains("Upload")').should('exist');
    });

    it('should be able to filter files', () => {
      cy.get('[data-cy="filter-dropdown"], [aria-label="filter"], select').should('exist');
    });

    it('should display file details', () => {
      cy.contains('Document.pdf').should('exist');
      cy.contains('Image.jpg').should('exist');
    });
  });
}); 