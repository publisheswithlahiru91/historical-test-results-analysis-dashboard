import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(root, '..');

const SR_LINK_ENV = `SR_LINK_APPLICATION_URL=https://opensource-demo.orangehrmlive.com/
SR_LINK_APPLICATION_USERNAME=Admin
SR_LINK_APPLICATION_PASSWORD=admin123
SR_LINK_BROWSER=chrome
SR_LINK_HEADLESS=false
SR_LINK_API_URL=https://jsonplaceholder.typicode.com/
`;

const GITIGNORE = `node_modules/
target/
reports/
.analytics-data/
`;

function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return rel;
}

function dashboardConfig(toolIds, { applicationType, methodology, importFormats }) {
  const frameworks = Object.fromEntries(
    toolIds.map((id) => [id, { historyFile: 'history.json', resultsDir: 'runs' }])
  );
  const formats = {
    'postman-collection': { enabled: false },
    'newman-json': { enabled: false },
    'junit-xml': { enabled: importFormats.includes('junit-xml') },
    'playwright-json': { enabled: importFormats.includes('playwright-json') },
    'cypress-mochawesome': { enabled: false }
  };
  return `import type { DashboardConfigFile } from 'historical-analytics-dashboard';

const config: DashboardConfigFile = {
  dashboard: {
    title: 'Sr Link - Historical Analytics Dashboard',
    theme: 'light',
    openBrowser: true,
    output: {
      htmlFile: 'reports/analytics-dashboard.html'
    },
    thresholds: {
      warningResponseTimeMs: 1000
    }
  },
  storage: {
    rootDir: '.analytics-data',
    maxHistoryEntries: 100,
    frameworks: ${JSON.stringify(frameworks, null, 6).replace(/"([^"]+)":/g, '$1:')}
  },
  importFormats: ${JSON.stringify(formats, null, 4).replace(/"([^"]+)":/g, '$1:')},
  project: {
    id: 'sr-link',
    name: 'Sr Link',
    frameworkName: 'sr-link-git-module-framework',
    applicationType: '${applicationType}',
    methodology: '${methodology}'
  }
};

export default config;
`;
}

const COPY_JUNIT = fs.readFileSync(
  path.join(base, '..', 'wk-all-in-one-framework', 'scripts', 'copy-junit.mjs'),
  'utf8'
);
const COPY_PLAYWRIGHT_JSON = fs.readFileSync(
  path.join(base, '..', 'wk-all-in-one-framework', 'scripts', 'copy-playwright-json.mjs'),
  'utf8'
);
const COPY_CYPRESS_JUNIT = fs.readFileSync(
  path.join(base, '..', 'wk-all-in-one-framework', 'scripts', 'copy-cypress-junit.mjs'),
  'utf8'
);

const SR_LINK_ENV_CONFIG = `package com.srlink.common;

public final class SrLinkEnvConfig {

  private SrLinkEnvConfig() {
  }

  public static String applicationUrl() {
    return env("SR_LINK_APPLICATION_URL", "https://opensource-demo.orangehrmlive.com/");
  }

  public static String username() {
    return env("SR_LINK_APPLICATION_USERNAME", "Admin");
  }

  public static String password() {
    return env("SR_LINK_APPLICATION_PASSWORD", "admin123");
  }

  public static String apiUrl() {
    return env("SR_LINK_API_URL", "https://jsonplaceholder.typicode.com/");
  }

  public static boolean headless() {
    return Boolean.parseBoolean(env("SR_LINK_HEADLESS", "true"));
  }

  private static String env(String key, String defaultValue) {
    String value = System.getenv(key);
    return value == null || value.isBlank() ? defaultValue : value;
  }
}
`;

const SELENIUM_LOGIN_PAGE = `package com.srlink.selenium.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage {

  private final WebDriver driver;
  private final By username = By.name("username");
  private final By password = By.name("password");
  private final By submit = By.cssSelector("button[type='submit']");

  public LoginPage(WebDriver driver) {
    this.driver = driver;
  }

  public LoginPage open(String url) {
    driver.get(url);
    return this;
  }

  public DashboardPage loginAs(String user, String pass) {
    driver.findElement(username).sendKeys(user);
    driver.findElement(password).sendKeys(pass);
    driver.findElement(submit).click();
    return new DashboardPage(driver);
  }

  public boolean isLoaded() {
    return driver.findElements(username).size() > 0;
  }
}
`;

const SELENIUM_DASHBOARD_PAGE = `package com.srlink.selenium.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class DashboardPage {

  private final WebDriver driver;
  private final By userMenu = By.cssSelector(".oxd-userdropdown-tab");
  private final By logoutLink = By.xpath("//a[contains(text(),'Logout')]");

  public DashboardPage(WebDriver driver) {
    this.driver = driver;
  }

  public boolean isLoaded() {
    return new WebDriverWait(driver, Duration.ofSeconds(15))
        .until(d -> d.findElements(userMenu).size() > 0);
  }

  public LoginPage logout() {
    driver.findElement(userMenu).click();
    new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.elementToBeClickable(logoutLink))
        .click();
    return new LoginPage(driver);
  }
}
`;

const PLAYWRIGHT_LOGIN_PAGE = `package com.srlink.playwright.pages;

import com.microsoft.playwright.Page;

public class LoginPage {

  private final Page page;
  private final String usernameSelector = "input[name='username']";
  private final String passwordSelector = "input[name='password']";
  private final String submitSelector = "button[type='submit']";

  public LoginPage(Page page) {
    this.page = page;
  }

  public LoginPage open(String url) {
    page.navigate(url);
    return this;
  }

  public DashboardPage loginAs(String user, String pass) {
    page.fill(usernameSelector, user);
    page.fill(passwordSelector, pass);
    page.click(submitSelector);
    return new DashboardPage(page);
  }

  public boolean isLoaded() {
    return page.locator(usernameSelector).isVisible();
  }
}
`;

