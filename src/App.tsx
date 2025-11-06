import { Navigate, Route, Routes } from 'react-router-dom';
import { ApiClientProvider } from './lib/api/context';
import FeedPage from './routes/FeedPage';

const App = () => (
  <ApiClientProvider>
    <Routes>
      <Route path="/" element={<FeedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </ApiClientProvider>
);

export default App;
