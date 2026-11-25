import webpush from "web-push";
import type { PushSubscriptionRow } from "@/types";
import { requireSupabase } from "@/lib/supabase/require-client";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushSendResult {
  configured: boolean;
  attempted: number;
  sent: number;
  removed: number;
  failed: number;
}

let vapidConfigured = false;

function isUsable(value: string | undefined): boolean {
  return Boolean(
    value &&
      !value.includes("replace-with") &&
      !value.includes("change-me") &&
      !value.includes("your-")
  );
}

export function isPushConfigured(): boolean {
  return (
    isUsable(process.env.VAPID_PUBLIC_KEY) &&
    isUsable(process.env.VAPID_PRIVATE_KEY) &&
    isUsable(process.env.VAPID_SUBJECT)
  );
}

function ensureVapid(): boolean {
  if (!isPushConfigured()) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    vapidConfigured = true;
  }
  return true;
}

/**
 * Sends a notification to every stored subscription and prunes endpoints the
 * push service reports as gone (404/410).
 */
export async function sendPushToAll(
  payload: PushPayload
): Promise<PushSendResult> {
  const result: PushSendResult = {
    configured: false,
    attempted: 0,
    sent: 0,
    removed: 0,
    failed: 0,
  };

  if (!ensureVapid()) return result;
  result.configured = true;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error) throw new Error(`Failed to load push subscriptions: ${error.message}`);

  const subscriptions = (data ?? []) as PushSubscriptionRow[];
  if (subscriptions.length === 0) return result;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/notifications",
    tag: payload.tag,
  });

  const deadEndpoints: string[] = [];
  const liveEndpoints: string[] = [];

  for (const subscription of subscriptions) {
    result.attempted += 1;
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        body,
        { TTL: 60 * 60 }
      );
      result.sent += 1;
      liveEndpoints.push(subscription.endpoint);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        deadEndpoints.push(subscription.endpoint);
        result.removed += 1;
      } else {
        result.failed += 1;
        console.warn(
          `[push] Delivery failed for ${subscription.endpoint.slice(0, 48)}…`,
          statusCode ?? err
        );
      }
    }
  }

  if (deadEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", deadEndpoints);
  }

  if (liveEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .in("endpoint", liveEndpoints);
  }

  return result;
}
