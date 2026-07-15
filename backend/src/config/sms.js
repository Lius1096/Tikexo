// SMS via Africa's Talking — couverture MTN + Moov Bénin
const AfricasTalking = require('africastalking');

let _client = null;
let _sms = null;

function getSmsClient() {
  if (_sms) return _sms;

  const apiKey   = process.env.SMS_API_KEY;
  const username = process.env.SMS_USERNAME;

  if (!apiKey || !username) {
    console.warn('[TIKEXO SMS] Africa\'s Talking non configuré — SMS désactivés');
    return null;
  }

  _client = AfricasTalking({ apiKey, username });
  _sms    = _client.SMS;
  return _sms;
}

/**
 * Envoie un SMS via Africa's Talking.
 * Le numéro doit être au format international : +22961234567
 * @param {string} to       Numéro destinataire
 * @param {string} message  Contenu du SMS (max 160 chars pour 1 SMS)
 */
async function envoyerSms(to, message) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[TIKEXO SMS DEV] → ${to} : ${message}`);
    return { success: true, dev: true };
  }

  const sms = getSmsClient();
  if (!sms) return { success: false, erreur: 'SMS non configuré' };

  try {
    const result = await sms.send({
      to:   [to],
      message,
      from: 'TIKEXO',  // Sender ID (soumis à approbation AT)
    });

    const recipient = result.SMSMessageData?.Recipients?.[0];
    if (recipient?.status !== 'Success') {
      throw new Error(`AT status: ${recipient?.status}`);
    }

    return { success: true, messageId: recipient.messageId };
  } catch (err) {
    console.error('[TIKEXO SMS] Erreur envoi:', err.message);
    return { success: false, erreur: err.message };
  }
}

/**
 * Envoie un OTP par SMS avec un message TIKEXO formaté.
 */
async function envoyerOtpSms(telephone, code) {
  const message = `TIKEXO : Votre code de connexion est ${code}. Valable 5 minutes. Ne le partagez jamais.`;
  return envoyerSms(telephone, message);
}

/**
 * Envoie une notification de paiement par SMS.
 */
async function envoyerSmsTransaction(telephone, montant, commercant) {
  const message = `TIKEXO : Paiement de ${montant} XOF accepté chez ${commercant}. Votre solde a été débité.`;
  return envoyerSms(telephone, message);
}

module.exports = { envoyerSms, envoyerOtpSms, envoyerSmsTransaction };
