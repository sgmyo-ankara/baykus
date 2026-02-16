// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// Analytics opsiyoneldir, şimdilik hata vermemesi için import ediyoruz
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
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
