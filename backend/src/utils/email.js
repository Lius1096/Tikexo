// Utilitaire email TIKEXO — Resend API (priorité) + Nodemailer SMTP (fallback)
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const { emailQueue } = require('../queues/index');

// Adresses expéditrices officielles TIKEXO
const EXPEDITEURS = {
  noreply:     '"TIKEXO" <noreply@tikexo.bj>',
  hello:       '"TIKEXO" <hello@tikexo.bj>',
  facturation: '"TIKEXO Facturation" <facturation@tikexo.bj>',
  support:     '"TIKEXO Support" <support@tikexo.bj>',
  ops:         '"TIKEXO Ops" <ops@tikexo.bj>',
};

const REPLY_TO = {
  noreply:     'support@tikexo.bj',
  hello:       'support@tikexo.bj',
  facturation: 'facturation@tikexo.bj',
  support:     'support@tikexo.bj',
  ops:         'ops@tikexo.bj',
};

// ─── Resend ───────────────────────────────────────────────────────────────────
let _resend = null;
function getResend() {
  if (_resend) return _resend;
  if (!process.env.RESEND_API_KEY) return null;
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// ─── Nodemailer (SMTP fallback) ───────────────────────────────────────────────
let _transport = null;
function getTransport() {
  if (_transport) return _transport;

  const user = process.env.SMTP_USER || process.env.EMAIL;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
  if (!user || !pass) return null;

  const isGmail = (process.env.SMTP_HOST || '').includes('gmail') || user.includes('@gmail.com');
  const host    = process.env.SMTP_HOST || (isGmail ? 'smtp.gmail.com' : null);
  if (!host) return null;

  const port = parseInt(process.env.SMTP_PORT || (isGmail ? '465' : '587'));
  _transport = nodemailer.createTransport({
    host, port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });

  return _transport;
}

function getFromAddress(expediteur) {
  const resend = getResend();
  if (resend) {
    // RESEND_FROM permet de surcharger quand le domaine tikexo.bj est vérifié
    return process.env.RESEND_FROM || 'onboarding@resend.dev';
  }
  const gmailUser = process.env.SMTP_USER || process.env.EMAIL;
  if (gmailUser && gmailUser.includes('@gmail.com')) return `"TIKEXO" <${gmailUser}>`;
  return EXPEDITEURS[expediteur] ?? EXPEDITEURS.noreply;
}

// ─── Envoi ────────────────────────────────────────────────────────────────────
async function envoyerEmail({ to, subject, html, text, expediteur = 'noreply', replyTo }) {
  const from     = getFromAddress(expediteur);
  const replyTo_ = replyTo ?? REPLY_TO[expediteur] ?? process.env.MAIL_RECEIVER ?? 'support@tikexo.bj';

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

  // 1. Resend API (si clé dispo)
  const resend = getResend();
  if (resend) {
    const { error } = await resend.emails.send({ from, to, subject, html, text, replyTo: replyTo_ });
    if (error) throw new Error(error.message);
    return;
  }

  // 2. Nodemailer SMTP (fallback)
  const transport = getTransport();
  if (!transport) {
    console.warn('[TIKEXO EMAIL] Aucun provider configuré — email non envoyé vers', to);
    return;
  }
  await transport.sendMail({ from, replyTo: replyTo_, to, subject, html, text });
}

async function envoyerEmailAsync({ to, subject, html, text, expediteur = 'noreply', replyTo } = {}) {
  return emailQueue.add('send', { to, subject, html, text, expediteur, replyTo });
}

function masquerEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}

module.exports = { envoyerEmail, envoyerEmailAsync, masquerEmail, EXPEDITEURS };
