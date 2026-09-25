import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { appLockService } from '../../services/appLockService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SetupPinModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const { theme, themeMode, language } = useApp();
  const ne = language === 'ne';
  const isDark = themeMode === 'dark';

  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const currentPin = step === 'create' ? firstPin : confirmPin;

  const handleKeyPress = (digit: string) => {
    if (currentPin.length >= pinLength) return;
    const next = currentPin + digit;
    setErrorMessage('');

    if (step === 'create') {
      setFirstPin(next);
      if (next.length === pinLength) {
        setTimeout(() => {
          setStep('confirm');
        }, 200);
      }
    } else {
      setConfirmPin(next);
      if (next.length === pinLength) {
        if (next === firstPin) {
          // Success
          saveNewPin(firstPin);
        } else {
          setErrorMessage(ne ? 'पिन मिलेन! पुन: प्रयास गर्नुहोस्।' : 'PINs do not match! Try again.');
          setTimeout(() => {
            setConfirmPin('');
            setFirstPin('');
            setStep('create');
          }, 1200);
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'create') {
      setFirstPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const saveNewPin = async (pin: string) => {
    const success = await appLockService.setupPin(pin, useBiometrics);
    if (success) {
      Alert.alert(
        ne ? 'सुरक्षा पिन सेट गरियो' : 'App Lock Enabled',
        ne ? 'एप लक सफलतापूर्वक सक्रिय गरियो।' : 'App Lock PIN has been successfully set.'
      );
      resetState();
      onSuccess();
    } else {
      Alert.alert('Error', 'Failed to save security PIN.');
    }
  };

  const resetState = () => {
    setStep('create');
    setFirstPin('');
    setConfirmPin('');
    setErrorMessage('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F8FAFC' }]}>
        {/* Header */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Feather name="x" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: theme.colors.textPrimary }]}>
            {ne ? 'एप लक सेटअप' : 'App Lock Setup'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Length selector */}
        {step === 'create' && firstPin.length === 0 && (
          <View style={styles.lengthRow}>
            <TouchableOpacity
              style={[
                styles.lengthBtn,
                pinLength === 4 && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setPinLength(4)}
            >
              <Text
                style={[
                  styles.lengthBtnText,
                  { color: pinLength === 4 ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                4-Digit PIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.lengthBtn,
                pinLength === 6 && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setPinLength(6)}
            >
              <Text
                style={[
                  styles.lengthBtnText,
                  { color: pinLength === 6 ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                6-Digit PIN
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.content}>
          <Text style={[styles.promptTitle, { color: theme.colors.textPrimary }]}>
            {step === 'create'
              ? (ne ? `नयाँ ${pinLength}-अङ्के पिन राख्नुहोस्` : `Create ${pinLength}-Digit PIN`)
              : (ne ? 'पुष्टिको लागि पिन पुन: प्रविष्ट गर्नुहोस्' : 'Confirm Your Security PIN')}
          </Text>
          <Text style={[styles.promptSub, { color: theme.colors.textMuted }]}>
            {step === 'create'
              ? (ne ? 'यो पिन एप खोल्दा आवश्यक पर्नेछ' : 'You will enter this PIN every time you open Byapar')
              : (ne ? 'पहिलो पटक राखेको पिनसँग मिल्नु पर्छ' : 'Must match the PIN you just entered')}
          </Text>

          {/* Dots */}
          <View style={styles.dotsContainer}>
            {Array.from({ length: pinLength }).map((_, i) => {
              const isFilled = i < currentPin.length;
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
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          {/* Biometrics Toggle (Only in confirm step) */}
          {step === 'confirm' && (
            <View style={[styles.bioRow, { borderColor: theme.colors.borderGlass, backgroundColor: theme.colors.card }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <MaterialCommunityIcons name="fingerprint" size={24} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bioTitle, { color: theme.colors.textPrimary }]}>
                    {ne ? 'फिंगरप्रिन्ट बायोमेट्रिक' : 'Fingerprint Biometric'}
                  </Text>
                  <Text style={[styles.bioSub, { color: theme.colors.textMuted }]}>
                    {ne ? 'द्रुत पहुँचको लागि फिंगरप्रिन्ट सेन्सर प्रयोग गर्नुहोस्' : 'Unlock quickly using device fingerprint'}
                  </Text>
                </View>
              </View>
              <Switch
                value={useBiometrics}
                onValueChange={async (val) => {
                  if (val) {
                    const { hasHardware, isEnrolled } = await appLockService.checkBiometricsSupport();
                    if (!hasHardware || !isEnrolled) {
                      Alert.alert(
                        ne ? 'फिंगरप्रिन्ट अनुपलब्ध' : 'Biometrics Unavailable',
                        ne
                          ? 'डिभाइसमा फिंगरप्रिन्ट हार्डवेयर छैन वा दर्ता गरिएको छैन।'
                          : 'No enrolled fingerprint found on this device. Please register a fingerprint in phone Settings first.'
                      );
                      setUseBiometrics(false);
                      return;
                    }
                  }
                  setUseBiometrics(val);
                }}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
          )}
        </View>

        {/* Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
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
                >
                  <Text style={[styles.keypadDigit, { color: theme.colors.textPrimary }]}>
                    {digit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={styles.keypadRow}>
            <View style={styles.emptyKeypadSpace} />
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
            >
              <Feather name="delete" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  lengthRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginTop: 10,
  },
  lengthBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  lengthBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    alignItems: 'center',
    marginVertical: 10,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  promptSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
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
    marginBottom: 10,
    height: 20,
    textAlign: 'center',
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  bioTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bioSub: {
    fontSize: 11,
    marginTop: 2,
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
    alignSelf: 'center',
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
});
