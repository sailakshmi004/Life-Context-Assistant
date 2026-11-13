import { testActivityValidation } from "./activity-validation.test";
import { testContextRulesEngine } from "./rules-engine.test";

function main() {
  console.log("Running Awarely Verification Test Suite (Phases 1-3)...\n");

  let total = 0;
  let passed = 0;

  // 1. Context Rules Engine Tests
  const ruleResults = testContextRulesEngine();
  for (const r of ruleResults) {
    total++;
    if (r.passed) {
      passed++;
      console.log(`✔ Rules Engine: ${r.test}`);
    } else {
      console.error(`❌ Rules Engine: ${r.test} - ${r.error}`);
    }
  }

  // 2. Activity Validation Tests
  const validationResults = testActivityValidation();
  for (const r of validationResults) {
    total++;
    if (r.passed) {
      passed++;
      console.log(`✔ Activity Validation: ${r.test}`);
    } else {
      console.error(`❌ Activity Validation: ${r.test} - ${r.error}`);
    }
  }

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

main();
