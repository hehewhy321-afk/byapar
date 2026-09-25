import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as LocalAuthentication from 'expo-local-authentication';

const KEY_ENABLED = '@byapar_app_lock_enabled';
const KEY_HASH = '@byapar_app_lock_hash';
const KEY_SALT = '@byapar_app_lock_salt';
const KEY_LENGTH = '@byapar_app_lock_pin_length';
const KEY_BIOMETRICS = '@byapar_app_lock_biometrics';
const KEY_FAILED_COUNT = '@byapar_app_lock_failed_count';
const KEY_LOCKOUT_UNTIL = '@byapar_app_lock_lockout_until';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 seconds

export interface AppLockConfig {
  enabled: boolean;
  pinLength: 4 | 6;
  useBiometrics: boolean;
  isLockedOut: boolean;
  lockoutSeconds: number;
}

export interface VerifyResult {
  success: boolean;
  attemptsLeft: number;
  lockedOut: boolean;
  lockoutSeconds: number;
  message?: string;
}

// In-memory session unlock flag
let sessionUnlocked = false;

function generateSalt(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let salt = '';
  for (let i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function hashPin(pin: string, salt: string): string {
  return CryptoJS.SHA256(`${salt}:${pin}`).toString();
}

export const appLockService = {
  isSessionUnlocked(): boolean {
    return sessionUnlocked;
  },

  setSessionUnlocked(unlocked: boolean) {
    sessionUnlocked = unlocked;
  },

  async getConfig(): Promise<AppLockConfig> {
    try {
      const [enabledStr, lenStr, bioStr, lockoutStr] = await Promise.all([
        AsyncStorage.getItem(KEY_ENABLED),
        AsyncStorage.getItem(KEY_LENGTH),
        AsyncStorage.getItem(KEY_BIOMETRICS),
        AsyncStorage.getItem(KEY_LOCKOUT_UNTIL),
      ]);

      const enabled = enabledStr === 'true';
      const pinLength: 4 | 6 = lenStr === '6' ? 6 : 4;
      const useBiometrics = bioStr === 'true';

      const lockoutUntil = lockoutStr ? parseInt(lockoutStr, 10) : 0;
      const now = Date.now();
      const isLockedOut = lockoutUntil > now;
      const lockoutSeconds = isLockedOut ? Math.ceil((lockoutUntil - now) / 1000) : 0;

      return {
        enabled,
        pinLength,
        useBiometrics,
        isLockedOut,
        lockoutSeconds,
      };
    } catch {
      return {
        enabled: false,
        pinLength: 4,
        useBiometrics: false,
        isLockedOut: false,
        lockoutSeconds: 0,
      };
    }
  },

  async setupPin(pin: string, useBiometrics = false): Promise<boolean> {
    try {
      if (pin.length !== 4 && pin.length !== 6) {
        throw new Error('PIN must be 4 or 6 digits');
      }

      const salt = generateSalt();
      const hash = hashPin(pin, salt);

      await Promise.all([
        AsyncStorage.setItem(KEY_ENABLED, 'true'),
        AsyncStorage.setItem(KEY_HASH, hash),
        AsyncStorage.setItem(KEY_SALT, salt),
        AsyncStorage.setItem(KEY_LENGTH, pin.length.toString()),
        AsyncStorage.setItem(KEY_BIOMETRICS, useBiometrics ? 'true' : 'false'),
        AsyncStorage.setItem(KEY_FAILED_COUNT, '0'),
        AsyncStorage.removeItem(KEY_LOCKOUT_UNTIL),
      ]);

      sessionUnlocked = true;
      return true;
    } catch (err) {
      console.error('Failed to setup PIN:', err);
      return false;
    }
  },

  async verifyPin(pin: string): Promise<VerifyResult> {
    try {
      // Check lockout first
      const lockoutStr = await AsyncStorage.getItem(KEY_LOCKOUT_UNTIL);
      const now = Date.now();
      if (lockoutStr) {
        const lockoutUntil = parseInt(lockoutStr, 10);
        if (lockoutUntil > now) {
          const secs = Math.ceil((lockoutUntil - now) / 1000);
          return {
            success: false,
            attemptsLeft: 0,
            lockedOut: true,
            lockoutSeconds: secs,
            message: `Too many failed attempts. Try again in ${secs}s.`,
          };
        }
      }

      const [storedHash, salt, failedCountStr] = await Promise.all([
        AsyncStorage.getItem(KEY_HASH),
        AsyncStorage.getItem(KEY_SALT),
        AsyncStorage.getItem(KEY_FAILED_COUNT),
      ]);

      if (!storedHash || !salt) {
        return { success: false, attemptsLeft: 0, lockedOut: false, lockoutSeconds: 0, message: 'No PIN set' };
      }

      const computed = hashPin(pin, salt);

      if (computed === storedHash) {
        // Success: Reset rate limiting
        await Promise.all([
          AsyncStorage.setItem(KEY_FAILED_COUNT, '0'),
          AsyncStorage.removeItem(KEY_LOCKOUT_UNTIL),
        ]);
        sessionUnlocked = true;
        return { success: true, attemptsLeft: MAX_FAILED_ATTEMPTS, lockedOut: false, lockoutSeconds: 0 };
      }

      // Failure: Track attempts
      const currentFailed = (failedCountStr ? parseInt(failedCountStr, 10) : 0) + 1;
      await AsyncStorage.setItem(KEY_FAILED_COUNT, currentFailed.toString());

      if (currentFailed >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = now + LOCKOUT_DURATION_MS;
        await AsyncStorage.setItem(KEY_LOCKOUT_UNTIL, lockoutUntil.toString());
        return {
          success: false,
          attemptsLeft: 0,
          lockedOut: true,
          lockoutSeconds: 30,
          message: 'Too many incorrect attempts. App locked for 30 seconds.',
        };
      }

      const attemptsLeft = MAX_FAILED_ATTEMPTS - currentFailed;
      return {
        success: false,
        attemptsLeft,
        lockedOut: false,
        lockoutSeconds: 0,
        message: `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
      };
    } catch (err) {
      console.error('Error verifying PIN:', err);
      return { success: false, attemptsLeft: 0, lockedOut: false, lockoutSeconds: 0 };
    }
  },

  async disableLock(): Promise<boolean> {
    try {
      await Promise.all([
        AsyncStorage.setItem(KEY_ENABLED, 'false'),
        AsyncStorage.removeItem(KEY_HASH),
        AsyncStorage.removeItem(KEY_SALT),
        AsyncStorage.removeItem(KEY_FAILED_COUNT),
        AsyncStorage.removeItem(KEY_LOCKOUT_UNTIL),
      ]);
      sessionUnlocked = true;
      return true;
    } catch {
      return false;
    }
  },

  async setBiometrics(enabled: boolean): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEY_BIOMETRICS, enabled ? 'true' : 'false');
      return true;
    } catch {
      return false;
    }
  },

  async checkBiometricsSupport(): Promise<{ hasHardware: boolean; isEnrolled: boolean; isSupported: boolean }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return {
        hasHardware,
        isEnrolled,
        isSupported: hasHardware && isEnrolled,
      };
    } catch (e) {
      console.error('Biometric support check error:', e);
      return { hasHardware: false, isEnrolled: false, isSupported: false };
    }
  },

  async authenticateWithBiometrics(
    reason = 'Confirm fingerprint to unlock'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { hasHardware, isEnrolled } = await this.checkBiometricsSupport();
      if (!hasHardware) {
        return { success: false, error: 'hardware_not_available' };
      }
      if (!isEnrolled) {
        return { success: false, error: 'not_enrolled' };
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: true,
      });

      if (authResult.success) {
        sessionUnlocked = true;
        await Promise.all([
          AsyncStorage.setItem(KEY_FAILED_COUNT, '0'),
          AsyncStorage.removeItem(KEY_LOCKOUT_UNTIL),
        ]);
        return { success: true };
      }

      return { success: false, error: authResult.error || 'auth_failed' };
    } catch (err: any) {
      console.error('Native biometric auth error:', err);
      return { success: false, error: err.message || 'unknown_error' };
    }
  },
};

