// Persistance des fichiers KYB (étape 3 de l'inscription) via IndexedDB.
// sessionStorage ne peut pas être utilisé ici : les objets File ne sont pas
// sérialisables en JSON, donc un rechargement de page perdait les fichiers
// déjà uploadés même si l'étape et les champs texte, eux, survivaient.
// IndexedDB stocke les File/Blob nativement (structured clone).
import type { KybFile } from './Step3Kyb';

const DB_NAME = 'tikexo_inscription';
const STORE = 'kyb_docs';
const KEY = 'draft';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function sauvegarderKybDocs(docs: KybFile[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(docs, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB indisponible (navigation privée stricte, quota, etc.) —
    // tant pis, l'utilisateur devra re-uploader après un rechargement.
  }
}

export async function chargerKybDocs(): Promise<KybFile[]> {
  try {
    const db = await openDb();
    const docs = await new Promise<KybFile[] | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return docs ?? [];
  } catch {
    return [];
  }
}

export async function effacerKybDocs(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // rien à faire — au pire le prochain chargement retrouvera un
    // brouillon obsolète, sans conséquence (juste re-uploadé ou ignoré)
  }
}
