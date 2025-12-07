import React, { createContext, useContext, ReactNode } from 'react';
import { t, Translations } from '../utils/i18n';

interface I18nContextType {
  t: Translations;
}

const I18nContext = createContext<I18nContextType>({ t });

export const useI18n = () => useContext(I18nContext);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  return (
    <I18nContext.Provider value={{ t }}>
      {children}
    </I18nContext.Provider>
  );
};

