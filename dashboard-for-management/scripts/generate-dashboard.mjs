import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const libRoot = path.resolve(root, '..', 'dist');

async function main() {
  const { loadManagementConfig } = await import(pathToFileURL(path.join(libRoot, 'config', 'load-config.js')).href);
  const { ManagementDashboardGenerator } = await import(
    pathToFileURL(path.join(libRoot, 'core', 'management-dashboard-generator.js')).href
  );

  const { config } = loadManagementConfig({
    configPath: path.join(root, 'dashboard.config.ts'),
    cwd: root
  });

  const generator = new ManagementDashboardGenerator({
    config,
    cwd: root,
    packageVersion: '0.2.0'
  });

  const outputPath = await generator.generate();
  console.log(`Management dashboard generated at ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
