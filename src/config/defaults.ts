import type { DashboardConfigFile } from '../core/types.js';

export const DEFAULT_CONFIG: DashboardConfigFile = {
  dashboard: {
    title: 'Historical Test Execution Analysis Dashboard',
    theme: 'light',
    openBrowser: true,
    output: {
      htmlFile: 'reports/analytics-dashboard.html'
    },
    thresholds: {
      warningResponseTimeMs: 1000
    }
  },
  storage: {
    rootDir: '.analytics-data',
    maxHistoryEntries: 50,
    frameworks: {
      newman: {
        historyFile: 'history.json',
        resultsDir: 'runs'
      }
    }
  },
  tools: {
    newman: {
      enabled: true,
      reporter: 'cli'
    }
  },
  importFormats: {
    'newman-json': {
      enabled: false
    },
    'junit-xml': {
      enabled: true
    },
    'playwright-json': {
      enabled: true
    },
    'cypress-mochawesome': {
      enabled: true
    },
    'postman-collection': {
      enabled: true
    }
  }
};

export const CONFIG_FILE_NAMES = [
  'dashboard.config.ts',
  'dashboard.config.mts',
  'dashboard.config.js',
  'dashboard.config.mjs'
] as const;
