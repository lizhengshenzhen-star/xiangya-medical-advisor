/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_FEISHU_BITABLE_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
