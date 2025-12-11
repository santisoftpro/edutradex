// App settings utility - reads from localStorage

const SETTINGS_KEY = 'optigobroker-settings';

export interface AppSettings {
  notifications: {
    tradeOpened: boolean;
    tradeResult: boolean;
    lowBalance: boolean;
    marketAlerts: boolean;
  };
  trading: {
    confirmTrades: boolean;
    defaultAmount: number;
    defaultDuration: number;
    soundEffects: boolean;
  };
  display: {
    theme: 'dark' | 'light';
    compactMode: boolean;
  };
}

const defaultSettings: AppSettings = {
  notifications: {
    tradeOpened: true,
    tradeResult: true,
    lowBalance: true,
    marketAlerts: false,
  },
  trading: {
    confirmTrades: true,
    defaultAmount: 10,
    defaultDuration: 30,
    soundEffects: true,
  },
  display: {
    theme: 'dark',
    compactMode: false,
  },
};

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultSettings,
        ...parsed,
        notifications: { ...defaultSettings.notifications, ...parsed.notifications },
        trading: { ...defaultSettings.trading, ...parsed.trading },
        display: { ...defaultSettings.display, ...parsed.display },
      };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return defaultSettings;
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return getSettings()[key];
}

export function isSoundEnabled(): boolean {
  return getSettings().trading.soundEffects;
}

export function getDefaultTradeAmount(): number {
  return getSettings().trading.defaultAmount;
}

export function getDefaultTradeDuration(): number {
  return getSettings().trading.defaultDuration;
}

export function shouldConfirmTrades(): boolean {
  return getSettings().trading.confirmTrades;
}
