import { api } from './axios';

export const DMService = {
  // Backend "target_user_id" beklediği için parametreyi ona göre gönderiyoruz
  startDM: async (target_user_id: string) => {
    const res = await api.post('/api/dm/create', { target_user_id });
    return res.data; // { message, channel } döner
  },
    
  // Sidebar için kullanıcının tüm DM kanallarını getirir
  getMyDMs: async () => {
    const res = await api.get('/api/dm/channels');
    return res.data.channels || res.data; 
  }
};