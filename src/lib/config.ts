export const IS_PRE_PROD = import.meta.env.VITE_PRE_PROD === "true";
export const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
export const ENV_LABEL = IS_PRE_PROD ? "staging" : "production";
