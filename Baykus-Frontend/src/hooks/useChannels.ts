import { useState, useCallback } from 'react';
import { ChannelService } from '../api/channels';
import type { Channel, CreateChannelRequest } from '../types';

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChannels = useCallback(async (serverId: string) => {
    if (!serverId || serverId === 'home') return []; // Geçersiz serverId kontrolü
    
    setLoading(true);
    try {
      const response = await ChannelService.getServerChannels(serverId);
      
      /**
       * DÜZELTME: Backend'den dönen cevabın yapısını kontrol ediyoruz.
       * Eğer response direkt diziyse onu kullan, 
       * Eğer response.data içindeyse onu kullan,
       * Hiçbiri yoksa boş dizi kullan.
       */
      const rawChannels = Array.isArray(response) ? response : (response?.data || []);
      
      // Soft delete (silinen) kanalları filtrele
      const activeChannels = rawChannels.filter((c: any) => !c.deleted_at);
      
      setChannels(activeChannels);
      return activeChannels;
    } catch (err) {
      console.error("Kanal listesi hatası:", err);
      setChannels([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewChannel = async (serverId: string, payload: CreateChannelRequest) => {
    try {
      const res = await ChannelService.createChannel(serverId, payload);
      await fetchChannels(serverId);
      return { success: true, channel: res.channel };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || "Hata oluştu" };
    }
  };

  return { channels, loading, fetchChannels, createChannel: createNewChannel };
}