import { Navigate, Route, Routes } from 'react-router-dom';
import { useUserStore } from './store/user';
import EntryPage from './pages/EntryPage';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';

/**
 * 守卫：未设置昵称的用户重定向到入口页
 */
function RequireUser({ children }: { children: React.ReactNode }) {
  const name = useUserStore((s) => s.name);
  if (!name) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryPage />} />
      <Route
        path="/lobby"
        element={
          <RequireUser>
            <LobbyPage />
          </RequireUser>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <RequireUser>
            <RoomPage />
          </RequireUser>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
