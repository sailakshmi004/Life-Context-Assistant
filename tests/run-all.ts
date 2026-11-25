import { testActivityValidation } from "./activity-validation.test";
import { testContextRulesEngine } from "./rules-engine.test";
import { testNotificationEngine } from "./notifications-engine.test";
import { testNotificationTransitions } from "./notification-transitions.test";
import { testWeatherRules } from "./weather-rules.test";
import { testAuthSecurity } from "./auth-security.test";
import { testSingleFlight } from "./single-flight.test";

type TestResult = { test: string; passed: boolean; error?: string };

let total = 0;
let passed = 0;

function report(group: string, results: TestResult[]) {
  for (const result of results) {
    total++;
    if (result.passed) {
      passed++;
      console.log(`✔ ${group}: ${result.test}`);
    } else {
      console.error(`❌ ${group}: ${result.test} - ${result.error}`);
    }
  }
}

async function main() {
  console.log("Running Awarely Verification Test Suite...\n");

  report("Rules Engine", testContextRulesEngine());
  report("Activity Validation", testActivityValidation());
  report("Notifications", testNotificationEngine());
  report("Weather rules", testWeatherRules());
  report("Transitions", testNotificationTransitions());
  report("Auth & security", await testAuthSecurity());
  report("Single-flight", await testSingleFlight());

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
