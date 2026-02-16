import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Yönlendirme için
import { FriendService } from '../../api/friends';
import { useDMs } from '../../hooks/useDMs'; // Yeni hook
import { MessageSquare, UserMinus, ShieldBan, Loader2 } from 'lucide-react';
import FriendActionModal from '../modals/FriendActionModal';
import { toast } from 'react-hot-toast';

export default function FriendsListView({ type }: { type: 'all' | 'pending' | 'blocked' }) {
  const [list, setList] = useState<any[]>([]);
  const { startConversation, isLoading: isDmLoading } = useDMs();
  const navigate = useNavigate();
  
  const [modal, setModal] = useState<{
    open: boolean;
    friendshipId: string;
    username: string;
    action: 'REMOVE' | 'BLOCK' | null;
  }>({ open: false, friendshipId: '', username: '', action: null });

  const loadData = async () => {
    const response = await FriendService.getFriends(type);
    setList(response.data);
    if (type === 'pending' && response.data.length > 0) {
      await FriendService.markAsSeen();
    }
  };

  useEffect(() => { loadData(); }, [type]);

  // 🔥 ÖZEL DM BAŞLATMA VE YÖNLENDİRME
  const handleStartDM = async (friend: any) => {
    try {
      // Backend'deki "dm-endpoint.ts" bunu yakalar
      // f.friend_id veya f.user_id durumuna göre doğru ID'yi gönderiyoruz
      const targetId = friend.friend_id || friend.id;
      const channel = await startConversation(targetId);
      
      toast.success("Mesaj kutusu açılıyor...");
      // DM kanalına yönlendir (Path: /channels/@me/DM_ID)
      navigate(`/channels/@me/${channel.id}`); 
    } catch (err) {
      console.error("DM Error:", err);
    }
  };

  const confirmAction = async () => {
    if (!modal.action) return;
    await FriendService.respondRequest({ 
      friendship_id: modal.friendshipId, 
      action: modal.action 
    });
    setModal({ open: false, friendshipId: '', username: '', action: null });
    loadData();
  };

  return (
    <div className="p-6">
      <div className="space-y-2">
        {list.map((f) => (
          <div key={f.friendship_id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] group border border-transparent hover:border-white/5 transition-all">
            <div className="flex items-center gap-3 font-medium italic uppercase tracking-tight text-sm">
                <div className="relative">
                    <img src={f.avatar_url || '/default-avatar.png'} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/5" />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-4 border-[#0f172a] ${f.online_status === 1 ? 'bg-success' : 'bg-text-muted'}`} />
                </div>
              <div className="flex flex-col leading-tight">
                <span className="font-black text-text-main">{f.username}</span>
                <span className="text-[10px] text-text-muted opacity-60 font-bold uppercase tracking-widest leading-none mt-0.5">
                    {f.online_status === 1 ? 'Çevrimiçi' : 'Çevrimdışı'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 duration-200">
              {type === 'all' && (
                <>
                  {/* MESAJ BUTONU - DM BAŞLATIR */}
                  <button 
                    onClick={() => handleStartDM(f)}
                    className="p-2.5 bg-bg-panel rounded-xl text-text-muted hover:text-accent transition-all active:scale-90"
                    title="Mesaj Gönder"
                  >
                    <MessageSquare size={18} strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={() => setModal({ open: true, friendshipId: f.friendship_id, username: f.username, action: 'REMOVE' })}
                    className="p-2.5 bg-bg-panel rounded-xl text-text-muted hover:text-warning transition-all active:scale-90"
                    title="Arkadaştan Çıkar"
                  >
                    <UserMinus size={18} strokeWidth={2.5} />
                  </button>
                </>
              )}
              
              <button 
                onClick={() => setModal({ open: true, friendshipId: f.friendship_id, username: f.username, action: 'BLOCK' })}
                className="p-2.5 bg-bg-panel rounded-xl text-text-muted hover:text-danger transition-all active:scale-90"
                title="Engelle"
              >
                <ShieldBan size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <FriendActionModal 
        isOpen={modal.open}
        onClose={() => setModal({ open: false, friendshipId: '', username: '', action: null })}
        onConfirm={confirmAction}
        username={modal.username}
        action={modal.action}
      />
    </div>
  );
}