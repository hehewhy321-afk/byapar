import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import {
  MobileSubscriptionPlan,
  fetchMobileSubscriptionPlans,
  getMobileSubscription,
  MobileSubscriptionState,
  validateMobilePromoCode,
  upgradeMobileSubscription,
  downgradeMobileSubscription,
  initiateMobileEsewaPayment,
  DEFAULT_MOBILE_PLANS,
} from '../services/subscriptionService';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ visible, onClose }) => {
  const { theme, activeBizId, store, user } = useApp();
  const [plans, setPlans] = useState<MobileSubscriptionPlan[]>(DEFAULT_MOBILE_PLANS);
  const [currentSub, setCurrentSub] = useState<MobileSubscriptionState | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro_99');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
      setPromoCode('');
      setPromoResult(null);
    }
  }, [visible, activeBizId]);

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

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    const res = await validateMobilePromoCode(promoCode.trim(), selectedPlan.id, basePrice);
    setPromoResult(res);
    setValidatingPromo(false);
  };

  const handleAction = async () => {
    if (!selectedPlan) return;

    if (isDowngrade) {
      Alert.alert(
        'Confirm Plan Downgrade',
        `Are you sure you want to downgrade to ${selectedPlan.name}?\n\n• Daily bill upload cap: ${selectedPlan.daily_bill_upload_limit === -1 ? 'Unlimited' : selectedPlan.daily_bill_upload_limit}\n• Staff account cap: ${selectedPlan.max_staff_accounts === -1 ? 'Unlimited' : selectedPlan.max_staff_accounts}\n• Max branches allowed: ${selectedPlan.max_stores_allowed}`,
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
                  { text: 'OK', onPress: () => { loadData(); onClose(); } },
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

    if (finalPrice <= 0) {
      setUpgrading(true);
      const res = await upgradeMobileSubscription({
        businessId: activeBizId,
        planId: selectedPlan.id,
        billingCycle,
        userId: user?.id,
        promoCode: promoResult?.valid ? promoResult.code : undefined,
      });
      setUpgrading(false);

      if (res.success) {
        Alert.alert(
          '🎉 Subscription Activated!',
          `Your store is now upgraded to ${selectedPlan.name}. All features and limits are immediately active.`,
          [{ text: 'OK', onPress: () => { loadData(); onClose(); } }]
        );
      } else {
        Alert.alert('Upgrade Failed', res.error || 'Please check network and try again.');
      }
      return;
    }

    // Paid Plan via eSewa
    setUpgrading(true);
    try {
      await initiateMobileEsewaPayment({
        businessId: activeBizId,
        businessName: store?.name || 'Byapar Merchant',
        planId: selectedPlan.id,
        billingCycle,
        amount: finalPrice,
        promoCode: promoResult?.valid ? promoResult.code : undefined,
        discountAmount: promoResult?.discountAmount || 0,
      });
      Alert.alert(
        'eSewa Payment Opened',
        'eSewa payment window was opened. After completing payment, tap "Confirm Activation" to finalize.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm Activation',
            onPress: async () => {
              const res = await upgradeMobileSubscription({
                businessId: activeBizId,
                planId: selectedPlan.id,
                billingCycle,
                userId: user?.id,
                promoCode: promoResult?.valid ? promoResult.code : undefined,
              });
              if (res.success) {
                Alert.alert('🎉 Subscription Activated!', `Plan upgraded to ${selectedPlan.name}.`);
                loadData();
                onClose();
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Could not launch payment gateway.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(255, 69, 0, 0.15)' }]}>
                <Feather name="award" size={20} color="#FF4500" />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  Byapar Cloud Plans
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                  Dynamic store licensing & feature limits
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            {/* Active Subscription Banner */}
            {currentSub && (
              <View style={[styles.activeBanner, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.activeBannerLeft}>
                  <Text style={[styles.activeBannerLabel, { color: theme.colors.textMuted }]}>
                    CURRENT ACTIVE PLAN
                  </Text>
                  <Text style={[styles.activeBannerTier, { color: theme.colors.textPrimary }]}>
                    {currentSub.planName}
                  </Text>
                  <Text style={[styles.activeBannerDays, { color: '#10B981' }]}>
                    ● {currentSub.daysRemaining} days remaining ({currentSub.status})
                  </Text>
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
                onPress={() => { setBillingCycle('monthly'); setPromoResult(null); }}
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
                onPress={() => { setBillingCycle('annual'); setPromoResult(null); }}
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
                    onPress={() => { setSelectedPlanId(p.id); setPromoResult(null); }}
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
                        <Text style={[styles.planCardName, { color: theme.colors.textPrimary }]}>
                          {p.name}
                        </Text>
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
                          Nepal IRD VAT Audit
                        </Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather
                          name={p.features.advanced_analytics ? 'check' : 'x'}
                          size={12}
                          color={p.features.advanced_analytics ? '#10B981' : '#9CA3AF'}
                        />
                        <Text style={[styles.featureText, { color: p.features.advanced_analytics ? '#10B981' : theme.colors.textSecondary, fontWeight: p.features.advanced_analytics ? '700' : 'normal' }]}>
                          Advanced Analytics
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Coupon Code Section */}
            <View style={[styles.couponBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass }]}>
              <Text style={[styles.couponLabel, { color: theme.colors.textSecondary }]}>
                Have a Promo / Coupon Code?
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

          {/* Footer Checkout Row */}
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
                isDowngrade && { backgroundColor: '#6B7280' },
              ]}
              onPress={handleAction}
              disabled={upgrading}
            >
              {upgrading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.upgradeBtnText}>
                  {isDowngrade
                    ? `Downgrade to ${selectedPlan.name}`
                    : isCurrentActive
                    ? 'Renew via eSewa'
                    : finalPrice === 0
                    ? 'Activate Free'
                    : `Pay via eSewa (रु ${finalPrice})`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
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
    marginBottom: 14,
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
    marginBottom: 14,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
