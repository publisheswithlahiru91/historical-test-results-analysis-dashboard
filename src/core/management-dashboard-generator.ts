import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import type { ManagementDashboardConfigFile, ManagementDashboardPayload } from './types.js';
import { resolveOutputHtmlPath } from '../config/load-config.js';
import { buildManagementFilterOptions, collectManagementHistory } from './management-collector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ManagementDashboardGeneratorOptions {
  config: ManagementDashboardConfigFile;
  cwd?: string;
  packageVersion?: string;
}

export class ManagementDashboardGenerator {
  private readonly config: ManagementDashboardConfigFile;
  private readonly cwd: string;
  private readonly packageVersion: string;

  constructor(options: ManagementDashboardGeneratorOptions) {
    this.config = options.config;
    this.cwd = options.cwd ?? process.cwd();
    this.packageVersion = options.packageVersion ?? '0.1.0';
  }

  async buildPayload(): Promise<ManagementDashboardPayload> {
    const history = await collectManagementHistory(this.config, this.cwd);

    return {
      mode: 'management',
      title: this.config.dashboard.title,
      version: this.packageVersion,
      defaultTheme: this.config.dashboard.theme,
      generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      history,
      filterOptions: buildManagementFilterOptions(history, this.config.management.filters),
      filters: this.config.management.filters
    };
  }

  renderHtml(payload: ManagementDashboardPayload): string {
    const templatePath = path.join(__dirname, '..', 'templates', 'management-dashboard.template.html');
    const template = fs.readFileSync(templatePath, 'utf-8');
    const serializedPayload = JSON.stringify(payload).replace(/</g, '\\u003c');

    return template.replace('__DASHBOARD_PAYLOAD__', serializedPayload);
  }

  async generate(options: { openBrowser?: boolean } = {}): Promise<string> {
    const payload = await this.buildPayload();
    const html = this.renderHtml(payload);
    const outputPath = resolveOutputHtmlPath(this.config, this.cwd);
    const outputDir = path.dirname(outputPath);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf-8');

    console.log(`\x1b[32m[REPORT]\x1b[0m Management dashboard HTML generated at ${outputPath}`);
    console.log(
      `\x1b[36m[DATA]\x1b[0m ${payload.history.length} run(s) embedded from ${this.config.management.sources.length} configured source(s).`
    );

    const shouldOpen = options.openBrowser ?? this.config.dashboard.openBrowser;
    if (shouldOpen) {
      void open(outputPath);
    }

    return outputPath;
  }
}
