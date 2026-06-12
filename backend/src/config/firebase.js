// Configuration Firebase Admin — TIKEXO (notifications push FCM)
const admin = require('firebase-admin');

let firebaseApp = null;

function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    console.warn('TIKEXO AVERTISSEMENT — Credentials Firebase non configurés');
    return null;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
  });

  return firebaseApp;
}

async function envoyerNotificationPush(fcmToken, titre, corps, data = {}) {
  const app = getFirebaseApp();
  if (!app) return null;

  const message = {
    token: fcmToken,
    notification: { title: `TIKEXO — ${titre}`, body: corps },
    data: { ...data, plateforme: 'TIKEXO' },
    android: { priority: 'high' },
    apns: { payload: { aps: { contentAvailable: true } } },
  };

  return admin.messaging().send(message);
}

async function envoyerNotificationMultiple(fcmTokens, titre, corps, data = {}) {
  const app = getFirebaseApp();
  if (!app) return null;

  const message = {
    tokens: fcmTokens,
    notification: { title: `TIKEXO — ${titre}`, body: corps },
    data: { ...data, plateforme: 'TIKEXO' },
  };

  return admin.messaging().sendEachForMulticast(message);
}

module.exports = { getFirebaseApp, envoyerNotificationPush, envoyerNotificationMultiple };
