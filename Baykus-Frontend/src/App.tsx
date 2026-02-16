import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/useAuthStore';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import ChannelChatView from './pages/dashboard/ChannelChatView';
import DirectMessageChatView from './pages/dashboard/DirectMessageChatView'; // 🚩 Yeni DM Görünümü
import ServerRedirect from './components/routing/ServerRedirect';

export default function App() {
  useAuth();
  const { user, isLoading } = useAuthStore();

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-bg-main text-white italic font-black uppercase tracking-widest animate-pulse">
      YÜKLENİYOR...
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <DashboardLayout /> : <Navigate to="/login" />}>
          
          {/* 📩 DM KISMI (@me yapısı) */}
          {/* /channels/@me rotasına tıklandığında arkadaş listesini veya son sohbeti açabilirsin */}
          <Route path="channels/@me/:channelId" element={<DirectMessageChatView />} />

          {/* 🏢 SUNUCU KISMI */}
          {/* Sunucuya tıklandığında ilk kanala yönlendir (Redirect Logic) */}
          <Route path="channels/:serverId" element={<ServerRedirect />} />
          
          {/* Kanal seçildiğinde standart Sunucu Chat görünümü */}
          <Route path="channels/:serverId/:channelId" element={<ChannelChatView />} />
          
        </Route>

        {/* 🔐 AUTH YOLLARI */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
        
        {/* 404 YÖNLENDİRME */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}