import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { syncUserWithBackend } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore'; // Global store'u bağla
import UserSettingsModal from '../modals/UserSettingsModal';

const API_BASE_URL = 'https://api.baykus.live';

export default function UserPanel() {
  const { user, setUser } = useAuthStore(); // Global user state'ini al
  const [loading, setLoading] = useState(!user);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Sadece store'da user yoksa sync yap, varsa mevcut veriyi kullan
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && !user) {
        try {
          const syncedUser = await syncUserWithBackend({
            username: firebaseUser.displayName || 'Baykuş Kullanıcısı',
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || ''
          });
          setUser(syncedUser);
        } catch (err) { console.error("Sync hatası:", err); }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, setUser]);

  const getAvatarUrl = () => {
    if (!user?.avatar_url) return '/default-avatar.png';
    if (user.avatar_url.startsWith('http')) return user.avatar_url;
    return `${API_BASE_URL}${user.avatar_url}`;
  };

  if (loading) return <div className="h-14 animate-pulse bg-white/5 rounded-2xl mx-2 shadow-inner" />;

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="h-14 rounded-2xl bg-bg-panel/60 border border-white/5 flex items-center px-2 gap-2 group hover:bg-bg-panel/80 transition-all duration-300 cursor-pointer mx-2 shadow-lg"
      >
        <div className="relative w-10 h-10 flex-shrink-0">
          <img 
            src={getAvatarUrl()}
            className="w-full h-full rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform duration-500 shadow-2xl"
            alt="Avatar"
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-[#1a1b1e] shadow-lg shadow-success/20" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-text-main truncate leading-tight tracking-tighter uppercase italic group-hover:text-accent transition-colors">
            {user?.username || 'Kullanıcı'}
          </div>
          <div className="text-[9px] text-text-muted font-black uppercase tracking-[0.15em] mt-0.5 opacity-40">
            ÇEVRİMİÇİ
          </div>
        </div>

        <div className="w-8 h-8 flex items-center justify-center rounded-lg group-hover:bg-white/5 text-text-muted group-hover:text-text-main transition-all duration-200">
          <Settings size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
        </div>
      </div>

      <UserSettingsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userData={user}
        avatarUrl={getAvatarUrl()}
      />
    </>
  );
}