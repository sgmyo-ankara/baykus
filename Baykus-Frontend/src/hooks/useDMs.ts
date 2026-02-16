import { useState, useEffect, useCallback } from 'react';
import { DMService } from '../api/dm';
import { toast } from 'react-hot-toast';

export function useDMs() {
  const [dms, setDms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDMs = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await DMService.getMyDMs();
      setDms(data);
    } catch (err: any) {
      console.error("DM listesi çekilemedi:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDMs();
  }, [fetchDMs]);

  const startConversation = async (userId: string) => {
    try {
      const res = await DMService.startDM(userId);
      // Listeyi tazele ki sol menü güncellensin
      await fetchDMs(); 
      // Backend'den gelen 'channel' objesini dönüyoruz (id için)
      return res.channel; 
    } catch (err: any) {
      const msg = err.response?.data?.error || "Sohbet başlatılamadı.";
      toast.error(msg);
      throw err;
    }
  };

  return { dms, isLoading, startConversation, refreshDMs: fetchDMs };
}