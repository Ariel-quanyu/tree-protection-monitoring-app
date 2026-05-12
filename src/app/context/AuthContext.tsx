import React, { createContext, useContext, useMemo, useState } from "react";

const FULL_NAME_STORAGE_KEY = "inspector_full_name";

interface AuthContextValue {
  fullName: string;
  loading: boolean;
  setFullName: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredFullName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(FULL_NAME_STORAGE_KEY)?.trim() ?? "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fullName, setFullNameState] = useState<string>(() => getStoredFullName());

  const setFullName = (name: string) => {
    const normalized = name.trim();
    setFullNameState(normalized);
    if (normalized) {
      localStorage.setItem(FULL_NAME_STORAGE_KEY, normalized);
    } else {
      localStorage.removeItem(FULL_NAME_STORAGE_KEY);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    fullName,
    loading: false,
    setFullName,
  }), [fullName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
