import { useState, useEffect } from 'react';

interface SessionStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Checks the server-side OAuth session status.
 * Returns whether the user is authenticated and whether the check is in progress.
 */
export function useSession(): SessionStatus {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/auth/status');
        const data = await response.json();
        setIsAuthenticated(data.authenticated === true);
      } catch (error) {
        console.error('[Session] Failed to check auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  return { isAuthenticated, isLoading };
}
