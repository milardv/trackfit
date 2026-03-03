import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import * as path from "node:path";

function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim();
  if (!trimmed) {
    return "/";
  }

  const startsWithSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return startsWithSlash.endsWith("/") ? startsWithSlash : `${startsWithSlash}/`;
}

function resolveGithubPagesBase(explicitBasePath?: string): string {
  if (explicitBasePath) {
    return normalizeBasePath(explicitBasePath);
  }

  const isGithubPagesBuild =
    process.env.GITHUB_PAGES === "true" || process.env.GITHUB_ACTIONS === "true";

  if (!isGithubPagesBuild) {
    return "/";
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const repositoryName = repository?.split("/")[1];

  if (!repositoryName) {
    return "/";
  }

  return `/${repositoryName}/`;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    base: resolveGithubPagesBase(env.VITE_BASE_PATH),
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
