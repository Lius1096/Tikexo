const express  = require('express');
const router   = express.Router();
const ctrl     = require('./carte.controller');
const { authentifier, autoriser, ROLES_BENEFICIAIRE_OU_ADMIN } = require('../../middlewares/auth');
const { limiterOtp } = require('../../middlewares/rateLimiter');

router.use(authentifier);

// ── Bénéficiaire (ou admin/RH consultant son propre espace salarié) ─────────

// Créer sa carte virtuelle
router.post('/virtuelle', autoriser(...ROLES_BENEFICIAIRE_OU_ADMIN), ctrl.creerVirtuelle);

// Consulter sa carte
router.get('/moi', autoriser(...ROLES_BENEFICIAIRE_OU_ADMIN), ctrl.getMaCarte);

// CVV dynamique (rate-limit 3/h géré côté middleware)
router.post('/:id/cvv', autoriser(...ROLES_BENEFICIAIRE_OU_ADMIN), limiterOtp, ctrl.getCVV);

// QR Code dynamique
router.get('/:id/qrcode', autoriser(...ROLES_BENEFICIAIRE_OU_ADMIN), ctrl.getQRCode);

// Token NFC dynamique (tap HCE)
router.get('/:id/nfctoken', autoriser(...ROLES_BENEFICIAIRE_OU_ADMIN), ctrl.getNFCToken);

// Bloquer sa propre carte
router.post('/:id/bloquer-moi', autoriser(...ROLES_BENEFICIAIRE_OU_ADMIN), ctrl.bloquerMaCarte);

// Demande carte physique
router.post('/physique/demande', autoriser(...ROLES_BENEFICIAIRE_OU_ADMIN), ctrl.demanderPhysique);

// Activation carte physique
router.post('/:id/physique/activer', autoriser(...ROLES_BENEFICIAIRE_OU_ADMIN), ctrl.activerPhysique);

// ── Paiement (commerçant / terminal) ─────────────────────────────────────────

// Validation QR (commerçant)
router.post('/paiement/qr/valider', autoriser('COMMERCANT', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerQR);

// Validation NFC (terminal)
router.post('/paiement/nfc/valider', autoriser('COMMERCANT', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerNFC);

// Validation + débit en un seul appel — commerçant scanne/tape la carte du bénéficiaire
router.post('/paiement/qr/payer', autoriser('COMMERCANT'), ctrl.payerQR);
router.post('/paiement/nfc/payer', autoriser('COMMERCANT'), ctrl.payerNFC);

// ── Employeur : demander carte physique pour un bénéficiaire ─────────────────
router.post('/physique/demande/:userId', autoriser('ADMIN_DIRECTEUR', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.demanderPhysiqueEmployeur);

// ── Admin / Employeur ─────────────────────────────────────────────────────────

// Lister (admin = tout, employeur = ?entrepriseId)
router.get('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_DIRECTEUR', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.lister);

// Demandes de cartes physiques en attente (admin only)
router.get('/demandes', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.listerDemandes);

// Valider une demande de carte physique (admin only)
router.post('/:id/valider-demande', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerDemande);

// Créer une carte virtuelle pour un bénéficiaire (admin, urgence)
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.creer);

// Bloquer / débloquer (admin ou employeur)
router.post('/:id/bloquer',   autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_DIRECTEUR', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.bloquer);
router.post('/:id/debloquer', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_DIRECTEUR', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.debloquer);

module.exports = router;
