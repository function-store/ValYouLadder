export const IS_DB_OPEN          = import.meta.env.VITE_DB_OPEN          !== "false";
export const IS_SUBMISSIONS_OPEN  = import.meta.env.VITE_SUBMISSIONS_OPEN  !== "false";
export const IS_ESTIMATES_OPEN    = import.meta.env.VITE_ESTIMATES_OPEN    !== "false";
export const SUPABASE_PROJECT_ID  = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
