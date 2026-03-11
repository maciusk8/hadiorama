import React from 'react';
import { useSession } from '@/shared/hooks/useSession';

interface LoginGateProps {
  children: React.ReactNode;
}

/**
 * Gate component that checks the OAuth session before rendering the app.
 *
 * - Loading → shows a loading indicator
 * - Not authenticated → redirects browser to /auth/login (HA OAuth)
 * - Authenticated → renders children
 */
export const LoginGate: React.FC<LoginGateProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#aaa',
        fontSize: '1.2rem',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Checking authentication…
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to the Elysia auth endpoint which will redirect to HA
    window.location.href = '/auth/login';

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#aaa',
        fontSize: '1.2rem',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Redirecting to Home Assistant login…
      </div>
    );
  }

  return <>{children}</>;
};
