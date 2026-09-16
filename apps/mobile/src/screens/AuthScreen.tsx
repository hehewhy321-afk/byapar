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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { supabase } from '../config/supabase';

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
  const { user, login, signUp, logout, theme, themeMode, store } = useApp();
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState(store.name || '');
  const [ownerName, setOwnerName] = useState(store.ownerName || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDark = themeMode === 'dark';

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
        setErrorMsg(res.error.message || 'Failed to sign in.');
      } else {
        setSuccessMsg('Signed in successfully!');
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

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all required fields.');
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
        setSuccessMsg('Account created successfully! Welcome to Byapar.');
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Password reset instructions sent to your email inbox.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Byapar Cloud?', [
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

  const content = (
    <View
      style={[
        fullscreen ? styles.fullscreenContainer : styles.modalCard,
        {
          backgroundColor: isDark ? '#0F0F0F' : '#FFFFFF',
          borderColor: isDark ? '#242424' : '#E2E8F0',
        },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? '#1F1F1F' : '#F1F5F9' },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <View style={styles.iconBadge}>
            <Feather name="shield" size={18} color="#FF4500" />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {fullscreen ? 'Byapar Retail Cloud' : 'Cloud Account & Sync'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Secure Supabase Authentication
            </Text>
          </View>
        </View>
        {!fullscreen && onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Already logged in state */}
      {user ? (
        <View style={styles.loggedInBox}>
          <View style={[styles.userAvatar, { backgroundColor: isDark ? '#1F1F1F' : '#F1F5F9' }]}>
            <Text style={styles.userAvatarText}>
              {(user.email?.[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.userEmail, { color: theme.colors.textPrimary }]}>{user.email}</Text>
          <View style={styles.syncStatusBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.syncStatusText}>Connected to Cloud Supabase</Text>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Feather name="log-out" size={16} color="#FF4D4F" />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          {/* Tab Selector */}
          <View
            style={[
              styles.tabSelector,
              {
                backgroundColor: isDark ? '#171717' : '#F1F5F9',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === 'signin' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#262626' : '#FFFFFF' },
                ],
              ]}
              onPress={() => {
                setTab('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tab === 'signin' && { color: theme.colors.textPrimary, fontWeight: '800' },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === 'signup' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#262626' : '#FFFFFF' },
                ],
              ]}
              onPress={() => {
                setTab('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tab === 'signup' && { color: theme.colors.textPrimary, fontWeight: '800' },
                ]}
              >
                Register
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === 'forgot' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#262626' : '#FFFFFF' },
                ],
              ]}
              onPress={() => {
                setTab('forgot');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tab === 'forgot' && { color: theme.colors.textPrimary, fontWeight: '800' },
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status Messages */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#FF4D4F" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {successMsg && (
            <View style={styles.successBox}>
              <Feather name="check-circle" size={16} color="#10B981" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {/* FORGOT PASSWORD FORM */}
          {tab === 'forgot' && (
            <View style={styles.forgotSection}>
              <Text style={[styles.forgotDesc, { color: theme.colors.textSecondary }]}>
                Enter your registered store email. We'll send you instructions to reset your password.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email Address *</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? '#141414' : '#F8FAFC',
                      borderColor: isDark ? '#282828' : '#CBD5E1',
                    },
                  ]}
                >
                  <Feather name="mail" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                    placeholder="store@example.com"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Feather name="send" size={17} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Send Reset Link</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToSignInBtn}
                onPress={() => {
                  setTab('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
              >
                <Feather name="arrow-left" size={14} color={theme.colors.primary} />
                <Text style={[styles.backToSignInText, { color: theme.colors.primary }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SIGN UP EXTRA FIELDS */}
          {tab === 'signup' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                  Business / Store Name *
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? '#141414' : '#F8FAFC',
                      borderColor: isDark ? '#282828' : '#CBD5E1',
                    },
                  ]}
                >
                  <Feather name="shopping-bag" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                    placeholder="e.g. Shrestha General Store"
                    placeholderTextColor={theme.colors.textMuted}
                    value={storeName}
                    onChangeText={setStoreName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                  Owner / Manager Name
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? '#141414' : '#F8FAFC',
                      borderColor: isDark ? '#282828' : '#CBD5E1',
                    },
                  ]}
                >
                  <Feather name="user" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                    placeholder="Full Name"
                    placeholderTextColor={theme.colors.textMuted}
                    value={ownerName}
                    onChangeText={setOwnerName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Phone Number</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? '#141414' : '#F8FAFC',
                      borderColor: isDark ? '#282828' : '#CBD5E1',
                    },
                  ]}
                >
                  <Feather name="phone" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                    placeholder="98XXXXXXXX"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>
            </>
          )}

          {/* SIGN IN & SIGN UP COMMON FIELDS */}
          {tab !== 'forgot' && (
            <>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email Address *</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? '#141414' : '#F8FAFC',
                      borderColor: isDark ? '#282828' : '#CBD5E1',
                    },
                  ]}
                >
                  <Feather name="mail" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                    placeholder="store@example.com"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Password *</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? '#141414' : '#F8FAFC',
                      borderColor: isDark ? '#282828' : '#CBD5E1',
                    },
                  ]}
                >
                  <Feather name="lock" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                    placeholder="Min 6 characters"
                    placeholderTextColor={theme.colors.textMuted}
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
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot password link */}
              {tab === 'signin' && (
                <TouchableOpacity
                  style={styles.forgotPassLink}
                  onPress={() => {
                    setTab('forgot');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  <Text style={[styles.forgotPassText, { color: theme.colors.primary }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.btnDisabled]}
                onPress={tab === 'signin' ? handleSignIn : handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Feather
                      name={tab === 'signin' ? 'log-in' : 'user-plus'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitBtnText}>
                      {tab === 'signin' ? 'Sign In to Account' : 'Register Store'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );

  if (fullscreen) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.fullscreenWrapper, { backgroundColor: theme.colors.bg }]}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        {content}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  fullscreenContainer: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 12,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 69, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.3)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#FF4D4F',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  forgotPassLink: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    marginTop: -4,
  },
  forgotPassText: {
    fontSize: 12,
    fontWeight: '700',
  },
  forgotSection: {
    paddingVertical: 6,
  },
  forgotDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  backToSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
  },
  backToSignInText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4500',
    borderRadius: 12,
    height: 48,
    gap: 8,
    marginTop: 8,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  loggedInBox: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF4500',
  },
  userAvatarText: {
    color: '#FF4500',
    fontSize: 24,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '700',
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  syncStatusText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.3)',
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
  },
  signOutBtnText: {
    color: '#FF4D4F',
    fontWeight: '600',
    fontSize: 13,
  },
});
