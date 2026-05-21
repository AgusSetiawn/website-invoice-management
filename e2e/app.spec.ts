import { test, expect } from '@playwright/test';

test.describe('Invoice Management App E2E', () => {
  test('should load the dashboard and display correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Nota Digital/);
    
    // Verify Dashboard layout
    await expect(page.getByRole('heading', { name: 'Ringkasan Keuangan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Folder Pelanggan' })).toBeVisible();
  });

  test('should navigate to invoice creation page', async ({ page }) => {
    await page.goto('/');
    
    // Click on 'Buat Nota' in navigation
    await page.click('text=Buat Nota');
    
    // Verify invoice page elements
    await expect(page.locator('text=Informasi Dasar')).toBeVisible();
    await expect(page.locator('text=Daftar Barang')).toBeVisible();
  });
  
  test('should create a new folder and save a transaction', async ({ page }) => {
    await page.goto('/invoice');
    
    // Fill in customer name
    await page.fill('input[placeholder="Ketik nama pembeli..."]', 'Test Customer E2E');
    
    // Verify the recommendation dropdown suggests creating a new folder
    await expect(page.locator('text=Belum ada folder pelanggan.')).toBeVisible();
    await page.click('button:has-text("Bikin Folder \\"Test Customer E2E\\"")');
    
    // Verify success alert
    await expect(page.getByRole('heading', { name: 'Berhasil' })).toBeVisible();
    await page.click('button:has-text("Mengerti")');
    
    // Add an item
    await page.fill('input[placeholder="Ketik nama barang..."]', 'Ayam Potong');
    await page.fill('input[type="number"]', '10');
    await page.fill('input[placeholder="Rp 0"]', '35000');
    
    // Save data
    await page.click('button:has-text("Simpan Data")');
    
    // Verify save success
    await expect(page.getByRole('heading', { name: 'Berhasil' })).toBeVisible();
    await page.click('button:has-text("Mengerti")');

    // View the transaction in history page
    await page.goto('/history');
    
    // Verify the transaction appears in the history list
    await expect(page.getByRole('heading', { name: 'Riwayat Transaksi' })).toBeVisible();
    await expect(page.locator('text=Test Customer E2E')).toBeVisible();
    
    // Click on the transaction to open details
    await page.click('text=Test Customer E2E');
    
    // Verify modal details
    await expect(page.getByRole('heading', { name: 'Detail Transaksi' })).toBeVisible();
    await expect(page.locator('text=Ayam Potong')).toBeVisible();
  });
});
