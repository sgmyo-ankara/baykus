// src/components/layout/DMSidebar.tsx
import { Search, UserPlus, MessageSquareOff } from 'lucide-react';
import { useDMs } from '../../hooks/useDMs';

export default function DMSidebar() {
  const { dms, isLoading } = useDMs();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-16 px-5 flex items-center justify-between border-b border-white/5 flex-shrink-0">
        <h2 className="font-black text-xl italic tracking-tighter uppercase text-text-main">Mesajlar</h2>
        <button className="p-2 hover:bg-white/5 rounded-xl text-text-muted hover:text-text-main transition-all active:scale-90">
          <UserPlus size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className="p-4 flex-shrink-0">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/50 group-focus-within:text-accent transition-colors" />
          <input 
            type="text" 
            placeholder="Sohbet bul..."
            className="w-full h-10 pl-10 pr-4 bg-bg-panel/30 border border-white/5 rounded-xl text-sm outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1 pb-4">
        {isLoading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : dms.length > 0 ? (
          dms.map((dm) => (
            <div key={dm.id} className="group flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.97]">
              <div className="relative flex-shrink-0">
                {/* DÜZELTME: icon_url null ise default-avatar kullan ve tipi string'e zorla */}
                <img 
                  src={dm.icon_url ?? '/default-avatar.png'} 
                  className="w-12 h-12 rounded-[18px] object-cover border border-white/5 group-hover:rounded-[14px] transition-all duration-300" 
                  alt={dm.name ?? 'Sohbet'} 
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-[3.5px] border-[#1e1f22]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text-muted group-hover:text-text-main truncate transition-colors">
                  {dm.name ?? 'Bilinmeyen Sohbet'}
                </div>
                <div className="text-[10px] text-text-muted/40 font-black uppercase tracking-widest truncate mt-0.5">Sohbete Başla</div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center opacity-20">
            <MessageSquareOff size={40} className="mb-2" />
            <p className="text-xs font-bold uppercase tracking-tighter">Henüz mesaj yok</p>
          </div>
        )}
      </div>
    </div>
  );
}