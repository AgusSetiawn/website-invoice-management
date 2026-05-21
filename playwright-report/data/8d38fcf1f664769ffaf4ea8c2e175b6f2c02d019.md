# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Invoice Management App E2E >> should create a new folder and save a transaction
- Location: e2e\app.spec.ts:24:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Test Customer E2E')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Test Customer E2E')

```

```yaml
- alert
- navigation:
  - img "Logo"
  - heading "Fandi Boiler" [level=1]
  - paragraph: Supplier Ayam & Bebek Segar — Bersih, Halal, Higienis & Berkualitas
  - link "Beranda":
    - /url: /
  - link "Buat Nota":
    - /url: /invoice
  - link "Riwayat":
    - /url: /history
    - img
    - text: Riwayat
- heading "Riwayat Transaksi" [level=2]
- paragraph: Log semua pembuatan nota dan pembayaran
- textbox "Cari nama atau catatan..."
- button "Semua"
- button "Nota"
- button "Bayar"
- paragraph: Belum ada riwayat transaksi.
- paragraph: Buat nota atau catat pembayaran untuk melihatnya di sini.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Invoice Management App E2E', () => {
  4  |   test('should load the dashboard and display correct title', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await expect(page).toHaveTitle(/Nota Digital/);
  7  |     
  8  |     // Verify Dashboard layout
  9  |     await expect(page.getByRole('heading', { name: 'Ringkasan Keuangan' })).toBeVisible();
  10 |     await expect(page.getByRole('heading', { name: 'Folder Pelanggan' })).toBeVisible();
  11 |   });
  12 | 
  13 |   test('should navigate to invoice creation page', async ({ page }) => {
  14 |     await page.goto('/');
  15 |     
  16 |     // Click on 'Buat Nota' in navigation
  17 |     await page.click('text=Buat Nota');
  18 |     
  19 |     // Verify invoice page elements
  20 |     await expect(page.locator('text=Informasi Dasar')).toBeVisible();
  21 |     await expect(page.locator('text=Daftar Barang')).toBeVisible();
  22 |   });
  23 |   
  24 |   test('should create a new folder and save a transaction', async ({ page }) => {
  25 |     await page.goto('/invoice');
  26 |     
  27 |     // Fill in customer name
  28 |     await page.fill('input[placeholder="Ketik nama pembeli..."]', 'Test Customer E2E');
  29 |     
  30 |     // Verify the recommendation dropdown suggests creating a new folder
  31 |     await expect(page.locator('text=Belum ada folder pelanggan.')).toBeVisible();
  32 |     await page.click('button:has-text("Bikin Folder \\"Test Customer E2E\\"")');
  33 |     
  34 |     // Verify success alert
  35 |     await expect(page.getByRole('heading', { name: 'Berhasil' })).toBeVisible();
  36 |     await page.click('button:has-text("Mengerti")');
  37 |     
  38 |     // Add an item
  39 |     await page.fill('input[placeholder="Ketik nama barang..."]', 'Ayam Potong');
  40 |     await page.fill('input[type="number"]', '10');
  41 |     await page.fill('input[placeholder="Rp 0"]', '35000');
  42 |     
  43 |     // Save data
  44 |     await page.click('button:has-text("Simpan Data")');
  45 |     
  46 |     // Verify save success
  47 |     await expect(page.getByRole('heading', { name: 'Berhasil' })).toBeVisible();
  48 |     await page.click('button:has-text("Mengerti")');
  49 | 
  50 |     // View the transaction in history page
  51 |     await page.goto('/history');
  52 |     
  53 |     // Verify the transaction appears in the history list
  54 |     await expect(page.getByRole('heading', { name: 'Riwayat Transaksi' })).toBeVisible();
> 55 |     await expect(page.locator('text=Test Customer E2E')).toBeVisible();
     |                                                          ^ Error: expect(locator).toBeVisible() failed
  56 |     
  57 |     // Click on the transaction to open details
  58 |     await page.click('text=Test Customer E2E');
  59 |     
  60 |     // Verify modal details
  61 |     await expect(page.getByRole('heading', { name: 'Detail Transaksi' })).toBeVisible();
  62 |     await expect(page.locator('text=Ayam Potong')).toBeVisible();
  63 |   });
  64 | });
  65 | 
```