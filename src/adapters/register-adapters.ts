import { newmanAdapter } from './newman/newman-adapter.js';
import { registry } from '../core/registry.js';

export function registerBuiltInAdapters(): void {
  registry.registerTool(newmanAdapter);
}
