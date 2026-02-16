import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';

export default function RegisterPage() {
  const { registerWithEmail } = useAuth();
  const { isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await registerWithEmail(email, password, username);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError("Bu e-posta zaten kullanımda.");
      else if (err.code === 'auth/weak-password') setError("Şifre çok zayıf.");
      else setError("Kayıt olunamadı.");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#313338] text-[#dbdee1]">
      
      <div className="flex w-full max-w-[480px] flex-col rounded bg-[#313338] p-8 shadow-none sm:bg-[#2b2d31] sm:shadow-2xl">
        
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">Hesap Oluştur</h2>
          <p className="mt-1 text-sm text-[#b5bac1]">Baykuş topluluğuna katıl.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              required
              placeholder="Sana nasıl seslenelim?"
              className="w-full rounded bg-[#1e1f22] p-2.5 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
              E-Posta
            </label>
            <input
              type="email"
              required
              placeholder="isim@örnek.com"
              className="w-full rounded bg-[#1e1f22] p-2.5 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
              Şifre
            </label>
            <input
              type="password"
              required
              className="w-full rounded bg-[#1e1f22] p-2.5 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-[#b5bac1]">En az 6 karakter olmalı.</p>
          </div>

          {error && <div className="text-sm font-medium text-red-400">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full rounded bg-[#5865F2] py-3 font-medium text-white transition hover:bg-[#4752C4] disabled:opacity-50"
          >
            {isLoading ? "Hesap Oluşturuluyor..." : "Kaydol"}
          </button>

          <div className="mt-2 text-sm text-[#b5bac1]">
            <Link to="/login" className="text-[#00a8fc] hover:underline">
              Zaten bir hesabın var mı?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}