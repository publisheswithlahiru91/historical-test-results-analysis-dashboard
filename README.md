# historical-analytics-dashboard

[![npm version](https://img.shields.io/npm/v/historical-analytics-dashboard.svg)](https://www.npmjs.com/package/historical-analytics-dashboard)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/LahiruMadhawa2020/historical-test-results-analysis-dashboard/blob/main/LICENSE)

Historical test execution analysis dashboard for Node.js. Import test results from Newman, JUnit XML, Playwright JSON, and Cypress, store execution history over time, and generate self-contained HTML analytics dashboards.

## Features

- **Multi-format import**: Support for Newman, JUnit XML, Playwright JSON, and Cypress results
- **Historical tracking**: Store and visualize test execution trends over time
- **Interactive dashboards**: Self-contained HTML dashboards with filtering and theme switching
- **Reset Filters**: Quick filter reset button in project and management dashboards
- **Management dashboard**: Cross-project visibility for test execution metrics
- **CLI & Programmatic API**: Use via command line or integrate into your Node.js workflows
- **S3 storage support**: Optional AWS S3 integration for cloud-based history storage

## Installation

```bash
npm install historical-analytics-dashboard
```

## Quick start

### 1. Create a config file

```bash
cp node_modules/historical-analytics-dashboard/dashboard.config.example.ts dashboard.config.ts
```

### 2. Import test results

```bash
# Import Newman JSON output
analytics-dashboard import reports/newman-run.json \
  --format newman-json \
  --tool newman \
  --config dashboard.config.ts

# Import JUnit XML (Selenium, TestNG, etc.)
analytics-dashboard import reports/junit.xml \
  --format junit-xml \
  --tool selenium-java-tdd \
  --application-type UI \
  --methodology TDD \
  --config dashboard.config.ts

# Import Playwright JSON
analytics-dashboard import reports/playwright.json \
  --format playwright-json \
  --tool playwright-ts-tdd \
  --application-type UI \
  --methodology TDD \
  --config dashboard.config.ts
```

### 3. Generate dashboard

```bash
analytics-dashboard generate --config dashboard.config.ts
```

Opens `reports/analytics-dashboard.html` in your browser.

## Dashboard features

- **Interactive filters**: Filter by application type, tool, and project (management dashboard)
- **Reset Filters**: One-click button to clear all active filters and restore default view
- **Theme toggle**: Switch between light and dark themes
- **Responsive design**: Works on desktop and mobile browsers
- **Self-contained HTML**: No external dependencies required to view dashboards

## CLI commands

```
analytics-dashboard run <input-file> [options]     # Run Newman collection + record history
analytics-dashboard import <file> [options]         # Import external test results
analytics-dashboard generate [options]              # Generate project dashboard HTML
analytics-dashboard management-generate [options]   # Generate management dashboard HTML
```

### Common options

| Flag | Description |
|------|-------------|
| `--config <path>` | Path to `dashboard.config.ts` (default: `dashboard.config.ts`) |
| `--tool <id>` | Tool identifier (e.g. `newman`, `selenium-java-tdd`) |
| `--format <id>` | Input format: `newman-json`, `junit-xml`, `playwright-json` |
| `--application-type <type>` | `UI`, `API`, or `Mobile` |
| `--methodology <type>` | `TDD` or `BDD` |

## Programmatic API

```typescript
import {
  loadConfig,
  Orchestrator,
  DashboardGenerator,
  ManagementDashboardGenerator,
  HistoryLedger,
  registry,
  STANDARD_TOOL_IDS
} from 'historical-analytics-dashboard';
```

### Key exports

| Export | Description |
|--------|-------------|
| `loadConfig(path)` | Load and validate a dashboard config file |
| `Orchestrator` | Run tools, import results, and manage history |
| `DashboardGenerator` | Generate project-level HTML dashboard |
| `ManagementDashboardGenerator` | Generate cross-project management dashboard |
| `HistoryLedger` | Read/write execution history entries |
| `registry` | Tool adapter registry |
| `STANDARD_TOOL_IDS` | Canonical list of supported tool identifiers |

## Configuration

### Project dashboard config

```typescript
import type { DashboardConfigFile } from 'historical-analytics-dashboard';

const config: DashboardConfigFile = {
  dashboard: {
    title: 'My Project Dashboard',
    theme: 'light',
    openBrowser: true,
    output: { htmlFile: 'reports/analytics-dashboard.html' },
    thresholds: { warningResponseTimeMs: 1000 }
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
    newman: { enabled: true, reporter: 'cli' }
  },
  importFormats: {
    'junit-xml': { enabled: true },
    'playwright-json': { enabled: true }
  }
};

export default config;
```

### Management dashboard config

```typescript
import type { ManagementDashboardConfigFile } from 'historical-analytics-dashboard';

const config: ManagementDashboardConfigFile = {
  dashboard: {
    title: 'Management Dashboard',
    theme: 'light',
    openBrowser: false,
    output: { htmlFile: 'reports/management-dashboard.html' },
    thresholds: { warningResponseTimeMs: 1000 }
  },
  management: {
    sources: [
      {
        id: 'my-project',
        label: 'My Project',
        projectName: 'My Project',
        frameworkName: 'my-framework',
        applicationType: 'UI',
        tool: 'selenium-java-tdd',
        methodology: 'TDD',
        storage: { type: 'filesystem', rootDir: '../my-project/.analytics-data' },
        enabled: true
      }
    ],
    filters: {
      applicationTypes: ['UI', 'API', 'Mobile'],
      toolNames: ['selenium-java-tdd', 'selenium-java-bdd', 'cypress-tdd'],
      showFrameworkFilter: false,
      showToolFilter: true,
      showProjectFilter: true
    }
  }
};

export default config;
```

## Supported tools

| Tool ID | Format | Description |
|---------|--------|-------------|
| `newman` | `newman-json` | Newman/Postman collection runs |
| `selenium-java-tdd` | `junit-xml` | Selenium Java TDD tests |
| `selenium-java-bdd` | `junit-xml` | Selenium Java BDD tests |
| `playwright-java-tdd` | `junit-xml` | Playwright Java TDD tests |
| `playwright-java-bdd` | `junit-xml` | Playwright Java BDD tests |
| `playwright-ts-tdd` | `playwright-json` | Playwright TypeScript TDD tests |
| `cypress-tdd` | `junit-xml` | Cypress TDD tests |
| `cypress-bdd` | `junit-xml` | Cypress BDD tests |
| `wdio-java-tdd` | `junit-xml` | WebdriverIO TDD tests |
| `wdio-java-bdd` | `junit-xml` | WebdriverIO BDD tests |

## Input formats

| Format | Extensions | Description |
|--------|-----------|-------------|
| `newman-json` | `.json` | Newman JSON run output |
| `junit-xml` | `.xml` | JUnit/XUnit XML reports |
| `playwright-json` | `.json` | Playwright JSON report |
| `postman-collection` | `.json` | Postman collection (run via Newman) |

## License

MIT - see [LICENSE](LICENSE) for details.
