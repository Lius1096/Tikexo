// Utilitaire email TIKEXO — Nodemailer + senders nommés
const nodemailer = require('nodemailer');
const { emailQueue } = require('../queues/index');

// Adresses expéditrices officielles TIKEXO
const EXPEDITEURS = {
  noreply:     '"TIKEXO" <noreply@tikexo.bj>',
  hello:       '"TIKEXO" <hello@tikexo.bj>',
  facturation: '"TIKEXO Facturation" <facturation@tikexo.bj>',
  support:     '"TIKEXO Support" <support@tikexo.bj>',
  ops:         '"TIKEXO Ops" <ops@tikexo.bj>',
};

// Adresses de réponse selon le contexte
const REPLY_TO = {
  noreply:     'support@tikexo.bj',
  hello:       'support@tikexo.bj',
  facturation: 'facturation@tikexo.bj',
  support:     'support@tikexo.bj',
  ops:         'ops@tikexo.bj',
};

let _transport = null;

function getTransport() {
  if (_transport) return _transport;

  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = parseInt(SMTP_PORT || '587');
  _transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return _transport;
}

/**
 * Envoie un email TIKEXO.
 * @param {Object} opts
 * @param {string} opts.to          Destinataire
 * @param {string} opts.subject     Objet
 * @param {string} opts.html        Corps HTML
 * @param {string} [opts.text]      Corps texte brut (fallback)
 * @param {keyof EXPEDITEURS} [opts.expediteur='noreply']  Sender nommé
 * @param {string} [opts.replyTo]   Reply-To custom (override)
 */
// Ajoute l'email en queue — réponse immédiate, envoi asynchrone
async function envoyerEmailAsync({ to, subject, html, text, expediteur = 'noreply', replyTo } = {}) {
  return emailQueue.add('send', { to, subject, html, text, expediteur, replyTo });
}

async function envoyerEmail({ to, subject, html, text, expediteur = 'noreply', replyTo }) {
  const from    = EXPEDITEURS[expediteur] ?? EXPEDITEURS.noreply;
  const replyTo_ = replyTo ?? REPLY_TO[expediteur] ?? 'support@tikexo.bj';

  if (process.env.NODE_ENV !== 'production') {
    console.log([
      '─────────────────────────────────────',
      `📧  TIKEXO EMAIL [DEV]`,
      `De  : ${from}`,
      `À   : ${to}`,
      `Obj : ${subject}`,
      `────`,
      text || '(HTML uniquement)',
      '─────────────────────────────────────',
    ].join('\n'));
    return;
  }

  const transport = getTransport();
  if (!transport) {
    console.warn('[TIKEXO EMAIL] SMTP non configuré — email non envoyé vers', to);
    return;
  }

  await transport.sendMail({ from, replyTo: replyTo_, to, subject, html, text });
}

function masquerEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}

module.exports = { envoyerEmail, envoyerEmailAsync, masquerEmail, EXPEDITEURS };
