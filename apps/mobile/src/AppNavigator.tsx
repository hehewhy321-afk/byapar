import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  PanResponder,
  BackHandler,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useApp } from './context/AppContext';
import { theme } from './theme';
import { AppHeader } from './components/common/AppHeader';
import { TabBar } from './components/common/TabBar';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { StoreSetupScreen } from './screens/StoreSetupScreen';
import { POSScreen } from './screens/POSScreen';
import { SalesHubScreen } from './screens/SalesHubScreen';
import { PurchaseHubScreen } from './screens/PurchaseHubScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { LedgerScreen } from './screens/LedgerScreen';
import { BillArchiveScreen } from './screens/BillArchiveScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { StaffScreen } from './screens/StaffScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { ExpenseIncomeScreen } from './screens/ExpenseIncomeScreen';
import { ActiveTab } from './types';

const MAIN_TABS: ActiveTab[] = [
  'dashboard',
  'sales',
  'bills',
  'expenses',
  'pos',
  'purchase',
  'accounts',
  'inventory',
  'ledger',
  'reports',
  'staff',
  'settings',
];

export const AppNavigator: React.FC = () => {
  const {
    isReady,
    isOnboarded,
    activeTab,
    setActiveTab,
    navigateBack,
    theme,
    showAuthModal,
    setShowAuthModal,
    user,
  } = useApp();
  const [onboardingStep, setOnboardingStep] = useState<'intro' | 'setup'>('intro');
  const lastBackPressRef = useRef<number>(0);

  // Hardware back button navigation: navigate back through screen history or double tap to exit from home
  useEffect(() => {
    const onBackPress = () => {
      if (showAuthModal) {
        setShowAuthModal(false);
        return true;
      }

      const handled = navigateBack();
      if (handled) {
        return true;
      }

      // At home ('dashboard'), require 2 presses within 2000ms to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [showAuthModal, activeTab, navigateBack]);

  // Swipe gesture navigation between tabs
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger on clear horizontal swipes (dx > 35) that are mostly horizontal
        return (
          Math.abs(gestureState.dx) > 35 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.2
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 50) {
          const currentIndex = MAIN_TABS.indexOf(activeTab);
          if (gestureState.dx < -50) {
            // Swipe left -> Next tab
            if (currentIndex >= 0 && currentIndex < MAIN_TABS.length - 1) {
              setActiveTab(MAIN_TABS[currentIndex + 1]);
            }
          } else if (gestureState.dx > 50) {
            // Swipe right -> Prev tab
            if (currentIndex > 0) {
              setActiveTab(MAIN_TABS[currentIndex - 1]);
            } else if (activeTab === 'settings') {
              setActiveTab('dashboard');
            }
          }
        }
      },
    })
  ).current;

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bg }]}>
        <Text style={[styles.loadingBrand, { color: theme.colors.textPrimary }]}>BYAPAR</Text>
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Initializing Retail OS Engine...</Text>
      </View>
    );
  }

  // Onboarding flow
  if (!isOnboarded) {
    if (onboardingStep === 'intro') {
      return <OnboardingScreen onFinish={() => setOnboardingStep('setup')} />;
    }
    return <StoreSetupScreen onComplete={() => setOnboardingStep('intro')} />;
  }

  // Mandatory Authentication: Must login or register to access Byapar Retail OS
  if (!user) {
    return <AuthScreen fullscreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Top Header */}
      <AppHeader />

      {/* Screen Body with Swipe Gesture Handler */}
      <View style={styles.screenBody} {...panResponder.panHandlers}>
        {activeTab === 'dashboard' && <DashboardScreen />}
        {activeTab === 'sales' && <SalesHubScreen />}
        {activeTab === 'bills' && <BillArchiveScreen />}
        {activeTab === 'expenses' && <ExpenseIncomeScreen />}
        {activeTab === 'pos' && <POSScreen />}
        {activeTab === 'purchase' && <PurchaseHubScreen />}
        {activeTab === 'accounts' && <AccountsScreen />}
        {activeTab === 'inventory' && <InventoryScreen />}
        {activeTab === 'ledger' && <LedgerScreen />}
        {activeTab === 'reports' && <ReportsScreen />}
        {activeTab === 'staff' && <StaffScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </View>

      {/* Bottom Navigation Bar */}
      <TabBar />

      {/* Cloud Supabase Auth Modal */}
      <AuthScreen visible={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  screenBody: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBrand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  loadingText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
});
