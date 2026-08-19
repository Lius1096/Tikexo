// Service notifications TIKEXO — centre de notifications in-app + push FCM
const prisma = require('../../config/database');
const { envoyerNotificationPush } = require('../../config/firebase');

/**
 * Crée une notification en base et tente un push FCM — jamais bloquant : un
 * échec ici (push down, DB lente) ne doit jamais faire échouer l'action
 * métier (paiement, dotation, reversement) qui l'a déclenchée. Chaque étape
 * a son propre try/catch pour que l'échec de l'une n'empêche pas l'autre.
 */
async function creerEtNotifier(userId, { titre, corps, type }) {
  try {
    await prisma.notification.create({ data: { user_id: userId, titre, corps, type } });
  } catch { /* best-effort */ }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcm_token: true } });
    if (user?.fcm_token) {
      await envoyerNotificationPush(user.fcm_token, titre, corps).catch(() => {});
    }
  } catch { /* best-effort */ }
}

async function lister(userId, filtres = {}) {
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;

  const [total, nonLues, items] = await Promise.all([
    prisma.notification.count({ where: { user_id: userId } }),
    prisma.notification.count({ where: { user_id: userId, lu: false } }),
    prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, non_lues: nonLues, page: p, limit: l };
}

async function compterNonLues(userId) {
  const non_lues = await prisma.notification.count({ where: { user_id: userId, lu: false } });
  return { non_lues };
}

async function marquerLu(userId, notifId) {
  const notif = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!notif || notif.user_id !== userId) {
    const err = new Error('Notification introuvable'); err.statusCode = 404; throw err;
  }
  return prisma.notification.update({ where: { id: notifId }, data: { lu: true } });
}

async function marquerToutLu(userId) {
  await prisma.notification.updateMany({ where: { user_id: userId, lu: false }, data: { lu: true } });
  return { ok: true };
}

async function supprimer(userId, notifId) {
  const notif = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!notif || notif.user_id !== userId) {
    const err = new Error('Notification introuvable'); err.statusCode = 404; throw err;
  }
  await prisma.notification.delete({ where: { id: notifId } });
  return { ok: true };
}

module.exports = { creerEtNotifier, lister, compterNonLues, marquerLu, marquerToutLu, supprimer };
