import { useEffect } from 'react'; // useRef'i sildik, gerek kalmadı
import { 
  signInWithPopup, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { syncUserWithBackend } from '../api/auth';
import type { User } from '../types';

// 🚩 GLOBAL BAYRAKLAR (Hook dışına alındı)
// Artık uygulamanın her yerinde bu değişkenler ortaktır.
let isRegisteringGlobal = false;
let isSyncingGlobal = false;

export const useAuth = () => {
  const { user, setUser, setFirebaseUser, setLoading, logout: storeLogout } = useAuthStore();

  // Sync Fonksiyonu
  const handleUserSync = async (firebaseUser: any, overrideUsername?: string) => {
    // 1. Gereksiz çalışmayı önle
    if (user && user.id === firebaseUser.uid && !overrideUsername) return;
    
    // Eğer şu an başka bir sync işlemi varsa bekle
    if (isSyncingGlobal) return;

    try {
      isSyncingGlobal = true;
      
      const finalUsername = overrideUsername || firebaseUser.displayName || "İsimsiz Baykuş";
      const finalAvatar = firebaseUser.photoURL || null;

      console.log("Backend Sync Başlatılıyor:", finalUsername); 

      const backendUser = await syncUserWithBackend({
        username: finalUsername,
        email: firebaseUser.email || "",
        picture: finalAvatar || ""
      });
      
      setUser(backendUser);

    } catch (error: any) {
      // Çakışma olsa bile backend 200 dönüyor (yeni kodumuzla), 
      // ama yine de 409 gelirse panik yapma.
      if (error.response &&(error.response.status === 409 || error.response.status === 200)) {
         return; 
      }

      console.warn("Backend Sync Hatası (Offline Mod):", error.message);
      
      const offlineUser: User = {
        id: firebaseUser.uid,
        username: overrideUsername || firebaseUser.displayName || "Offline Kullanıcı",
        email: firebaseUser.email || "",
        avatar_url: firebaseUser.photoURL || null,
        status: 1,
        created_at: Date.now()
      };
      
      setUser(offlineUser);
    } finally {
      isSyncingGlobal = false;
    }
  };

  // 1. KAYIT OLMA FONKSİYONU
  const registerWithEmail = async (email: string, pass: string, username: string) => {
    setLoading(true);
    
    // 🚩 GLOBAL KİLİT: Listener'ı kesinlikle sustur
    isRegisteringGlobal = true; 

    try {
      // A) Firebase'de oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;

      // B) Profil ismini güncelle (Promise olarak başlat)
      const profileUpdatePromise = updateProfile(firebaseUser, {
        displayName: username,
        photoURL: `https://ui-avatars.com/api/?name=${username}&background=random`
      });

      // C) MANUEL SYNC (Doğru isimle Backend'e git)
      // Listener susturulduğu için veritabanına sadece bu istek gidecek.
      await handleUserSync(firebaseUser, username);

      // Profil güncellemesinin bitmesini bekle
      await profileUpdatePromise;

    } catch (error) {
      console.error("Kayıt hatası:", error);
      throw error;
    } finally {
      setLoading(false);
      // Listener kilidini biraz gecikmeli aç
      setTimeout(() => { isRegisteringGlobal = false; }, 2000);
    }
  };

  // 2. GİRİŞ YAPMA FONKSİYONU
  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // Sync işlemi Listener tarafından yapılacak
    } catch (error) {
      console.error("Giriş hatası:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      storeLogout();
      isSyncingGlobal = false;
      isRegisteringGlobal = false;
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  // 3. OTOMATİK DİNLEYİCİ
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      
      // 🚩 GLOBAL KONTROL: Eğer herhangi bir yerde kayıt işlemi varsa dur!
      if (isRegisteringGlobal) {
        console.log("⚠️ Kayıt işlemi sürüyor, Listener (Otomatik Sync) engellendi.");
        return;
      }

      if (currentUser) {
        setFirebaseUser(currentUser);
        await handleUserSync(currentUser);
      } else {
        storeLogout();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { 
    loginWithGoogle, 
    registerWithEmail, 
    loginWithEmail, 
    logout, 
    user 
  };
};