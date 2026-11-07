import { testActivityValidation } from "./activity-validation.test";
import { runSampleRuleTest } from "./rules-engine.test";

function main() {
  console.log("Running Awarely Phase 2 Verification Test Suite...\n");

  let total = 0;
  let passed = 0;

  // 1. Rule Engine Test
  total++;
  const rulePassed = runSampleRuleTest();
  if (rulePassed) {
    passed++;
    console.log("✔ Context Rules Engine: Correctly flags weather conflict on drying clothes");
  } else {
    console.error("❌ Context Rules Engine test failed");
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
