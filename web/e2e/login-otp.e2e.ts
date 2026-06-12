// E2E Playwright — Connexion par OTP TIKEXO
import { test, expect } from '@playwright/test';

const BENEF_PHONE = process.env.TEST_BENEF_PHONE || '+22990000003';

test.describe('Connexion OTP — TIKEXO', () => {
  test('Flux complet : saisie téléphone → OTP → dashboard', async ({ page }) => {
    await page.goto('/login');

    // Étape 1 : Saisir le numéro de téléphone
    await expect(page.locator('[data-testid="telephone-input"]')).toBeVisible();
    await page.fill('[data-testid="telephone-input"]', BENEF_PHONE);
    await page.click('[data-testid="send-otp-btn"]');

    // Étape 2 : L'écran OTP s'affiche
    await expect(page.locator('[data-testid="otp-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="otp-hint"]')).toContainText('code');

    // Récupérer l'OTP via l'endpoint de test
    const otpRes = await page.request.get(`/api/v1/test/otp?telephone=${BENEF_PHONE}`);
    expect(otpRes.status()).toBe(200);
    const { code } = await otpRes.json();
    expect(code).toMatch(/^\d{6}$/);

    // Étape 3 : Saisir le bon OTP
    await page.fill('[data-testid="otp-input"]', code);
    await page.click('[data-testid="verify-otp-btn"]');

    // Étape 4 : Redirection vers le dashboard
    await expect(page).toHaveURL(/\/(dashboard|accueil)/);
    await expect(page.locator('[data-testid="wallet-solde"]')).toBeVisible();
  });

  test('Mauvais OTP 3× → message de blocage affiché', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="telephone-input"]', BENEF_PHONE);
    await page.click('[data-testid="send-otp-btn"]');

    // 3 tentatives avec un mauvais code
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="otp-input"]', '000000');
      await page.click('[data-testid="verify-otp-btn"]');

      if (i < 2) {
        await expect(page.locator('[data-testid="otp-error"]')).toBeVisible();
        await page.fill('[data-testid="otp-input"]', '');
      }
    }

    // Après 3 échecs : message de blocage ou d'épuisement des tentatives
    await expect(
      page.locator('[data-testid="otp-blocked-msg"], [data-testid="otp-max-attempts-msg"]')
    ).toBeVisible();
  });

  test('OTP expiré → message d\'expiration affiché', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="telephone-input"]', BENEF_PHONE);
    await page.click('[data-testid="send-otp-btn"]');

    // Invalider l'OTP via l'endpoint de test (simule l'expiration)
    await page.request.post(`/api/v1/test/otp/expire?telephone=${BENEF_PHONE}`);

    await page.fill('[data-testid="otp-input"]', '123456');
    await page.click('[data-testid="verify-otp-btn"]');

    await expect(page.locator('[data-testid="otp-expired-msg"]')).toBeVisible();
  });

  test('Renvoi d\'OTP : nouveau code invalide l\'ancien', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="telephone-input"]', BENEF_PHONE);
    await page.click('[data-testid="send-otp-btn"]');

    // Récupérer le premier OTP
    const otpRes1 = await page.request.get(`/api/v1/test/otp?telephone=${BENEF_PHONE}`);
    const { code: code1 } = await otpRes1.json();

    // Renvoyer un nouvel OTP
    await page.click('[data-testid="renvoyer-otp-btn"]');
    await page.waitForTimeout(500);

    const otpRes2 = await page.request.get(`/api/v1/test/otp?telephone=${BENEF_PHONE}`);
    const { code: code2 } = await otpRes2.json();

    // Les deux codes doivent être différents
    expect(code1).not.toBe(code2);

    // L'ancien code ne doit plus fonctionner
    await page.fill('[data-testid="otp-input"]', code1);
    await page.click('[data-testid="verify-otp-btn"]');
    await expect(page.locator('[data-testid="otp-error"]')).toBeVisible();

    // Le nouveau code doit fonctionner
    await page.fill('[data-testid="otp-input"]', code2);
    await page.click('[data-testid="verify-otp-btn"]');
    await expect(page).toHaveURL(/\/(dashboard|accueil)/);
  });
});
