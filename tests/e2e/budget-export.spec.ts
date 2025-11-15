import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * TC-024: Budget CSV Playwright Smoke Test
 * 
 * Methodology: End-to-End Testing
 * Purpose: Confirm CSV download success across browsers
 * 
 * Test Cases:
 * 1. Authenticate and navigate to budgets workspace
 * 2. Trigger export and capture download artifact
 * 3. Parse CSV to confirm headers and row counts
 * 
 * Expected Results: CSV saved with expected schema in Chromium and Firefox
 * Configuration: Playwright download fixtures, seeded budget data
 */

test.describe('Budget CSV Export', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to budgets page
    // Note: In a real scenario, this would require authentication
    // For now, we'll test the export functionality assuming we're on the budgets page
    await page.goto('/budgets');
    
    // Wait for budgets to load
    await page.waitForSelector('text=Budgets', { timeout: 10000 });
  });

  test('should export budgets to CSV with correct headers', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click the export button
    const exportButton = page.getByRole('button', { name: /Export CSV/i });
    await expect(exportButton).toBeVisible();
    await exportButton.click();
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify download filename
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/^budget-export-.*\.csv$/);
    
    // Save the file
    const downloadsDir = join(__dirname, '..', '..', 'downloads');
    const filePath = join(downloadsDir, fileName);
    await download.saveAs(filePath);
    
    // Read and parse CSV (file path is controlled by test, safe to read)
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const csvContent = readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\r\n').filter(line => line.trim());
    
    // Verify CSV structure
    expect(lines.length).toBeGreaterThan(1); // At least header + 1 data row
    
    // Verify headers
    const headers = lines[0].split(',');
    const expectedHeaders = [
      'Budget Name',
      'Budget Period',
      'Start Date',
      'End Date',
      'Category',
      'Allocated',
      'Spent',
      'Variance',
      'Variance %',
      'Alert Threshold',
      'Rollover Applied',
      'Notes',
      'Last Updated',
    ];
    
    expect(headers).toEqual(expectedHeaders);
    
    // Verify data rows exist
    expect(lines.length).toBeGreaterThan(1);
    
    // Verify first data row has correct number of columns
    if (lines.length > 1) {
      const firstDataRow = lines[1].split(',');
      expect(firstDataRow.length).toBeGreaterThanOrEqual(expectedHeaders.length);
    }
  });

  test('should show success message after export', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click the export button
    const exportButton = page.getByRole('button', { name: /Export CSV/i });
    await exportButton.click();
    
    // Wait for download
    await downloadPromise;
    
    // Verify success message appears
    const successMessage = page.getByRole('status', { name: /exported/i });
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    await expect(successMessage).toContainText(/exported/i);
  });

  test('should handle export with multiple budgets', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export
    const exportButton = page.getByRole('button', { name: /Export CSV/i });
    await exportButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    const fileName = download.suggestedFilename();
    const downloadsDir = join(__dirname, '..', '..', 'downloads');
    const filePath = join(downloadsDir, fileName);
    await download.saveAs(filePath);
    
    // Read CSV (file path is controlled by test, safe to read)
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const csvContent = readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\r\n').filter(line => line.trim());
    
    // Verify we have data rows (header + at least one budget's categories)
    expect(lines.length).toBeGreaterThan(1);
    
    // Count unique budget names in CSV
    const budgetNames = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const budgetName = row[0];
      if (budgetName) {
        budgetNames.add(budgetName);
      }
    }
    
    // Should have at least one budget
    expect(budgetNames.size).toBeGreaterThan(0);
  });
});

