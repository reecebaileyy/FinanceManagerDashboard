import { test, expect } from '@playwright/test';

/**
 * TC-025: Suspended Account Login Flow (E2E)
 * 
 * Methodology: End-to-End Testing
 * Purpose: Ensure suspended accounts cannot login or refresh sessions
 * 
 * Test Cases:
 * 1. Attempt login with suspended user (expect forbidden/error)
 * 2. Verify appropriate error message is displayed
 * 3. Verify user cannot access protected routes
 * 
 * Expected Results: Suspended users are blocked consistently with clear messaging
 * Configuration: Test user with suspended status, mock auth service
 */

test.describe('Suspended Account Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForSelector('text=Login', { timeout: 5000 });
  });

  test('should display error when attempting to login with suspended account', async ({ page }) => {
    // Fill in suspended user credentials
    // Note: In a real implementation, this would use a test user with suspended status
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    await emailInput.fill('suspended@example.com');
    await passwordInput.fill('TestPassword123!');
    
    // Submit login form
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();
    
    // Wait for error message
    // The error should indicate the account is suspended
    const errorMessage = page.locator('text=/suspended|account.*disabled|access.*denied/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should prevent access to protected routes after suspended login attempt', async ({ page }) => {
    // Attempt login with suspended account
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    await emailInput.fill('suspended@example.com');
    await passwordInput.fill('TestPassword123!');
    
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();
    
    // Wait for error
    await page.waitForSelector('text=/suspended|error/i', { timeout: 5000 });
    
    // Try to navigate to protected route
    await page.goto('/dashboard');
    
    // Should be redirected to login or show access denied
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/login|\/forbidden|\/access-denied/);
  });

  test('should show appropriate error message format', async ({ page }) => {
    // Attempt login
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    await emailInput.fill('suspended@example.com');
    await passwordInput.fill('TestPassword123!');
    
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();
    
    // Verify error message is user-friendly
    const errorContainer = page.locator('[role="alert"], .error, [class*="error"]').first();
    await expect(errorContainer).toBeVisible({ timeout: 5000 });
    
    const errorText = await errorContainer.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText?.toLowerCase()).toMatch(/suspended|disabled|contact|support/i);
  });
});

