import React, { useState, useEffect } from 'react';
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
import { BUSINESS_TYPES } from '@byapar/core';
import { BusinessType } from '../types';

interface AuthScreenProps {
  visible?: boolean;
  onClose?: () => void;
  fullscreen?: boolean;
}

// Map business type icon string to valid Feather glyph name
function getCategoryIcon(iconName: string): keyof typeof Feather.glyphMap {
  switch (iconName) {
    case 'shopping-bag':
      return 'shopping-bag';
    case 'tag':
      return 'tag';
    case 'coffee':
      return 'coffee';
    case 'smartphone':
      return 'smartphone';
    case 'utensils':
      return 'disc';
    case 'home':
      return 'home';
    case 'activity':
      return 'activity';
    case 'tool':
      return 'tool';
    case 'smile':
      return 'smile';
    default:
      return 'grid';
  }
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  visible = true,
  onClose,
  fullscreen = false,
}) => {
  const { user, login, signUp, resendVerificationEmail, logout, themeMode, store } = useApp();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('general');
  const [verificationSentEmail, setVerificationSentEmail] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Form Fields - Fresh and clean, never populated with previous session details
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Clear all cached form inputs whenever user signs out or authentication screen is opened
  useEffect(() => {
    if (!user) {
      setEmail('');
      setPassword('');
      setStoreName('');
      setOwnerName('');
      setPhone('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setSignupStep(1);
    }
  }, [user, visible]);

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

  // Strict Monochrome Palette: Pure Black & White as per mode with #FF4500 brand button
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
        const msg = res.error.message || '';
        if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('verify your email')) {
          setVerificationSentEmail(email.trim());
          setErrorMsg('Your email is not verified yet. Please check your inbox and click the verification link before signing in.');
        } else {
          setErrorMsg(msg || 'Failed to sign in. Please verify credentials.');
        }
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

  const handleProceedToCategory = () => {
    if (!storeName.trim()) {
      setErrorMsg('Please enter your business or store name.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Mobile phone number is compulsory for account registration.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    setErrorMsg(null);
    setSignupStep(2);
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password.');
      setSignupStep(1);
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      setSignupStep(1);
      return;
    }
    if (!storeName.trim()) {
      setErrorMsg('Please enter your store name.');
      setSignupStep(1);
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Mobile phone number is compulsory for account registration.');
      setSignupStep(1);
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile phone number.');
      setSignupStep(1);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await signUp(
        email.trim(),
        password,
        storeName.trim(),
        phone.trim(),
        selectedBusinessType
      );
      if (res.error) {
        setErrorMsg(res.error.message || 'Failed to create account.');
      } else {
        const isConfirmed = !!(res.data?.session || res.data?.user?.email_confirmed_at || (res.data?.user as any)?.confirmed_at);
        if (!isConfirmed) {
          setVerificationSentEmail(email.trim());
          setErrorMsg(null);
          setSuccessMsg('Account created! Please check your email to verify your account before signing in.');
        } else {
          setSuccessMsg('Store registered successfully! Preloaded category suggestions.');
          if (onClose) {
            setTimeout(() => {
              onClose();
            }, 600);
          }
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
            {store.name || 'Registered Store'} • {store.businessType ? store.businessType.toUpperCase() : 'GENERAL'}
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
                setSignupStep(1);
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
                setSignupStep(1);
                setEmail('');
                setPassword('');
                setStoreName('');
                setOwnerName('');
                setPhone('');
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

          {/* Verification Required Banner */}
          {verificationSentEmail && (
            <View
              style={[
                styles.verificationBox,
                {
                  backgroundColor: isDark ? '#1C1917' : '#FFFBEB',
                  borderColor: isDark ? '#78350F' : '#FDE68A',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Feather name="mail" size={20} color="#D97706" style={{ marginTop: 2, marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verificationTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                    Email Verification Required
                  </Text>
                  <Text style={[styles.verificationBody, { color: isDark ? '#D6D3D1' : '#78350F' }]}>
                    We sent a verification link to <Text style={{ fontWeight: 'bold' }}>{verificationSentEmail}</Text>.
                    Please click the link in your email to activate your account before accessing Byapar.
                  </Text>
                </View>
              </View>

              <View style={styles.verificationBtnRow}>
                <TouchableOpacity
                  style={[styles.resendActionBtn, resendingVerification && { opacity: 0.6 }]}
                  disabled={resendingVerification}
                  onPress={async () => {
                    setResendingVerification(true);
                    try {
                      const res = await resendVerificationEmail(verificationSentEmail);
                      if (res.error) throw res.error;
                      Alert.alert('Verification Sent', `A new verification email has been sent to ${verificationSentEmail}.`);
                    } catch (e: any) {
                      Alert.alert('Error', e.message || 'Could not resend email.');
                    } finally {
                      setResendingVerification(false);
                    }
                  }}
                >
                  <Text style={styles.resendActionBtnText}>
                    {resendingVerification ? 'Resending...' : 'Resend Verification Email'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchLoginActionBtn}
                  onPress={() => {
                    setTab('signin');
                    setVerificationSentEmail(null);
                    setErrorMsg(null);
                  }}
                >
                  <Text style={[styles.switchLoginActionBtnText, { color: colors.textPrimary }]}>
                    Go to Sign In →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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

          {/* SIGN IN VIEW */}
          {tab === 'signin' && (
            <>
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

                {/* FORGOT PASSWORD LINK BELOW PASSWORD FIELD */}
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
              </View>

              <AnimatedPressable
                style={[styles.submitBtn, { backgroundColor: colors.buttonBg }]}
                onPress={handleSignIn}
                disabled={loading}
                activeScale={0.96}
              >
                {loading ? (
                  <ActivityIndicator color={colors.buttonText} size="small" />
                ) : (
                  <>
                    <Feather name="log-in" size={17} color={colors.buttonText} />
                    <Text style={[styles.submitBtnText, { color: colors.buttonText }]}>
                      Sign In
                    </Text>
                  </>
                )}
              </AnimatedPressable>
            </>
          )}

          {/* SIGN UP STEP 1: CREDENTIALS & STORE DETAILS */}
          {tab === 'signup' && signupStep === 1 && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Business / Store Name *
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
                  Mobile Phone *
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

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Email Address *
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
                  Password * (Min 6 characters)
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
              </View>

              <AnimatedPressable
                style={[styles.submitBtn, { backgroundColor: colors.buttonBg }]}
                onPress={handleProceedToCategory}
                activeScale={0.96}
              >
                <Text style={[styles.submitBtnText, { color: colors.buttonText }]}>
                  Continue: Business Category
                </Text>
                <Feather name="arrow-right" size={17} color={colors.buttonText} />
              </AnimatedPressable>
            </>
          )}

          {/* SIGN UP STEP 2: BUSINESS CATEGORY SELECTION */}
          {tab === 'signup' && signupStep === 2 && (
            <View style={styles.categoryStepContainer}>
              <View style={styles.stepHeaderRow}>
                <TouchableOpacity
                  onPress={() => {
                    setErrorMsg(null);
                    setSignupStep(1);
                  }}
                  style={styles.stepBackBtn}
                >
                  <Feather name="arrow-left" size={18} color={colors.textPrimary} />
                  <Text style={[styles.stepBackText, { color: colors.textPrimary }]}>Back</Text>
                </TouchableOpacity>
                <View style={[styles.stepBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.stepBadgeText, { color: colors.textSecondary }]}>Step 2 of 2</Text>
                </View>
              </View>

              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                Choose Your Business Type
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
                We'll preload tailored product categories and inventory suggestions for your store.
              </Text>

              {/* Grid of Business Types */}
              <View style={styles.categoryGrid}>
                {BUSINESS_TYPES.map((bt) => {
                  const isSelected = selectedBusinessType === bt.id;
                  return (
                    <TouchableOpacity
                      key={bt.id}
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isSelected ? '#FF4500' : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => setSelectedBusinessType(bt.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.categoryCardHeader}>
                        <View
                          style={[
                            styles.categoryIconBox,
                            {
                              backgroundColor: isSelected ? '#FF4500' : isDark ? '#1F1F1F' : '#E2E8F0',
                            },
                          ]}
                        >
                          <Feather
                            name={getCategoryIcon(bt.icon)}
                            size={16}
                            color={isSelected ? '#FFFFFF' : colors.textPrimary}
                          />
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            {
                              borderColor: isSelected ? '#FF4500' : colors.border,
                              backgroundColor: isSelected ? '#FF4500' : 'transparent',
                            },
                          ]}
                        >
                          {isSelected && <Feather name="check" size={11} color="#FFFFFF" />}
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.categoryLabel,
                          {
                            color: isSelected ? colors.textPrimary : colors.textPrimary,
                            fontWeight: isSelected ? '800' : '700',
                          },
                        ]}
                      >
                        {bt.label}
                      </Text>
                      <Text
                        style={[styles.categorySub, { color: colors.textMuted }]}
                        numberOfLines={2}
                      >
                        {bt.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Complete Registration Button */}
              <AnimatedPressable
                style={[styles.submitBtn, { backgroundColor: colors.buttonBg, marginTop: 18 }]}
                onPress={handleSignUp}
                disabled={loading}
                activeScale={0.96}
              >
                {loading ? (
                  <ActivityIndicator color={colors.buttonText} size="small" />
                ) : (
                  <>
                    <Feather name="check-circle" size={17} color={colors.buttonText} />
                    <Text style={[styles.submitBtnText, { color: colors.buttonText }]}>
                      Complete & Launch Store
                    </Text>
                  </>
                )}
              </AnimatedPressable>
            </View>
          )}
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
                    We will send a reset link to your email
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

            {/* Notification alert within shift-up sheet */}
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
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.sheetSubmitBtn, { backgroundColor: colors.buttonBg }]}
              onPress={handleResetPassword}
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <ActivityIndicator color={colors.buttonText} size="small" />
              ) : (
                <>
                  <Feather name="send" size={16} color={colors.buttonText} />
                  <Text style={[styles.sheetSubmitBtnText, { color: colors.buttonText }]}>
                    Send Recovery Email
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
      animationType="fade"
      transparent
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
    marginBottom: 20,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  logoImg: {
    width: 50,
    height: 50,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  loggedInBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  storeSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  signOutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  bodySection: {
    width: '100%',
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
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
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotPassBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 2,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },

  /* Step 2 Category Selection */
  categoryStepContainer: {
    width: '100%',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  stepBackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 17,
  },
  categoryGrid: {
    gap: 10,
  },
  categoryCard: {
    padding: 12,
    borderRadius: 12,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  categorySub: {
    fontSize: 11,
    lineHeight: 15,
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
  verificationBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  verificationBody: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  verificationBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(217, 119, 6, 0.2)',
    paddingTop: 10,
    marginTop: 10,
  },
  resendActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#D97706',
  },
  resendActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  switchLoginActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  switchLoginActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
