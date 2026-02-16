import { useState, useEffect, useCallback } from 'react';
import type { Server } from '../types';
import { ServerService } from '../api/servers';
import { auth } from '../lib/firebase';
import { toast } from 'react-hot-toast';

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Sunucuları Getir
  const fetchServers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await ServerService.getMyServers();
      setServers(data);
    } catch (err) {
      console.error("Sunucu listesi çekilemedi:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auth Takibi
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchServers();
      } else {
        setServers([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchServers]);

  // 2. Yeni Sunucu Ekle
  const addServer = async (name: string) => {
    try {
      const result = await ServerService.createServer({ name });
      // Mermi gibi güncelle: Listeyi baştan çekmek yerine yeni sunucuyu başa ekle
      if (result.server_id) {
        await fetchServers(); // Alternatif: Manuel state güncelleme de yapılabilir
        toast.success("Sunucu kuruldu! 🦉");
      }
      return result;
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Sunucu oluşturulamadı.");
      throw err;
    }
  };

  // 3. Sunucu Ayarlarını Güncelle (Global State Güncellemesi ile)
  const updateServerInState = (serverId: string, data: Partial<Server>) => {
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, ...data } : s));
  };

  // 4. Sunucuyu Sil veya Ayrıl (Listeden Çıkar)
  const removeServerFromState = (serverId: string) => {
    setServers(prev => prev.filter(s => s.id !== serverId));
  };

  return { 
    servers, 
    isLoading, 
    addServer, 
    fetchServers, // Gerektiğinde manuel tetiklemek için
    updateServerInState, // Ayarlar modalı başarılı olursa çağırılır
    removeServerFromState // Silme/Ayrılma başarılı olursa çağırılır
  };
}