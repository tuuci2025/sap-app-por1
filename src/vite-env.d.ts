/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POR1_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
