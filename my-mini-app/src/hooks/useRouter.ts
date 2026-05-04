import { useCallback, useEffect, useState } from "react";

type Page = "home" | "create" | "list" | "inbox" | "detail";

interface RouteState {
  page: Page;
  params: Record<string, string>;
}

function parsePath(pathname: string): RouteState {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/" || path === "") {
    return { page: "home", params: {} };
  }
  if (path === "/create") {
    return { page: "create", params: {} };
  }
  if (path === "/list") {
    return { page: "list", params: {} };
  }
  if (path === "/inbox") {
    return { page: "inbox", params: {} };
  }
  if (path.startsWith("/detail/")) {
    const id = path.slice("/detail/".length);
    if (id) {
      return { page: "detail", params: { id } };
    }
  }

  return { page: "home", params: {} };
}

export function useRouter() {
  const [route, setRoute] = useState<RouteState>(() =>
    parsePath(window.location.pathname),
  );

  useEffect(() => {
    function handlePopState() {
      setRoute(parsePath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, "", path);
    setRoute(parsePath(path));
  }, []);

  const back = useCallback(() => {
    if (window.history.length <= 1) {
      // 딥링크로 직접 진입한 경우 히스토리가 없으므로 홈으로 이동
      navigate("/");
    } else {
      window.history.back();
    }
  }, [navigate]);

  return { route, navigate, back };
}
