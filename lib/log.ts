/**
 * Minimal structured logger.
 *
 * Every line is a JSON object, which is friendlier for Docker log collection
 * than free-form console output.
 */
type LogLevel = "info" | "warn" | "error";

export function log(
  level: LogLevel,
  scope: string,
  message: string,
  extra?: Record<string, unknown>
): void {
  const payload = {
    level,
    scope,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
