// E2E Playwright — Flux dotation employeur TIKEXO
import { test, expect } from '@playwright/test';

const RH_PHONE = process.env.TEST_RH_PHONE || '+22990000002';

test.describe('Employeur — Flux Dotation TIKEXO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="telephone-input"]', RH_PHONE);
    await page.click('[data-testid="send-otp-btn"]');

    const otpRes = await page.request.get(`/api/v1/test/otp?telephone=${RH_PHONE}`);
    const { code } = await otpRes.json();

    await page.fill('[data-testid="otp-input"]', code);
    await page.click('[data-testid="verify-otp-btn"]');
    await expect(page).toHaveURL(/\/rh/);
  });

  test('Recharger wallet entreprise via mock webhook FedaPay', async ({ page }) => {
    await page.goto('/rh/wallet');

    const soldeAvant = await page.locator('[data-testid="solde-wallet"]').textContent();

    await page.click('[data-testid="recharger-wallet-btn"]');
    await page.fill('[data-testid="montant-recharge-input"]', '100000');
    await page.click('[data-testid="initier-paiement-btn"]');

    // Attendre la redirection vers FedaPay (mockée en dev)
    await expect(page.locator('[data-testid="paiement-en-cours"]')).toBeVisible();

    // Simuler le webhook FedaPay en test
    const txId = await page.locator('[data-testid="fedapay-tx-id"]').textContent();
    await page.request.post('/api/v1/test/webhook/fedapay', {
      data: { transaction: { id: txId, status: 'approved' } },
    });

    // Attendre la mise à jour du solde (Socket.io)
    await expect(page.locator('[data-testid="solde-wallet"]')).not.toHaveText(soldeAvant || '');
    const soldeApres = await page.locator('[data-testid="solde-wallet"]').textContent();
    expect(parseFloat(soldeApres?.replace(/[^0-9.]/g, '') || '0')).toBeGreaterThan(
      parseFloat(soldeAvant?.replace(/[^0-9.]/g, '') || '0')
    );
  });

  test('Calculer les dotations du mois', async ({ page }) => {
    await page.goto('/rh/dotations');

    await page.click('[data-testid="calculer-dotations-btn"]');
    await page.selectOption('[data-testid="mois-concerne-select"]', '2026-06');
    await page.click('[data-testid="confirmer-calcul-btn"]');

    await expect(page.locator('[data-testid="dotations-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="dotation-row"]').first()).toBeVisible();

    // Vérifier que le nombre de titres est cohérent avec les jours ouvrés
    const nbTitres = await page.locator('[data-testid="dotation-row"]').first()
      .locator('[data-testid="nb-titres"]').textContent();
    expect(parseInt(nbTitres || '0')).toBeGreaterThan(0);
  });

  test('Valider et distribuer les dotations', async ({ page }) => {
    await page.goto('/rh/dotations');

    // Sélectionner toutes les dotations EN_ATTENTE
    await page.click('[data-testid="selectionner-tout-checkbox"]');
    await page.click('[data-testid="valider-selection-btn"]');
    await page.click('[data-testid="confirmer-validation-btn"]');

    await expect(page.locator('[data-testid="validation-success-toast"]')).toBeVisible();

    // Distribuer
    await page.click('[data-testid="distribuer-selection-btn"]');
    await page.click('[data-testid="confirmer-distribution-btn"]');

    await expect(page.locator('[data-testid="distribution-success-toast"]')).toBeVisible();

    // Vérifier le statut des dotations
    await expect(page.locator('[data-testid="dotation-row"][data-statut="DISTRIBUE"]').first())
      .toBeVisible();
  });

  test('Vérifier les soldes bénéficiaires après distribution', async ({ page }) => {
    await page.goto('/rh/beneficiaires');

    const premierBenef = page.locator('[data-testid="beneficiaire-row"]').first();
    await premierBenef.click();

    // Ouvrir le détail du wallet
    await expect(page.locator('[data-testid="wallet-solde"]')).toBeVisible();
    const solde = await page.locator('[data-testid="wallet-solde"]').textContent();
    expect(parseFloat(solde?.replace(/[^0-9.]/g, '') || '0')).toBeGreaterThan(0);
  });
});
