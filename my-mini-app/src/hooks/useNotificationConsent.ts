import { useCallback, useEffect, useRef, useState } from "react";

import { getConsent, recordPushConsent } from "../lib/api/consent";

interface State {
  hasConsented: boolean;
  loading: boolean;
  error: string | null;
}

export function useNotificationConsent(tossUserKey: string | null) {
  const [state, setState] = useState<State>({
    hasConsented: false,
    loading: false,
    error: null,
  });
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tossUserKey) return;
    if (fetchedKeyRef.current === tossUserKey) return;
    fetchedKeyRef.current = tossUserKey;

    setState({ hasConsented: false, loading: true, error: null });
    void getConsent(tossUserKey)
      .then((consent) => {
        setState({
          hasConsented: Boolean(consent?.pushEnabled && consent?.pushConsentedAt),
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        setState({
          hasConsented: false,
          loading: false,
          error: err instanceof Error ? err.message : "동의 정보를 불러오지 못했어요.",
        });
      });
  }, [tossUserKey]);

  const consent = useCallback(async () => {
    if (!tossUserKey) throw new Error("로그인이 필요해요.");
    const next = await recordPushConsent(tossUserKey);
    setState({
      hasConsented: Boolean(next.pushEnabled && next.pushConsentedAt),
      loading: false,
      error: null,
    });
  }, [tossUserKey]);

  return {
    hasConsented: state.hasConsented,
    loading: state.loading,
    error: state.error,
    consent,
  };
}
