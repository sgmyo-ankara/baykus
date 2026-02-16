import { useState } from 'react';
import { UserService } from '../api/user';
import { useAuthStore } from '../store/useAuthStore';

export function useUser() {
  const [updating, setUpdating] = useState(false);
  const { setUser, user: currentUser } = useAuthStore();

  const updateProfile = async (values: { username?: string; avatar_url?: string }) => {
    setUpdating(true);
    try {
      const updatedValues = { ...values };

      // 🔍 Dinamik Avatar: Eğer kullanıcı özel resim yüklememişse (ui-avatars kullanıyorsa)
      // yeni isme göre avatar linkini de otomatik güncelle.
      if (values.username && currentUser?.avatar_url?.includes('ui-avatars.com')) {
        updatedValues.avatar_url = `https://ui-avatars.com/api/?name=${values.username}&background=random`;
      }

      const res = await UserService.updateProfile(updatedValues);
      
      if (res.user) {
        // ✅ KRİTİK: Global store'u güncelliyoruz. 
        // Bu sayede UserPanel ve modal F5 atmadan anında güncellenir!
        setUser(res.user); 
      }
      return { success: true };
    } catch (err: any) {
      console.error("Profil güncelleme hatası:", err);
      return { success: false, error: err.response?.data?.error || "Hata oluştu." };
    } finally {
      setUpdating(false);
    }
  };

  return { updateProfile, updating };
}