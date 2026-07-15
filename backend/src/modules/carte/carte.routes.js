const express  = require('express');
const router   = express.Router();
const ctrl     = require('./carte.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');
const { limiterOtp } = require('../../middlewares/rateLimiter');

router.use(authentifier);

// ── Bénéficiaire ──────────────────────────────────────────────────────────────

// Créer sa carte virtuelle
router.post('/virtuelle', autoriser('BENEFICIAIRE'), ctrl.creerVirtuelle);

// Consulter sa carte
router.get('/moi', autoriser('BENEFICIAIRE'), ctrl.getMaCarte);

// CVV dynamique (rate-limit 3/h géré côté middleware)
router.post('/:id/cvv', autoriser('BENEFICIAIRE'), limiterOtp, ctrl.getCVV);

// QR Code dynamique
router.get('/:id/qrcode', autoriser('BENEFICIAIRE'), ctrl.getQRCode);

// Bloquer sa propre carte
router.post('/:id/bloquer-moi', autoriser('BENEFICIAIRE'), ctrl.bloquerMaCarte);

// Demande carte physique
router.post('/physique/demande', autoriser('BENEFICIAIRE'), ctrl.demanderPhysique);

// Activation carte physique
router.post('/:id/physique/activer', autoriser('BENEFICIAIRE'), ctrl.activerPhysique);

// ── Paiement (commerçant / terminal) ─────────────────────────────────────────

// Validation QR (commerçant)
router.post('/paiement/qr/valider', autoriser('COMMERCANT', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerQR);

// Validation NFC (terminal)
router.post('/paiement/nfc/valider', autoriser('COMMERCANT', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerNFC);

// ── Employeur : demander carte physique pour un bénéficiaire ─────────────────
router.post('/physique/demande/:userId', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.demanderPhysiqueEmployeur);

// ── Admin / Employeur ─────────────────────────────────────────────────────────

// Lister (admin = tout, employeur = ?entrepriseId)
router.get('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.lister);

// Demandes de cartes physiques en attente (admin only)
router.get('/demandes', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.listerDemandes);

// Valider une demande de carte physique (admin only)
router.post('/:id/valider-demande', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerDemande);

// Créer une carte virtuelle pour un bénéficiaire (admin, urgence)
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.creer);

// Bloquer / débloquer (admin ou employeur)
router.post('/:id/bloquer',   autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.bloquer);
router.post('/:id/debloquer', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.debloquer);

module.exports = router;
