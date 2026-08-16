import { registry } from '../core/registry.js';
import { cypressMochawesomeImporter } from './cypress-mochawesome-importer.js';
import { junitXmlImporter } from './junit-xml-importer.js';
import { playwrightJsonImporter } from './playwright-json-importer.js';

export function registerBuiltInImporters(): void {
  registry.registerImporter(junitXmlImporter);
  registry.registerImporter(playwrightJsonImporter);
  registry.registerImporter(cypressMochawesomeImporter);
}
