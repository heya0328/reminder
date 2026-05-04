import { useCallback, useEffect, useRef, useState } from "react";
import { loginWithCode } from "../lib/api/auth";

const IS_LOCAL_DEV = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

interface AuthState {
  userKey: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    userKey: null,
    loading: true,
    error: null,
  });

  const login = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (IS_LOCAL_DEV) {
        const { userKey } = await loginWithCode("local-dev-auth-code", "SANDBOX");
        setState({ userKey, loading: false, error: null });
        return userKey;
      }

      const { appLogin } = await import("@apps-in-toss/web-bridge");
      const { authorizationCode, referrer } = await appLogin();
      const { userKey } = await loginWithCode(authorizationCode, referrer);
      setState({ userKey, loading: false, error: null });
      return userKey;
    } catch (err) {
      const message = err instanceof Error ? err.message : "로그인에 실패했어요.";
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  const autoLoginAttempted = useRef(false);
  useEffect(() => {
    if (autoLoginAttempted.current || state.userKey) return;
    autoLoginAttempted.current = true;
    void login();
  }, [login, state.userKey]);

  return {
    userKey: state.userKey,
    loading: state.loading,
    error: state.error,
    login,
    isLoggedIn: state.userKey !== null,
  };
}
