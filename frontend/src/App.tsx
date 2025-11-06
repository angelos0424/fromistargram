import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminApiProvider } from './lib/api/admin/context';
import { ApiClientProvider } from './lib/api/context';
import { AuthProvider } from './lib/auth/context';
import FeedPage from './routes/FeedPage';
import AdminDashboard from './routes/admin/AdminDashboard';
import AdminGate from './routes/admin/AdminGate';
import AdminTargetsPage from './routes/admin/AdminTargetsPage';
import AdminAccountsPage from './routes/admin/AdminAccountsPage';
import AdminRunsPage from './routes/admin/AdminRunsPage';

const App = () => (
  <ApiClientProvider>
    <AuthProvider>
      <AdminApiProvider>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/post/:postId" element={<FeedPage />} />
          <Route path="/admin/*" element={<AdminGate />}> 
            <Route index element={<AdminDashboard />} />
            <Route path="targets" element={<AdminTargetsPage />} />
            <Route path="accounts" element={<AdminAccountsPage />} />
            <Route path="runs" element={<AdminRunsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminApiProvider>
    </AuthProvider>
  </ApiClientProvider>
);

export default App;
