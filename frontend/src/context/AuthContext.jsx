// context/AuthContext.jsx — wraps Amplify v6 sign-in and exposes a single
// React context with the current user, role (priority Admin > Analyst >
// User), and the actions the LoginPage / Sidebar need. The ID token is
// decoded locally just to surface the role; signature verification still
// happens server-side in middleware/auth.js.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  confirmSignIn as amplifyConfirmSignIn,
  fetchAuthSession,
} from 'aws-amplify/auth';

const AuthContext = createContext(null);

function decodePayload(jwt) {
  try {
    const part = jwt.split('.')[1];
    const padded = part + '==='.slice((part.length + 3) % 4);
    return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

async function loadCurrentUser() {
  try {
    const session = await fetchAuthSession();
    const idToken = session?.tokens?.idToken?.toString();
    if (!idToken) return null;
    const claims = decodePayload(idToken);
    const groups = claims['cognito:groups'] || [];
    const role =
      groups.includes('Admins')   ? 'Admin'   :
      groups.includes('Analysts') ? 'Analyst' :
      'User';
    return {
      idToken,
      sub: claims.sub,
      email: claims.email,
      name: claims.name || claims.email,
      groups,
      role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser().then((u) => {
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  const refresh = useCallback(async () => {
    const u = await loadCurrentUser();
    setUser(u);
    return u;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    // Sign out any stale session first to avoid "There is already a signed in user" error
    try { await amplifySignOut(); } catch { /* ignore */ }
    const result = await amplifySignIn({
      username: email,
      password,
      options: { authFlowType: 'USER_PASSWORD_AUTH' },
    });
    if (result.isSignedIn) {
      const u = await refresh();
      return { status: 'OK', user: u };
    }
    if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return { status: 'NEW_PASSWORD_REQUIRED' };
    }
    return { status: 'PENDING', step: result.nextStep?.signInStep };
  }, [refresh]);

  const completeNewPassword = useCallback(async (newPassword) => {
    const result = await amplifyConfirmSignIn({ challengeResponse: newPassword });
    if (result.isSignedIn) {
      const u = await refresh();
      return { status: 'OK', user: u };
    }
    return { status: 'PENDING', step: result.nextStep?.signInStep };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, completeNewPassword, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
