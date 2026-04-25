import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "random-reminder",
  brand: {
    displayName: "랜덤 리마인더",
    primaryColor: "#3182F6",
    icon: "",
  },
  web: {
    host: "localhost",
    port: 53118,
    commands: {
      dev: "vite dev --host localhost --port 53118",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
