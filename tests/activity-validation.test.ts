/**
 * Activity Validation & Data Normalization Test Suite (Phase 2)
 */

import {
  validateCreateActivityInput,
  validateUpdateActivityInput,
  normalizeActivityPayload,
} from "@/lib/validations/activity";

export function testActivityValidation() {
  const results: { test: string; passed: boolean; error?: string }[] = [];

  const assert = (name: string, condition: boolean, errorMsg?: string) => {
    results.push({
      test: name,
      passed: condition,
      error: condition ? undefined : errorMsg || "Assertion failed",
    });
  };

  // Test 1: Valid payload with camelCase
  const validPayload = {
    title: "Drying Clothes",
    description: "Hang laundry outdoors",
    category: "household",
    startTime: "2026-11-07T14:00:00Z",
    durationMinutes: 120,
    monitoringEnabled: true,
  };
  const res1 = validateCreateActivityInput(validPayload);
  assert("Valid camelCase payload passes", res1.isValid && res1.data?.durationMinutes === 120);

  // Test 2: Valid payload with snake_case
  const snakePayload = {
    title: "Morning 5K Run",
    category: "fitness",
    start_time: "2026-11-07T07:00:00Z",
    duration_minutes: 45,
    monitoring_enabled: false,
  };
  const res2 = validateCreateActivityInput(snakePayload);
  assert(
    "Valid snake_case payload normalizes and passes",
    res2.isValid && res2.data?.durationMinutes === 45 && res2.data?.monitoringEnabled === false
  );

  // Test 3: Missing title fails
  const noTitlePayload = {
    category: "outdoor",
    startTime: "2026-11-07T10:00:00Z",
    durationMinutes: 60,
  };
  const res3 = validateCreateActivityInput(noTitlePayload);
  assert("Missing title fails validation", !res3.isValid && Boolean(res3.errors.title));

  // Test 4: Invalid category fails
  const badCategoryPayload = {
    title: "Test",
    category: "invalid_category",
    startTime: "2026-11-07T10:00:00Z",
    durationMinutes: 60,
  };
  const res4 = validateCreateActivityInput(badCategoryPayload);
  assert("Invalid category fails validation", !res4.isValid && Boolean(res4.errors.category));

  // Test 5: Negative or zero duration fails
  const zeroDurationPayload = {
    title: "Test Zero Duration",
    category: "household",
    startTime: "2026-11-07T10:00:00Z",
    durationMinutes: 0,
  };
  const res5 = validateCreateActivityInput(zeroDurationPayload);
  assert("Zero duration fails validation", !res5.isValid && Boolean(res5.errors.durationMinutes));

  // Test 6: Partial update validation (empty fails)
  const emptyUpdate = {};
  const res6 = validateUpdateActivityInput(emptyUpdate);
  assert("Empty update payload fails", !res6.isValid);

  // Test 7: Valid partial update succeeds
  const validUpdate = {
    status: "completed",
    durationMinutes: 90,
  };
  const res7 = validateUpdateActivityInput(validUpdate);
  assert(
    "Valid partial update succeeds",
    res7.isValid && res7.data?.status === "completed" && res7.data?.durationMinutes === 90
  );

  return results;
}
