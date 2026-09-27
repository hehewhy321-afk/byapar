import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const data = await AsyncStorage.getItem(`@byapar_${key}`);
      if (data !== null) {
        return JSON.parse(data) as T;
      }
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
    }
    return defaultValue;
  },

  async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const prefixed = keys.map(k => `@byapar_${k}`);
      const pairs = await AsyncStorage.multiGet(prefixed);
      const result: Record<string, any> = {};
      pairs.forEach(([fullKey, val]) => {
        const rawKey = fullKey.replace('@byapar_', '');
        if (val !== null) {
          try {
            result[rawKey] = JSON.parse(val);
          } catch {
            result[rawKey] = val;
          }
        }
      });
      return result;
    } catch (e) {
      console.warn('Error in storage.multiGet:', e);
      return {};
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(`@byapar_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error writing ${key} to storage:`, e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`@byapar_${key}`);
    } catch (e) {
      console.warn(`Error removing ${key} from storage:`, e);
    }
  },
};
