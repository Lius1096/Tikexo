import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

// Affiche l'alerte + joue le son système même quand l'app est au premier
// plan — sans ça, iOS/Android n'affichent rien tant que l'app est ouverte.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Demande la permission, prépare le canal Android (son par défaut) et
// enregistre le token FCM de l'appareil côté backend. Best-effort : l'app
// reste pleinement utilisable si l'utilisateur refuse ou si ça échoue.
export async function enregistrerPushToken(): Promise<void> {
  try {
    const { status: statutExistant } = await Notifications.getPermissionsAsync();
    let statut = statutExistant;
    if (statut !== 'granted') {
      const demande = await Notifications.requestPermissionsAsync();
      statut = demande.status;
    }
    if (statut !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TIKEXO',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    const token = await Notifications.getDevicePushTokenAsync();
    if (typeof token.data === 'string') {
      await api.post('/auth/fcm-token', { fcm_token: token.data });
    }
  } catch {
    // best-effort
  }
}
