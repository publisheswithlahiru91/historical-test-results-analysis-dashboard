import type { ResultImporter, ToolAdapter } from '../core/types.js';

export class AdapterRegistry {
  private readonly tools = new Map<string, ToolAdapter>();
  private readonly importers = new Map<string, ResultImporter>();

  registerTool(adapter: ToolAdapter): void {
    this.tools.set(adapter.id, adapter);
  }

  registerImporter(importer: ResultImporter): void {
    this.importers.set(importer.formatId, importer);
  }

  getTool(toolId: string): ToolAdapter | undefined {
    return this.tools.get(toolId);
  }

  getImporter(formatId: string): ResultImporter | undefined {
    return this.importers.get(formatId);
  }

  listTools(): ToolAdapter[] {
    return [...this.tools.values()];
  }

  listImporters(): ResultImporter[] {
    return [...this.importers.values()];
  }
}

export const registry = new AdapterRegistry();
