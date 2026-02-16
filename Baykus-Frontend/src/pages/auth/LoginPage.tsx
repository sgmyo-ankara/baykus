import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginPage() {
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const { isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') setError("Hatalı e-posta veya şifre.");
      else setError("Giriş yapılamadı.");
    }
  };

  return (
    // ANA SAHNE: Koyu Antrasit Arka Plan
    <div className="flex h-screen w-full items-center justify-center bg-[#313338] text-[#dbdee1] ">
      
      {/* ORTA KART: Hafifçe daha açık, gölgeli */}
      <div className="flex w-full max-w-[480px] flex-col rounded bg-[#313338] p-8 shadow-none sm:bg-[#2b2d31] sm:shadow-2xl">
        
        {/* BAŞLIK ALANI */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-2xl transition-transform hover:rotate-12">
            🦉
          </div>
          <h2 className="text-2xl font-bold text-white">Tekrar Hoşgeldin!</h2>
          <p className="mt-1 text-sm text-[#b5bac1]">Seni tekrar görmek çok güzel!</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Input Grubu 1 */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
              E-Posta Adresi
            </label>
            <input
              type="email"
              required
              className="w-full rounded bg-[#1e1f22] p-2.5 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Input Grubu 2 */}
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
            <div className="mt-1 text-right">
              <a href="#" className="text-xs text-[#00a8fc] hover:underline">Şifreni mi unuttun?</a>
            </div>
          </div>

          {/* Hata Mesajı */}
          {error && <div className="text-sm font-medium text-red-400">{error}</div>}

          {/* Giriş Butonu */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded bg-[#5865F2] py-3 font-medium text-white transition hover:bg-[#4752C4] disabled:opacity-50"
          >
            {isLoading ? "Yükleniyor..." : "Giriş Yap"}
          </button>

          {/* Google Butonu */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-[#3f4147]"></div>
            <span className="mx-2 flex-shrink-0 text-xs text-[#b5bac1]">veya</span>
            <div className="flex-grow border-t border-[#3f4147]"></div>
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex w-full items-center justify-center gap-2 rounded bg-white py-2.5 font-medium text-black transition hover:bg-gray-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google ile Devam Et
          </button>

          {/* Kayıt Linki */}
          <div className="text-sm text-[#b5bac1]">
            Bir hesaba mı ihtiyacın var?{" "}
            <Link to="/register" className="text-[#00a8fc] hover:underline">
              Kaydol
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}