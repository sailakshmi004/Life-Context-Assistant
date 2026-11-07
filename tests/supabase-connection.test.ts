import { getSupabaseServerClient } from "../lib/supabase/server";
import { isSupabaseConfigured } from "../lib/supabase/client";
import { activityRepository } from "../lib/supabase/activities";

export async function testSupabaseIntegration() {
  console.log("=== Awarely Supabase Integration Verification ===");

  // 1. Check client configuration
  const configured = isSupabaseConfigured();
  console.log("1. Supabase configured:", configured ? "YES" : "NO");
  if (!configured) {
    throw new Error("Supabase is not configured in .env / .env.local");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase server client could not be instantiated");
  }

  // 2. Test reading activities
  console.log("2. Fetching records from public.activities...");
  const { activities, isLiveSupabase } = await activityRepository.getAll();
  console.log(`   isLiveSupabase: ${isLiveSupabase}`);
  console.log(`   Total activities retrieved: ${activities.length}`);

  // 3. Test creating a new activity in Supabase
  console.log("3. Creating a new test activity in Supabase...");
  const testTitle = `Supabase Integration Test - ${new Date().toISOString()}`;
  const createdResult = await activityRepository.create({
    title: testTitle,
    description: "Automated test record created to verify Supabase integration in Awarely",
    category: "outdoor",
    startTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    durationMinutes: 90,
    monitoringEnabled: true,
    status: "pending",
  });

  const newActivity = createdResult.activity;
  console.log("   Inserted Activity ID:", newActivity.id);
  console.log("   Inserted Activity Title:", newActivity.title);
  console.log("   Inserted Activity Category:", newActivity.category);
  console.log("   Is live Supabase:", createdResult.isLiveSupabase);

  // 4. Verify reading back the new activity by ID
  console.log("4. Verifying record persistence by ID...");
  const fetched = await activityRepository.getById(newActivity.id);
  if (!fetched) {
    throw new Error(`Record with ID ${newActivity.id} was not found after insert`);
  }
  console.log("   Verified record in Supabase:", fetched.title === testTitle ? "SUCCESS" : "FAIL");

  // 5. Test updating the activity
  console.log("5. Testing status update on new record...");
  const updated = await activityRepository.update(newActivity.id, {
    status: "in_progress",
  });
  console.log("   Updated status:", updated?.status);

  return {
    success: true,
    createdId: newActivity.id,
    createdTitle: newActivity.title,
    count: activities.length + 1,
  };
}

if (require.main === module) {
  testSupabaseIntegration()
    .then((res) => {
      console.log("\nAll Supabase integration checks passed successfully!");
      console.log("Created Record ID:", res.createdId);
      process.exit(0);
    })
    .catch((err) => {
      console.error("\nSupabase integration test failed:", err);
      process.exit(1);
    });
}
