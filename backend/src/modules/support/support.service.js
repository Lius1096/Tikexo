// Service support client TIKEXO
const prisma = require('../../config/database');
const { envoyerEmailAsync } = require('../../utils/email');
const { ticketSupportCree, ticketSupportReponse, ticketSupportResolu } = require('../../utils/emailTemplates');
const { creerEtNotifier } = require('../notification/notification.service');
const { logger } = require('../../middlewares/errorHandler');

const ROLES_ADMIN = ['SUPER_ADMIN', 'ADMIN_OPS'];
const CATEGORIES_VALIDES = ['WALLET', 'DOTATION', 'KYB', 'PAIEMENT', 'RETRAIT', 'COMPTE', 'AUTRE'];

// Chaque type de compte a son propre espace web — sert à construire le lien
// "Voir la réponse" dans l'email de notification.
function cheminEspace(role) {
  if (['ADMIN_DIRECTEUR', 'ADMIN_RH', 'GESTIONNAIRE_RH'].includes(role)) return '/employeur/support';
  if (role === 'COMMERCANT') return '/commercant/support';
  return '/beneficiaire/support';
}

async function creerTicket(userId, { categorie, sujet, message, pieceJointeUrl }) {
  if (!sujet || !sujet.trim()) {
    const err = new Error('Le sujet est requis'); err.statusCode = 400; throw err;
  }
  if (!message || !message.trim()) {
    const err = new Error('Le message est requis'); err.statusCode = 400; throw err;
  }
  const categorieFinale = CATEGORIES_VALIDES.includes(categorie) ? categorie : 'AUTRE';

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true, prenom: true, email_perso: true, email_pro: true },
  });

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.ticketSupport.create({
      data: { user_id: userId, categorie: categorieFinale, sujet: sujet.trim() },
    });
    await tx.ticketSupportMessage.create({
      data: { ticket_id: t.id, auteur_id: userId, auteur_role: user.role, message: message.trim(), piece_jointe_url: pieceJointeUrl || null },
    });
    return t;
  });

  const email = user.email_perso || user.email_pro;
  if (email) {
    const { html, text } = ticketSupportCree(user.prenom, ticket.sujet);
    envoyerEmailAsync({ to: email, subject: `TIKEXO — Demande reçue : ${ticket.sujet}`, html, text })
      .catch((e) => logger.warn('TIKEXO — Email accusé réception ticket support échoué', { err: e.message, ticketId: ticket.id }));
  }

  return getTicketAutorise(ticket.id, { id: userId, role: user.role });
}

async function listerMesTickets(userId) {
  return prisma.ticketSupport.findMany({
    where: { user_id: userId },
    orderBy: { updatedAt: 'desc' },
  });
}

async function listerTicketsAdmin({ page = 1, limit = 20, statut, categorie } = {}) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  const where = {};
  if (statut) where.statut = statut;
  if (categorie) where.categorie = categorie;

  const [total, items] = await Promise.all([
    prisma.ticketSupport.count({ where }),
    prisma.ticketSupport.findMany({
      where,
      include: { user: { select: { id: true, nom: true, prenom: true, role: true, email_perso: true, email_pro: true } } },
      orderBy: [{ statut: 'asc' }, { updatedAt: 'desc' }],
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function getTicketAutorise(ticketId, requester) {
  const ticket = await prisma.ticketSupport.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, nom: true, prenom: true, role: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { auteur: { select: { id: true, nom: true, prenom: true, role: true } } },
      },
    },
  });

  const estAdmin = ROLES_ADMIN.includes(requester.role);
  const estProprietaire = requester.id === ticket.user_id;
  if (!estAdmin && !estProprietaire) {
    const err = new Error('Accès refusé à ce ticket'); err.statusCode = 403; throw err;
  }

  return ticket;
}

