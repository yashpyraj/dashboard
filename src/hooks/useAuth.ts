import { useState, useEffect } from 'react';

interface AuthState {
  isAdmin: boolean;
  loading: boolean;
}

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '7890';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    // Check if admin session is valid (with expiration)
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        const now = Date.now();
        
        // Check if session is still valid (24 hours)
        if (session.expires > now && session.authenticated === true) {
          setAuthState({ isAdmin: true, loading: false });
          return;
        } else {
          // Session expired, remove it
          localStorage.removeItem('admin_session');
        }
      } catch (e) {
        // Invalid session data, remove it
        localStorage.removeItem('admin_session');
      }
    }
    
    setAuthState({ isAdmin: false, loading: false });
  }, []);

  const createSession = () => {
    const session = {
      authenticated: true,
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      timestamp: Date.now()
    };
    localStorage.setItem('admin_session', JSON.stringify(session));
  };

  const signInWithPin = async (pin: string) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    // Add delay to prevent brute force
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Hash the PIN for comparison (simple hash for demo)
    const hashedPin = btoa(pin + 'salt_yammy_2024');
    const expectedHash = btoa(ADMIN_PIN + 'salt_yammy_2024');
    
    if (hashedPin === expectedHash) {
      createSession();
      setAuthState({ isAdmin: true, loading: false });
      return { error: null };
    } else {
      setAuthState({ isAdmin: false, loading: false });
      return { error: { message: 'Invalid PIN. Access denied.' } };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('admin_session');
    setAuthState({ isAdmin: false, loading: false });
    return { error: null };
  };

  return {
    user: authState.isAdmin ? { email: 'admin@local' } : null,
    loading: authState.loading,
    isAdmin: authState.isAdmin,
    signInWithPin,
    signOut,
  };
}