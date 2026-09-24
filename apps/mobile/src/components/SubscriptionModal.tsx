import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import {
  MobileSubscriptionPlan,
  fetchMobileSubscriptionPlans,
  getMobileSubscription,
  MobileSubscriptionState,
  validateMobilePromoCode,
  downgradeMobileSubscription,
  initiateMobileEsewaPayment,
  verifyMobileEsewaPayment,
  cancelMobileEsewaPayment,
  fetchMobileSubscriptionHistory,
  activateFreeMobileSubscription,
  MobileEsewaPaymentSession,
  MobileSubscriptionTransactionRecord,
  DEFAULT_MOBILE_PLANS,
} from '../services/subscriptionService';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ visible, onClose }) => {
  const { theme, activeBizId, store } = useApp();
  const [plans, setPlans] = useState<MobileSubscriptionPlan[]>(DEFAULT_MOBILE_PLANS);
  const [currentSub, setCurrentSub] = useState<MobileSubscriptionState | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro_99');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  // Modal Views: 'plans' or 'history'
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [historyList, setHistoryList] = useState<MobileSubscriptionTransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // In-app eSewa payment session
  const [paymentSession, setPaymentSession] = useState<MobileEsewaPaymentSession | null>(null);
  const paymentSessionRef = useRef<MobileEsewaPaymentSession | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    paymentSessionRef.current = paymentSession;
  }, [paymentSession]);

  useEffect(() => {
    if (visible) {
      loadData();
      setPromoCode('');
      setPromoResult(null);
      setActiveTab('plans');
    }
  }, [visible, activeBizId]);

  useEffect(() => {
    if (activeTab === 'history' && activeBizId) {
      loadHistory();
    }
  }, [activeTab, activeBizId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPlans, sub] = await Promise.all([
        fetchMobileSubscriptionPlans(),
        getMobileSubscription(activeBizId),
      ]);
      setPlans(allPlans);
      setCurrentSub(sub);

      if (sub.planTier && sub.planTier !== 'free') {
        const found = allPlans.find((p) => p.id === sub.planTier);
        if (found) setSelectedPlanId(found.id);
      } else {
        setSelectedPlanId('pro_99');
      }
    } catch (err) {
      console.warn('Subscription load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const items = await fetchMobileSubscriptionHistory(activeBizId);
      setHistoryList(items);
    } catch (err) {
      console.warn('Failed to load subscription history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const basePrice = billingCycle === 'annual' ? selectedPlan.annual_price : selectedPlan.monthly_price;
  const finalPrice = promoResult?.valid ? promoResult.finalPrice : basePrice;

  const planRank = (id?: string) => {
    if (!id || id === 'free') return 0;
    if (id.includes('starter')) return 1;
    if (id.includes('pro')) return 2;
    if (id.includes('enterprise')) return 3;
    return 0;
  };

  const currentRank = planRank(currentSub?.planTier);
  const selectedRank = planRank(selectedPlan.id);
  const isDowngrade = selectedRank < currentRank;
  const isCurrentActive = selectedRank === currentRank && currentSub?.planTier !== 'free';

  // 7-DAY SUBSCRIPTION LIFECYCLE RULES
  const daysRemaining = currentSub?.daysRemaining ?? 0;
  const isPaidActive = Boolean(
    currentSub?.planTier && currentSub?.planTier !== 'free' && currentSub?.status === 'active'
  );
  // Renewal/plan switch window is open only when 7 or fewer days left
  const isRenewalWindowOpen = !isPaidActive || daysRemaining <= 7;
  const daysUntilRenewalWindow = Math.max(0, daysRemaining - 7);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    const res = await validateMobilePromoCode(promoCode.trim(), selectedPlan.id, basePrice);
    setPromoResult(res);
    setValidatingPromo(false);
  };

  const startPaymentFlow = async () => {
    if (finalPrice <= 0) {
      setUpgrading(true);
      const res = await activateFreeMobileSubscription({ businessId: activeBizId });
      setUpgrading(false);

      if (res.success) {
        Alert.alert(
          '🎉 Free Plan Activated',
          `Your store is set to ${selectedPlan.name}.`,
          [{ text: 'OK', onPress: () => { loadData(); onClose(); } }]
        );
      } else {
        Alert.alert('Activation Failed', res.error || 'Please check network and try again.');
      }
      return;
    }

    // Launch In-App eSewa Payment
    setUpgrading(true);
    try {
      const session = await initiateMobileEsewaPayment({
        businessId: activeBizId,
        businessName: store?.name || 'Byapar Merchant Store',
        planId: selectedPlan.id,
        billingCycle,
        amount: finalPrice,
        promoCode: promoResult?.valid ? promoResult.code : undefined,
        discountAmount: promoResult?.discountAmount || 0,
      });
      paymentSessionRef.current = session;
      setPaymentSession(session);
    } catch (err: any) {
      Alert.alert('Gateway Error', err.message || 'Could not initiate eSewa payment session.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedPlan) return;

    // 1. Downgrade Check: If active paid subscription has MORE than 7 days left, block early downgrade
    if (isDowngrade) {
      if (isPaidActive && !isRenewalWindowOpen) {
        Alert.alert(
          `🔒 Downgrade Locked (${daysRemaining} Days Left)`,
          `Your store is currently active on ${currentSub?.planName} with ${daysRemaining} days remaining in this billing cycle.\n\nTo protect your paid period, downgrades to ${selectedPlan.name} will unlock when 7 or fewer days remain (in ${daysUntilRenewalWindow} days).`,
          [{ text: 'Got It', style: 'default' }]
        );
        return;
      }

      Alert.alert(
        'Confirm Plan Downgrade',
        `Are you sure you want to switch to ${selectedPlan.name}?\n\n• Daily bill upload cap: ${
          selectedPlan.daily_bill_upload_limit === -1 ? 'Unlimited' : selectedPlan.daily_bill_upload_limit
        }\n• Staff account cap: ${
          selectedPlan.max_staff_accounts === -1 ? 'Unlimited' : selectedPlan.max_staff_accounts
        }\n• Max branches: ${selectedPlan.max_stores_allowed}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Downgrade',
            style: 'destructive',
            onPress: async () => {
              setUpgrading(true);
              const res = await downgradeMobileSubscription({
                businessId: activeBizId,
                targetPlanId: selectedPlan.id,
              });
              setUpgrading(false);
              if (res.success) {
                Alert.alert('Downgraded', `Successfully adjusted limits to ${selectedPlan.name}.`, [
                  {
                    text: 'OK',
                    onPress: () => {
                      loadData();
                      onClose();
                    },
                  },
                ]);
              } else {
                Alert.alert('Downgrade Failed', res.error || 'Please try again.');
              }
            },
          },
        ]
      );
      return;
    }

    // 2. Renewal Check: If renewing same plan with MORE than 7 days left, explain renewal window
    if (isCurrentActive) {
      if (isPaidActive && !isRenewalWindowOpen) {
        Alert.alert(
          `Plan Already Active (${daysRemaining} Days Left)`,
          `Your ${currentSub?.planName} is fully active with ${daysRemaining} days remaining.\n\nEarly renewal opens 7 days before expiry (in ${daysUntilRenewalWindow} days). You don't need to pay again right now!`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // 3. Upgrade Check: If upgrading to a higher plan while > 7 days left on current plan
    if (!isDowngrade && !isCurrentActive && isPaidActive && !isRenewalWindowOpen) {
      Alert.alert(
        '⚡ Instant Plan Upgrade',
        `You currently have ${daysRemaining} days remaining on ${currentSub?.planName}.\n\nUpgrading to ${selectedPlan.name} now will immediately activate your new higher limits for a fresh cycle. Would you like to proceed to eSewa payment?`,
        [
          { text: 'Wait for Renewal Window', style: 'cancel' },
          {
            text: 'Proceed to eSewa',
            onPress: () => startPaymentFlow(),
          },
        ]
      );
      return;
    }

    await startPaymentFlow();
  };

  const isHandlingReturnRef = useRef(false);

  /**
   * Intercepts eSewa navigation inside the in-app WebView
   */
  const handleWebViewNavigation = async (url: string) => {
    if (!url || isHandlingReturnRef.current) return;

    // Check for success return
    if (
      url.includes('byapar.app/esewa-success') ||
      url.includes('payment=esewa_success') ||
      url.includes('status=COMPLETE')
    ) {
      isHandlingReturnRef.current = true;
      setVerifyingPayment(true);

      // Extract transaction uuid from embedded ?txn=... in URL or session ref
      let extractedUuid = (paymentSessionRef.current?.transactionUuid || '').split('?')[0].split('&')[0].trim();
      const txnMatch = url.match(/[?&]txn=([^?&#]+)/) || url.match(/[?&]transaction_uuid=([^?&#]+)/);
      if (txnMatch) {
        extractedUuid = decodeURIComponent(txnMatch[1]).split('?')[0].split('&')[0].trim();
      }

      // Extract base64 data query param
      const dataMatch = url.match(/[?&]data=([^&#]+)/);
      const rawData = dataMatch ? decodeURIComponent(dataMatch[1]) : '';

      const res = await verifyMobileEsewaPayment(rawData, extractedUuid, activeBizId);
      setVerifyingPayment(false);
      setPaymentSession(null);
      isHandlingReturnRef.current = false;

      if (res.success) {
        Alert.alert(
          '🎉 Subscription Activated!',
          `Your store is now upgraded to ${selectedPlan.name}! All premium limits and features are active immediately.`,
          [
            {
              text: 'OK',
              onPress: () => {
                loadData();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Payment Processing Notice',
          res.message || 'Payment received. Backend sync is finalizing.',
          [
            {
              text: 'OK',
              onPress: () => {
                loadData();
                onClose();
              },
            },
          ]
        );
      }
    } else if (
      url.includes('byapar.app/esewa-failure') ||
      url.includes('payment=esewa_failure') ||
      url.includes('status=CANCELED') ||
      url.includes('status=CANCELLED') ||
      url.includes('esewa-cancel')
    ) {
      isHandlingReturnRef.current = true;
      let cancelUuid = paymentSessionRef.current?.transactionUuid;
      const txnMatch = url.match(/[?&]txn=([^&#]+)/) || url.match(/[?&]transaction_uuid=([^&#]+)/);
      if (txnMatch) {
        cancelUuid = decodeURIComponent(txnMatch[1]);
      }
      if (cancelUuid) {
        await cancelMobileEsewaPayment(cancelUuid, 'User cancelled in eSewa gateway', activeBizId);
      }
      setPaymentSession(null);
      isHandlingReturnRef.current = false;
      Alert.alert('Payment Cancelled', 'The eSewa transaction was cancelled. No charges were deducted.');
    }
  };

  const handleCancelPaymentModal = () => {
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to exit? Your payment will be marked as cancelled.',
      [
        { text: 'Keep Paying', style: 'cancel' },
        {
          text: 'Yes, Cancel Payment',
          style: 'destructive',
          onPress: async () => {
            const uuidToCancel = paymentSessionRef.current?.transactionUuid || paymentSession?.transactionUuid;
            if (uuidToCancel) {
              await cancelMobileEsewaPayment(uuidToCancel, 'User dismissed in-app payment window', activeBizId);
            }
            setPaymentSession(null);
            isHandlingReturnRef.current = false;
            Alert.alert('Payment Cancelled', 'No charges were made to your eSewa account.');
          },
        },
      ]
    );
  };

  return (
    <>
      {/* PRIMARY SUBSCRIPTION MODAL */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(255, 69, 0, 0.15)' }]}>
                  <Feather name="award" size={20} color="#FF4500" />
                </View>
                <View>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    Byapar Cloud Licensing
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    MSME Store Plans & eSewa Gateway
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* TAB SELECTOR: PLANS VS BILLING HISTORY */}
            <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'plans' && { backgroundColor: theme.colors.card, shadowOpacity: 0.1 },
                ]}
                onPress={() => setActiveTab('plans')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: activeTab === 'plans' ? '#FF4500' : theme.colors.textMuted },
                  ]}
                >
                  ⚡ Available Plans
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'history' && { backgroundColor: theme.colors.card, shadowOpacity: 0.1 },
                ]}
                onPress={() => setActiveTab('history')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: activeTab === 'history' ? '#FF4500' : theme.colors.textMuted },
                  ]}
                >
                  📄 Billing History & Invoices
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'plans' ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                {/* Active Subscription Banner */}
                {currentSub && (
                  <View style={[styles.activeBanner, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.activeBannerLeft}>
                      <Text style={[styles.activeBannerLabel, { color: theme.colors.textMuted }]}>
                        CURRENT ACTIVE LICENSE
                      </Text>
                      <Text style={[styles.activeBannerTier, { color: theme.colors.textPrimary }]}>
                        {currentSub.planName}
                      </Text>
                      <Text style={[styles.activeBannerDays, { color: currentSub.status === 'active' ? '#10B981' : '#EF4444' }]}>
                        ● {currentSub.daysRemaining > 365 ? 'Lifetime / Free' : `${currentSub.daysRemaining} days left`} ({currentSub.status})
                      </Text>
                      {isPaidActive && !isRenewalWindowOpen && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Feather name="lock" size={10} color="#F59E0B" />
                          <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>
                            Renewal & plan switch unlocks in {daysUntilRenewalWindow} days
                          </Text>
                        </View>
                      )}
                      {isPaidActive && isRenewalWindowOpen && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Feather name="clock" size={10} color="#10B981" />
                          <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700' }}>
                            ⚡ Renewal Window Active: Renew or switch plans now
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.activeBadge, { backgroundColor: 'rgba(255, 69, 0, 0.15)' }]}>
                      <Text style={{ color: '#FF4500', fontSize: 11, fontWeight: '700' }}>
                        {currentSub.planTier.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Monthly / Annual Cycle Toggle */}
                <View style={[styles.cycleContainer, { backgroundColor: theme.colors.surface }]}>
                  <TouchableOpacity
                    style={[
                      styles.cycleBtn,
                      billingCycle === 'monthly' && { backgroundColor: theme.colors.card, shadowOpacity: 0.1 },
                    ]}
                    onPress={() => {
                      setBillingCycle('monthly');
                      setPromoResult(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.cycleBtnText,
                        { color: billingCycle === 'monthly' ? theme.colors.textPrimary : theme.colors.textMuted },
                      ]}
                    >
                      Monthly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.cycleBtn,
                      billingCycle === 'annual' && { backgroundColor: '#FF4500' },
                    ]}
                    onPress={() => {
                      setBillingCycle('annual');
                      setPromoResult(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.cycleBtnText,
                        { color: billingCycle === 'annual' ? '#FFFFFF' : theme.colors.textMuted },
                      ]}
                    >
                      Annual (2 Mo Free)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Plans List */}
                <View style={styles.plansList}>
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    const price = billingCycle === 'annual' ? p.annual_price : p.monthly_price;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => {
                          setSelectedPlanId(p.id);
                          setPromoResult(null);
                        }}
                        style={[
                          styles.planCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: isSelected ? '#FF4500' : theme.colors.borderGlass,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                      >
                        <View style={styles.planCardHeader}>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.planCardName, { color: theme.colors.textPrimary }]}>
                                {p.name}
                              </Text>
                              {p.badge_text ? (
                                <View style={styles.planTag}>
                                  <Text style={styles.planTagText}>{p.badge_text}</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.planCardDesc, { color: theme.colors.textMuted }]}>
                              {p.description}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.planCardPrice, { color: '#FF4500' }]}>
                              रु {price}
                            </Text>
                            <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>
                              /{billingCycle === 'annual' ? 'yr' : 'mo'}
                            </Text>
                          </View>
                        </View>

                        {/* Hard limits row */}
                        <View style={styles.limitsRow}>
                          <View style={styles.limitTag}>
                            <Feather name="file-text" size={11} color={theme.colors.textMuted} />
                            <Text style={[styles.limitTagText, { color: theme.colors.textPrimary }]}>
                              {p.daily_bill_upload_limit === -1 ? 'Unlimited bills' : `${p.daily_bill_upload_limit} bills/d`}
                            </Text>
                          </View>
                          <View style={styles.limitTag}>
                            <Feather name="users" size={11} color={theme.colors.textMuted} />
                            <Text style={[styles.limitTagText, { color: theme.colors.textPrimary }]}>
                              {p.max_staff_accounts === -1 ? 'Unlimited staff' : `${p.max_staff_accounts} staff`}
                            </Text>
                          </View>
                          <View style={styles.limitTag}>
                            <Feather name="shopping-bag" size={11} color="#10B981" />
                            <Text style={[styles.limitTagText, { color: '#10B981', fontWeight: '700' }]}>
                              {p.max_stores_allowed === -1 ? 'Unlimited' : `${p.max_stores_allowed} store${p.max_stores_allowed > 1 ? 's' : ''}`}
                            </Text>
                          </View>
                        </View>

                        {/* Features checklist */}
                        <View style={styles.featuresList}>
                          <View style={styles.featureItem}>
                            <Feather
                              name={p.features.whatsapp_reminders ? 'check' : 'x'}
                              size={12}
                              color={p.features.whatsapp_reminders ? '#10B981' : '#9CA3AF'}
                            />
                            <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
                              WhatsApp Reminders
                            </Text>
                          </View>
                          <View style={styles.featureItem}>
                            <Feather
                              name={p.features.fonepay_qr_generation ? 'check' : 'x'}
                              size={12}
                              color={p.features.fonepay_qr_generation ? '#10B981' : '#9CA3AF'}
                            />
                            <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
                              Dynamic Fonepay QR
                            </Text>
                          </View>
                          <View style={styles.featureItem}>
                            <Feather
                              name={p.features.ird_vat_audit ? 'check' : 'x'}
                              size={12}
                              color={p.features.ird_vat_audit ? '#10B981' : '#9CA3AF'}
                            />
                            <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
                              IRD / VAT Audit Log
                            </Text>
                          </View>
                          <View style={styles.featureItem}>
                            <Feather
                              name={p.features.multi_store ? 'check' : 'x'}
                              size={12}
                              color={p.features.multi_store ? '#10B981' : '#9CA3AF'}
                            />
                            <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
                              Multi-Branch Sync
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Promo Code Box */}
                <View style={[styles.couponBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass }]}>
                  <Text style={[styles.couponLabel, { color: theme.colors.textMuted }]}>
                    HAVE A DISCOUNT COUPON?
                  </Text>
                  <View style={styles.couponInputRow}>
                    <TextInput
                      style={[
                        styles.couponInput,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.borderGlass,
                          color: theme.colors.textPrimary,
                        },
                      ]}
                      value={promoCode}
                      onChangeText={setPromoCode}
                      placeholder="e.g. DASHAIN2026, WELCOME50"
                      placeholderTextColor={theme.colors.textMuted}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[styles.applyBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}
                      onPress={handleApplyPromo}
                      disabled={validatingPromo}
                    >
                      {validatingPromo ? (
                        <ActivityIndicator size="small" color="#FF4500" />
                      ) : (
                        <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 12 }}>
                          Apply
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {promoResult && (
                    <Text
                      style={[
                        styles.promoMsg,
                        { color: promoResult.valid ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {promoResult.message}
                    </Text>
                  )}
                </View>
              </ScrollView>
            ) : (
              /* BILLING HISTORY & INVOICES TAB */
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                {loadingHistory ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FF4500" />
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 8 }}>
                      Loading billing timeline...
                    </Text>
                  </View>
                ) : historyList.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center', gap: 8 }}>
                    <Feather name="file-text" size={32} color={theme.colors.textMuted} />
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
                      No Transactions Yet
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 11, textAlign: 'center', paddingHorizontal: 30 }}>
                      When you upgrade your store license via eSewa, your payment records and audit invoices will appear here.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8, paddingBottom: 10 }}>
                    {historyList.map((tx) => {
                      const isComplete = tx.status === 'completed';
                      const isCancelled = tx.status === 'cancelled';
                      const isPending = tx.status === 'pending';
                      return (
                        <View
                          key={tx.id || tx.transaction_uuid}
                          style={[
                            styles.historyCard,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.borderGlass,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                              <Text style={[styles.historyPlan, { color: theme.colors.textPrimary }]}>
                                {tx.plan_tier?.toUpperCase() || 'PLAN'} ({tx.billing_cycle || 'monthly'})
                              </Text>
                              <Text style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 2 }}>
                                {tx.created_at ? new Date(tx.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent'}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary }}>
                                रु {tx.amount.toLocaleString()}
                              </Text>
                              <View
                                style={[
                                  styles.statusPill,
                                  {
                                    backgroundColor: isComplete
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : isCancelled
                                      ? 'rgba(107, 114, 128, 0.15)'
                                      : 'rgba(245, 158, 11, 0.15)',
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: '800',
                                    color: isComplete ? '#10B981' : isCancelled ? '#6B7280' : '#F59E0B',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {tx.status}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.borderGlass }}>
                            <Text style={{ fontSize: 9, color: theme.colors.textMuted, fontFamily: 'monospace' }}>
                              UUID: {tx.transaction_uuid.slice(-12)}
                            </Text>
                            <Text style={{ fontSize: 9, color: isComplete ? '#10B981' : theme.colors.textMuted, fontWeight: '600' }}>
                              {tx.transaction_code ? `eSewa: ${tx.transaction_code}` : tx.gateway || 'eSewa'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            )}

            {/* Footer Checkout Row (Only when on Plans tab) */}
            {activeTab === 'plans' && (
              <View style={[styles.footer, { borderTopColor: theme.colors.borderGlass }]}>
                <View>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Total Payable</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    {promoResult?.valid && (
                      <Text style={{ fontSize: 12, color: theme.colors.textMuted, textDecorationLine: 'line-through' }}>
                        रु {basePrice}
                      </Text>
                    )}
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#FF4500' }}>
                      रु {finalPrice}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.upgradeBtn,
                    isDowngrade && isPaidActive && !isRenewalWindowOpen
                      ? { backgroundColor: '#4B5563' }
                      : isDowngrade
                      ? { backgroundColor: '#6B7280' }
                      : isCurrentActive && isPaidActive && !isRenewalWindowOpen
                      ? { backgroundColor: '#10B981' }
                      : finalPrice > 0
                      ? { backgroundColor: '#60BB46' } // eSewa brand green
                      : { backgroundColor: '#FF4500' },
                  ]}
                  onPress={handleAction}
                  disabled={upgrading}
                >
                  {upgrading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {isDowngrade && isPaidActive && !isRenewalWindowOpen ? (
                        <Feather name="lock" size={14} color="#FFFFFF" />
                      ) : isCurrentActive && isPaidActive && !isRenewalWindowOpen ? (
                        <Feather name="check-circle" size={14} color="#FFFFFF" />
                      ) : isCurrentActive && isRenewalWindowOpen ? (
                        <Feather name="refresh-cw" size={14} color="#FFFFFF" />
                      ) : finalPrice > 0 ? (
                        <Feather name="shield" size={14} color="#FFFFFF" />
                      ) : null}
                      <Text style={styles.upgradeBtnText}>
                        {isDowngrade && isPaidActive && !isRenewalWindowOpen
                          ? `Downgrade (Locked • ${daysRemaining}d left)`
                          : isDowngrade
                          ? `Downgrade to ${selectedPlan.name}`
                          : isCurrentActive && isPaidActive && !isRenewalWindowOpen
                          ? `Active (${daysRemaining}d left)`
                          : isCurrentActive && isRenewalWindowOpen
                          ? `Renew ${selectedPlan.name} with eSewa`
                          : finalPrice === 0
                          ? 'Activate Free Plan'
                          : `Pay रु ${finalPrice} with eSewa`}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* IN-APP ESEWA PAYMENT WEBVIEW MODAL                                        */}
      {/* ========================================================================= */}
      {paymentSession && (
        <Modal
          visible={!!paymentSession}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setPaymentSession(null)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
            {/* Header */}
            <View style={styles.webViewHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: '#60BB46', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12 }}>e</Text>
                </View>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    eSewa Secure Checkout
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 10 }}>
                    रु {paymentSession.amount} NPR • Test & Live Gateway
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCancelPaymentModal}
                style={styles.cancelPaymentBtn}
              >
                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>✕ Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* In-app Webview */}
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              <WebView
                source={{ html: paymentSession.htmlForm, baseUrl: 'https://rc-epay.esewa.com.np' }}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onShouldStartLoadWithRequest={(request) => {
                  if (
                    request.url.includes('byapar.app/esewa-success') ||
                    request.url.includes('payment=esewa_success') ||
                    request.url.includes('byapar.app/esewa-failure') ||
                    request.url.includes('payment=esewa_failure') ||
                    request.url.includes('status=COMPLETE') ||
                    request.url.includes('status=CANCELED')
                  ) {
                    handleWebViewNavigation(request.url);
                    return false;
                  }
                  return true;
                }}
                onNavigationStateChange={(nav) => {
                  if (
                    nav.url.includes('byapar.app/esewa-success') ||
                    nav.url.includes('payment=esewa_success') ||
                    nav.url.includes('byapar.app/esewa-failure') ||
                    nav.url.includes('payment=esewa_failure') ||
                    nav.url.includes('status=COMPLETE') ||
                    nav.url.includes('status=CANCELED')
                  ) {
                    handleWebViewNavigation(nav.url);
                  }
                }}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color="#60BB46" />
                    <Text style={{ color: '#4B5563', fontSize: 12, marginTop: 10, fontWeight: '600' }}>
                      Connecting to eSewa Nepal Gateway...
                    </Text>
                  </View>
                )}
              />

              {/* Verification Spinner Overlay */}
              {verifyingPayment && (
                <View style={styles.verifyingOverlay}>
                  <ActivityIndicator size="large" color="#60BB46" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginTop: 12 }}>
                    Verifying Payment with eSewa...
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 4 }}>
                    Updating store license and syncing admin ledger
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  activeBannerLeft: {
    gap: 2,
  },
  activeBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeBannerTier: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeBannerDays: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cycleContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    marginBottom: 12,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  cycleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  plansList: {
    gap: 10,
    marginBottom: 12,
  },
  planCard: {
    borderRadius: 16,
    padding: 14,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  planCardName: {
    fontSize: 14,
    fontWeight: '700',
  },
  planTag: {
    backgroundColor: 'rgba(255, 69, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planTagText: {
    color: '#FF4500',
    fontSize: 9,
    fontWeight: '700',
  },
  planCardDesc: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: 200,
  },
  planCardPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
  limitsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.2)',
  },
  limitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  limitTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  featureText: {
    fontSize: 11,
  },
  couponBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  couponLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  applyBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoMsg: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  upgradeBtn: {
    backgroundColor: '#FF4500',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  historyCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  historyPlan: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  cancelPaymentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  verifyingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
