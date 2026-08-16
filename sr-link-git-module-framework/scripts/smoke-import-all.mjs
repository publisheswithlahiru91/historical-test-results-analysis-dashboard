import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import {
  API_OPERATIONS,
  UI_OPERATIONS,
  junitXml,
  playwrightJson
} from '../../scripts/smoke-reports.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const libRoot = path.resolve(root, '..', 'dist');

const MODULES = [
  {
    dir: 'postman-api-testing',
    imports: []
  },
  {
    dir: 'selenium-tdd-testing',
    imports: [
      ['reports/junit/selenium-java-tdd.xml', 'junit-xml', 'selenium-java-tdd', 'UI', 'TDD']
    ],
    uiTool: { toolId: 'selenium-java-tdd', className: 'com.srlink.selenium.tdd.LoginLogoutTddTest' }
  },
  {
    dir: 'selenium-bdd-testing',
    imports: [
      ['reports/junit/selenium-java-bdd.xml', 'junit-xml', 'selenium-java-bdd', 'UI', 'BDD']
    ],
    uiTool: { toolId: 'selenium-java-bdd', className: 'com.srlink.selenium.bdd.RunCucumberTest' }
  },
  {
    dir: 'playwright-java-tdd-testing',
    imports: [
      ['reports/junit/playwright-java-tdd.xml', 'junit-xml', 'playwright-java-tdd', 'UI', 'TDD'],
      ['reports/junit/playwright-java-tdd-api.xml', 'junit-xml', 'playwright-java-tdd', 'API', 'TDD']
    ],
    uiTool: { toolId: 'playwright-java-tdd', className: 'com.srlink.playwright.tdd.ui.LoginLogoutTddTest' },
    apiTool: { toolId: 'playwright-java-tdd', className: 'com.srlink.playwright.tdd.api.JsonPlaceholderCrudTddTest' }
  },
  {
    dir: 'playwright-java-bdd-testing',
    imports: [
      ['reports/junit/playwright-java-bdd.xml', 'junit-xml', 'playwright-java-bdd', 'UI', 'BDD'],
      ['reports/junit/playwright-java-bdd-api.xml', 'junit-xml', 'playwright-java-bdd', 'API', 'BDD']
    ],
    uiTool: { toolId: 'playwright-java-bdd', className: 'com.srlink.playwright.bdd.ui.RunCucumberUiTest' },
    apiTool: { toolId: 'playwright-java-bdd', className: 'com.srlink.playwright.bdd.api.RunCucumberApiTest' }
  },
  {
    dir: 'playwright-ts-tdd-testing',
    imports: [
      ['reports/playwright/playwright-ts-tdd-ui.json', 'playwright-json', 'playwright-ts-tdd', 'UI', 'TDD'],
      ['reports/playwright/playwright-ts-tdd-api.json', 'playwright-json', 'playwright-ts-tdd', 'API', 'TDD']
    ]
  },
  {
    dir: 'cypress-ts-tdd-testing',
    imports: [
      ['reports/junit/cypress-tdd.xml', 'junit-xml', 'cypress-tdd', 'UI', 'TDD']
    ],
    uiTool: { toolId: 'cypress-tdd', className: 'cypress.ui.tdd.loginLogout' }
  },
  {
    dir: 'cypress-ts-bdd-testing',
    imports: [
      ['reports/junit/cypress-bdd.xml', 'junit-xml', 'cypress-bdd', 'UI', 'BDD']
    ],
    uiTool: { toolId: 'cypress-bdd', className: 'cypress.ui.bdd.loginLogout' }
  },
  {
    dir: 'wdio-ts-tdd-testing',
    imports: [
      ['reports/junit/wdio-java-tdd.xml', 'junit-xml', 'wdio-java-tdd', 'UI', 'TDD']
    ],
    uiTool: { toolId: 'wdio-java-tdd', className: 'wdio.ui.tdd.loginLogout' }
  },
  {
    dir: 'wdio-ts-bdd-testing',
    imports: [
      ['reports/junit/wdio-java-bdd.xml', 'junit-xml', 'wdio-java-bdd', 'UI', 'BDD']
    ],
    uiTool: { toolId: 'wdio-java-bdd', className: 'wdio.ui.bdd.loginLogout' }
  }
];

