import { Alert, Linking } from 'react-native';

export interface UpdateInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  isUpdateAvailable: boolean;
  mandatory: boolean;
  releaseNotes: string[];
  downloadUrl: string;
}

export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_BUILD_NUMBER = 1;

class UpdateService {
  private lastCheckedTime: number = 0;

  async checkForUpdates(silent: boolean = false): Promise<UpdateInfo> {
    this.lastCheckedTime = Date.now();

    const mockLatestVersion: UpdateInfo = {
      version: '1.0.0',
      buildNumber: 1,
      releaseDate: '2026-09-16',
      isUpdateAvailable: false,
      mandatory: false,
      releaseNotes: [
        'Enhanced 16 KB memory page size support for Android 15',
        'Enabled system Edge-to-Edge display compliance',
        'Searchable Contact dropdown in Quick Record Entry',
        'New modern circular brand logo',
        'Message Templates Studio with dynamic variables',
      ],
      downloadUrl: 'https://play.google.com/store/apps/details?id=com.byapar.app',
    };

    if (!silent) {
      if (mockLatestVersion.isUpdateAvailable) {
        this.promptUpdate(mockLatestVersion);
      } else {
        Alert.alert(
          'App is Up to Date',
          `You are running the latest version of Byapar Retail OS (v${CURRENT_APP_VERSION}). No updates required.`,
          [{ text: 'OK' }]
        );
      }
    }

    return mockLatestVersion;
  }

  promptUpdate(info: UpdateInfo) {
    Alert.alert(
      'New Update Available',
      `Version ${info.version} is now available with important improvements:\n\n${info.releaseNotes
        .map((n) => `• ${n}`)
        .join('\n')}`,
      [
        ...(info.mandatory
          ? []
          : [
              {
                text: 'Later',
                style: 'cancel' as const,
              },
            ]),
        {
          text: 'Update Now',
          onPress: () => {
            if (info.downloadUrl) {
              Linking.openURL(info.downloadUrl).catch(() => {
                Alert.alert('Error', 'Unable to open Play Store link.');
              });
            }
          },
        },
      ],
      { cancelable: !info.mandatory }
    );
  }
}

export const updateService = new UpdateService();
