import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/AppNavigator';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from './src/services/notificationService';

const MainContent: React.FC = () => {
  const { theme, themeMode, setActiveTab } = useApp();

  useEffect(() => {
    // Request Android 13+ (POST_NOTIFICATIONS) runtime permission on startup
    requestNotificationPermission();

    // When user taps on a notification in the phone's notification panel, navigate to notifications screen
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      setActiveTab('notifications');
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.bg}
      />
      <AppNavigator />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
