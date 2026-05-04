import { useCallback, useEffect, useRef, useState } from "react";

const AD_GROUP_ID = "ait.v2.live.1a6abea091074a78";

export function useFullScreenAd() {
  const [loaded, setLoaded] = useState(false);
  const unregisterRef = useRef<(() => void) | undefined>();

  const loadAd = useCallback(() => {
    setLoaded(false);

    import("@apps-in-toss/web-bridge")
      .then(({ loadFullScreenAd }) => {
        if (!loadFullScreenAd.isSupported?.()) return;

        unregisterRef.current?.();
        unregisterRef.current = loadFullScreenAd({
          options: { adGroupId: AD_GROUP_ID },
          onEvent: (event) => {
            if (event.type === "loaded") {
              setLoaded(true);
            }
          },
          onError: () => {
            // 광고 로드 실패 → 무시, 앱 기능 차단하지 않음
          },
        });
      })
      .catch(() => {
        // 로컬 개발 환경
      });
  }, []);

  // 마운트 시 첫 로드
  useEffect(() => {
    loadAd();
    return () => {
      unregisterRef.current?.();
    };
  }, [loadAd]);

  const showAd = useCallback(
    (onDismissed: () => void) => {
      if (!loaded) {
        // 광고 미로드 시 바로 다음 단계 진행
        onDismissed();
        return;
      }

      import("@apps-in-toss/web-bridge")
        .then(({ showFullScreenAd }) => {
          showFullScreenAd({
            options: { adGroupId: AD_GROUP_ID },
            onEvent: (event) => {
              if (event.type === "dismissed" || event.type === "failedToShow") {
                setLoaded(false);
                loadAd(); // 다음 광고 미리 로드
                onDismissed();
              }
            },
            onError: () => {
              loadAd();
              onDismissed();
            },
          });
        })
        .catch(() => {
          onDismissed();
        });
    },
    [loaded, loadAd],
  );

  return { loaded, showAd };
}
