import fs from 'fs';
import path from 'path';
import type { AssertionMetric, RequestMetric, ResultImporter, ResultImportOptions } from '../core/types.js';
import {
  applyImportContext,
  buildRunMetric,
  resolveImportContext
} from './import-utils.js';

interface ParsedTestCase {
  name: string;
  classname: string;
  timeSec: number;
  failureMessage?: string;
  method?: string;
  url?: string;
  assertions: AssertionMetric[];
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseProperties(attrs: string, body: string): Record<string, string> {
  const props: Record<string, string> = {};
  const propertyRegex = /<property\b([^>]*)\/>|<property\b([^>]*)>([\s\S]*?)<\/property>/gi;
  let match: RegExpExecArray | null;

  while ((match = propertyRegex.exec(body)) !== null) {
    const attrBlock = match[1] ?? match[2] ?? '';
    const nameMatch = attrBlock.match(/\bname="([^"]*)"/i);
    const valueMatch = attrBlock.match(/\bvalue="([^"]*)"/i);
    if (nameMatch) {
      props[decodeXmlEntities(nameMatch[1])] = valueMatch ? decodeXmlEntities(valueMatch[1]) : '';
    }
  }

  const attrMethod = attrs.match(/\bmethod="([^"]*)"/i);
  const attrUrl = attrs.match(/\burl="([^"]*)"/i);
  if (attrMethod) props.method = decodeXmlEntities(attrMethod[1]);
  if (attrUrl) props.url = decodeXmlEntities(attrUrl[1]);

  return props;
}

function parseAssertions(body: string, testName: string, passed: boolean, failureMessage?: string): AssertionMetric[] {
  const assertions: AssertionMetric[] = [];
  const assertionRegex = /<assertion\b([^>]*)\/>|<assertion\b([^>]*)>([\s\S]*?)<\/assertion>/gi;
  let match: RegExpExecArray | null;

  while ((match = assertionRegex.exec(body)) !== null) {
    const attrBlock = match[1] ?? match[2] ?? '';
    const nameMatch = attrBlock.match(/\bname="([^"]*)"/i);
    const passedMatch = attrBlock.match(/\bpassed="([^"]*)"/i);
    const errorMatch = attrBlock.match(/\berror="([^"]*)"/i);
    assertions.push({
      name: nameMatch ? decodeXmlEntities(nameMatch[1]) : testName,
      passed: passedMatch ? passedMatch[1].toLowerCase() === 'true' : passed,
      errorMessage: errorMatch ? decodeXmlEntities(errorMatch[1]) : undefined
    });
  }

  if (assertions.length === 0) {
    assertions.push({
      name: testName,
      passed,
      errorMessage: failureMessage
    });
  }

  return assertions;
}

function parseTestCases(xml: string): { suiteName: string; cases: ParsedTestCase[] } {
  const suiteMatch = xml.match(/<testsuite[^>]*name="([^"]*)"/i);
  const suiteName = suiteMatch ? decodeXmlEntities(suiteMatch[1]) : 'JUnit Suite';

  const cases: ParsedTestCase[] = [];
  const testcaseRegex = /<testcase\b([^>]*)>([\s\S]*?)<\/testcase>|<testcase\b([^>]*)\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = testcaseRegex.exec(xml)) !== null) {
    const attrs = match[1] ?? match[3] ?? '';
    const body = match[2] ?? '';
    const nameMatch = attrs.match(/\bname="([^"]*)"/i);
    const classMatch = attrs.match(/\bclassname="([^"]*)"/i);
    const timeMatch = attrs.match(/\btime="([^"]*)"/i);
    const failureMatch = body.match(/<failure[^>]*>([\s\S]*?)<\/failure>/i);
    const name = nameMatch ? decodeXmlEntities(nameMatch[1]) : 'Unnamed test';
    const failureMessage = failureMatch ? decodeXmlEntities(failureMatch[1].trim()) : undefined;
    const passed = !failureMessage;
    const props = parseProperties(attrs, body);

    cases.push({
      name,
      classname: classMatch ? decodeXmlEntities(classMatch[1]) : 'unknown',
      timeSec: timeMatch ? Number.parseFloat(timeMatch[1]) : 0,
      failureMessage,
      method: props.method ?? props.httpMethod,
      url: props.url ?? props.httpUrl ?? (classMatch ? decodeXmlEntities(classMatch[1]) : 'unknown'),
      assertions: parseAssertions(body, name, passed, failureMessage)
    });
  }

  return { suiteName, cases };
}

function toRequestMetrics(cases: ParsedTestCase[]): RequestMetric[] {
  return cases.map((testCase, index) => ({
    id: `TC-${index + 1}`,
    name: testCase.name,
    method: testCase.method ?? 'TEST',
    url: testCase.url ?? testCase.classname,
    statusCode: testCase.failureMessage ? 500 : 200,
    responseTimeMs: Math.round(testCase.timeSec * 1000),
    assertions: testCase.assertions
  }));
}

export class JunitXmlImporter implements ResultImporter {
  readonly formatId = 'junit-xml';
  readonly label = 'JUnit XML Report';
  readonly supportedExtensions = ['.xml'] as const;

  async importResult(options: ResultImportOptions): Promise<import('../core/types.js').RunMetric> {
    const filePath = path.resolve(options.filePath);
    const xml = fs.readFileSync(filePath, 'utf-8');
    const { suiteName, cases } = parseTestCases(xml);

    if (cases.length === 0) {
      throw new Error(`No test cases found in JUnit XML: ${filePath}`);
    }

    const context = resolveImportContext(options.config, options.importContext);
    const metric = buildRunMetric({
      tool: context.tool,
      sourceName: suiteName,
      requests: toRequestMetrics(cases),
      metadata: {
        reportPath: filePath,
        format: this.formatId
      }
    });

    return applyImportContext(metric, context);
  }
}

export const junitXmlImporter = new JunitXmlImporter();
