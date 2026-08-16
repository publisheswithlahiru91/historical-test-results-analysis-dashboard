/** Canonical tool ids shown in dashboard Tool filters. Application Type (UI/API/Mobile) distinguishes variants. */
export const STANDARD_TOOL_IDS = [
  'cypress-bdd',
  'cypress-tdd',
  'newman',
  'playwright-java-bdd',
  'playwright-java-tdd',
  'playwright-ts-tdd',
  'selenium-java-bdd',
  'selenium-java-tdd',
  'wdio-java-bdd',
  'wdio-java-tdd'
] as const;

export type StandardToolId = (typeof STANDARD_TOOL_IDS)[number];

/** Maps legacy tool ids from older imports to the canonical id. */
export const LEGACY_TOOL_ID_MAP: Record<string, StandardToolId> = {
  'playwright-java-api-tdd': 'playwright-java-tdd',
  'playwright-java-api-bdd': 'playwright-java-bdd',
  'playwright-ts-api-tdd': 'playwright-ts-tdd',
  'cypress-api-tdd': 'cypress-tdd',
  'cypress-api-bdd': 'cypress-bdd',
  'wdio-tdd': 'wdio-java-tdd',
  'wdio-bdd': 'wdio-java-bdd'
};

export function normalizeToolId(toolId: string): string {
  return LEGACY_TOOL_ID_MAP[toolId] ?? toolId;
}