function writeModuleReports(modulePath, module) {
  const junitDir = path.join(modulePath, 'reports', 'junit');
  const playwrightDir = path.join(modulePath, 'reports', 'playwright');
  fs.mkdirSync(junitDir, { recursive: true });
  fs.mkdirSync(playwrightDir, { recursive: true });

  if (module.uiTool) {
    fs.writeFileSync(
      path.join(junitDir, `${module.uiTool.toolId}.xml`),
      junitXml(module.uiTool.toolId, module.uiTool.className, UI_OPERATIONS)
    );
  }
  if (module.apiTool) {
    fs.writeFileSync(
      path.join(junitDir, `${module.apiTool.toolId}-api.xml`),
      junitXml(module.apiTool.toolId, module.apiTool.className, API_OPERATIONS)
    );
  }
  if (module.dir.includes('playwright-ts')) {
    fs.writeFileSync(
      path.join(playwrightDir, 'playwright-ts-tdd-ui.json'),
      JSON.stringify(playwrightJson('playwright-ts-tdd', UI_OPERATIONS), null, 2)
    );
    fs.writeFileSync(
      path.join(playwrightDir, 'playwright-ts-tdd-api.json'),
      JSON.stringify(playwrightJson('playwright-ts-tdd', API_OPERATIONS), null, 2)
    );
  }
}

function syncHistoriesToRoot() {
  const rootAnalytics = path.join(root, '.analytics-data');
  fs.mkdirSync(rootAnalytics, { recursive: true });

  for (const module of MODULES) {
    const moduleAnalytics = path.join(root, module.dir, '.analytics-data');
    if (!fs.existsSync(moduleAnalytics)) continue;

    for (const toolId of fs.readdirSync(moduleAnalytics)) {
      const srcHistory = path.join(moduleAnalytics, toolId, 'history.json');
      if (!fs.existsSync(srcHistory)) continue;

      const destDir = path.join(rootAnalytics, toolId);
      fs.mkdirSync(destDir, { recursive: true });
      const destHistory = path.join(destDir, 'history.json');

      const srcRuns = JSON.parse(fs.readFileSync(srcHistory, 'utf-8'));
      const destRuns = fs.existsSync(destHistory)
        ? JSON.parse(fs.readFileSync(destHistory, 'utf-8'))
        : [];

      const merged = [...destRuns];
      for (const run of srcRuns) {
        if (!merged.some((existing) => existing.runId === run.runId)) {
          merged.push(run);
        }
      }

      merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      fs.writeFileSync(destHistory, JSON.stringify(merged, null, 2));
    }
  }
}

async function main() {
  const { loadConfig } = await import(pathToFileURL(path.join(libRoot, 'config', 'load-config.js')).href);
  const { Orchestrator } = await import(pathToFileURL(path.join(libRoot, 'core', 'orchestrator.js')).href);

  for (const module of MODULES) {
    const modulePath = path.join(root, module.dir);
    const configPath = path.join(modulePath, 'dashboard.config.ts');
    if (!fs.existsSync(configPath)) continue;

    writeModuleReports(modulePath, module);
    const { config } = loadConfig({ configPath, cwd: modulePath });
    const orchestrator = new Orchestrator({ config, cwd: modulePath, packageVersion: '0.2.0' });

    for (const [file, format, tool, appType, methodology] of module.imports) {
      const filePath = path.join(modulePath, file);
      if (!fs.existsSync(filePath)) continue;
      console.log(`Importing ${module.dir} · ${tool} (${appType})...`);
      await orchestrator.importResult(format, filePath, { tool, applicationType: appType, methodology });
    }

    try {
      await orchestrator.generateDashboard({ openBrowser: false });
    } catch {
      // modules with partial tool config may skip generate
    }
  }

  syncHistoriesToRoot();

  const rootConfigPath = path.join(root, 'dashboard.config.ts');
  if (fs.existsSync(rootConfigPath)) {
    const { config } = loadConfig({ configPath: rootConfigPath, cwd: root });
    const rootOrchestrator = new Orchestrator({ config, cwd: root, packageVersion: '0.2.0' });
    console.log('Generating unified Sr Link dashboard...');
    await rootOrchestrator.generateDashboard({ openBrowser: false });
  }

  console.log('Sr Link smoke import complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
