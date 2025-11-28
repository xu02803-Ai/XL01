// pages/Settings2FA.tsx
// 两步验证设置页面示例

import React, { useState } from 'react';
import { useAdvancedAuth } from '../contexts/AdvancedAuthContext';
import styles from './Settings2FA.module.css';

type Step = 'disabled' | 'setup' | 'verify' | 'enabled';

export const Settings2FA: React.FC = () => {
  const { enable2FA, verify2FA, validate2FA, disable2FA } = useAdvancedAuth();
  const [step, setStep] = useState<Step>('disabled');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await enable2FA();
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setBackupCodes(result.backupCodes);
      setStep('setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await verify2FA(verificationCode);
      setStep('enabled');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure? You will lose 2FA protection.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await disable2FA();
      setStep('disabled');
      setQrCode('');
      setSecret('');
      setBackupCodes([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <div className={styles.container}>
      <h2>Two-Factor Authentication (2FA)</h2>

      {error && <div className={styles.error}>{error}</div>}

      {step === 'disabled' && (
        <div className={styles.card}>
          <p className={styles.status}>🔓 2FA is currently disabled</p>
          <p className={styles.description}>
            Two-factor authentication adds an extra layer of security to your account.
            You'll need to enter a code from your authenticator app when logging in.
          </p>
          <button
            className={styles.primaryButton}
            onClick={handleEnable2FA}
            disabled={loading}
          >
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div className={styles.card}>
          <p className={styles.status}>⚙️ Setup 2FA</p>

          <div className={styles.setupSection}>
            <h3>Step 1: Scan QR Code</h3>
            <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            {qrCode && <img src={qrCode} alt="QR Code" className={styles.qrCode} />}
            <p className={styles.fallback}>Can't scan? Enter manually:</p>
            <code className={styles.secret}>{secret}</code>
          </div>

          <div className={styles.setupSection}>
            <h3>Step 2: Verify Code</h3>
            <p>Enter the 6-digit code from your authenticator app</p>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className={styles.codeInput}
              disabled={loading}
            />
            <button
              className={styles.primaryButton}
              onClick={handleVerifyCode}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className={styles.card}>
          <p className={styles.status}>📝 Save Backup Codes</p>
          <p className={styles.description}>
            Save these recovery codes in a safe place. You can use them to regain access if
            you lose your authenticator.
          </p>

          <div className={styles.backupCodes}>
            {backupCodes.map((code) => (
              <code key={code}>{code}</code>
            ))}
          </div>

          <button
            className={styles.secondaryButton}
            onClick={copyBackupCodes}
          >
            {copiedCodes ? '✓ Copied!' : 'Copy Codes'}
          </button>

          <button
            className={styles.primaryButton}
            onClick={() => setStep('enabled')}
          >
            I've Saved the Codes
          </button>
        </div>
      )}

      {step === 'enabled' && (
        <div className={styles.card}>
          <p className={styles.status}>🔐 2FA is enabled</p>
          <p className={styles.description}>
            Your account is now protected with two-factor authentication.
          </p>
          <button
            className={styles.dangerButton}
            onClick={handleDisable2FA}
            disabled={loading}
          >
            {loading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      )}
    </div>
  );
};
