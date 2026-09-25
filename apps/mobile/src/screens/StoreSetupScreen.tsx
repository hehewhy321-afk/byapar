import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { useApp } from '../context/AppContext';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { FadeInView } from '../components/common/FadeInView';

interface Props {
  onComplete: () => void;
}

export const StoreSetupScreen: React.FC<Props> = ({ onComplete }) => {
  const { store, completeOnboarding, language, setLanguage, themeMode, setThemeMode } = useApp();

  const [name, setName] = useState(store.name);
  const [ownerName, setOwnerName] = useState(store.ownerName);
  const [phone, setPhone] = useState(store.phone);
  const [panNumber, setPanNumber] = useState(store.panNumber);
  const [address, setAddress] = useState(store.address);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your business or store name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your contact phone number.');
      return;
    }

    await completeOnboarding({
      ...store,
      name: name.trim(),
      ownerName: ownerName.trim() || 'Store Owner',
      phone: phone.trim(),
      panNumber: panNumber.trim() || 'Pending',
      address: address.trim() || 'Kathmandu, Nepal',
    });

    onComplete();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FadeInView duration={260} translateY={16} style={styles.headerBox}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>QUICK SETUP</Text>
          </View>
          <Text style={styles.title}>Register Store</Text>
          <Text style={styles.subtitle}>
            Used on receipts, invoices, and WhatsApp messages
          </Text>
        </FadeInView>

        <FadeInView delay={80} style={styles.formCard}>
          <Text style={styles.label}>Business / Store Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Shrestha Mart & General Store"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Proprietor / Owner</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bikash Shrestha"
            placeholderTextColor={theme.colors.textMuted}
            value={ownerName}
            onChangeText={setOwnerName}
          />

          <View style={styles.row}>
            <View style={styles.flexOne}>
              <Text style={styles.label}>Phone (WhatsApp) *</Text>
              <TextInput
                style={styles.input}
                placeholder="98XXXXXXXX"
                keyboardType="phone-pad"
                placeholderTextColor={theme.colors.textMuted}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={[styles.flexOne, { marginLeft: 10 }]}>
              <Text style={styles.label}>PAN / VAT Number</Text>
              <TextInput
                style={styles.input}
                placeholder="9-digit PAN"
                placeholderTextColor={theme.colors.textMuted}
                value={panNumber}
                onChangeText={setPanNumber}
              />
            </View>
          </View>

          <Text style={styles.label}>Store Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. New Road, Kathmandu"
            placeholderTextColor={theme.colors.textMuted}
            value={address}
            onChangeText={setAddress}
          />

          <View style={styles.prefSection}>
            <Text style={styles.label}>Language / भाषा</Text>
            <View style={styles.optionRow}>
              <AnimatedPressable
                style={[styles.prefOption, language === 'en' && styles.prefOptionActive]}
                onPress={() => setLanguage('en')}
                activeScale={0.96}
              >
                <Feather name="globe" size={14} color={language === 'en' ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.prefOptionText, language === 'en' && styles.prefOptionTextActive]}>English</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.prefOption, language === 'ne' && styles.prefOptionActive]}
                onPress={() => setLanguage('ne')}
                activeScale={0.96}
              >
                <Feather name="globe" size={14} color={language === 'ne' ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.prefOptionText, language === 'ne' && styles.prefOptionTextActive]}>नेपाली</Text>
              </AnimatedPressable>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>App Theme / थिम</Text>
            <View style={styles.optionRow}>
              <AnimatedPressable
                style={[styles.prefOption, themeMode === 'light' && styles.prefOptionActive]}
                onPress={() => setThemeMode('light')}
                activeScale={0.96}
              >
                <Feather name="sun" size={14} color={themeMode === 'light' ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.prefOptionText, themeMode === 'light' && styles.prefOptionTextActive]}>Light Mode</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.prefOption, themeMode === 'dark' && styles.prefOptionActive]}
                onPress={() => setThemeMode('dark')}
                activeScale={0.96}
              >
                <Feather name="moon" size={14} color={themeMode === 'dark' ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.prefOptionText, themeMode === 'dark' && styles.prefOptionTextActive]}>Dark Mode</Text>
              </AnimatedPressable>
            </View>
          </View>

          <AnimatedPressable style={styles.submitBtn} onPress={handleSave} activeScale={0.96}>
            <Text style={styles.submitText}>Launch Retail OS</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </AnimatedPressable>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: 40,
  },
  headerBox: {
    marginBottom: theme.spacing.lg,
  },
  stepBadge: {
    backgroundColor: theme.colors.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  stepBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.emerald,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    padding: theme.spacing.xl,
  },
  label: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
  },
  row: {
    flexDirection: 'row',
  },
  flexOne: {
    flex: 1,
  },
  prefSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  prefOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGlass,
  },
  prefOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(255, 69, 0, 0.08)',
  },
  prefOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  prefOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xl,
    gap: 8,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
