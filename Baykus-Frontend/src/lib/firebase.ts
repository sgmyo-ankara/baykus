// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// Analytics opsiyoneldir, şimdilik hata vermemesi için import ediyoruz
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAW_dzspyYz9P4rEiSPvnylt055y-PIwSA",
  authDomain: "baykus-960bd.firebaseapp.com",
  projectId: "baykus-960bd",
  storageBucket: "baykus-960bd.firebasestorage.app",
  messagingSenderId: "607403578684",
  appId: "1:607403578684:web:ec5173be0e8b365210ba39",
  measurementId: "G-T2KXRW487H"
};

// 1. Uygulamayı Başlat
const app = initializeApp(firebaseConfig);

// 2. Servisleri Başlat ve Dışarı Aktar (Export)
// Uygulamanın diğer yerlerinde bunları kullanacağız.
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics sadece tarayıcı ortamında çalışır, SSR hatası almamak için kontrol
if (typeof window !== "undefined") {
  getAnalytics(app);
}