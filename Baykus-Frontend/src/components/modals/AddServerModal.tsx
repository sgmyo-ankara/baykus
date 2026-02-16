import { useState } from "react";
import { createPortal } from "react-dom";
import { X, PlusCircle, Compass, ChevronLeft } from "lucide-react";
import { useServers } from "../../hooks/useServers";
import { useInvites } from "../../hooks/useInvites";
import { useNavigate } from "react-router-dom";

type Step = "select" | "create" | "join";

export default function AddServerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>("select");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const { addServer } = useServers();
  const { joinServer, loading } = useInvites();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const reset = () => {
    setStep("select");
    setName("");
    setInviteCode("");
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop - Arka planı bg-main'e yaklaştırmak için çok koyu yaptık */}
      <div onClick={reset} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />

      {/* Modal Gövdesi - bg-elevated ve border uyumlu */}
      <div className="relative w-full max-w-[400px] bg-bg-elevated rounded-2xl border-2 border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-150">
        
        {/* Header */}
        <div className="relative px-5 pt-5 text-center">
          {step !== "select" && (
            <button onClick={() => setStep("select")} className="absolute left-4 top-4 text-text-muted hover:text-text-main transition-colors">
              <ChevronLeft size={20} strokeWidth={4}/>
            </button>
          )}

          <button onClick={reset} className="absolute right-4 top-4 text-text-muted hover:text-text-main transition-colors">
            <X size={20} strokeWidth={4}/>
          </button>

          <h2 className="text-lg font-bold text-text-main tracking-tight uppercase">
            {step === "select" && "Sunucu Ekle"}
            {step === "create" && "Oluştur"}
            {step === "join" && "Katıl"}
          </h2>
          <p className="text-[12px] text-text-muted mt-0.5 leading-snug">
            {step === "select" && "Bir başlangıç yap veya arkadaşlarına katıl."}
            {step === "create" && "Sunucun için bir isim seç."}
            {step === "join" && "Davet kodunu aşağıya yapıştır."}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-2.5">
          {step === "select" && (
            <>
              <ActionCard
                icon={<PlusCircle size={25} />}
                title="Kendim Oluşturayım"
                description="Hemen bir alan kur"
                onClick={() => setStep("create")}
              />
              <ActionCard
                icon={<Compass size={25} />}
                title="Sunucuya Katıl"
                description="Kod ile giriş yap"
                success
                onClick={() => setStep("join")}
              />
            </>
          )}

          {step === "create" && (
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Sunucu İsmi</label>
                <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: Baykuş Evi"
                    className="w-full h-12 px-3 rounded-lg bg-black/20 border-2 border-white/5 text-[13px] text-text-main outline-none focus:border-accent/50 transition-all"
                />
            </div>
          )}

          {step === "join" && (
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Davet Kodu</label>
                <input
                    autoFocus
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="8 Haneli Kod"
                    className="w-full h-12 px-3 rounded-lg bg-black/20 border-2 border-white/5 text-[13px] text-success font-bold tracking-widest uppercase outline-none focus:border-success/50 transition-all"
                />
            </div>
          )}
        </div>

        {/* Footer - bg-main'den biraz daha açık bir tonla ayırdık */}
        {step !== "select" && (
          <div className="flex justify-end items-center gap-3 px-5 py-3 bg-white/[0.02] mt-2">
            <button onClick={reset} className="text-[13px] text-text-muted hover:text-text-main font-medium transition-colors">Vazgeç</button>
            <button
              onClick={step === "create" ? async () => { await addServer(name.trim()); reset(); } : async () => { 
                const res = await joinServer(inviteCode.trim());
                if (res.success) { navigate(`/channels/${res.serverId}/${res.channelId}`); reset(); }
              }}
              disabled={(step === "create" && name.trim().length < 3) || (step === "join" && (!inviteCode || loading))}
              className={`px-4 py-2.5 rounded-md text-[13px] font-bold text-white transition-all shadow-lg
                ${step === "create" ? "bg-accent hover:bg-accent/80" : "bg-success hover:bg-success/80"}
                disabled:opacity-50`}
            >
              {loading ? "..." : step === "create" ? "Oluştur" : "Katıl"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function ActionCard({ icon, title, description, onClick, success }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-white/[0.03] bg-white/[0.02] hover:bg-white/[0.05] transition-all text-left group"
    >
      <div className={`p-2 rounded-lg ${success ? "bg-success/20 text-success" : "bg-accent/20 text-accent"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[13px] font-bold text-text-main leading-none">{title}</p>
        <p className="text-[12px] text-text-muted mt-1">{description}</p>
      </div>
    </button>
  );
}