import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { updateService, CURRENT_APP_VERSION } from '../services/updateService';
import { buildWhatsAppReminderMessage } from '../services/whatsapp';

interface TemplatePreset {
  id: string;
  name: string;
  badge: string;
  template: string;
}

const PREMADE_TEMPLATES: TemplatePreset[] = [
  {
    id: 'friendly',
    name: 'Friendly Reminder',
    badge: 'Standard',
    template:
      'Namaste {customer_name},\n\nThis is a gentle payment reminder from *{store_name}*.\nYour current pending ledger balance is *Rs. {amount}*.\n\nKindly settle the amount at your earliest convenience via Fonepay / QR or at our store counter.\n\nThank you for your business!',
  },
  {
    id: 'urgent',
    name: 'Urgent Overdue Notice',
    badge: 'Overdue',
    template:
      'IMPORTANT NOTICE: Namaste {customer_name},\n\nYour outstanding credit balance of *Rs. {amount}* with *{store_name}* is overdue as of {date}.\n\nPlease clear the pending amount immediately to ensure uninterrupted credit and delivery services.\n\nContact us directly for queries.',
  },
  {
    id: 'receipt',
    name: 'Payment Acknowledgment',
    badge: 'Thank You',
    template:
      'Namaste {customer_name},\n\nWe have received your payment at *{store_name}*. Thank you!\nYour updated remaining ledger balance is *Rs. {amount}* as of {date}.\n\nWe appreciate your timely settlement.',
  },
  {
    id: 'quick',
    name: 'Quick Compact SMS',
    badge: 'Short',
    template:
      '{store_name}: Dear {customer_name}, pending balance is Rs. {amount} as of {date}. Please settle via digital QR or cash. Thank you.',
  },
];

const TEMPLATE_VARIABLES = [
  { tag: '{customer_name}', desc: 'Customer Name' },
  { tag: '{store_name}', desc: 'Store Name' },
  { tag: '{amount}', desc: 'Due Balance (Rs.)' },
  { tag: '{date}', desc: "Today's Date" },
];