async function ajouterMessage(ticketId, auteur, message, pieceJointeUrl) {
  if (!message || !message.trim()) {
    const err = new Error('Le message est requis'); err.statusCode = 400; throw err;
  }

  const ticket = await getTicketAutorise(ticketId, auteur);
  if (ticket.statut === 'FERME') {
    const err = new Error('Ce ticket est fermé — ouvrez une nouvelle demande si besoin'); err.statusCode = 409; throw err;
  }

  const estAdmin = ROLES_ADMIN.includes(auteur.role);

  await prisma.ticketSupportMessage.create({
    data: { ticket_id: ticketId, auteur_id: auteur.id, auteur_role: auteur.role, message: message.trim(), piece_jointe_url: pieceJointeUrl || null },
  });

  // Un admin qui répond passe le ticket en cours ; l'auteur qui répond à un
  // ticket qu'on croyait résolu le rouvre implicitement — pas besoin de
  // rouvrir manuellement pour continuer la conversation.
  const nouveauStatut = estAdmin ? 'EN_COURS' : (ticket.statut === 'RESOLU' ? 'EN_COURS' : ticket.statut);
  if (nouveauStatut !== ticket.statut) {
    await prisma.ticketSupport.update({ where: { id: ticketId }, data: { statut: nouveauStatut } });
  } else {
    // Fait toujours remonter le ticket en tête de liste (tri par updatedAt).
    await prisma.ticketSupport.update({ where: { id: ticketId }, data: {} });
  }

  if (estAdmin) {
    const contact = ticket.user;
    const email = await prisma.user.findUnique({ where: { id: contact.id }, select: { email_perso: true, email_pro: true } });
    const destinataire = email?.email_perso || email?.email_pro;
    if (destinataire) {
      const frontendUrl = process.env.FRONTEND_URL || 'https://tikexo.kete.fr';
      const lien = `${frontendUrl}${cheminEspace(contact.role)}`;
      const { html, text } = ticketSupportReponse(contact.prenom, ticket.sujet, lien);
      envoyerEmailAsync({ to: destinataire, subject: `TIKEXO — Réponse à votre demande : ${ticket.sujet}`, html, text })
        .catch((e) => logger.warn('TIKEXO — Email réponse ticket support échoué', { err: e.message, ticketId }));
    }
    creerEtNotifier(contact.id, {
      titre: 'Nouvelle réponse support',
      corps: `Réponse à votre demande « ${ticket.sujet} »`,
      type: 'SUPPORT',
    }).catch(() => {});
  }

  return getTicketAutorise(ticketId, auteur);
}

// Vérifie l'accès à la pièce jointe d'un message via son ticket parent —
// même règle que getTicketAutorise (admin ou auteur du ticket).
async function getMessageAutorise(messageId, requester) {
  const msg = await prisma.ticketSupportMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: { ticket: { select: { user_id: true } } },
  });

  const estAdmin = ROLES_ADMIN.includes(requester.role);
  const estProprietaire = requester.id === msg.ticket.user_id;
  if (!estAdmin && !estProprietaire) {
    const err = new Error('Accès refusé à cette pièce jointe'); err.statusCode = 403; throw err;
  }
  if (!msg.piece_jointe_url) {
    const err = new Error('Aucune pièce jointe pour ce message'); err.statusCode = 404; throw err;
  }

  return msg;
}

async function changerStatutTicket(ticketId, adminId, statut) {
  const STATUTS_VALIDES = ['OUVERT', 'EN_COURS', 'RESOLU', 'FERME'];
  if (!STATUTS_VALIDES.includes(statut)) {
    const err = new Error('Statut invalide'); err.statusCode = 400; throw err;
  }

  const ticket = await prisma.ticketSupport.update({
    where: { id: ticketId },
    data: { statut },
    include: { user: { select: { id: true, prenom: true, email_perso: true, email_pro: true } } },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'TICKET_SUPPORT_STATUT_MODIFIE', entite: 'TicketSupport', entite_id: ticketId, apres: { statut } },
  });

  if (statut === 'RESOLU') {
    const destinataire = ticket.user.email_perso || ticket.user.email_pro;
    if (destinataire) {
      const { html, text } = ticketSupportResolu(ticket.user.prenom, ticket.sujet);
      envoyerEmailAsync({ to: destinataire, subject: `TIKEXO — Demande résolue : ${ticket.sujet}`, html, text })
        .catch((e) => logger.warn('TIKEXO — Email résolution ticket support échoué', { err: e.message, ticketId }));
    }
    creerEtNotifier(ticket.user.id, {
      titre: 'Demande résolue',
      corps: `Votre demande « ${ticket.sujet} » a été marquée comme résolue`,
      type: 'SUPPORT',
    }).catch(() => {});
  }

  return ticket;
}

module.exports = {
  creerTicket,
  listerMesTickets,
  listerTicketsAdmin,
  getTicketAutorise,
  getMessageAutorise,
  ajouterMessage,
  changerStatutTicket,
};
