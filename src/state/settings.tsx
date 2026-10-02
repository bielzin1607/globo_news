import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Settings = { targetLang: string; translateList: boolean };
type Ctx = Settings & { update: (patch: Partial<Settings>) => void };

const DEFAULTS: Settings = { targetLang: 'pt', translateList: false };
const KEY = 'settings:v1';
const SettingsContext = createContext<Ctx>({ ...DEFAULTS, update: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setS({ ...DEFAULTS, ...JSON.parse(v) }))
      .catch(() => {});
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...s,
      update: (patch) =>
        setS((prev) => {
          const next = { ...prev, ...patch };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [s]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
