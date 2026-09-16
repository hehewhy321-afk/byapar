import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { FadeInView } from '../components/common/FadeInView';

interface Props {
  onFinish: () => void;
}

const STEPS = [
  {
    icon: 'zap' as const,
    color: theme.colors.emerald,
    bg: theme.colors.emeraldBg,
    badge: 'LIGHTNING POS',
    title: 'Speed Checkout',
    desc: 'Instant Fonepay QR and counter checkout. Works completely offline with zero latency.',
  },
  {
    icon: 'book-open' as const,
    color: theme.colors.indigoLight,
    bg: theme.colors.indigoBg,
    badge: 'SMART LEDGER',
    title: 'Khata on Autopilot',
    desc: 'Track credit receivables and dispatch 1-tap WhatsApp payment reminders with custom tones.',
  },
  {
    icon: 'camera' as const,
    color: theme.colors.cyan,
    bg: theme.colors.cyanBg,
    badge: 'AUDIT VAULT',
    title: 'Digital Bill Vault',
    desc: 'Snap physical vendor invoices and expense slips to maintain verified digital records.',
  },
];

export const OnboardingScreen: React.FC<Props> = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onFinish();
    }
  };

  const step = STEPS[currentStep];

  return (
    <View style={styles.container}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.logoText}>BYAPAR</Text>
        </View>

        <AnimatedPressable onPress={onFinish} activeScale={0.88}>
          <Text style={styles.skipText}>Skip</Text>
        </AnimatedPressable>
      </View>

      {/* HERO ILLUSTRATION & CONTENT */}
      <FadeInView key={currentStep} duration={260} translateY={18} style={styles.heroContent}>
        <View style={[styles.iconAura, { backgroundColor: step.bg }]}>
          <View style={styles.iconCircle}>
            <Feather name={step.icon} size={36} color={step.color} />
          </View>
        </View>

        <View style={styles.stepBadge}>
          <Text style={[styles.stepBadgeText, { color: step.color }]}>{step.badge}</Text>
        </View>

        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDesc}>{step.desc}</Text>

        {/* DOTS */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, currentStep === idx && styles.dotActive]}
            />
          ))}
        </View>
      </FadeInView>

      {/* BOTTOM CTA */}
      <View style={styles.bottomBar}>
        <AnimatedPressable style={styles.primaryBtn} onPress={handleNext} activeScale={0.96}>
          <Text style={styles.primaryBtnText}>
            {currentStep === STEPS.length - 1 ? 'Set Up My Store' : 'Next'}
          </Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </AnimatedPressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: 'space-between',
    padding: theme.spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: 1.5,
  },
  skipText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  iconAura: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  stepBadge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    marginBottom: 12,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.borderGlass,
  },
  dotActive: {
    width: 20,
    backgroundColor: theme.colors.primary,
  },
  bottomBar: {
    paddingBottom: theme.spacing.lg,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
