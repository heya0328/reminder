import { useEffect, useRef, useState } from "react";

export function useBannerAd() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    import("@apps-in-toss/web-bridge")
      .then(({ TossAds }) => {
        if (!TossAds.initialize.isSupported?.()) return;
        TossAds.initialize({
          callbacks: {
            onInitialized: () => setInitialized(true),
            onInitializationFailed: () => {},
          },
        });
      })
      .catch(() => {});
  }, []);

  return initialized;
}

export function useBannerAttach(
  adGroupId: string,
  initialized: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialized || !containerRef.current) return;

    let attached: { destroy: () => void } | undefined;

    import("@apps-in-toss/web-bridge")
      .then(({ TossAds }) => {
        if (!containerRef.current) return;
        attached = TossAds.attachBanner(adGroupId, containerRef.current, {
          theme: "light",
          tone: "blackAndWhite",
          variant: "card",
          callbacks: {
            onAdFailedToRender: () => {},
            onNoFill: () => {},
          },
        });
      })
      .catch(() => {});

    return () => {
      attached?.destroy();
    };
  }, [initialized, adGroupId]);

  return containerRef;
}

/**
 * userKey를 seed로 사용해 리스트 내 광고 삽입 위치를 결정
 * 같은 유저는 항상 같은 위치에 광고를 봄
 */
export function getAdPosition(userKey: string, listLength: number): number | null {
  if (listLength < 2) return null; // 리스트가 너무 짧으면 광고 없음

  // 간단한 해시: userKey의 각 문자 코드를 합산
  let hash = 0;
  for (let i = 0; i < userKey.length; i++) {
    hash = ((hash << 5) - hash + userKey.charCodeAt(i)) | 0;
  }

  // 2번째 ~ (listLength)번째 사이에 배치 (첫 번째 항목 바로 아래부터)
  const minPos = 1;
  const maxPos = Math.min(listLength, 5); // 최대 5번째까지
  const pos = minPos + (Math.abs(hash) % (maxPos - minPos + 1));
  return pos;
}
