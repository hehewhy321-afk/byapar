import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { supabase } from '../config/supabase';
import { AnimatedPressable } from '../components/common/AnimatedPressable';

interface AuthScreenProps {
  visible?: boolean;
  onClose?: () => void;
  fullscreen?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  visible = true,
  onClose,
  fullscreen = false,
}) => {
  const { user, login, signUp, logout, themeMode, store } = useApp();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState(store.name || '');
  const [ownerName, setOwnerName] = useState(store.ownerName || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password shift-up popup state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDark = themeMode === 'dark';

  // Strict Monochrome Palette per User Requirement: Pure Black & White as per mode
  const colors = {
    bg: isDark ? '#000000' : '#FFFFFF',
    surface: isDark ? '#0A0A0A' : '#F8F9FA',
    card: isDark ? '#121212' : '#FFFFFF',
    border: isDark ? '#242424' : '#E2E8F0',
    borderActive: isDark ? '#FFFFFF' : '#000000',
    textPrimary: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#A3A3A3' : '#475569',
    textMuted: isDark ? '#737373' : '#94A3B8',
    buttonBg: '#FF4500',
    buttonText: '#FFFFFF',
    inputBg: isDark ? '#0A0A0A' : '#F8F9FA',
    tabActiveBg: isDark ? '#FFFFFF' : '#000000',
    tabActiveText: isDark ? '#000000' : '#FFFFFF',
    tabInactiveBg: 'transparent',
    tabInactiveText: isDark ? '#737373' : '#64748B',
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await login(email.trim(), password);
      if (res.error) {
        setErrorMsg(res.error.message || 'Failed to sign in. Please verify credentials.');
      } else {
        setSuccessMsg('Signed in successfully!');
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 500);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await signUp(email.trim(), password, storeName.trim(), phone.trim());
      if (res.error) {
        setErrorMsg(res.error.message || 'Failed to create account.');
      } else {
        setSuccessMsg('Store registered successfully! Welcome to Byapar.');
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 600);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotMsg({ type: 'error', text: 'Please enter your registered email address.' });
      return;
    }

    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
      if (error) {
        setForgotMsg({ type: 'error', text: error.message });
      } else {
        setForgotMsg({
          type: 'success',
          text: 'Recovery link sent! Check your inbox to reset your password.',
        });
      }
    } catch (err: any) {
      setForgotMsg({
        type: 'error',
        text: err.message || 'Failed to send password reset email.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          if (onClose) onClose();
        },
      },
    ]);
  };

  const mainFormContent = (
    <View style={styles.formWrapper}>
      {/* Top Header / Close Button if modal */}
      {!fullscreen && onClose && (
        <View style={styles.topCloseRow}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Brand Hero with Logo */}
      <View style={styles.heroSection}>
        <View style={[styles.logoBadge, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Byapar</Text>
        <Text style={[styles.brandTagline, { color: colors.textMuted }]}>
          Retail Management & Accounting 
        </Text>
      </View>

      {/* Already logged in view */}
      {user ? (
        <View style={[styles.loggedInBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.userAvatar, { backgroundColor: isDark ? '#1F1F1F' : '#E2E8F0' }]}>
            <Text style={[styles.userAvatarText, { color: colors.textPrimary }]}>
              {(user.email?.[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.userEmail, { color: colors.textPrimary }]}>{user.email}</Text>
          <Text style={[styles.storeSubtitle, { color: colors.textMuted }]}>
            {store.name || 'Registered Store'}
          </Text>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Feather name="log-out" size={16} color="#EF4444" />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bodySection}>
          {/* Segmented Monochrome Tabs: Sign In / Register Store */}
          <View
            style={[
              styles.tabSelector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === 'signin' && {
                  backgroundColor: colors.tabActiveBg,
                },
              ]}
              onPress={() => {
                setTab('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: tab === 'signin' ? colors.tabActiveText : colors.tabInactiveText,
                  },
                  tab === 'signin' && styles.tabBtnTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === 'signup' && {
                  backgroundColor: colors.tabActiveBg,
                },
              ]}
              onPress={() => {
                setTab('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: tab === 'signup' ? colors.tabActiveText : colors.tabInactiveText,
                  },
                  tab === 'signup' && styles.tabBtnTextActive,
                ]}
              >
                Register Store
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status Alerts */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {successMsg && (
            <View style={styles.successBox}>
              <Feather name="check-circle" size={16} color="#10B981" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {/* SIGN UP EXTRA FIELDS */}
          {tab === 'signup' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Business / Store Name
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather
                    name="shopping-bag"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="e.g. Kathmandu Mart"
                    placeholderTextColor={colors.textMuted}
                    value={storeName}
                    onChangeText={setStoreName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Proprietor / Owner Name
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather
                    name="user"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Owner Full Name"
                    placeholderTextColor={colors.textMuted}
                    value={ownerName}
                    onChangeText={setOwnerName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Contact Phone
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather
                    name="phone"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="98XXXXXXXX"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>
            </>
          )}

          {/* COMMON: EMAIL & PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Email Address
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather
                name="mail"
                size={16}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="store@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Password
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather
                name="lock"
                size={16}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {tab === 'signin' && (
              <TouchableOpacity
                style={styles.forgotPassBtn}
                onPress={() => {
                  setForgotEmail(email);
                  setForgotMsg(null);
                  setForgotModalVisible(true);
                }}
              >
                <Text style={[styles.forgotLink, { color: colors.textSecondary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* MONOCHROME SUBMIT BUTTON */}
          <AnimatedPressable
            style={[styles.submitBtn, { backgroundColor: colors.buttonBg }]}
            onPress={tab === 'signin' ? handleSignIn : handleSignUp}
            disabled={loading}
            activeScale={0.96}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText} size="small" />
            ) : (
              <>
                <Feather
                  name={tab === 'signin' ? 'log-in' : 'arrow-right'}
                  size={17}
                  color={colors.buttonText}
                />
                <Text style={[styles.submitBtnText, { color: colors.buttonText }]}>
                  {tab === 'signin' ? 'Sign In' : 'Create Store Account'}
                </Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      )}

      {/* SHIFT-UP POPUP MODAL FOR FORGOT PASSWORD */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetOverlay}
        >
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setForgotModalVisible(false)}
          />

          <View
            style={[
              styles.sheetContent,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandleRow}>
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: isDark ? '#333333' : '#CBD5E1' },
                ]}
              />
            </View>

            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleGroup}>
                <View
                  style={[
                    styles.sheetIconBox,
                    { backgroundColor: isDark ? '#1F1F1F' : '#F1F5F9' },
                  ]}
                >
                  <Feather name="key" size={18} color={colors.textPrimary} />
                </View>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                    Reset Password
                  </Text>
                  <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
                    We will send a recovery link to your email
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {forgotMsg && (
              <View
                style={[
                  styles.statusCard,
                  forgotMsg.type === 'error' ? styles.statusError : styles.statusSuccess,
                ]}
              >
                <Feather
                  name={forgotMsg.type === 'error' ? 'alert-circle' : 'check-circle'}
                  size={15}
                  color={forgotMsg.type === 'error' ? '#EF4444' : '#10B981'}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: forgotMsg.type === 'error' ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {forgotMsg.text}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Registered Email Address
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather
                  name="mail"
                  size={16}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="store@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                />
              </View>
            </View>

            <AnimatedPressable
              style={[styles.sheetSubmitBtn, { backgroundColor: colors.buttonBg }]}
              onPress={handleResetPassword}
              disabled={forgotLoading}
              activeScale={0.96}
            >
              {forgotLoading ? (
                <ActivityIndicator color={colors.buttonText} size="small" />
              ) : (
                <>
                  <Feather name="send" size={15} color={colors.buttonText} />
                  <Text style={[styles.sheetSubmitBtnText, { color: colors.buttonText }]}>
                    Send Recovery Link
                  </Text>
                </>
              )}
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );

  if (fullscreen) {
    return (
      <SafeAreaView style={[styles.fullscreenSafe, { backgroundColor: colors.bg }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.fullscreenWrapper}
        >
          <ScrollView
            contentContainerStyle={styles.fullscreenScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {mainFormContent}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {mainFormContent}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenSafe: {
    flex: 1,
  },
  fullscreenWrapper: {
    flex: 1,
  },
  fullscreenScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  topCloseRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  closeBtn: {
    padding: 6,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  logoImg: {
    width: 52,
    height: 52,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  brandTagline: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  bodySection: {
    width: '100%',
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  successText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  forgotPassBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 10,
    marginTop: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loggedInBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  userAvatarText: {
    fontSize: 26,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '700',
  },
  storeSubtitle: {
    fontSize: 13,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginTop: 14,
  },
  signOutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Shift-Up Bottom Sheet Styles */
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandleRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  sheetSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    marginTop: 8,
  },
  sheetSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