export const SettingsScreen: React.FC = () => {
  const {
    store,
    updateStoreProfile,
    theme,
    themeMode,
    setThemeMode,
    user,
    logout,
    setShowAuthModal,
  } = useApp();

  // Store profile fields
  const [storeName, setStoreName] = useState(store.name || '');
  const [ownerName, setOwnerName] = useState(store.ownerName || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [panNumber, setPanNumber] = useState(store.panNumber || '');
  const [address, setAddress] = useState(store.address || '');
  const [vatEnabled, setVatEnabled] = useState(store.vatEnabled || false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(store.paperWidth || '58mm');
  const [isSavingStore, setIsSavingStore] = useState(false);

  // Message template fields
  const [messageTemplate, setMessageTemplate] = useState(
    store.whatsappTemplate || PREMADE_TEMPLATES[0].template
  );
  const [activePresetId, setActivePresetId] = useState<string>('friendly');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // In-app update state
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    setStoreName(store.name || '');
    setOwnerName(store.ownerName || '');
    setPhone(store.phone || '');
    setPanNumber(store.panNumber || '');
    setAddress(store.address || '');
    setVatEnabled(store.vatEnabled || false);
    setPaperWidth(store.paperWidth || '58mm');
    if (store.whatsappTemplate) {
      setMessageTemplate(store.whatsappTemplate);
    }
  }, [store]);

  const handleSaveStoreProfile = async () => {
    setIsSavingStore(true);
    try {
      await updateStoreProfile({
        name: storeName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        panNumber: panNumber.trim(),
        address: address.trim(),
        vatEnabled,
        paperWidth,
      });
      Alert.alert('Success', 'Store profile and preferences saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save store profile.');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleApplyPreset = (preset: TemplatePreset) => {
    setMessageTemplate(preset.template);
    setActivePresetId(preset.id);
  };

  const handleInsertVariable = (tag: string) => {
    setMessageTemplate((prev) => `${prev} ${tag}`);
  };

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      await updateStoreProfile({
        whatsappTemplate: messageTemplate.trim(),
      });
      Alert.alert('Success', 'WhatsApp reminder template saved.');
    } catch {
      Alert.alert('Error', 'Failed to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      await updateService.checkForUpdates(false);
    } catch {
      Alert.alert('Update Check', 'Unable to reach the update server. Please check internet.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your Byapar account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const previewText = buildWhatsAppReminderMessage(
    'Ram Sharma',
    storeName.trim() || 'Byapar Store',
    4500,
    messageTemplate
  );

  const displayName =
    store.ownerName || user?.user_metadata?.owner_name || store.name || 'Store Owner';
  const displayEmail = user?.email || 'No email registered';
  const displayPhone = store.phone || user?.user_metadata?.phone || 'Not provided';
  const displayStore = store.name || user?.user_metadata?.store_name || 'My Store';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. ACCOUNT PROFILE CARD */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatarBox, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarLetter}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerTitles}>
            <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
              {displayName}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>
              {displayEmail}
            </Text>
          </View>
        </View>

        <View style={styles.profileDetailsList}>
          <View style={styles.profileDetailRow}>
            <View style={styles.detailLabelRow}>
              <Feather name="shopping-bag" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>Store</Text>
            </View>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {displayStore}
            </Text>
          </View>

          <View style={styles.profileDetailRow}>
            <View style={styles.detailLabelRow}>
              <Feather name="phone" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>Phone</Text>
            </View>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {displayPhone}
            </Text>
          </View>
        </View>

        {user ? (
          <AnimatedPressable
            style={[styles.signOutBtn, { borderColor: theme.colors.rose }]}
            onPress={handleLogout}
            activeScale={0.96}
          >
            <Feather name="log-out" size={14} color={theme.colors.rose} />
            <Text style={[styles.signOutBtnText, { color: theme.colors.rose }]}>Sign Out</Text>
          </AnimatedPressable>
        ) : (
          <AnimatedPressable
            style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowAuthModal(true)}
            activeScale={0.96}
          >
            <Feather name="user-check" size={15} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Sign In to Account</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* 2. APPEARANCE - TOGGLE TYPE TAB */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
        ]}
      >
        <View style={styles.cardHeaderSmall}>
          <Feather name="sun" size={18} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Appearance</Text>
        </View>

        {/* Segmented Toggle Bar */}
        <View
          style={[
            styles.toggleTabContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderGlass,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.toggleTabBtn,
              themeMode === 'dark' && [
                styles.toggleTabBtnActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setThemeMode('dark')}
            activeOpacity={0.85}
          >
            <Feather
              name="moon"
              size={15}
              color={themeMode === 'dark' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.toggleTabText,
                { color: themeMode === 'dark' ? '#FFFFFF' : theme.colors.textMuted },
                themeMode === 'dark' && styles.toggleTabTextActive,
              ]}
            >
              AMOLED Dark
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleTabBtn,
              themeMode === 'light' && [
                styles.toggleTabBtnActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setThemeMode('light')}
            activeOpacity={0.85}
          >
            <Feather
              name="sun"
              size={15}
              color={themeMode === 'light' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.toggleTabText,
                { color: themeMode === 'light' ? '#FFFFFF' : theme.colors.textMuted },
                themeMode === 'light' && styles.toggleTabTextActive,
              ]}
            >
              Daylight Light
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. STORE PROFILE & BILLING PREFERENCES */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
        ]}
      >
        <View style={styles.cardHeaderSmall}>
          <Feather name="briefcase" size={18} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            Store Information
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Store / Shop Name
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderGlass,
              },
            ]}
            value={storeName}
            onChangeText={setStoreName}
            placeholder="e.g., Byapar Kirana Store"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Proprietor / Owner Name
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderGlass,
              },
            ]}
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="e.g., Rajesh Shrestha"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Phone</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.borderGlass,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="98XXXXXXXX"
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              PAN / VAT
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.borderGlass,
                },
              ]}
              value={panNumber}
              onChangeText={setPanNumber}
              placeholder="9 Digits"
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Address</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderGlass,
              },
            ]}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g., New Road, Kathmandu"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* 13% VAT TOGGLE WITH SMALL BORDER RADIUS */}
        <View
          style={[
            styles.vatRowCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderGlass,
            },
          ]}
        >
          <View style={styles.vatInfo}>
            <Text style={[styles.vatTitle, { color: theme.colors.textPrimary }]}>
              Enable 13% Nepal VAT
            </Text>
            <Text style={[styles.vatSubtitle, { color: theme.colors.textMuted }]}>
              Computes taxable amount and VAT on sales receipts
            </Text>
          </View>
          <Switch
            value={vatEnabled}
            onValueChange={setVatEnabled}
            trackColor={{ false: theme.colors.card, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Thermal Printer Paper Width */}
        <View style={styles.paperWidthContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Receipt Printer Width
          </Text>
          <View style={styles.paperWidthRow}>
            {(['58mm', '80mm'] as const).map((width) => (
              <TouchableOpacity
                key={width}
                style={[
                  styles.paperWidthOption,
                  paperWidth === width && styles.paperWidthOptionActive,
                  {
                    backgroundColor:
                      paperWidth === width ? 'rgba(99, 102, 241, 0.16)' : theme.colors.surface,
                    borderColor:
                      paperWidth === width ? theme.colors.primary : theme.colors.borderGlass,
                  },
                ]}
                onPress={() => setPaperWidth(width)}
              >
                <Feather
                  name="printer"
                  size={15}
                  color={paperWidth === width ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.paperWidthText,
                    {
                      color:
                        paperWidth === width ? theme.colors.primary : theme.colors.textMuted,
                    },
                  ]}
                >
                  {width} Paper
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <AnimatedPressable
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleSaveStoreProfile}
          disabled={isSavingStore}
          activeScale={0.96}
        >
          <Feather name="check" size={16} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>{isSavingStore ? 'Saving...' : 'Save Store Details'}</Text>
        </AnimatedPressable>
      </View>

      {/* 4. MESSAGE TEMPLATES STUDIO */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
        ]}
      >
        <View style={styles.cardHeaderSmall}>
          <Feather name="message-circle" size={18} color="#25D366" />
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            WhatsApp Templates Studio
          </Text>
        </View>

        {/* Premade Presets Chips */}
        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
          Premade Presets
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScroll}
        >
          {PREMADE_TEMPLATES.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? 'rgba(37, 211, 102, 0.16)' : theme.colors.surface,
                    borderColor: isSelected ? '#25D366' : theme.colors.borderGlass,
                  },
                ]}
                onPress={() => handleApplyPreset(preset)}
              >
                <Text
                  style={[
                    styles.presetBadge,
                    { color: isSelected ? '#25D366' : theme.colors.textMuted },
                  ]}
                >
                  {preset.badge}
                </Text>
                <Text
                  style={[
                    styles.presetName,
                    { color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary },
                  ]}
                >
                  {preset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Variable Inserter */}
        <Text
          style={[
            styles.inputLabel,
            { color: theme.colors.textSecondary, marginTop: 14, marginBottom: 6 },
          ]}
        >
          Insert Variables (Tap to add)
        </Text>
        <View style={styles.variablePillsRow}>
          {TEMPLATE_VARIABLES.map((v) => (
            <TouchableOpacity
              key={v.tag}
              style={[
                styles.variablePill,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
              ]}
              onPress={() => handleInsertVariable(v.tag)}
            >
              <Text style={[styles.variableTag, { color: theme.colors.primary }]}>{v.tag}</Text>
              <Text style={[styles.variableDesc, { color: theme.colors.textMuted }]}>
                {v.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Template Input Area */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginTop: 14 }]}>
            Template Content
          </Text>
          <TextInput
            style={[
              styles.templateTextInput,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderGlass,
              },
            ]}
            value={messageTemplate}
            onChangeText={(txt) => {
              setMessageTemplate(txt);
              setActivePresetId('');
            }}
            multiline
            numberOfLines={5}
            placeholder="Type your WhatsApp message template..."
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Live Preview Card */}
        <View
          style={[
            styles.previewCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
          ]}
        >
          <View style={styles.previewHeader}>
            <Feather name="eye" size={13} color="#25D366" />
            <Text style={[styles.previewTitle, { color: '#25D366' }]}>
              Live WhatsApp Preview
            </Text>
          </View>
          <Text style={[styles.previewText, { color: theme.colors.textPrimary }]}>
            {previewText}
          </Text>
        </View>

        <AnimatedPressable
          style={[styles.saveBtn, { backgroundColor: '#25D366', marginTop: 14 }]}
          onPress={handleSaveTemplate}
          disabled={isSavingTemplate}
          activeScale={0.96}
        >
          <Feather name="save" size={16} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {isSavingTemplate ? 'Saving...' : 'Save WhatsApp Template'}
          </Text>
        </AnimatedPressable>
      </View>

      {/* 5. APP UPDATES - CLEAN SINGLE CHECK FOR UPDATE */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
        ]}
      >
        <View style={styles.updateRow}>
          <View style={styles.updateInfoCol}>
            <Text style={[styles.updateTitle, { color: theme.colors.textPrimary }]}>
              Byapar Retail OS
            </Text>
            <Text style={[styles.updateSub, { color: theme.colors.textMuted }]}>
              Version {CURRENT_APP_VERSION}
            </Text>
          </View>

          <AnimatedPressable
            style={[styles.updateCheckBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            activeScale={0.94}
          >
            <Feather name="refresh-cw" size={14} color="#FFFFFF" />
            <Text style={styles.updateCheckBtnText}>
              {checkingUpdate ? 'Checking...' : 'Check for Updates'}
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerTitles: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  profileDetailsList: {
    gap: 8,
    marginBottom: 12,
    paddingTop: 4,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 4,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Toggle Tab for Appearance */
  toggleTabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
  },
  toggleTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 6,
  },
  toggleTabBtnActive: {},
  toggleTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTabTextActive: {
    fontWeight: '800',
  },

  /* Form & VAT */
  inputGroup: {
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  textInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  vatRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8, // Small border radius as requested
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  },
  vatInfo: {
    flex: 1,
    marginRight: 10,
  },
  vatTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  vatSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  paperWidthContainer: {
    marginTop: 6,
    marginBottom: 14,
  },
  paperWidthRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paperWidthOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  paperWidthOptionActive: {},
  paperWidthText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  /* WhatsApp Studio */
  presetScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  presetBadge: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  presetName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  variablePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  variableTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  variableDesc: {
    fontSize: 10,
  },
  templateTextInput: {
    minHeight: 95,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  previewCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 6,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 12,
    lineHeight: 17,
  },

  /* Clean In-App Update Row */
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateInfoCol: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  updateSub: {
    fontSize: 12,
    marginTop: 2,
  },
  updateCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  updateCheckBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
