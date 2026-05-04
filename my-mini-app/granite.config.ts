import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "randominder",
  brand: {
    displayName: "랜덤알림",
    primaryColor: "#3182F6",
    icon: "https://static.toss.im/appsintoss/30619/c9580170-a164-4b5e-a4b7-14ce09d723dd.png",
  },
  web: {
    host: "192.168.0.109",
    port: 5173,
    commands: {
      dev: "vite dev --host 0.0.0.0 --port 5173",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