const PLAYWRIGHT_DASHBOARD_PAGE = `package com.srlink.playwright.pages;

import com.microsoft.playwright.Page;

public class DashboardPage {

  private final Page page;
  private final String userMenuSelector = ".oxd-userdropdown-tab";
  private final String logoutSelector = "a:has-text('Logout')";

  public DashboardPage(Page page) {
    this.page = page;
  }

  public boolean isLoaded() {
    return page.locator(userMenuSelector).isVisible();
  }

  public LoginPage logout() {
    page.click(userMenuSelector);
    page.click(logoutSelector);
    return new LoginPage(page);
  }
}
`;

function javaPom(artifactId, name) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.srlink.framework</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>1.0.0-SNAPSHOT</version>
  <packaging>jar</packaging>

  <name>${name}</name>

  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <junit.version>5.10.2</junit.version>
    <playwright.version>1.42.0</playwright.version>
    <selenium.version>4.18.1</selenium.version>
    <cucumber.version>7.15.0</cucumber.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>com.microsoft.playwright</groupId>
      <artifactId>playwright</artifactId>
      <version>\${playwright.version}</version>
    </dependency>
    <dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>\${selenium.version}</version>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>\${junit.version}</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>io.cucumber</groupId>
      <artifactId>cucumber-java</artifactId>
      <version>\${cucumber.version}</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>io.cucumber</groupId>
      <artifactId>cucumber-junit-platform-engine</artifactId>
      <version>\${cucumber.version}</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.platform</groupId>
      <artifactId>junit-platform-suite</artifactId>
      <version>1.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.12.1</version>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <useModulePath>false</useModulePath>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
`;
}

function npmPackage(name, scripts) {
  return JSON.stringify({
    name,
    version: '1.0.0',
    description: `Sr Link — ${name}`,
    scripts: {
      ...scripts,
      'analytics:generate': 'analytics-dashboard generate --config dashboard.config.ts'
    },
    devDependencies: {
      'historical-analytics-dashboard': 'file:../..'
    }
  }, null, 2) + '\n';
}

function readme(folder, tool, runCmd) {
  return `# Sr Link — ${tool}

**Project:** Sr Link | **Framework:** sr-link-git-module-framework | **Folder:** \`${folder}\`

## Prerequisites

- Node.js 18+
- Built library at \`../..\``
${folder.includes('selenium') || folder.includes('playwright-java') ? '- Java 17 and Maven\n' : ''}

## Setup

\`\`\`powershell
cd ..\\..
npm install && npm run build
cd ..\\sr-link-git-module-framework\\${folder}
npm install
${folder.includes('java') ? 'mvn -q dependency:resolve\n' : ''}\`\`\`

## Run tests with dashboard

\`\`\`powershell
${runCmd}
\`\`\`

Copy \`.env\` values or set \`SR_LINK_*\` environment variables before running UI tests.
`;
}

const created = {};

function track(project, file) {
  if (!created[project]) created[project] = [];
  created[project].push(file);
}

