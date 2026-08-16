#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, loadManagementConfig } from './config/load-config.js';
import { Orchestrator } from './core/orchestrator.js';
import { ManagementDashboardGenerator } from './core/management-dashboard-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')).version as string;

interface ParsedArgs {
  command?: string;
  positional: string[];
  configPath?: string;
  tool?: string;
  format?: string;
  applicationType?: string;
  methodology?: string;
}

function printHelp(): void {
  console.log(`
Historical Test Execution Analysis Dashboard Orchestrator

Usage:
  analytics-dashboard run <input-file> [--tool newman] [--config dashboard.config.ts]
  analytics-dashboard generate [--config dashboard.config.ts]
  analytics-dashboard management-generate [--config dashboard.config.ts]
  analytics-dashboard import <result-file> --format <format-id> [--tool <tool-id>] [--application-type UI|API|Mobile] [--methodology TDD|BDD] [--config dashboard.config.ts]

Options:
  --config, -c   Path to dashboard.config.ts
  --tool, -t     Tool id for run/import (e.g. newman, selenium-java-tdd)
  --format, -f   Result import format id (for import command)
  --application-type  UI, API, or Mobile (import command)
  --methodology  TDD, BDD, or TDD/BDD (import command)
  --help, -h     Show this help message

Configuration:
  Loads dashboard.config.ts from the current directory when present.
  See dashboard.config.example.ts for all supported settings.
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    positional: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--config' || arg === '-c') {
      parsed.configPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--tool' || arg === '-t') {
      parsed.tool = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--format' || arg === '-f') {
      parsed.format = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--application-type') {
      parsed.applicationType = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--methodology') {
      parsed.methodology = argv[index + 1];
      index += 1;
      continue;
    }

    if (!arg.startsWith('-')) {
      if (!parsed.command) {
        parsed.command = arg;
      } else {
        parsed.positional.push(arg);
      }
    }
  }

  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command) {
    printHelp();
    process.exit(1);
  }

  switch (args.command) {
    case 'management-generate': {
      const { config: managementConfig } = loadManagementConfig({
        configPath: args.configPath,
        cwd: process.cwd()
      });
      const managementGenerator = new ManagementDashboardGenerator({
        config: managementConfig,
        packageVersion
      });
      await managementGenerator.generate();
      break;
    }

    case 'run':
    case 'generate':
    case 'import': {
      const { config } = loadConfig({ configPath: args.configPath });
      const orchestrator = new Orchestrator({
        config,
        packageVersion
      });

      if (args.command === 'run') {
        const inputPath = args.positional[0];
        if (!inputPath) {
          console.error('Missing input file. Example: analytics-dashboard run collections/demo.json');
          process.exit(1);
        }

        const toolId = args.tool ?? 'newman';
        await orchestrator.runAndGenerate(toolId, inputPath);
        break;
      }

      if (args.command === 'generate') {
        await orchestrator.generateDashboard();
        break;
      }

      const filePath = args.positional[0];
      if (!filePath) {
        console.error('Missing result file. Example: analytics-dashboard import results/junit.xml --format junit-xml');
        process.exit(1);
      }

      if (!args.format) {
        console.error('Missing --format option for import command.');
        process.exit(1);
      }

      if (!args.tool) {
        console.error('Missing --tool option for import command.');
        process.exit(1);
      }

      await orchestrator.importResult(args.format, filePath, {
        tool: args.tool,
        applicationType: args.applicationType as import('./core/types.js').ApplicationType | undefined,
        methodology: args.methodology
      });
      await orchestrator.generateDashboard();
      break;
    }

    default:
      console.error(`Unknown command "${args.command}".`);
      printHelp();
      process.exit(1);
  }
}

main().catch((error: Error) => {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${error.message}`);
  process.exit(1);
});
