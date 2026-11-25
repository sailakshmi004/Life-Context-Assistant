import type {
  Activity,
  EnvironmentalRule,
  HourlyForecast,
  RuleFinding,
} from "@/types";

/**
 * Rule registry.
 *
 * Each rule is an independent evaluator with its own thresholds, message, and
 * suggestion. Adding a new environmental condition means adding one entry here
 * rather than editing a giant conditional block.
 */

export const RULE_LABELS: Record<EnvironmentalRule, string> = {
  rain: "Rain",
  heat: "Heat",
  wind: "Wind",
  humidity: "Humidity",
};

interface RuleContext {
  activity: Activity;
  hours: HourlyForecast[];
}

type RuleEvaluator = (context: RuleContext) => RuleFinding | null;

function hourLabel(hour: HourlyForecast): string {
  // WeatherAPI returns a location-local "YYYY-MM-DD HH:mm" string.
  const parts = hour.time.split(" ");
  if (parts.length === 2) return parts[1];
  const date = new Date(hour.timeEpoch * 1000);
  if (Number.isNaN(date.getTime())) return hour.time;
  return `${String(date.getUTCHours()).padStart(2, "0")}:00`;
}

function hourRange(hours: HourlyForecast[]): string {
  if (hours.length === 0) return "";
  const first = hourLabel(hours[0]);
  const last = hourLabel(hours[hours.length - 1]);
  return first === last ? first : `${first}–${last}`;
}

function activityText(activity: { title: string; category: string }): string {
  return `${activity.title} ${activity.category}`.toLowerCase();
}

function rainSuggestion(activity: Activity): string {
  const text = activityText(activity);
  if (/cloth|laundry|dry/.test(text)) {
    return "Move laundry to an indoor drying rack or postpone until the rain clears.";
  }
  if (/car|vehicle|wash/.test(text)) {
    return "Rain will cause water spots after washing. Delay until clear skies.";
  }
  if (/plant|garden|lawn|herb|watering/.test(text)) {
    return "Rain may be enough to water your garden today; you can skip manual watering.";
  }
  if (/run|jog|bike|cycle|walk|hike|trek|workout|exercise/.test(text)) {
    return "Wet, slippery ground expected. Switch to an indoor workout or use rain gear.";
  }
  if (activity.category === "outdoor") {
    return "Consider moving this indoors or rescheduling to a drier window.";
  }
  return "Consider rescheduling or adjusting the time.";
}

function heatSuggestion(activity: Activity): string {
  const text = activityText(activity);
  if (/car|vehicle|wash/.test(text)) {
    return "Wash in the shade or a cooler part of the day to avoid quick water spots.";
  }
  if (/plant|garden|lawn|herb|watering/.test(text)) {
    return "Water early morning or evening to reduce evaporation.";
  }
  return "Hydrate, take breaks, and prefer a cooler time or an indoor alternative.";
}

function evaluateRain({ activity, hours }: RuleContext): RuleFinding | null {
  if (hours.length === 0) return null;

  const maxRainChance = Math.max(...hours.map((hour) => hour.chanceOfRain), 0);
  const maxPrecip = Math.max(...hours.map((hour) => hour.precipMm), 0);
  const conditions = hours.map((hour) => hour.condition.toLowerCase());
  const hasStorm = conditions.some((condition) => /thunder|storm/.test(condition));
  const hasRainCondition = conditions.some((condition) =>
    /rain|shower|drizzle|thunder/.test(condition)
  );

  if (maxRainChance < 50 && maxPrecip < 0.5 && !hasRainCondition) {
    return null;
  }

  const severity =
    maxRainChance >= 70 || maxPrecip >= 2 || hasStorm ? "danger" : "warning";
  const amount =
    maxPrecip > 0 ? ` (${maxPrecip.toFixed(1)} mm)` : "";
  const message =
    hasRainCondition && maxRainChance < 50
      ? `Rain conditions are forecast between ${hourRange(hours)}.`
      : `${maxRainChance}% chance of rain${amount} between ${hourRange(hours)}.`;

  return {
    rule: "rain",
    severity,
    title: "Rain conflict",
    message,
    suggestion: rainSuggestion(activity),
    evidence: { metric: "rainChance", value: maxRainChance, unit: "%" },
    hours: hours.map(hourLabel),
  };
}

