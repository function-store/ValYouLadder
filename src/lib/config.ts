export const IS_PRE_PROD = import.meta.env.VITE_PRE_PROD === "true";
export const IS_DB_OPEN         = import.meta.env.VITE_DB_OPEN          === "true" || !IS_PRE_PROD;
export const IS_SUBMISSIONS_OPEN = import.meta.env.VITE_SUBMISSIONS_OPEN === "true" || !IS_PRE_PROD;
export const IS_ESTIMATES_OPEN   = import.meta.env.VITE_ESTIMATES_OPEN   === "true" || !IS_PRE_PROD;
export const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
export const ENV_LABEL = IS_PRE_PROD ? "staging" : "production";
