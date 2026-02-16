import { Check, X, BellOff } from 'lucide-react';
import { useFriends } from '../../hooks/useFriends';
import { useEffect } from 'react';
import { FriendService } from '../../api/friends';

export default function PendingView() {
  const { friends, fetchFriends, loading } = useFriends()

  useEffect(() => {
    const initPending = async () => {
      // 1. Önce listeyi çek ve bekle (await)
      const data = await fetchFriends('pending');

      // 2. data'nın dizi olduğundan ve içinde görülmemiş (is_seen: 0) olduğundan emin ol
      const hasUnseen = Array.isArray(data) && data.some((f: any) => f.is_seen == 0);

      if (hasUnseen) {
        try {
          // 3. Backend'e bildir
          await FriendService.markAsSeen();

          // 4. KRİTİK: Backend "okey" dedikten sonra sinyali çak!
          // Eğer bunu yapmazsak Header eski veriyi (1) göstermeye devam eder.
          window.dispatchEvent(new Event('refreshPendingCount'));
          console.log("Sinyal gönderildi: Sayacı sıfırla!");
        } catch (err) {
          console.error("Seen hatası:", err);
        }
      }
    };

    initPending();
  }, [fetchFriends]);

  const handleAction = async (id: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      await FriendService.respondRequest({ friendship_id: id, action });
      await fetchFriends('pending');
      window.dispatchEvent(new Event('refreshPendingCount'));
    } catch (err) {
      console.error("İşlem hatası:", err);
    }
  };

  if (loading && friends.length === 0) return <div className="p-6 space-y-4 animate-pulse">{[1, 2].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl" />)}</div>;

  return (
    <div className="p-6">
      <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-6">Bekleyen İstekler — {friends.length}</h3>
      <div className="space-y-2">
        {friends.length > 0 ? friends.map((f: any) => (
          <div key={f.friendship_id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:bg-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={f.avatar_url || '/default-avatar.png'} className="w-11 h-11 rounded-xl object-cover" />
                {f.is_seen === 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-[#1e1f22]" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-text-main">{f.username}</span>
                <span className="text-[10px] text-text-muted font-bold uppercase italic tracking-tighter">Sana İstek Gönderdi</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAction(f.friendship_id, 'ACCEPT')} className="p-2.5 bg-success/10 text-success rounded-xl hover:bg-success hover:text-white transition-all"><Check size={20} strokeWidth={3} /></button>
              <button onClick={() => handleAction(f.friendship_id, 'REJECT')} className="p-2.5 bg-error/10 text-error rounded-xl hover:bg-error hover:text-white transition-all"><X size={20} strokeWidth={3} /></button>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center"><BellOff size={48} className="mb-4" /><p className="font-black italic uppercase text-sm">Bekleyen istek yok</p></div>
        )}
      </div>
    </div>
  );
}