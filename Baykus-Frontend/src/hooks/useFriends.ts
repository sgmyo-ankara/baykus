import { useState, useCallback } from 'react';
import { FriendService } from '../api/friends';

export function useFriends() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async (type: 'all' | 'pending' | 'blocked') => {
    setLoading(true);
    try {
      const response = await FriendService.getFriends(type);
      setFriends(response.data);
      return response.data; // <--- KRİTİK: Veriyi geri döndür ki bileşende kontrol edebilelim
    } catch (err) {
      console.error("Liste yükleme hatası:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const sendRequest = async (username: string) => {
    try {
      await FriendService.sendRequest({ target_username: username });
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.error || "Hata oluştu" };
    }
  };

  return { friends, loading, fetchFriends, sendRequest };
}