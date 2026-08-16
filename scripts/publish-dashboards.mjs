import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const libRoot = root;

console.log('Building historical-analytics-dashboard...');
spawnSync('npm', ['run', 'build'], { cwd: libRoot, stdio: 'inherit', shell: true });

const projects = [
  { name: 'WK', cwd: path.join(root, 'wk-all-in-one-framework'), script: 'scripts/smoke-import-all.mjs' },
  { name: 'DELL', cwd: path.join(root, 'dell-maven-module-framework'), script: 'scripts/smoke-import-all.mjs' },
  { name: 'Sr Link', cwd: path.join(root, 'sr-link-git-module-framework'), script: 'scripts/smoke-import-all.mjs' }
];

for (const project of projects) {
  console.log(`\n=== ${project.name} smoke import ===`);
  const result = spawnSync('node', [project.script], { cwd: project.cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${project.name} smoke import failed`);
  }
}

console.log('\n=== Management dashboard ===');
spawnSync('node', ['scripts/generate-dashboard.mjs'], {
  cwd: path.join(root, 'dashboard-for-management'),
  stdio: 'inherit'
});

const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });

const copies = [
  [path.join(root, 'wk-all-in-one-framework', 'reports', 'analytics-dashboard.html'), path.join(docsDir, 'wk-dashboard.html')],
  [path.join(root, 'dell-maven-module-framework', 'reports', 'analytics-dashboard.html'), path.join(docsDir, 'dell-dashboard.html')],
  [path.join(root, 'sr-link-git-module-framework', 'reports', 'analytics-dashboard.html'), path.join(docsDir, 'sr-link-dashboard.html')],
  [path.join(root, 'dashboard-for-management', 'reports', 'management-dashboard.html'), path.join(docsDir, 'management-dashboard.html')]
];

for (const [src, dest] of copies) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${dest}`);
  }
}

console.log('\nAll dashboards generated and copied to docs/.');