function evaluateHeat({ activity, hours }: RuleContext): RuleFinding | null {
  if (hours.length === 0) return null;

  const maxFeelsLike = Math.max(
    ...hours.map((hour) => hour.feelsLikeC || hour.tempC),
    -Infinity
  );
  if (!Number.isFinite(maxFeelsLike) || maxFeelsLike < 35) return null;

  const severity = maxFeelsLike >= 40 ? "danger" : "warning";

  return {
    rule: "heat",
    severity,
    title: "High heat",
    message: `Feels like ${Math.round(maxFeelsLike)}°C between ${hourRange(hours)}.`,
    suggestion: heatSuggestion(activity),
    evidence: {
      metric: "feelsLikeC",
      value: Math.round(maxFeelsLike),
      unit: "°C",
    },
    hours: hours.map(hourLabel),
  };
}

function evaluateWind({ activity, hours }: RuleContext): RuleFinding | null {
  if (hours.length === 0) return null;

  const maxWind = Math.max(
    ...hours.map((hour) => hour.windSpeedKmh),
    -Infinity
  );
  if (!Number.isFinite(maxWind) || maxWind < 35) return null;

  const severity = maxWind >= 60 ? "danger" : "warning";
  const text = activityText(activity);
  const suggestion = /cloth|laundry|dry/.test(text)
    ? "Strong wind can blow laundry around. Use secure pegs or dry indoors."
    : /plant|garden|lawn/.test(text)
    ? "Avoid spraying or loose gardening tasks until the wind eases."
    : "Secure loose items and consider an indoor alternative.";

  return {
    rule: "wind",
    severity,
    title: "Strong wind",
    message: `Wind up to ${Math.round(maxWind)} km/h between ${hourRange(hours)}.`,
    suggestion,
    evidence: {
      metric: "windSpeedKmh",
      value: Math.round(maxWind),
      unit: "km/h",
    },
    hours: hours.map(hourLabel),
  };
}

function evaluateHumidity({ hours }: RuleContext): RuleFinding | null {
  if (hours.length === 0) return null;

  const average =
    hours.reduce((total, hour) => total + hour.humidity, 0) / hours.length;
  if (average < 80) return null;

  const severity = average >= 90 ? "danger" : "warning";

  return {
    rule: "humidity",
    severity,
    title: "High humidity",
    message: `Average humidity is ${Math.round(average)}% between ${hourRange(hours)}.`,
    suggestion:
      "Clothes may dry slowly. Use an indoor rack or a dryer instead.",
    evidence: {
      metric: "humidity",
      value: Math.round(average),
      unit: "%",
    },
    hours: hours.map(hourLabel),
  };
}

const RULE_EVALUATORS: Record<EnvironmentalRule, RuleEvaluator> = {
  rain: evaluateRain,
  heat: evaluateHeat,
  wind: evaluateWind,
  humidity: evaluateHumidity,
};

/**
 * Picks the rules that make sense for an activity.
 *
 * These defaults are intentionally conservative: indoor work/leisure tasks do
 * not trigger weather alerts. Future per-activity overrides can extend this
 * without changing the evaluators.
 */
export function getRuleTypesForActivity(
  activity: Pick<Activity, "title" | "category">
): EnvironmentalRule[] {
  const text = activityText(activity);
  const isDrying = /cloth|laundry|\bdry\b/.test(text);
  const isCar = /car|vehicle|wash/.test(text);
  const isGarden = /plant|garden|lawn|herb|watering/.test(text);
  const isExercise = /run|jog|bike|cycle|walk|hike|trek|workout|exercise/.test(
    text
  );
  const isOutdoorish =
    activity.category === "outdoor" ||
    activity.category === "fitness" ||
    isDrying ||
    isCar ||
    isGarden ||
    isExercise;

  const rules = new Set<EnvironmentalRule>();
  if (isOutdoorish) rules.add("rain");
  if (
    activity.category === "outdoor" ||
    activity.category === "fitness" ||
    isExercise ||
    isCar ||
    isGarden
  ) {
    rules.add("heat");
  }
  if (isOutdoorish) rules.add("wind");
  if (isDrying) rules.add("humidity");

  return Array.from(rules);
}

/**
 * Evaluates every applicable rule and returns only findings that exceed a
 * threshold. Findings are sorted by severity (danger before warning).
 */
export function evaluateRules(
  activity: Activity,
  hours: HourlyForecast[]
): RuleFinding[] {
  const findings: RuleFinding[] = [];

  for (const rule of getRuleTypesForActivity(activity)) {
    const finding = RULE_EVALUATORS[rule]({ activity, hours });
    if (finding) findings.push(finding);
  }

  return findings.sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === "danger" ? -1 : 1;
  });
}
