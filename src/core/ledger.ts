import fs from 'fs';
import path from 'path';
import type { DashboardConfigFile, RunMetric } from '../core/types.js';
import {
  ensureFrameworkStorage,
  resolveFrameworkStorage
} from '../config/storage-paths.js';

export class HistoryLedger {
  private readonly layout: ReturnType<typeof resolveFrameworkStorage>;
  private readonly maxEntries: number;

  constructor(config: DashboardConfigFile, framework: string, cwd = process.cwd()) {
    this.layout = resolveFrameworkStorage(config, framework, cwd);
    this.maxEntries = config.storage.maxHistoryEntries;
    ensureFrameworkStorage(this.layout);
  }

  readAll(): RunMetric[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.layout.historyPath, 'utf-8')) as RunMetric[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  append(metric: RunMetric): void {
    const history = this.readAll();
    history.push(metric);

    while (history.length > this.maxEntries) {
      const removed = history.shift();
      if (removed) {
        this.removeRunSnapshot(removed.runId);
      }
    }

    fs.writeFileSync(this.layout.historyPath, JSON.stringify(history, null, 2));
    this.writeRunSnapshot(metric);
  }

  private writeRunSnapshot(metric: RunMetric): void {
    const snapshotPath = path.join(this.layout.resultsDir, `${metric.runId}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(metric, null, 2));
  }

  private removeRunSnapshot(runId: string): void {
    const snapshotPath = path.join(this.layout.resultsDir, `${runId}.json`);
    if (fs.existsSync(snapshotPath)) {
      fs.unlinkSync(snapshotPath);
    }
  }

  getHistoryPath(): string {
    return this.layout.historyPath;
  }

  getResultsDir(): string {
    return this.layout.resultsDir;
  }
}
