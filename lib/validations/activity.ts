import {
  ActivityCategory,
  ActivityStatus,
  ActivityValidationErrors,
  CreateActivityInput,
  UpdateActivityInput,
} from "@/types";

export const VALID_CATEGORIES: ActivityCategory[] = [
  "household",
  "outdoor",
  "fitness",
  "work",
  "leisure",
];

export const VALID_STATUSES: ActivityStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

/**
 * Normalizes an unknown payload to standard CreateActivityInput format.
 * Accepts both camelCase (startTime) and snake_case (start_time).
 */
export function normalizeActivityPayload(
  raw: Record<string, unknown>
): Record<string, unknown> {
  return {
    title: raw.title,
    description: raw.description,
    category: raw.category,
    startTime: raw.startTime ?? raw.start_time,
    durationMinutes: raw.durationMinutes ?? raw.duration_minutes,
    monitoringEnabled: raw.monitoringEnabled ?? raw.monitoring_enabled,
    status: raw.status,
  };
}

/**
 * Validates a payload for creating a new activity.
 */
export function validateCreateActivityInput(raw: unknown): {
  isValid: boolean;
  errors: ActivityValidationErrors;
  data?: CreateActivityInput;
} {
  const errors: ActivityValidationErrors = {};

  if (!raw || typeof raw !== "object") {
    return {
      isValid: false,
      errors: { title: "Payload must be a valid JSON object" },
    };
  }

  const normalized = normalizeActivityPayload(raw as Record<string, unknown>);

  // 1. Title
  if (
    typeof normalized.title !== "string" ||
    normalized.title.trim().length === 0
  ) {
    errors.title = "Activity title is required.";
  } else if (normalized.title.trim().length > 255) {
    errors.title = "Title cannot exceed 255 characters.";
  }

  // 2. Category
  if (!normalized.category) {
    errors.category = `Category is required. Must be one of: ${VALID_CATEGORIES.join(", ")}.`;
  } else if (
    !VALID_CATEGORIES.includes(normalized.category as ActivityCategory)
  ) {
    errors.category = `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}.`;
  }

  // 3. Duration Minutes
  const durationNum = Number(normalized.durationMinutes);
  if (
    normalized.durationMinutes === undefined ||
    normalized.durationMinutes === null ||
    isNaN(durationNum)
  ) {
    errors.durationMinutes = "Duration in minutes is required.";
  } else if (!Number.isInteger(durationNum) || durationNum <= 0) {
    errors.durationMinutes = "Duration must be a positive integer greater than 0.";
  } else if (durationNum > 1440) {
    errors.durationMinutes = "Duration cannot exceed 1440 minutes (24 hours).";
  }

  // 4. Start Time
  if (
    typeof normalized.startTime !== "string" ||
    normalized.startTime.trim().length === 0
  ) {
    errors.startTime = "Start time is required.";
  } else {
    // Validate if it's a valid date or valid time format
    const parsedDate = new Date(normalized.startTime);
    const isIsoOrValidDate = !isNaN(parsedDate.getTime());
    // Also accept clean "HH:MM AM/PM" or "HH:MM"
    const isTimeFormat = /^(\d{1,2}:\d{2}\s?(AM|PM)?|\d{1,2}:\d{2})$/i.test(
      normalized.startTime.trim()
    );

    if (!isIsoOrValidDate && !isTimeFormat) {
      errors.startTime = "Start time must be a valid date or time format (e.g. 2026-11-07T14:00:00Z or '2:00 PM').";
    }
  }

  // 5. Status (Optional on create, defaults to 'pending')
  if (
    normalized.status !== undefined &&
    normalized.status !== null &&
    !VALID_STATUSES.includes(normalized.status as ActivityStatus)
  ) {
    errors.status = `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.`;
  }

  // 6. Monitoring Enabled (Optional on create, defaults to true)
  if (
    normalized.monitoringEnabled !== undefined &&
    typeof normalized.monitoringEnabled !== "boolean"
  ) {
    errors.monitoringEnabled = "monitoringEnabled must be a boolean.";
  }

  // 7. Description (Optional)
  let cleanDescription: string | null = null;
  if (normalized.description !== undefined && normalized.description !== null) {
    if (typeof normalized.description !== "string") {
      errors.description = "Description must be a string.";
    } else {
      cleanDescription = normalized.description.trim() || null;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  // Normalize start time to ISO string if it's parseable
  let finalStartTime = (normalized.startTime as string).trim();
  const dateObj = new Date(finalStartTime);
  if (!isNaN(dateObj.getTime())) {
    finalStartTime = dateObj.toISOString();
  }

  return {
    isValid: true,
    errors: {},
    data: {
      title: (normalized.title as string).trim(),
      description: cleanDescription,
      category: normalized.category as ActivityCategory,
      startTime: finalStartTime,
      durationMinutes: durationNum,
      monitoringEnabled:
        typeof normalized.monitoringEnabled === "boolean"
          ? normalized.monitoringEnabled
          : true,
      status: (normalized.status as ActivityStatus) || "pending",
    },
  };
}

/**
 * Validates a payload for updating an existing activity (PATCH).
 */
export function validateUpdateActivityInput(raw: unknown): {
  isValid: boolean;
  errors: ActivityValidationErrors;
  data?: UpdateActivityInput;
} {
  const errors: ActivityValidationErrors = {};

  if (!raw || typeof raw !== "object") {
    return {
      isValid: false,
      errors: { title: "Payload must be a valid JSON object" },
    };
  }

  const normalized = normalizeActivityPayload(raw as Record<string, unknown>);
  const data: UpdateActivityInput = {};
  let fieldsProvided = 0;

  // Title
  if (normalized.title !== undefined) {
    fieldsProvided++;
    if (
      typeof normalized.title !== "string" ||
      normalized.title.trim().length === 0
    ) {
      errors.title = "Title cannot be empty.";
    } else if (normalized.title.trim().length > 255) {
      errors.title = "Title cannot exceed 255 characters.";
    } else {
      data.title = normalized.title.trim();
    }
  }

  // Description
  if (normalized.description !== undefined) {
    fieldsProvided++;
    if (normalized.description === null) {
      data.description = null;
    } else if (typeof normalized.description !== "string") {
      errors.description = "Description must be a string or null.";
    } else {
      data.description = normalized.description.trim() || null;
    }
  }

  // Category
  if (normalized.category !== undefined) {
    fieldsProvided++;
    if (!VALID_CATEGORIES.includes(normalized.category as ActivityCategory)) {
      errors.category = `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}.`;
    } else {
      data.category = normalized.category as ActivityCategory;
    }
  }

  // Duration
  if (normalized.durationMinutes !== undefined) {
    fieldsProvided++;
    const num = Number(normalized.durationMinutes);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
      errors.durationMinutes = "Duration must be a positive integer greater than 0.";
    } else if (num > 1440) {
      errors.durationMinutes = "Duration cannot exceed 1440 minutes (24 hours).";
    } else {
      data.durationMinutes = num;
    }
  }

  // Start Time
  if (normalized.startTime !== undefined) {
    fieldsProvided++;
    if (
      typeof normalized.startTime !== "string" ||
      normalized.startTime.trim().length === 0
    ) {
      errors.startTime = "Start time cannot be empty.";
    } else {
      const parsedDate = new Date(normalized.startTime);
      const isIsoOrValidDate = !isNaN(parsedDate.getTime());
      const isTimeFormat = /^(\d{1,2}:\d{2}\s?(AM|PM)?|\d{1,2}:\d{2})$/i.test(
        normalized.startTime.trim()
      );
      if (!isIsoOrValidDate && !isTimeFormat) {
        errors.startTime = "Start time must be a valid date or time format.";
      } else {
        data.startTime = isIsoOrValidDate
          ? parsedDate.toISOString()
          : normalized.startTime.trim();
      }
    }
  }

  // Monitoring Enabled
  if (normalized.monitoringEnabled !== undefined) {
    fieldsProvided++;
    if (typeof normalized.monitoringEnabled !== "boolean") {
      errors.monitoringEnabled = "monitoringEnabled must be a boolean.";
    } else {
      data.monitoringEnabled = normalized.monitoringEnabled;
    }
  }

  // Status
  if (normalized.status !== undefined) {
    fieldsProvided++;
    if (!VALID_STATUSES.includes(normalized.status as ActivityStatus)) {
      errors.status = `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.`;
    } else {
      data.status = normalized.status as ActivityStatus;
    }
  }

  if (fieldsProvided === 0) {
    return {
      isValid: false,
      errors: { title: "At least one field must be provided to update." },
    };
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, errors: {}, data };
}
