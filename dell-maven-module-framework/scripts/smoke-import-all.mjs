import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const libRoot = path.resolve(root, '..', 'dist');

async function main() {
  spawnSync('node', ['scripts/generate-smoke-reports.mjs'], { cwd: root, stdio: 'inherit' });

  const { loadConfig } = await import(pathToFileURL(path.join(libRoot, 'config', 'load-config.js')).href);
  const { Orchestrator } = await import(pathToFileURL(path.join(libRoot, 'core', 'orchestrator.js')).href);

  const { config } = loadConfig({ configPath: path.join(root, 'dashboard.config.ts'), cwd: root });
  const orchestrator = new Orchestrator({ config, cwd: root, packageVersion: '0.2.0' });

  const imports = [
    ['reports/junit/selenium-java-tdd.xml', 'junit-xml', 'selenium-java-tdd', 'UI', 'TDD'],
    ['reports/junit/selenium-java-bdd.xml', 'junit-xml', 'selenium-java-bdd', 'UI', 'BDD'],
    ['reports/junit/playwright-java-tdd.xml', 'junit-xml', 'playwright-java-tdd', 'UI', 'TDD'],
    ['reports/junit/playwright-java-bdd.xml', 'junit-xml', 'playwright-java-bdd', 'UI', 'BDD'],
    ['reports/junit/playwright-java-tdd-api.xml', 'junit-xml', 'playwright-java-tdd', 'API', 'TDD'],
    ['reports/junit/playwright-java-bdd-api.xml', 'junit-xml', 'playwright-java-bdd', 'API', 'BDD'],
    ['reports/playwright/playwright-ts-tdd-ui.json', 'playwright-json', 'playwright-ts-tdd', 'UI', 'TDD'],
    ['reports/playwright/playwright-ts-tdd-api.json', 'playwright-json', 'playwright-ts-tdd', 'API', 'TDD'],
    ['reports/junit/cypress-tdd.xml', 'junit-xml', 'cypress-tdd', 'UI', 'TDD'],
    ['reports/junit/cypress-bdd.xml', 'junit-xml', 'cypress-bdd', 'UI', 'BDD'],
    ['reports/junit/wdio-java-tdd.xml', 'junit-xml', 'wdio-java-tdd', 'UI', 'TDD'],
    ['reports/junit/wdio-java-bdd.xml', 'junit-xml', 'wdio-java-bdd', 'UI', 'BDD']
  ];

  for (const [file, format, tool, appType, methodology] of imports) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;
    console.log(`Importing ${tool} (${appType})...`);
    await orchestrator.importResult(format, filePath, { tool, applicationType: appType, methodology });
  }

  await orchestrator.generateDashboard({ openBrowser: false });
  console.log('DELL smoke import complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
