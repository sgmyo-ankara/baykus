import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';

export default function ServerRedirect() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (!serverId) return;

    const redirectToFirstChannel = async () => {
      try {
        // Sunucunun kanallarını çek
        const response = await api.get(`/api/servers/${serverId}/channels`);
        const channels = response.data;

        if (!channels || channels.length === 0) {
          // Kanal yoksa ana sayfaya dön
          navigate('/', { replace: true });
          return;
        }

        // İlk kanala yönlendir
        const firstChannel = channels[0];
        navigate(`/channels/${serverId}/${firstChannel.id}`, { replace: true });
      } catch (error) {
        console.error('Kanal listesi alınamadı:', error);
        // Hata olursa ana sayfaya dön
        navigate('/', { replace: true });
      } finally {
        setIsRedirecting(false);
      }
    };

    redirectToFirstChannel();
  }, [serverId, navigate]);

  // Yönlendirme yapılırken loading göster
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center opacity-30">
        <span className="text-6xl animate-pulse mb-4 block">⚡</span>
        <p className="text-sm font-medium italic uppercase">Yönlendiriliyor...</p>
      </div>
    </div>
  );
}