// E2E Playwright — Administration des entreprises TIKEXO
import { test, expect } from '@playwright/test';

test.describe('Admin Entreprise — TIKEXO', () => {
  test.beforeEach(async ({ page }) => {
    // Connexion en tant que SUPER_ADMIN
    await page.goto('/login');
    await page.fill('[data-testid="telephone-input"]', process.env.TEST_SUPER_ADMIN_PHONE!);
    await page.click('[data-testid="send-otp-btn"]');

    // Récupérer l'OTP via l'endpoint de test
    const otpRes = await page.request.get(`/api/v1/test/otp?telephone=${process.env.TEST_SUPER_ADMIN_PHONE}`);
    const { code } = await otpRes.json();

    await page.fill('[data-testid="otp-input"]', code);
    await page.click('[data-testid="verify-otp-btn"]');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('Créer une entreprise → statut EN_ATTENTE', async ({ page }) => {
    await page.goto('/admin/entreprises/nouveau');

    await page.fill('[data-testid="nom-input"]', 'Entreprise E2E Test');
    await page.fill('[data-testid="nif-input"]', 'NIF-E2E-' + Date.now());
    await page.fill('[data-testid="adresse-input"]', 'Cotonou, Bénin');
    await page.fill('[data-testid="email-input"]', 'test.e2e@entreprise.bj');
    await page.fill('[data-testid="telephone-input"]', '+22990000001');

    await page.click('[data-testid="submit-entreprise-btn"]');

    await expect(page.locator('[data-testid="statut-badge"]')).toContainText('EN_ATTENTE');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('Activer une entreprise → statut ACTIF + kyb_valide=true', async ({ page }) => {
    await page.goto('/admin/entreprises');

    // Trouver la première entreprise EN_ATTENTE
    const entrepriseRow = page.locator('[data-testid="entreprise-row"][data-statut="EN_ATTENTE"]').first();
    await entrepriseRow.locator('[data-testid="actions-btn"]').click();
    await page.click('[data-testid="activer-entreprise-btn"]');

    // Confirmer l'activation
    await page.click('[data-testid="confirmer-activation-btn"]');

    await expect(page.locator('[data-testid="statut-badge"]').first()).toContainText('ACTIF');
    await expect(page.locator('[data-testid="kyb-badge"]').first()).toContainText('KYB Validé');
  });

  test('Suspendre une entreprise → bénéficiaires ne peuvent plus payer', async ({ page }) => {
    await page.goto('/admin/entreprises');

    // Récupérer l'ID de l'entreprise active
    const entrepriseRow = page.locator('[data-testid="entreprise-row"][data-statut="ACTIF"]').first();
    const entrepriseId = await entrepriseRow.getAttribute('data-id');

    await entrepriseRow.locator('[data-testid="actions-btn"]').click();
    await page.click('[data-testid="suspendre-entreprise-btn"]');
    await page.fill('[data-testid="motif-suspension-input"]', 'Test de suspension E2E');
    await page.click('[data-testid="confirmer-suspension-btn"]');

    await expect(page.locator(`[data-id="${entrepriseId}"] [data-testid="statut-badge"]`))
      .toContainText('SUSPENDU');

    // Vérifier via API que les bénéficiaires sont bloqués
    const checkRes = await page.request.get(
      `/api/v1/entreprises/${entrepriseId}/beneficiaires/statut`,
      { headers: { Authorization: `Bearer ${process.env.TEST_SUPER_ADMIN_TOKEN}` } }
    );
    const data = await checkRes.json();
    // Les bénéficiaires de cette entreprise ne doivent pas pouvoir effectuer de transactions
    expect(data.peutEffectuerTransactions).toBe(false);
  });

  test('Tableau de bord admin — métriques entreprises chargées', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page.locator('[data-testid="total-entreprises"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-beneficiaires"]')).toBeVisible();
    await expect(page.locator('[data-testid="volume-transactions"]')).toBeVisible();
  });
});
