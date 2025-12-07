import CryptoJS from 'crypto-js';

// Encryption configuration
const ITERATIONS = 100000;
const KEY_SIZE = 256 / 32; // 256 bits
const IV_SIZE = 128 / 8; // 128 bits

/**
 * Derives a cryptographic key from a password using PBKDF2
 */
export function deriveKey(password: string, salt: string): string {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString();
}

/**
 * Generates a random salt
 */
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
}

/**
 * Generates a random IV (Initialization Vector)
 */
export function generateIV(): string {
  return CryptoJS.lib.WordArray.random(IV_SIZE).toString();
}

/**
 * Encrypts plaintext using AES-256-CBC
 */
export function encrypt(plaintext: string, key: string): { ciphertext: string; iv: string } {
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE);
  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Hex),
  };
}

/**
 * Decrypts ciphertext using AES-256-CBC
 */
export function decrypt(ciphertext: string, key: string, iv: string): string {
  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const ivWordArray = CryptoJS.enc.Hex.parse(iv);
  
  const ciphertextWordArray = CryptoJS.enc.Base64.parse(ciphertext);
  
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: ciphertextWordArray,
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Hashes a password for verification purposes
 */
export function hashPassword(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  }).toString();
}

/**
 * Encrypts an entire note object
 */
export function encryptNote(
  note: { title: string; content: string },
  key: string
): { encryptedTitle: string; encryptedContent: string; titleIV: string; contentIV: string } {
  const titleResult = encrypt(note.title, key);
  const contentResult = encrypt(note.content, key);

  return {
    encryptedTitle: titleResult.ciphertext,
    encryptedContent: contentResult.ciphertext,
    titleIV: titleResult.iv,
    contentIV: contentResult.iv,
  };
}

/**
 * Decrypts an entire note object
 */
export function decryptNote(
  encryptedNote: {
    encryptedTitle: string;
    encryptedContent: string;
    titleIV: string;
    contentIV: string;
  },
  key: string
): { title: string; content: string } {
  const title = decrypt(encryptedNote.encryptedTitle, key, encryptedNote.titleIV);
  const content = decrypt(encryptedNote.encryptedContent, key, encryptedNote.contentIV);

  return { title, content };
}

/**
 * Validates that a key can decrypt a test string
 */
export function validateKey(testCiphertext: string, testIV: string, key: string, expectedPlaintext: string): boolean {
  try {
    const decrypted = decrypt(testCiphertext, key, testIV);
    return decrypted === expectedPlaintext;
  } catch {
    return false;
  }
}

/**
 * Generates a secure random identifier
 */
export function generateSecureId(): string {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
}
