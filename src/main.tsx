import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from '@/App';
import { HomeAssistantProvider } from '@/shared/providers/HomeAssistantProvider';
import { LoginGate } from '@/shared/components/LoginGate';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * WebSocket URL pointing to our Elysia proxy — never directly to HA.
 * The proxy handles HA authentication server-side.
 */
const WS_URL = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
  + `//${window.location.host}/ws/ha`;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <LoginGate>
      <HomeAssistantProvider url={WS_URL}>
        <App />
      </HomeAssistantProvider>
    </LoginGate>
  </QueryClientProvider>
);
