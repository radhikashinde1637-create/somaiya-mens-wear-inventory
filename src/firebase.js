import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDqhBEnAFwasrwTvtiG6sT2BXJeRsq4Em4",
  authDomain: "somaiya-mens-wear.firebaseapp.com",
  projectId: "somaiya-mens-wear",
  storageBucket: "somaiya-mens-wear.firebasestorage.app",
  messagingSenderId: "495326518075",
  appId: "1:495326518075:web:234ff2721db4714be7f51e",
  measurementId: "G-NBG8L82ZCK"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export default app;
