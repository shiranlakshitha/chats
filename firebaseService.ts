
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, query, limit } from "firebase/firestore";
import { Character, Chat } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyAMkJjeepK-CJh4wFCdmeS_tWes5PdMTuM",
  authDomain: "crud-877d0.firebaseapp.com",
  projectId: "crud-877d0",
  storageBucket: "crud-877d0.firebasestorage.app",
  messagingSenderId: "145620515934",
  appId: "1:145620515934:web:ec2564400d13988b9888cf",
  measurementId: "G-7KTFPTS7SL"
};

let db: any = null;
let initializationError: string | null = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e: any) {
  initializationError = e.message;
  console.error("Firebase Initialization Failed:", e);
}

export const isFirebaseEnabled = () => db !== null && initializationError === null;
export const getFirebaseError = () => initializationError;

/**
 * Specifically tests if the Firestore service is active.
 * If the database hasn't been created in the console, this will catch it.
 */
export const testFirestoreConnection = async () => {
  if (!db) return false;
  try {
    // We try to query a non-existent collection just to see if the service responds
    const q = query(collection(db, "_health_check_"), limit(1));
    await getDocs(q);
    initializationError = null;
    return true;
  } catch (e: any) {
    console.warn("Firestore Health Check Failed:", e.message);
    if (e.message.includes("not available") || e.message.includes("database-not-found")) {
      initializationError = "DATABASE NOT CREATED: Go to Firebase Console > Firestore Database > 'Create Database'.";
    } else if (e.message.includes("permission-denied")) {
      initializationError = "PERMISSION DENIED: Ensure you selected 'Start in Test Mode' when creating the database.";
    } else {
      initializationError = e.message;
    }
    return false;
  }
};

export const syncCharacterToCloud = async (character: Character) => {
  if (!db) return;
  try {
    await setDoc(doc(db, "characters", character.id), character);
    console.log(`Cloud Sync (Char): ${character.name}`);
  } catch (e: any) {
    console.error("Cloud Sync Error (Char):", e);
    if (e.message.includes("not available")) {
      initializationError = "Firestore service is not active in this project.";
    }
  }
};

export const syncChatToCloud = async (chat: Chat) => {
  if (!db) return;
  try {
    if (!chat.id || chat.messages.length === 0) return;
    await setDoc(doc(db, "chats", chat.id), chat);
    console.log(`Cloud Sync (Chat): ${chat.id}`);
  } catch (e: any) {
    console.error("Cloud Sync Error (Chat):", e);
    if (e.message.includes("not available")) {
      initializationError = "Firestore service is not active in this project.";
    }
    throw e;
  }
};

export const fetchAllCharactersFromCloud = async (): Promise<Character[]> => {
  if (!db) return [];
  try {
    const querySnapshot = await getDocs(collection(db, "characters"));
    return querySnapshot.docs.map(doc => doc.data() as Character);
  } catch (e) {
    console.error("Cloud Fetch Failed (Chars):", e);
    return [];
  }
};

export const fetchAllChatsFromCloud = async (): Promise<Chat[]> => {
  if (!db) return [];
  try {
    const querySnapshot = await getDocs(collection(db, "chats"));
    return querySnapshot.docs.map(doc => doc.data() as Chat);
  } catch (e) {
    console.error("Cloud Fetch Failed (Chats):", e);
    return [];
  }
};
