import { useEffect, useRef } from "react";

interface BackHandlerOptions {
  page: string;
  onBack: () => void;
  onExit: () => void;
}

export function useBackHandler({ page, onBack, onExit }: BackHandlerOptions) {
  const pageRef = useRef(page);
  pageRef.current = page;

  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    let cancelled = false;

    import("@apps-in-toss/web-bridge")
      .then(({ graniteEvent }) => {
        if (cancelled) return;
        unsubscribe = graniteEvent.addEventListener("backEvent", {
          onEvent: () => {
            if (pageRef.current === "home") {
              onExitRef.current();
            } else {
              onBackRef.current();
            }
          },
          onError: (error: Error) => {
            console.error("[backEvent error]", error);
          },
        });
      })
      .catch(() => {
        // 로컬 개발 환경: graniteEvent 사용 불가
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
}
