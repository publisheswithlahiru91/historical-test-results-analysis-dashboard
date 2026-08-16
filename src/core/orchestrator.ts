import type { DashboardConfigFile, RunMetric } from './types.js';
import { HistoryLedger } from './ledger.js';
import { DashboardGenerator } from './dashboard-generator.js';
import path from 'path';
import { registry } from './registry.js';
import { registerBuiltInAdapters } from '../adapters/register-adapters.js';
import { registerBuiltInImporters } from '../importers/register-importers.js';

registerBuiltInAdapters();
registerBuiltInImporters();

export interface OrchestratorOptions {
  config: DashboardConfigFile;
  cwd?: string;
  packageVersion?: string;
}

export class Orchestrator {
  private readonly config: DashboardConfigFile;
  private readonly cwd: string;
  private readonly generator: DashboardGenerator;
  private readonly packageVersion: string;

  constructor(options: OrchestratorOptions) {
    this.config = options.config;
    this.cwd = options.cwd ?? process.cwd();
    this.packageVersion = options.packageVersion ?? '0.1.0';
    this.generator = new DashboardGenerator({
      config: this.config,
      cwd: this.cwd,
      packageVersion: this.packageVersion
    });
  }

  private createLedger(toolId: string): HistoryLedger {
    return new HistoryLedger(this.config, toolId, this.cwd);
  }

  async runTool(toolId: string, inputPath: string): Promise<RunMetric> {
    const adapter = registry.getTool(toolId);

    if (!adapter) {
      const available = registry.listTools().map((tool) => tool.id).join(', ') || 'none';
      throw new Error(`Unknown tool "${toolId}". Available tools: ${available}`);
    }

    const toolConfig = this.config.tools[toolId];
    if (toolConfig && toolConfig.enabled === false) {
      throw new Error(`Tool "${toolId}" is disabled in configuration.`);
    }

    console.log(`\x1b[36m[ORCHESTRATOR]\x1b[0m Running ${adapter.label} against ${inputPath}`);

    const metric = await adapter.execute({
      inputPath,
      config: this.config
    });

    this.recordRun(metric);
    return metric;
  }

  async importResult(
    formatId: string,
    filePath: string,
    importContext?: import('./types.js').ImportContextOptions
  ): Promise<RunMetric> {
    const formatConfig = this.config.importFormats[formatId];
    if (formatConfig && formatConfig.enabled === false) {
      throw new Error(`Import format "${formatId}" is disabled in configuration.`);
    }

    const importer = registry.getImporter(formatId);
    if (!importer) {
      const available = registry.listImporters().map((item) => item.formatId).join(', ') || 'none';
      throw new Error(`Unknown import format "${formatId}". Available formats: ${available}`);
    }

    const metric = await importer.importResult({
      filePath,
      config: this.config,
      importContext
    });

    this.recordRun(metric);
    return metric;
  }

  recordRun(metric: RunMetric): void {
    const enriched = this.enrichMetric(metric);
    const ledger = this.createLedger(enriched.tool);
    ledger.append(enriched);

    console.log(
      `\x1b[32m[LEDGER SUCCESS]\x1b[0m Appended run ${enriched.runId} (${enriched.tool}, ${enriched.status}).`
    );
    console.log(`\x1b[36m[STORAGE]\x1b[0m History: ${ledger.getHistoryPath()}`);
    console.log(`\x1b[36m[STORAGE]\x1b[0m Run snapshot: ${path.join(ledger.getResultsDir(), `${enriched.runId}.json`)}`);
  }

  private enrichMetric(metric: RunMetric): RunMetric {
    const project = this.config.project;
    const enriched = project
      ? {
          ...metric,
          projectId: metric.projectId ?? project.id,
          projectName: metric.projectName ?? project.name,
          frameworkName: metric.frameworkName ?? project.frameworkName,
          applicationType: metric.applicationType ?? project.applicationType,
          methodology: metric.methodology ?? project.methodology
        }
      : metric;

    this.ensureToolStorage(enriched.tool);
    return enriched;
  }

  private ensureToolStorage(toolId: string): void {
    if (!this.config.storage.frameworks[toolId]) {
      this.config.storage.frameworks[toolId] = {
        historyFile: 'history.json',
        resultsDir: 'runs'
      };
    }
  }

  async generateDashboard(options: { openBrowser?: boolean } = {}): Promise<string> {
    return this.generator.generate(options);
  }

  async runAndGenerate(toolId: string, inputPath: string): Promise<string> {
    await this.runTool(toolId, inputPath);
    return this.generateDashboard();
  }
}

export { registry };
