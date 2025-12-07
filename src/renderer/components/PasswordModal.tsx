import React, { useState } from 'react';
import { Settings } from '../types';
import { hashPassword, generateSalt, encrypt, decrypt, validateKey } from '../utils/encryption';
import { useEncryption } from '../contexts/EncryptionContext';
import '../styles/Modal.css';

interface PasswordModalProps {
  isSetup: boolean;
  onClose: () => void;
  onUnlock: () => void;
  settings: Settings;
  onUpdateSettings: (updates: Partial<Settings>) => Promise<void>;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  isSetup,
  onClose,
  onUnlock,
  settings,
  onUpdateSettings,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setEncryptionKey, generateKeyFromPassword } = useEncryption();

  const handleSetup = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { key, salt } = generateKeyFromPassword(password);
      const testString = 'secure-notes-test';
      const { ciphertext, iv } = encrypt(testString, key);

      await onUpdateSettings({
        encryptionEnabled: true,
        passwordHash: hashPassword(password, salt),
        passwordSalt: salt,
        testCiphertext: ciphertext,
        testIV: iv,
      });

      setEncryptionKey(key);
      onUnlock();
    } catch (err) {
      setError('Encryption setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { key } = generateKeyFromPassword(password, settings.passwordSalt);
      const testString = 'secure-notes-test';

      if (settings.testCiphertext && settings.testIV) {
        const isValid = validateKey(settings.testCiphertext, settings.testIV, key, testString);
        
        if (isValid) {
          setEncryptionKey(key);
          onUnlock();
        } else {
          setError('Wrong password');
        }
      } else {
        // Fallback to hash comparison
        const inputHash = hashPassword(password, settings.passwordSalt!);
        if (inputHash === settings.passwordHash) {
          setEncryptionKey(key);
          onUnlock();
        } else {
          setError('Wrong password');
        }
      }
    } catch (err) {
      setError('Unlock failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSetup) {
      handleSetup();
    } else {
      handleUnlock();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal password-modal">
        <div className="modal-header">
          <div className="lock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h2>{isSetup ? 'Encryption Setup' : 'Locked'}</h2>
          <p>
            {isSetup
              ? 'Set a master password to protect your notes'
              : 'Enter your password to access your notes'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
            />
          </div>

          {isSetup && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {isSetup && (
            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">If you forget this password, you won't be able to access your notes!</span>
            </div>
          )}

          <div className="modal-actions">
            {!settings.encryptionEnabled && (
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Processing...' : isSetup ? 'Enable Encryption' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;
