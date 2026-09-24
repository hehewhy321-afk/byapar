import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { supabase } from '../config/supabase';
import { storage } from '../services/storage';
import { ActiveTab } from '../types';

export interface MobileOnboardingState {
  profile_completed: boolean;
  first_item_added: boolean;
  first_invoice_created: boolean;
  fonepay_qr_linked: boolean;
  staff_invited: boolean;
  mobile_app_paired: boolean;
  backup_configured: boolean;
  completion_percentage: number;
}

const DEFAULT_ONBOARDING: MobileOnboardingState = {
  profile_completed: true,
  first_item_added: true,
  first_invoice_created: true,
  fonepay_qr_linked: false,
  staff_invited: false,
  mobile_app_paired: true,
  backup_configured: true,
  completion_percentage: 57,
};

export const OnboardingChecklistWidget: React.FC = () => {
  const { theme, activeBizId, setActiveTab } = useApp();
  const [onboarding, setOnboarding] = useState<MobileOnboardingState>(DEFAULT_ONBOARDING);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkDismissed();
    loadOnboarding();
  }, [activeBizId]);

  const checkDismissed = async () => {
    const isDismissed = await storage.get<boolean>(`onboarding_dismissed_${activeBizId}`, false);
    setDismissed(isDismissed);
  };

  const loadOnboarding = async () => {
    if (!activeBizId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchant_onboarding')
        .select('*')
        .eq('business_id', activeBizId)
        .maybeSingle();

      if (!error && data) {
        setOnboarding(data);
      }
    } catch (err) {
      console.warn('Mobile onboarding load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setDismissed(true);
    await storage.set(`onboarding_dismissed_${activeBizId}`, true);
  };

  const toggleMilestone = async (key: keyof MobileOnboardingState, targetTab?: ActiveTab) => {
    if (typeof onboarding[key] !== 'boolean') return;
    const nextVal = !onboarding[key];

    const updated: MobileOnboardingState = {
      ...onboarding,
      [key]: nextVal,
    };

    const boolKeys: (keyof MobileOnboardingState)[] = [
      'profile_completed',
      'first_item_added',
      'first_invoice_created',
      'fonepay_qr_linked',
      'staff_invited',
      'mobile_app_paired',
      'backup_configured',
    ];
    const completedCount = boolKeys.filter((k) => updated[k] === true).length;
    const percentage = Math.round((completedCount / boolKeys.length) * 100);
    updated.completion_percentage = percentage;

    setOnboarding(updated);
    setUpdating(true);

    try {
      await supabase.from('merchant_onboarding').upsert({
        business_id: activeBizId,
        profile_completed: updated.profile_completed,
        first_item_added: updated.first_item_added,
        first_invoice_created: updated.first_invoice_created,
        fonepay_qr_linked: updated.fonepay_qr_linked,
        staff_invited: updated.staff_invited,
        mobile_app_paired: updated.mobile_app_paired,
        backup_configured: updated.backup_configured,
        completion_percentage: percentage,
        last_milestone_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Mobile onboarding milestone update notice:', err);
    } finally {
      setUpdating(false);
    }

    if (targetTab && nextVal) {
      setActiveTab(targetTab);
    }
  };

  if (dismissed || onboarding.completion_percentage === 100) {
    return null;
  }

  const milestones: {
    key: keyof MobileOnboardingState;
    label: string;
    tab?: ActiveTab;
    icon: string;
  }[] = [
    { key: 'profile_completed', label: 'Store Profile & PAN', tab: 'settings', icon: 'shopping-bag' },
    { key: 'first_item_added', label: 'Add First Inventory Item', tab: 'inventory', icon: 'package' },
    { key: 'first_invoice_created', label: 'Create First Sale / Bill', tab: 'pos', icon: 'file-text' },
    { key: 'fonepay_qr_linked', label: 'Link Fonepay Merchant QR', tab: 'accounts', icon: 'credit-card' },
    { key: 'staff_invited', label: 'Add Staff Member', tab: 'staff', icon: 'users' },
    { key: 'mobile_app_paired', label: 'Mobile App Synced', tab: 'dashboard', icon: 'smartphone' },
    { key: 'backup_configured', label: 'Cloud Backup Active', tab: 'settings', icon: 'cloud' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: 'rgba(59, 130, 246, 0.25)',
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Feather name="zap" size={16} color="#3B82F6" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Store Setup Progress
              </Text>
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>{onboarding.completion_percentage}% Done</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Complete these steps to unlock full retail potential
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
          <Feather name="x" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarTrack, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${onboarding.completion_percentage}%`, backgroundColor: '#3B82F6' },
          ]}
        />
      </View>

      {/* Milestones List */}
      <View style={styles.milestonesList}>
        {milestones.map((m) => {
          const isDone = onboarding[m.key] === true;
          return (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.milestoneItem,
                {
                  backgroundColor: isDone ? 'rgba(16, 185, 129, 0.08)' : theme.colors.surface,
                  borderColor: isDone ? 'rgba(16, 185, 129, 0.3)' : theme.colors.borderGlass,
                },
              ]}
              onPress={() => toggleMilestone(m.key, m.tab)}
              activeOpacity={0.7}
            >
              <View style={styles.milestoneLeft}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isDone ? '#10B981' : 'transparent',
                      borderColor: isDone ? '#10B981' : theme.colors.borderGlass,
                    },
                  ]}
                >
                  {isDone && <Feather name="check" size={12} color="#FFFFFF" />}
                </View>

                <Text
                  style={[
                    styles.milestoneLabel,
                    {
                      color: isDone ? theme.colors.textSecondary : theme.colors.textPrimary,
                      textDecorationLine: isDone ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {m.label}
                </Text>
              </View>

              {m.tab && (
                <Feather
                  name="chevron-right"
                  size={14}
                  color={isDone ? theme.colors.textMuted : '#3B82F6'}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  percentBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  percentText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  dismissBtn: {
    padding: 4,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestonesList: {
    gap: 8,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