// --- selenium-tdd-testing ---
{
  const p = 'selenium-tdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/pom.xml`, javaPom('selenium-tdd-testing', 'Sr Link Selenium TDD')));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['selenium-java-tdd'], { applicationType: 'UI', methodology: 'TDD', importFormats: ['junit-xml'] })));
  track(p, write(`${p}/scripts/copy-junit.mjs`, COPY_JUNIT));
  track(p, write(`${p}/src/main/java/com/srlink/common/SrLinkEnvConfig.java`, SR_LINK_ENV_CONFIG));
  track(p, write(`${p}/src/main/java/com/srlink/selenium/pages/LoginPage.java`, SELENIUM_LOGIN_PAGE));
  track(p, write(`${p}/src/main/java/com/srlink/selenium/pages/DashboardPage.java`, SELENIUM_DASHBOARD_PAGE));
  track(p, write(`${p}/src/test/java/com/srlink/selenium/tdd/LoginLogoutTddTest.java`, `package com.srlink.selenium.tdd;

import com.srlink.common.SrLinkEnvConfig;
import com.srlink.selenium.pages.DashboardPage;
import com.srlink.selenium.pages.LoginPage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginLogoutTddTest {

  private WebDriver driver;

  @BeforeEach
  void setUp() {
    ChromeOptions options = new ChromeOptions();
    if (SrLinkEnvConfig.headless()) {
      options.addArguments("--headless=new");
    }
    driver = new ChromeDriver(options);
  }

  @AfterEach
  void tearDown() {
    if (driver != null) {
      driver.quit();
    }
  }

  @Test
  void shouldLoginAndLogout() {
    DashboardPage dashboard = new LoginPage(driver)
        .open(SrLinkEnvConfig.applicationUrl())
        .loginAs(SrLinkEnvConfig.username(), SrLinkEnvConfig.password());

    assertTrue(dashboard.isLoaded(), "Dashboard should load after login");

    LoginPage loginPage = dashboard.logout();
    assertTrue(loginPage.isLoaded(), "Login page should load after logout");
  }
}
`));
  track(p, write(`${p}/package.json`, npmPackage('sr-link-selenium-tdd-testing', {
    test: 'mvn -Dtest=LoginLogoutTddTest test',
    'analytics:import': 'node scripts/copy-junit.mjs selenium-java-tdd com.srlink.selenium.tdd.LoginLogoutTddTest && analytics-dashboard import reports/junit/selenium-java-tdd.xml --format junit-xml --tool selenium-java-tdd --application-type UI --methodology TDD --config dashboard.config.ts',
    'analytics:run': 'npm run test && npm run analytics:import && npm run analytics:generate'
  })));
  track(p, write(`${p}/README.md`, readme(p, 'Selenium Java TDD', 'npm run analytics:run')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

// --- selenium-bdd-testing ---
{
  const p = 'selenium-bdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/pom.xml`, javaPom('selenium-bdd-testing', 'Sr Link Selenium BDD')));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['selenium-java-bdd'], { applicationType: 'UI', methodology: 'BDD', importFormats: ['junit-xml'] })));
  track(p, write(`${p}/scripts/copy-junit.mjs`, COPY_JUNIT));
  track(p, write(`${p}/src/main/java/com/srlink/common/SrLinkEnvConfig.java`, SR_LINK_ENV_CONFIG));
  track(p, write(`${p}/src/main/java/com/srlink/selenium/pages/LoginPage.java`, SELENIUM_LOGIN_PAGE));
  track(p, write(`${p}/src/main/java/com/srlink/selenium/pages/DashboardPage.java`, SELENIUM_DASHBOARD_PAGE));
  track(p, write(`${p}/src/test/java/com/srlink/selenium/bdd/RunCucumberTest.java`, `package com.srlink.selenium.bdd;

import org.junit.platform.suite.api.ConfigurationParameter;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectClasspathResource;
import org.junit.platform.suite.api.Suite;

import static io.cucumber.junit.platform.engine.Constants.GLUE_PROPERTY_NAME;
import static io.cucumber.junit.platform.engine.Constants.PLUGIN_PROPERTY_NAME;

@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features/selenium")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "com.srlink.selenium.bdd")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME, value = "pretty")
public class RunCucumberTest {
}
`));
  track(p, write(`${p}/src/test/java/com/srlink/selenium/bdd/LoginLogoutStepDefinitions.java`, `package com.srlink.selenium.bdd;

import com.srlink.common.SrLinkEnvConfig;
import com.srlink.selenium.pages.DashboardPage;
import com.srlink.selenium.pages.LoginPage;
import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class LoginLogoutStepDefinitions {

  private WebDriver driver;
  private DashboardPage dashboardPage;

  @Before
  public void setUp() {
    ChromeOptions options = new ChromeOptions();
    if (SrLinkEnvConfig.headless()) {
      options.addArguments("--headless=new");
    }
    driver = new ChromeDriver(options);
  }

  @After
  public void tearDown() {
    if (driver != null) {
      driver.quit();
    }
  }

  @Given("the Sr Link application login page is opened")
  public void openLoginPage() {
    new LoginPage(driver).open(SrLinkEnvConfig.applicationUrl());
  }

  @When("the user logs in with valid credentials")
  public void login() {
    dashboardPage = new LoginPage(driver).loginAs(SrLinkEnvConfig.username(), SrLinkEnvConfig.password());
  }

  @Then("the dashboard should be displayed")
  public void verifyDashboard() {
    assertTrue(dashboardPage.isLoaded(), "Dashboard should be visible");
  }

  @When("the user logs out")
  public void logout() {
    dashboardPage.logout();
  }

  @Then("the login page should be displayed")
  public void verifyLoginPage() {
    assertTrue(new LoginPage(driver).isLoaded(), "Login page should be visible");
  }
}
`));
  track(p, write(`${p}/src/test/resources/features/selenium/login-logout.feature`, `Feature: Sr Link Selenium BDD login and logout

  Scenario: User logs in and logs out
    Given the Sr Link application login page is opened
    When the user logs in with valid credentials
    Then the dashboard should be displayed
    When the user logs out
    Then the login page should be displayed
`));
  track(p, write(`${p}/package.json`, npmPackage('sr-link-selenium-bdd-testing', {
    test: 'mvn -Dtest=RunCucumberTest test',
    'analytics:import': 'node scripts/copy-junit.mjs selenium-java-bdd com.srlink.selenium.bdd.RunCucumberTest && analytics-dashboard import reports/junit/selenium-java-bdd.xml --format junit-xml --tool selenium-java-bdd --application-type UI --methodology BDD --config dashboard.config.ts',
    'analytics:run': 'npm run test && npm run analytics:import && npm run analytics:generate'
  })));
  track(p, write(`${p}/README.md`, readme(p, 'Selenium Java BDD', 'npm run analytics:run')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

// --- playwright-java-tdd-testing ---
{
  const p = 'playwright-java-tdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/pom.xml`, javaPom('playwright-java-tdd-testing', 'Sr Link Playwright Java TDD')));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['playwright-java-tdd', 'playwright-java-api-tdd'], { applicationType: 'UI', methodology: 'TDD', importFormats: ['junit-xml'] })));
  track(p, write(`${p}/scripts/copy-junit.mjs`, COPY_JUNIT));
  track(p, write(`${p}/src/main/java/com/srlink/common/SrLinkEnvConfig.java`, SR_LINK_ENV_CONFIG));
  track(p, write(`${p}/src/main/java/com/srlink/playwright/pages/LoginPage.java`, PLAYWRIGHT_LOGIN_PAGE));
  track(p, write(`${p}/src/main/java/com/srlink/playwright/pages/DashboardPage.java`, PLAYWRIGHT_DASHBOARD_PAGE));
  track(p, write(`${p}/src/test/java/com/srlink/playwright/tdd/ui/LoginLogoutTddTest.java`, `package com.srlink.playwright.tdd.ui;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.srlink.common.SrLinkEnvConfig;
import com.srlink.playwright.pages.DashboardPage;
import com.srlink.playwright.pages.LoginPage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginLogoutTddTest {

  private Playwright playwright;
  private Browser browser;
  private Page page;

  @BeforeEach
  void setUp() {
    playwright = Playwright.create();
    browser = playwright.chromium().launch(
        new BrowserType.LaunchOptions().setHeadless(SrLinkEnvConfig.headless())
    );
    page = browser.newPage();
  }

  @AfterEach
  void tearDown() {
    if (browser != null) {
      browser.close();
    }
    if (playwright != null) {
      playwright.close();
    }
  }

  @Test
  void shouldLoginAndLogout() {
    DashboardPage dashboard = new LoginPage(page)
        .open(SrLinkEnvConfig.applicationUrl())
        .loginAs(SrLinkEnvConfig.username(), SrLinkEnvConfig.password());

    assertTrue(dashboard.isLoaded(), "Dashboard should load after login");

    LoginPage loginPage = dashboard.logout();
    assertTrue(loginPage.isLoaded(), "Login page should load after logout");
  }
}
`));
  track(p, write(`${p}/src/test/java/com/srlink/playwright/tdd/api/JsonPlaceholderCrudTddTest.java`, `package com.srlink.playwright.tdd.api;

import com.microsoft.playwright.APIRequest;
import com.microsoft.playwright.APIRequestContext;
import com.microsoft.playwright.APIResponse;
import com.microsoft.playwright.Playwright;
import com.srlink.common.SrLinkEnvConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonPlaceholderCrudTddTest {

  private Playwright playwright;
  private APIRequestContext request;

  @BeforeEach
  void setUp() {
    playwright = Playwright.create();
    request = playwright.request().newContext(
        new APIRequest.NewContextOptions().setBaseURL(SrLinkEnvConfig.apiUrl())
    );
  }

  @AfterEach
  void tearDown() {
    if (request != null) {
      request.dispose();
    }
    if (playwright != null) {
      playwright.close();
    }
  }

  @Test
  void shouldPerformCrudOnPosts() {
    APIResponse create = request.post("/posts/", new APIRequestContext.PostOptions()
        .setData("{\\"title\\":\\"sr-link\\",\\"body\\":\\"create\\",\\"userId\\":1}"));
    assertEquals(201, create.status());
    assertTrue(create.text().contains("\\"id\\""));

    APIResponse read = request.get("/posts/1");
    assertEquals(200, read.status());
    assertTrue(read.text().contains("\\"id\\": 1"));

    APIResponse update = request.put("/posts/1", new APIRequestContext.PutOptions()
        .setData("{\\"id\\":1,\\"title\\":\\"sr-link-updated\\",\\"body\\":\\"update\\",\\"userId\\":1}"));
    assertEquals(200, update.status());
    assertTrue(update.text().contains("sr-link-updated"));

    APIResponse remove = request.delete("/posts/1");
    assertEquals(200, remove.status());
  }
}
`));
  track(p, write(`${p}/package.json`, npmPackage('sr-link-playwright-java-tdd-testing', {
    'test:ui': 'mvn -Dtest=com.srlink.playwright.tdd.ui.LoginLogoutTddTest test',
    'test:api': 'mvn -Dtest=com.srlink.playwright.tdd.api.JsonPlaceholderCrudTddTest test',
    'analytics:import:ui': 'node scripts/copy-junit.mjs playwright-java-tdd com.srlink.playwright.tdd.ui.LoginLogoutTddTest && analytics-dashboard import reports/junit/playwright-java-tdd.xml --format junit-xml --tool playwright-java-tdd --application-type UI --methodology TDD --config dashboard.config.ts',
    'analytics:import:api': 'node scripts/copy-junit.mjs playwright-java-api-tdd com.srlink.playwright.tdd.api.JsonPlaceholderCrudTddTest && analytics-dashboard import reports/junit/playwright-java-api-tdd.xml --format junit-xml --tool playwright-java-api-tdd --application-type API --methodology TDD --config dashboard.config.ts',
    'analytics:run:ui': 'npm run test:ui && npm run analytics:import:ui && npm run analytics:generate',
    'analytics:run:api': 'npm run test:api && npm run analytics:import:api && npm run analytics:generate'
  })));
  track(p, write(`${p}/README.md`, readme(p, 'Playwright Java TDD (UI + API)', 'npm run analytics:run:ui\nnpm run analytics:run:api')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

// --- playwright-java-bdd-testing ---
{
  const p = 'playwright-java-bdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/pom.xml`, javaPom('playwright-java-bdd-testing', 'Sr Link Playwright Java BDD')));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['playwright-java-bdd', 'playwright-java-api-bdd'], { applicationType: 'UI', methodology: 'BDD', importFormats: ['junit-xml'] })));
  track(p, write(`${p}/scripts/copy-junit.mjs`, COPY_JUNIT));
  track(p, write(`${p}/src/main/java/com/srlink/common/SrLinkEnvConfig.java`, SR_LINK_ENV_CONFIG));
  track(p, write(`${p}/src/main/java/com/srlink/playwright/pages/LoginPage.java`, PLAYWRIGHT_LOGIN_PAGE));
  track(p, write(`${p}/src/main/java/com/srlink/playwright/pages/DashboardPage.java`, PLAYWRIGHT_DASHBOARD_PAGE));
  track(p, write(`${p}/src/test/java/com/srlink/playwright/bdd/ui/RunCucumberUiTest.java`, `package com.srlink.playwright.bdd.ui;

import org.junit.platform.suite.api.ConfigurationParameter;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectClasspathResource;
import org.junit.platform.suite.api.Suite;

import static io.cucumber.junit.platform.engine.Constants.GLUE_PROPERTY_NAME;
import static io.cucumber.junit.platform.engine.Constants.PLUGIN_PROPERTY_NAME;

@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features/playwright/ui")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "com.srlink.playwright.bdd.ui")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME, value = "pretty")
public class RunCucumberUiTest {
}
`));
  track(p, write(`${p}/src/test/java/com/srlink/playwright/bdd/api/RunCucumberApiTest.java`, `package com.srlink.playwright.bdd.api;

import org.junit.platform.suite.api.ConfigurationParameter;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectClasspathResource;
import org.junit.platform.suite.api.Suite;

import static io.cucumber.junit.platform.engine.Constants.GLUE_PROPERTY_NAME;
import static io.cucumber.junit.platform.engine.Constants.PLUGIN_PROPERTY_NAME;

@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features/playwright/api")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "com.srlink.playwright.bdd.api")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME, value = "pretty")
public class RunCucumberApiTest {
}
`));
  track(p, write(`${p}/src/test/java/com/srlink/playwright/bdd/ui/LoginLogoutStepDefinitions.java`, `package com.srlink.playwright.bdd.ui;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.srlink.common.SrLinkEnvConfig;
import com.srlink.playwright.pages.DashboardPage;
import com.srlink.playwright.pages.LoginPage;
import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class LoginLogoutStepDefinitions {

  private Playwright playwright;
  private Browser browser;
  private Page page;
  private DashboardPage dashboardPage;

  @Before
  public void setUp() {
    playwright = Playwright.create();
    browser = playwright.chromium().launch(
        new BrowserType.LaunchOptions().setHeadless(SrLinkEnvConfig.headless())
    );
    page = browser.newPage();
  }

  @After
  public void tearDown() {
    if (browser != null) {
      browser.close();
    }
    if (playwright != null) {
      playwright.close();
    }
  }

  @Given("the Sr Link Playwright login page is opened")
  public void openLoginPage() {
    new LoginPage(page).open(SrLinkEnvConfig.applicationUrl());
  }

  @When("the Playwright user logs in with valid credentials")
  public void login() {
    dashboardPage = new LoginPage(page).loginAs(SrLinkEnvConfig.username(), SrLinkEnvConfig.password());
  }

  @Then("the Playwright dashboard should be displayed")
  public void verifyDashboard() {
    assertTrue(dashboardPage.isLoaded(), "Dashboard should be visible");
  }

  @When("the Playwright user logs out")
  public void logout() {
    dashboardPage.logout();
  }

  @Then("the Playwright login page should be displayed")
  public void verifyLoginPage() {
    assertTrue(new LoginPage(page).isLoaded(), "Login page should be visible");
  }
}
`));
  track(p, write(`${p}/src/test/java/com/srlink/playwright/bdd/api/JsonPlaceholderCrudStepDefinitions.java`, `package com.srlink.playwright.bdd.api;

import com.microsoft.playwright.APIRequest;
import com.microsoft.playwright.APIRequestContext;
import com.microsoft.playwright.APIResponse;
import com.microsoft.playwright.Playwright;
import com.srlink.common.SrLinkEnvConfig;
import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class JsonPlaceholderCrudStepDefinitions {

  private Playwright playwright;
  private APIRequestContext request;
  private APIResponse lastResponse;

  @Before
  public void setUp() {
    playwright = Playwright.create();
    request = playwright.request().newContext(
        new APIRequest.NewContextOptions().setBaseURL(SrLinkEnvConfig.apiUrl())
    );
  }

  @After
  public void tearDown() {
    if (request != null) {
      request.dispose();
    }
    if (playwright != null) {
      playwright.close();
    }
  }

  @When("a new post is created via Playwright API")
  public void createPost() {
    lastResponse = request.post("/posts/", new APIRequestContext.PostOptions()
        .setData("{\\"title\\":\\"sr-link-bdd\\",\\"body\\":\\"create\\",\\"userId\\":1}"));
  }

  @When("post {int} is fetched via Playwright API")
  public void fetchPost(int id) {
    lastResponse = request.get("/posts/" + id);
  }

  @When("post {int} is updated via Playwright API")
  public void updatePost(int id) {
    lastResponse = request.put("/posts/" + id, new APIRequestContext.PutOptions()
        .setData("{\\"id\\":" + id + ",\\"title\\":\\"sr-link-bdd-updated\\",\\"body\\":\\"update\\",\\"userId\\":1}"));
  }

  @When("post {int} is deleted via Playwright API")
  public void deletePost(int id) {
    lastResponse = request.delete("/posts/" + id);
  }

  @Then("the Playwright API response status should be {int}")
  public void verifyStatus(int status) {
    assertEquals(status, lastResponse.status());
  }

  @Then("the Playwright API response body should contain {string}")
  public void verifyBodyContains(String text) {
    assertTrue(lastResponse.text().contains(text));
  }
}
`));
  track(p, write(`${p}/src/test/resources/features/playwright/ui/login-logout.feature`, `Feature: Sr Link Playwright BDD login and logout

  Scenario: User logs in and logs out with Playwright
    Given the Sr Link Playwright login page is opened
    When the Playwright user logs in with valid credentials
    Then the Playwright dashboard should be displayed
    When the Playwright user logs out
    Then the Playwright login page should be displayed
`));
  track(p, write(`${p}/src/test/resources/features/playwright/api/jsonplaceholder-crud.feature`, `Feature: Sr Link Playwright BDD JSONPlaceholder CRUD

  Scenario: CRUD operations on posts
    When a new post is created via Playwright API
    Then the Playwright API response status should be 201
    And the Playwright API response body should contain "id"
    When post 1 is fetched via Playwright API
    Then the Playwright API response status should be 200
    And the Playwright API response body should contain "\\"id\\": 1"
    When post 1 is updated via Playwright API
    Then the Playwright API response status should be 200
    And the Playwright API response body should contain "sr-link-bdd-updated"
    When post 1 is deleted via Playwright API
    Then the Playwright API response status should be 200
`));
  track(p, write(`${p}/package.json`, npmPackage('sr-link-playwright-java-bdd-testing', {
    'test:ui': 'mvn -Dtest=RunCucumberUiTest test',
    'test:api': 'mvn -Dtest=RunCucumberApiTest test',
    'analytics:import:ui': 'node scripts/copy-junit.mjs playwright-java-bdd com.srlink.playwright.bdd.ui.RunCucumberUiTest && analytics-dashboard import reports/junit/playwright-java-bdd.xml --format junit-xml --tool playwright-java-bdd --application-type UI --methodology BDD --config dashboard.config.ts',
    'analytics:import:api': 'node scripts/copy-junit.mjs playwright-java-api-bdd com.srlink.playwright.bdd.api.RunCucumberApiTest && analytics-dashboard import reports/junit/playwright-java-api-bdd.xml --format junit-xml --tool playwright-java-api-bdd --application-type API --methodology BDD --config dashboard.config.ts',
    'analytics:run:ui': 'npm run test:ui && npm run analytics:import:ui && npm run analytics:generate',
    'analytics:run:api': 'npm run test:api && npm run analytics:import:api && npm run analytics:generate'
  })));
  track(p, write(`${p}/README.md`, readme(p, 'Playwright Java BDD (UI + API)', 'npm run analytics:run:ui\nnpm run analytics:run:api')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

// --- playwright-ts-tdd-testing ---
{
  const p = 'playwright-ts-tdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['playwright-ts-tdd', 'playwright-ts-api-tdd'], { applicationType: 'UI', methodology: 'TDD', importFormats: ['playwright-json'] })));
  track(p, write(`${p}/scripts/copy-playwright-json.mjs`, COPY_PLAYWRIGHT_JSON));
  track(p, write(`${p}/playwright.config.ts`, `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  reporter: [['list'], ['json', { outputFile: 'reports/playwright/results.json' }]],
  use: {
    baseURL: process.env.SR_LINK_APPLICATION_URL ?? 'https://opensource-demo.orangehrmlive.com/',
    headless: (process.env.SR_LINK_HEADLESS ?? 'true') !== 'false',
    trace: 'off'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
`));
  track(p, write(`${p}/tests/playwright/ui/tdd/login-logout.spec.ts`, `import { test, expect } from '@playwright/test';

const username = process.env.SR_LINK_APPLICATION_USERNAME ?? 'Admin';
const password = process.env.SR_LINK_APPLICATION_PASSWORD ?? 'admin123';

test('Sr Link Playwright TS UI login and logout', async ({ page }) => {
  await page.goto('/');
  await page.fill("input[name='username']", username);
  await page.fill("input[name='password']", password);
  await page.click("button[type='submit']");
  await expect(page.locator('.oxd-userdropdown-tab')).toBeVisible();
  await page.click('.oxd-userdropdown-tab');
  await page.click("a:has-text('Logout')");
  await expect(page.locator("input[name='username']")).toBeVisible();
});
`));
  track(p, write(`${p}/tests/playwright/api/tdd/jsonplaceholder-crud.spec.ts`, `import { test, expect } from '@playwright/test';

const apiUrl = process.env.SR_LINK_API_URL ?? 'https://jsonplaceholder.typicode.com/';

test('Sr Link Playwright TS API CRUD', async ({ request }) => {
  const create = await request.post(\`\${apiUrl}posts/\`, {
    data: { title: 'sr-link', body: 'create', userId: 1 }
  });
  expect(create.status()).toBe(201);

  const read = await request.get(\`\${apiUrl}posts/1\`);
  expect(read.status()).toBe(200);
  expect(await read.json()).toMatchObject({ id: 1 });

  const update = await request.put(\`\${apiUrl}posts/1\`, {
    data: { id: 1, title: 'sr-link-updated', body: 'update', userId: 1 }
  });
  expect(update.status()).toBe(200);

  const remove = await request.delete(\`\${apiUrl}posts/1\`);
  expect(remove.status()).toBe(200);
});
`));
  track(p, write(`${p}/package.json`, JSON.stringify({
    name: 'sr-link-playwright-ts-tdd-testing',
    version: '1.0.0',
    description: 'Sr Link — Playwright TypeScript TDD (UI + API)',
    scripts: {
      'test:ui': 'playwright test tests/playwright/ui/tdd',
      'test:api': 'playwright test tests/playwright/api/tdd',
      'analytics:import:ui': 'node scripts/copy-playwright-json.mjs playwright-ts-tdd && analytics-dashboard import reports/playwright/playwright-ts-tdd.json --format playwright-json --tool playwright-ts-tdd --application-type UI --methodology TDD --config dashboard.config.ts',
      'analytics:import:api': 'node scripts/copy-playwright-json.mjs playwright-ts-api-tdd && analytics-dashboard import reports/playwright/playwright-ts-api-tdd.json --format playwright-json --tool playwright-ts-api-tdd --application-type API --methodology TDD --config dashboard.config.ts',
      'analytics:run:ui': 'npm run test:ui && npm run analytics:import:ui && npm run analytics:generate',
      'analytics:run:api': 'npm run test:api && npm run analytics:import:api && npm run analytics:generate',
      'analytics:generate': 'analytics-dashboard generate --config dashboard.config.ts'
    },
    devDependencies: {
      '@playwright/test': '^1.42.0',
      'historical-analytics-dashboard': 'file:../..',
      typescript: '^5.4.2'
    }
  }, null, 2) + '\n'));
  track(p, write(`${p}/README.md`, readme(p, 'Playwright TypeScript TDD (UI + API)', 'npm run analytics:run:ui\nnpm run analytics:run:api')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

// --- cypress-ts-tdd-testing ---
{
  const p = 'cypress-ts-tdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['cypress-tdd'], { applicationType: 'UI', methodology: 'TDD', importFormats: ['junit-xml'] })));
  track(p, write(`${p}/scripts/copy-cypress-junit.mjs`, COPY_CYPRESS_JUNIT));
  track(p, write(`${p}/cypress.config.ts`, `import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.SR_LINK_APPLICATION_URL ?? 'https://opensource-demo.orangehrmlive.com/',
    specPattern: 'tests/cypress/**/*.cy.ts',
    supportFile: 'src/main/typescript/cypress/support/e2e.ts',
    video: false,
    reporter: 'junit',
    reporterOptions: {
      mochaFile: 'reports/junit/cypress-[suite].xml',
      toConsole: false
    },
    setupNodeEvents(on, config) {
      config.env.SR_LINK_USERNAME = process.env.SR_LINK_APPLICATION_USERNAME ?? 'Admin';
      config.env.SR_LINK_PASSWORD = process.env.SR_LINK_APPLICATION_PASSWORD ?? 'admin123';
      return config;
    }
  }
});
`));
  track(p, write(`${p}/src/main/typescript/cypress/support/commands.ts`, `declare global {
  namespace Cypress {
    interface Chainable {
      loginOrangeHrm(username: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginOrangeHrm', (username: string, password: string) => {
  cy.get("input[name='username']").type(username);
  cy.get("input[name='password']").type(password);
  cy.get("button[type='submit']").click();
});

export {};
`));
  track(p, write(`${p}/src/main/typescript/cypress/support/e2e.ts`, `import './commands';\n`));
  track(p, write(`${p}/tests/cypress/ui/tdd/login-logout.cy.ts`, `describe('Sr Link Cypress UI TDD', () => {
  it('logs in and logs out', () => {
    cy.visit('/');
    cy.loginOrangeHrm('Admin', 'admin123');
    cy.get('.oxd-userdropdown-tab').should('be.visible');
    cy.get('.oxd-userdropdown-tab').click();
    cy.contains('Logout').click();
    cy.get("input[name='username']").should('be.visible');
  });
});
`));
  track(p, write(`${p}/package.json`, JSON.stringify({
    name: 'sr-link-cypress-ts-tdd-testing',
    version: '1.0.0',
    description: 'Sr Link — Cypress TypeScript TDD',
    scripts: {
      test: 'cypress run --spec tests/cypress/ui/tdd/login-logout.cy.ts',
      'analytics:import': 'node scripts/copy-cypress-junit.mjs cypress-tdd && analytics-dashboard import reports/junit/cypress-tdd.xml --format junit-xml --tool cypress-tdd --application-type UI --methodology TDD --config dashboard.config.ts',
      'analytics:run': 'npm run test && npm run analytics:import && npm run analytics:generate',
      'analytics:generate': 'analytics-dashboard generate --config dashboard.config.ts'
    },
    devDependencies: {
      cypress: '^13.7.0',
      'historical-analytics-dashboard': 'file:../..',
      typescript: '^5.4.2'
    }
  }, null, 2) + '\n'));
  track(p, write(`${p}/README.md`, readme(p, 'Cypress TypeScript TDD', 'npm run analytics:run')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

// --- cypress-ts-bdd-testing ---
{
  const p = 'cypress-ts-bdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['cypress-bdd'], { applicationType: 'UI', methodology: 'BDD', importFormats: ['junit-xml'] })));
  track(p, write(`${p}/scripts/copy-cypress-junit.mjs`, COPY_CYPRESS_JUNIT));
  track(p, write(`${p}/cypress.config.ts`, `import { defineConfig } from 'cypress';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import createEsbuildPlugin from '@badeball/cypress-cucumber-preprocessor/esbuild';

export default defineConfig({
  e2e: {
    baseUrl: process.env.SR_LINK_APPLICATION_URL ?? 'https://opensource-demo.orangehrmlive.com/',
    specPattern: 'tests/cypress/**/*.{feature}',
    supportFile: 'src/main/typescript/cypress/support/e2e.ts',
    video: false,
    reporter: 'junit',
    reporterOptions: {
      mochaFile: 'reports/junit/cypress-[suite].xml',
      toConsole: false
    },
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on('file:preprocessor', createBundler({
        plugins: [createEsbuildPlugin(config)]
      }));
      config.env.SR_LINK_USERNAME = process.env.SR_LINK_APPLICATION_USERNAME ?? 'Admin';
      config.env.SR_LINK_PASSWORD = process.env.SR_LINK_APPLICATION_PASSWORD ?? 'admin123';
      return config;
    }
  }
});
`));
  track(p, write(`${p}/src/main/typescript/cypress/support/e2e.ts`, `import './commands';\n`));
  track(p, write(`${p}/src/main/typescript/cypress/support/commands.ts`, `export {};\n`));
  track(p, write(`${p}/tests/cypress/ui/bdd/login-logout.feature`, `Feature: Sr Link Cypress BDD login logout

  Scenario: Login and logout
    Given the Cypress login page is opened
    When the Cypress user logs in
    Then the Cypress dashboard is visible
    When the Cypress user logs out
    Then the Cypress login page is visible
`));
  track(p, write(`${p}/tests/cypress/ui/bdd/login-logout.steps.ts`, `import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Given('the Cypress login page is opened', () => {
  cy.visit('/');
});

When('the Cypress user logs in', () => {
  cy.get("input[name='username']").type(Cypress.env('SR_LINK_USERNAME') ?? 'Admin');
  cy.get("input[name='password']").type(Cypress.env('SR_LINK_PASSWORD') ?? 'admin123');
  cy.get("button[type='submit']").click();
});

Then('the Cypress dashboard is visible', () => {
  cy.get('.oxd-userdropdown-tab').should('be.visible');
});

When('the Cypress user logs out', () => {
  cy.get('.oxd-userdropdown-tab').click();
  cy.contains('Logout').click();
});

Then('the Cypress login page is visible', () => {
  cy.get("input[name='username']").should('be.visible');
});
`));
  track(p, write(`${p}/package.json`, JSON.stringify({
    name: 'sr-link-cypress-ts-bdd-testing',
    version: '1.0.0',
    description: 'Sr Link — Cypress TypeScript BDD',
    scripts: {
      test: 'cypress run --spec tests/cypress/ui/bdd/login-logout.feature',
      'analytics:import': 'node scripts/copy-cypress-junit.mjs cypress-bdd && analytics-dashboard import reports/junit/cypress-bdd.xml --format junit-xml --tool cypress-bdd --application-type UI --methodology BDD --config dashboard.config.ts',
      'analytics:run': 'npm run test && npm run analytics:import && npm run analytics:generate',
      'analytics:generate': 'analytics-dashboard generate --config dashboard.config.ts'
    },
    devDependencies: {
      '@badeball/cypress-cucumber-preprocessor': '^20.0.5',
      '@bahmutov/cypress-esbuild-preprocessor': '^2.2.0',
      cypress: '^13.7.0',
      'historical-analytics-dashboard': 'file:../..',
      typescript: '^5.4.2'
    }
  }, null, 2) + '\n'));
  track(p, write(`${p}/README.md`, readme(p, 'Cypress TypeScript BDD', 'npm run analytics:run')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

// --- wdio-ts-tdd-testing ---
{
  const p = 'wdio-ts-tdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['wdio-tdd'], { applicationType: 'UI', methodology: 'TDD', importFormats: ['junit-xml'] })));
  track(p, write(`${p}/wdio.conf.ts`, `import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
  runner: 'local',
  specs: ['./tests/wdio/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: process.env.SR_LINK_HEADLESS === 'false' ? [] : ['--headless=new']
    }
  }],
  logLevel: 'error',
  framework: 'mocha',
  reporters: ['spec', ['junit', { outputDir: './reports/junit', outputFileFormat: () => 'wdio-tdd.xml' }]],
  mochaOpts: { ui: 'bdd', timeout: 60000 },
  baseUrl: process.env.SR_LINK_APPLICATION_URL ?? 'https://opensource-demo.orangehrmlive.com/'
};
`));
  track(p, write(`${p}/tests/wdio/ui/tdd/login-logout.spec.ts`, `describe('Sr Link WDIO UI TDD', () => {
  it('logs in and logs out', async () => {
    await browser.url('/');
    await $('input[name="username"]').setValue(process.env.SR_LINK_APPLICATION_USERNAME ?? 'Admin');
    await $('input[name="password"]').setValue(process.env.SR_LINK_APPLICATION_PASSWORD ?? 'admin123');
    await $('button[type="submit"]').click();
    await expect($('.oxd-userdropdown-tab')).toBeDisplayed();
    await $('.oxd-userdropdown-tab').click();
    await $('a=Logout').click();
    await expect($('input[name="username"]')).toBeDisplayed();
  });
});
`));
  track(p, write(`${p}/package.json`, JSON.stringify({
    name: 'sr-link-wdio-ts-tdd-testing',
    version: '1.0.0',
    description: 'Sr Link — WebdriverIO TypeScript TDD',
    scripts: {
      test: 'wdio run wdio.conf.ts',
      'analytics:import': 'analytics-dashboard import reports/junit/wdio-tdd.xml --format junit-xml --tool wdio-tdd --application-type UI --methodology TDD --config dashboard.config.ts',
      'analytics:run': 'npm run test && npm run analytics:import && npm run analytics:generate',
      'analytics:generate': 'analytics-dashboard generate --config dashboard.config.ts'
    },
    devDependencies: {
      '@wdio/cli': '^8.35.1',
      '@wdio/junit-reporter': '^8.32.4',
      '@wdio/local-runner': '^8.35.1',
      '@wdio/mocha-framework': '^8.35.1',
      '@wdio/spec-reporter': '^8.32.4',
      'historical-analytics-dashboard': 'file:../..',
      typescript: '^5.4.2'
    }
  }, null, 2) + '\n'));
  track(p, write(`${p}/README.md`, readme(p, 'WebdriverIO TypeScript TDD', 'npm run analytics:run')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

// --- wdio-ts-bdd-testing ---
{
  const p = 'wdio-ts-bdd-testing';
  track(p, write(`${p}/.env`, SR_LINK_ENV));
  track(p, write(`${p}/.gitignore`, GITIGNORE));
  track(p, write(`${p}/dashboard.config.ts`, dashboardConfig(['wdio-bdd'], { applicationType: 'UI', methodology: 'BDD', importFormats: ['junit-xml'] })));
  track(p, write(`${p}/wdio.bdd.conf.ts`, `import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
  runner: 'local',
  specs: ['./tests/wdio/ui/bdd/**/*.feature'],
  maxInstances: 1,
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: process.env.SR_LINK_HEADLESS === 'false' ? [] : ['--headless=new']
    }
  }],
  logLevel: 'error',
  framework: 'cucumber',
  reporters: ['spec', ['junit', { outputDir: './reports/junit', outputFileFormat: () => 'wdio-bdd.xml' }]],
  cucumberOpts: {
    require: ['./tests/wdio/ui/bdd/**/*.steps.ts'],
    timeout: 60000
  },
  baseUrl: process.env.SR_LINK_APPLICATION_URL ?? 'https://opensource-demo.orangehrmlive.com/'
};
`));
  track(p, write(`${p}/tests/wdio/ui/bdd/login-logout.feature`, `Feature: Sr Link WDIO BDD login logout

  Scenario: Login and logout
    Given the WDIO login page is opened
    When the WDIO user logs in
    Then the WDIO dashboard is visible
    When the WDIO user logs out
    Then the WDIO login page is visible
`));
  track(p, write(`${p}/tests/wdio/ui/bdd/login-logout.steps.ts`, `import { Given, When, Then } from '@wdio/cucumber-framework';

Given('the WDIO login page is opened', async () => {
  await browser.url('/');
});

When('the WDIO user logs in', async () => {
  await $('input[name="username"]').setValue(process.env.SR_LINK_APPLICATION_USERNAME ?? 'Admin');
  await $('input[name="password"]').setValue(process.env.SR_LINK_APPLICATION_PASSWORD ?? 'admin123');
  await $('button[type="submit"]').click();
});

Then('the WDIO dashboard is visible', async () => {
  await expect($('.oxd-userdropdown-tab')).toBeDisplayed();
});

When('the WDIO user logs out', async () => {
  await $('.oxd-userdropdown-tab').click();
  await $('a=Logout').click();
});

Then('the WDIO login page is visible', async () => {
  await expect($('input[name="username"]')).toBeDisplayed();
});
`));
  track(p, write(`${p}/package.json`, JSON.stringify({
    name: 'sr-link-wdio-ts-bdd-testing',
    version: '1.0.0',
    description: 'Sr Link — WebdriverIO TypeScript BDD',
    scripts: {
      test: 'wdio run wdio.bdd.conf.ts',
      'analytics:import': 'analytics-dashboard import reports/junit/wdio-bdd.xml --format junit-xml --tool wdio-bdd --application-type UI --methodology BDD --config dashboard.config.ts',
      'analytics:run': 'npm run test && npm run analytics:import && npm run analytics:generate',
      'analytics:generate': 'analytics-dashboard generate --config dashboard.config.ts'
    },
    devDependencies: {
      '@wdio/cli': '^8.35.1',
      '@wdio/cucumber-framework': '^8.35.1',
      '@wdio/junit-reporter': '^8.32.4',
      '@wdio/local-runner': '^8.35.1',
      '@wdio/spec-reporter': '^8.32.4',
      'historical-analytics-dashboard': 'file:../..',
      typescript: '^5.4.2'
    }
  }, null, 2) + '\n'));
  track(p, write(`${p}/README.md`, readme(p, 'WebdriverIO TypeScript BDD', 'npm run analytics:run')));
  track(p, write(`${p}/.analytics-data/.gitkeep`, ''));
}

console.log(JSON.stringify(created, null, 2));
