import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Vibration,
  Animated,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { appLockService, AppLockConfig } from '../../services/appLockService';

interface Props {
  visible: boolean;
  onUnlock: () => void;
}

export const AppLockModal: React.FC<Props> = ({ visible, onUnlock }) => {
  const { theme, themeMode, language } = useApp();
  const ne = language === 'ne';
  const isDark = themeMode === 'dark';

  const [config, setConfig] = useState<AppLockConfig>({
    enabled: false,
    pinLength: 4,
    useBiometrics: false,
    isLockedOut: false,
    lockoutSeconds: 0,
  });

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [shakeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setEnteredPin('');
      setErrorMessage('');
      loadConfigAndTriggerBiometrics();
    }
  }, [visible]);

  const loadConfigAndTriggerBiometrics = async () => {
    const cfg = await appLockService.getConfig();
    setConfig(cfg);
    if (cfg.isLockedOut) {
      setLockoutTimer(cfg.lockoutSeconds);
    } else if (cfg.useBiometrics) {
      // Auto-trigger native OS hardware biometric prompt like banking apps
      setTimeout(() => {
        handleBiometricAuth();
      }, 350);
    }
  };

  const loadConfig = async () => {
    const cfg = await appLockService.getConfig();
    setConfig(cfg);
    if (cfg.isLockedOut) {
      setLockoutTimer(cfg.lockoutSeconds);
    }
  };

  const handleBiometricAuth = async () => {
    if (lockoutTimer > 0) return;
    try {
      const res = await appLockService.authenticateWithBiometrics(
        ne ? 'ब्यापार एप अनलक गर्न फिंगरप्रिन्ट छुनुहोस्' : 'Touch fingerprint sensor to unlock Byapar'
      );
      if (res.success) {
        Vibration.vibrate(100);
        setEnteredPin('');
        onUnlock();
      } else if (res.error === 'not_enrolled') {
        setErrorMessage(ne ? 'डिभाइसमा फिंगरप्रिन्ट दर्ता गरिएको छैन' : 'No fingerprint enrolled on device');
      }
    } catch (e) {
      console.error('Biometric authentication error:', e);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            loadConfig();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTimer]);

  const triggerShake = () => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = async (digit: string) => {
    if (lockoutTimer > 0) return;
    if (enteredPin.length >= config.pinLength) return;

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setErrorMessage('');

    if (nextPin.length === config.pinLength) {
      // Auto submit
      const result = await appLockService.verifyPin(nextPin);
      if (result.success) {
        setEnteredPin('');
        onUnlock();
      } else {
        triggerShake();
        setEnteredPin('');
        setErrorMessage(result.message || (ne ? 'गलत पिन!' : 'Incorrect PIN!'));
        if (result.lockedOut) {
          setLockoutTimer(result.lockoutSeconds);
        }
      }
    }
  };

  const handleDelete = () => {
    if (lockoutTimer > 0) return;
    if (enteredPin.length > 0) {
      setEnteredPin((prev) => prev.slice(0, -1));
      setErrorMessage('');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F8FAFC' }]}>
        {/* Brand Shield Header */}
        <View style={styles.header}>
          <View style={[styles.shieldIconWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
            <Feather name="shield" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {ne ? 'ब्यापार सेक्युरिटी लक' : 'Byapar Security Lock'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {lockoutTimer > 0
              ? (ne ? `धेरै पटक गलत पिन हालियो। ${lockoutTimer}s पर्खनुहोस्।` : `Too many failed attempts. Wait ${lockoutTimer}s.`)
              : (ne ? 'अगाडि बढ्न आफ्नो सुरक्षा पिन प्रविष्ट गर्नुहोस्' : 'Enter your secret PIN to access store data')}
          </Text>
        </View>

        {/* PIN Indicators */}
        <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: config.pinLength }).map((_, i) => {
            const isFilled = i < enteredPin.length;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFilled ? theme.colors.primary : 'transparent',
                    borderColor: isFilled ? theme.colors.primary : theme.colors.borderGlass,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Error / Lockout Message */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : lockoutTimer > 0 ? (
          <Text style={styles.lockoutText}>
            {ne ? `लक भएको छ (${lockoutTimer}s)` : `App Locked Out (${lockoutTimer}s)`}
          </Text>
        ) : (
          <View style={{ height: 20 }} />
        )}

        {/* Number Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rowIdx) => (
            <View key={rowIdx} style={styles.keypadRow}>
              {row.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={[
                    styles.keypadBtn,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      borderColor: theme.colors.borderGlass,
                    },
                  ]}
                  onPress={() => handleKeyPress(digit)}
                  activeOpacity={0.7}
                  disabled={lockoutTimer > 0}
                >
                  <Text style={[styles.keypadDigit, { color: theme.colors.textPrimary }]}>
                    {digit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Bottom row: Biometrics or Empty, 0, Backspace */}
          <View style={styles.keypadRow}>
            {config.useBiometrics ? (
              <TouchableOpacity
                style={[
                  styles.keypadBtn,
                  styles.utilityKeypadBtn,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                onPress={handleBiometricAuth}
                activeOpacity={0.7}
                disabled={lockoutTimer > 0}
              >
                <MaterialCommunityIcons name="fingerprint" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyKeypadSpace} />
            )}

            <TouchableOpacity
              style={[
                styles.keypadBtn,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: theme.colors.borderGlass,
                },
              ]}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.7}
              disabled={lockoutTimer > 0}
            >
              <Text style={[styles.keypadDigit, { color: theme.colors.textPrimary }]}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.keypadBtn,
                styles.utilityKeypadBtn,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: theme.colors.borderGlass,
                },
              ]}
              onPress={handleDelete}
              activeOpacity={0.7}
              disabled={lockoutTimer > 0}
            >
              <Feather name="delete" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banking-Grade Hardware Biometric Quick Prompt */}
        {config.useBiometrics && (
          <TouchableOpacity
            style={[
              styles.biometricPromptBar,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: theme.colors.borderGlass,
              },
            ]}
            onPress={handleBiometricAuth}
            activeOpacity={0.7}
            disabled={lockoutTimer > 0}
          >
            <MaterialCommunityIcons name="fingerprint" size={22} color={theme.colors.primary} />
            <Text style={[styles.biometricPromptText, { color: theme.colors.textPrimary }]}>
              {ne ? 'फिंगरप्रिन्टबाट अनलक गर्नुहोस्' : 'Tap to Verify Fingerprint'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  shieldIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 20,
    height: 20,
    textAlign: 'center',
  },
  lockoutText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 20,
    height: 20,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  keypadBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  utilityKeypadBtn: {
    borderWidth: 1,
  },
  emptyKeypadSpace: {
    width: 72,
    height: 72,
  },
  keypadDigit: {
    fontSize: 26,
    fontWeight: '700',
  },
  biometricPromptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1,
  },
  biometricPromptText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
