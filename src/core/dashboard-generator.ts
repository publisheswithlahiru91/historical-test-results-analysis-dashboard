import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import type { DashboardConfigFile, EmbeddedDashboardPayload, RunMetric } from '../core/types.js';
import { listConfiguredFrameworks } from '../config/storage-paths.js';
import { resolveOutputHtmlPath } from '../config/load-config.js';
import { buildManagementFilterOptions } from './management-collector.js';
import { normalizeToolId } from '../config/standard-tools.js';
import { HistoryLedger } from './ledger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DashboardGeneratorOptions {
  config: DashboardConfigFile;
  cwd?: string;
  packageVersion?: string;
}

export class DashboardGenerator {
  private readonly config: DashboardConfigFile;
  private readonly cwd: string;
  private readonly packageVersion: string;

  constructor(options: DashboardGeneratorOptions) {
    this.config = options.config;
    this.cwd = options.cwd ?? process.cwd();
    this.packageVersion = options.packageVersion ?? '0.1.0';
  }

  collectHistory(): RunMetric[] {
    const frameworks = listConfiguredFrameworks(this.config);
    const merged = frameworks.flatMap((framework) => {
      const ledger = new HistoryLedger(this.config, framework, this.cwd);
      return ledger.readAll().map((run) => ({
        ...run,
        tool: normalizeToolId(run.tool)
      }));
    });

    return merged.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  }

  buildPayload(history: RunMetric[]): EmbeddedDashboardPayload {
    return {
      title: this.config.dashboard.title,
      version: this.packageVersion,
      defaultTheme: this.config.dashboard.theme,
      generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      history,
      filterOptions: buildManagementFilterOptions(history, this.config.filters),
      filters: this.config.filters
    };
  }

  renderHtml(payload: EmbeddedDashboardPayload): string {
    const templatePath = path.join(__dirname, '..', 'templates', 'dashboard.template.html');
    const template = fs.readFileSync(templatePath, 'utf-8');
    const serializedPayload = JSON.stringify(payload).replace(/</g, '\\u003c');

    return template.replace('__DASHBOARD_PAYLOAD__', serializedPayload);
  }

  async generate(options: { openBrowser?: boolean } = {}): Promise<string> {
    const history = this.collectHistory();
    const payload = this.buildPayload(history);
    const html = this.renderHtml(payload);
    const outputPath = resolveOutputHtmlPath(this.config, this.cwd);
    const outputDir = path.dirname(outputPath);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf-8');

    console.log(`\x1b[32m[REPORT]\x1b[0m Dashboard HTML generated at ${outputPath}`);
    console.log(`\x1b[36m[DATA]\x1b[0m ${history.length} run(s) embedded from framework storage.`);

    const shouldOpen = options.openBrowser ?? this.config.dashboard.openBrowser;
    if (shouldOpen) {
      void open(outputPath);
    }

    return outputPath;
  }
}
