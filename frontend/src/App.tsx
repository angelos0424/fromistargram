import { Navigate, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/auth/context';
import FeedPage from './routes/FeedPage';
import AdminDashboard from './routes/admin/AdminDashboard';
import AdminGate from './routes/admin/AdminGate';
import AdminTargetsPage from './routes/admin/AdminTargetsPage';
import AdminAccountsPage from './routes/admin/AdminAccountsPage';
import AdminRunsPage from './routes/admin/AdminRunsPage';
import AdminDatabasePage from './routes/admin/AdminDatabasePage';

const App = () => (
  <HelmetProvider>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/post/:postId" element={<FeedPage />} />
        <Route path="/admin/*" element={<AdminGate />}>
          <Route index element={<AdminDashboard />} />
          <Route path="targets" element={<AdminTargetsPage />} />
          <Route path="accounts" element={<AdminAccountsPage />} />
          <Route path="runs" element={<AdminRunsPage />} />
          <Route path="db" element={<AdminDatabasePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </HelmetProvider>
);

export default App;
