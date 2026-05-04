import { useEffect, useRef } from "react";

const APP_NAME = "randominder";

function parseSchemeUri(uri: string): string | null {
  if (!uri) return null;

  // intoss://randominder/detail/abc-123 → /detail/abc-123
  const prefix = `intoss://${APP_NAME}`;
  if (!uri.startsWith(prefix)) return null;

  const path = uri.slice(prefix.length);
  if (!path || path === "/") return null;

  return path;
}

export function useDeepLink(onDeepLink: (path: string) => void) {
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    import("@apps-in-toss/web-bridge")
      .then(({ getSchemeUri }) => {
        const uri = getSchemeUri();
        const path = parseSchemeUri(uri);
        if (path) {
          onDeepLink(path);
        }
      })
      .catch(() => {
        // 로컬 개발 환경: getSchemeUri 사용 불가
      });
  }, [onDeepLink]);
}
