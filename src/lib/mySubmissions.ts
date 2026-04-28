const STORAGE_KEY = "ccc_submissions";

export interface StoredSubmission {
  id: string;
  token: string;
  submittedAt: string;
}

export const getStoredSubmissions = (): StoredSubmission[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const addStoredSubmission = (id: string, token: string): void => {
  const existing = getStoredSubmissions();
  const updated = [
    ...existing.filter((s) => s.id !== id),
    { id, token, submittedAt: new Date().toISOString() },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const removeStoredSubmission = (id: string): void => {
  const updated = getStoredSubmissions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const hasStoredSubmissions = (): boolean =>
  getStoredSubmissions().length > 0;
