import type { DashboardConfigFile } from 'historical-analytics-dashboard';

const config: DashboardConfigFile = {
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
      reporter: 'cli',
      iterationCount: 1
    }
  },
  importFormats: {
    'postman-collection': {
      enabled: true
    },
    'newman-json': {
      enabled: false
    },
    'junit-xml': {
      enabled: false
    }
  }
};

export default config;
