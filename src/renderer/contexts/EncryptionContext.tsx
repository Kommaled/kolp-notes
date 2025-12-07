import React, { createContext, useContext, useState, ReactNode } from 'react';
import { deriveKey, generateSalt, encrypt, decrypt } from '../utils/encryption';

interface EncryptionContextType {
  isEncryptionEnabled: boolean;
  encryptionKey: string | null;
  setEncryptionKey: (key: string | null) => void;
  encryptText: (text: string) => { ciphertext: string; iv: string } | null;
  decryptText: (ciphertext: string, iv: string) => string | null;
  generateKeyFromPassword: (password: string, salt?: string) => { key: string; salt: string };
}

const EncryptionContext = createContext<EncryptionContextType>({
  isEncryptionEnabled: false,
  encryptionKey: null,
  setEncryptionKey: () => {},
  encryptText: () => null,
  decryptText: () => null,
  generateKeyFromPassword: () => ({ key: '', salt: '' }),
});

export const useEncryption = () => useContext(EncryptionContext);

interface EncryptionProviderProps {
  children: ReactNode;
}

export const EncryptionProvider: React.FC<EncryptionProviderProps> = ({ children }) => {
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  const encryptText = (text: string) => {
    if (!encryptionKey) return null;
    try {
      return encrypt(text, encryptionKey);
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  };

  const decryptText = (ciphertext: string, iv: string) => {
    if (!encryptionKey) return null;
    try {
      return decrypt(ciphertext, encryptionKey, iv);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  };

  const generateKeyFromPassword = (password: string, existingSalt?: string) => {
    const salt = existingSalt || generateSalt();
    const key = deriveKey(password, salt);
    return { key, salt };
  };

  return (
    <EncryptionContext.Provider
      value={{
        isEncryptionEnabled: !!encryptionKey,
        encryptionKey,
        setEncryptionKey,
        encryptText,
        decryptText,
        generateKeyFromPassword,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
};
