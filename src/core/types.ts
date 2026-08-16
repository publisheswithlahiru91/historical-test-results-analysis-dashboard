export type RunStatus = 'Success' | 'Warning' | 'Failure';
export type DashboardTheme = 'light' | 'dark';
export type ApplicationType = 'UI' | 'API' | 'Mobile';
export type TestMethodology = 'TDD' | 'BDD' | 'TDD/BDD';

export interface AssertionMetric {
  name: string;
  passed: boolean;
  errorMessage?: string;
}

export interface RequestMetric {
  id: string;
  name: string;
  method: string;
  url: string;
  statusCode: number;
  responseTimeMs: number;
  assertions: AssertionMetric[];
}

export interface RunSummary {
  totalRequests: number;
  passedAssertions: number;
  failedAssertions: number;
  avgResponseTimeMs: number;
}

export interface RunMetric {
  runId: string;
  tool: string;
  sourceName: string;
  timestamp: string;
  status: RunStatus;
  summary: RunSummary;
  requests: RequestMetric[];
  projectId?: string;
  projectName?: string;
  frameworkName?: string;
  applicationType?: ApplicationType;
  methodology?: TestMethodology | string;
  metadata?: Record<string, unknown>;
}

export interface EmbeddedDashboardPayload {
  title: string;
  version: string;
  defaultTheme: DashboardTheme;
  generatedAt: string;
  history: RunMetric[];
  filterOptions?: ManagementFilterOptions;
  filters?: ManagementFiltersConfig;
}

export interface ManagementFilterOptions {
  applicationTypes: ApplicationType[];
  frameworkNames: string[];
  toolNames: string[];
  projectNames: string[];
}

export interface ManagementFiltersConfig {
  applicationTypes: ApplicationType[];
  toolNames?: string[];
  showFrameworkFilter: boolean;
  showToolFilter: boolean;
  showProjectFilter: boolean;
}

export interface ManagementSourceStorage {
  type: 'filesystem' | 's3' | 'http';
  rootDir?: string;
  bucket?: string;
  prefix?: string;
  region?: string;
  url?: string;
}

export interface ManagementSourceConfig {
  id: string;
  label: string;
  /** Display name for Project filter (e.g. WK, DELL, Sr Link) */
  projectName?: string;
  /** @deprecated Use storage.rootDir with storage.type filesystem */
  storageRoot?: string;
  storage?: ManagementSourceStorage;
  frameworkName: string;
  applicationType: ApplicationType;
  tool: string;
  tools?: string[];
  methodology?: TestMethodology | string;
  enabled?: boolean;
}

export interface ManagementDashboardConfig {
  sources: ManagementSourceConfig[];
  filters: ManagementFiltersConfig;
}

export interface ManagementDashboardPayload extends EmbeddedDashboardPayload {
  mode: 'management';
  filterOptions: ManagementFilterOptions;
  filters: ManagementFiltersConfig;
}

export interface ProjectIdentityConfig {
  id: string;
  name: string;
  frameworkName: string;
  applicationType: ApplicationType;
  methodology?: TestMethodology | string;
}

export interface ToolExecuteOptions {
  inputPath: string;
  config: DashboardConfigFile;
}

export interface ToolAdapter {
  readonly id: string;
  readonly label: string;
  readonly supportedInputFormats: readonly string[];
  execute(options: ToolExecuteOptions): Promise<RunMetric>;
}

export interface ImportContextOptions {
  tool?: string;
  applicationType?: ApplicationType;
  methodology?: TestMethodology | string;
  projectId?: string;
  projectName?: string;
  frameworkName?: string;
}

export interface ResultImportOptions {
  filePath: string;
  config: DashboardConfigFile;
  importContext?: ImportContextOptions;
}

export interface ResultImporter {
  readonly formatId: string;
  readonly label: string;
  readonly supportedExtensions: readonly string[];
  importResult(options: ResultImportOptions): Promise<RunMetric>;
}

export interface DashboardConfigFile {
  dashboard: DashboardUiConfig;
  storage: StorageConfig;
  tools: ToolsConfig;
  importFormats: ImportFormatsConfig;
  project?: ProjectIdentityConfig;
  filters?: ManagementFiltersConfig;
}

export interface ManagementDashboardConfigFile {
  dashboard: DashboardUiConfig;
  management: ManagementDashboardConfig;
}

export interface DashboardUiConfig {
  title: string;
  theme: DashboardTheme;
  openBrowser: boolean;
  output: OutputConfig;
  thresholds: ThresholdConfig;
}

export interface OutputConfig {
  htmlFile: string;
}

export interface StorageConfig {
  rootDir: string;
  maxHistoryEntries: number;
  frameworks: FrameworkStorageMap;
}

export interface FrameworkStorageMap {
  [frameworkId: string]: FrameworkStoragePaths | undefined;
}

export interface FrameworkStoragePaths {
  historyFile: string;
  resultsDir: string;
}

export interface ThresholdConfig {
  warningResponseTimeMs: number;
}

export interface ToolsConfig {
  newman: NewmanToolConfig;
  [toolId: string]: ToolConfig | NewmanToolConfig | undefined;
}

export interface ToolConfig {
  enabled: boolean;
}

export interface NewmanToolConfig extends ToolConfig {
  reporter: string;
  environment?: string;
  globals?: string;
  iterationCount?: number;
  delayRequest?: number;
  timeout?: number;
}

export interface ImportFormatsConfig {
  [formatId: string]: ImportFormatConfig | undefined;
}

export interface ImportFormatConfig {
  enabled: boolean;
}

/** @deprecated Use DashboardConfigFile */
export type AnalyzerConfig = DashboardConfigFile;
