import { Navigate, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/auth/context';
import FeedPage from './routes/FeedPage';
import AdminDashboard from './routes/admin/AdminDashboard';
import AdminGate from './routes/admin/AdminGate';
import AdminUploadsPage from './routes/admin/AdminUploadsPage';
import AdminDatabasePage from './routes/admin/AdminDatabasePage';

const App = () => (
  <HelmetProvider>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/post/:postId" element={<FeedPage />} />
        <Route path="/admin/*" element={<AdminGate />}>
          <Route index element={<AdminDashboard />} />
          <Route path="uploads" element={<AdminUploadsPage />} />
          <Route path="db" element={<AdminDatabasePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </HelmetProvider>
);

export default App;
