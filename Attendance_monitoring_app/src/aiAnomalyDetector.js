import { parseTime, formatMinutes, addMinutes } from "./timeUtils";
import { getScheduleForStrand } from "./schedules";

/* =========================
 * Tunables / Defaults
 * ========================= */
export const DEFAULT_ANOMALY_OPTIONS = {
  // If minutes late exceeds these, we can still trigger even if ML is inconclusive.
  scheduleThresholds: {
    warn: 15,
    medium: 45,
    high: 75,
  },

  // Percentiles of the learned distance distribution used to assign severity.
  modelPercentiles: {
    low: 0.9,
    medium: 0.95,
    high: 0.99,
  },

  // Minimum records per strand to use modelled detection.
  minimumRecords: 8,

  // Use robust stats (median/MAD) below this size to reduce outlier bias
  robustCutover: 20,

  // If N >= mahalanobisCutover, use Mahalanobis (with regularized covariance)
  mahalanobisCutover: 16,

  // Numerical guardrails
  maxMinutesFeature: 240,
  ridge: 1e-3,
  minStd: 1e-3,

  // Score floors per severity (keeps UI stable)
  minScore: {
    low: 0.55,
    medium: 0.75,
    high: 0.9,
  },
};

const SEVERITY_ORDER = { high: 3, medium: 2, low: 1 };

/* =========================
 * Public API
 * ========================= */
export const detectAttendanceAnomalies = (
  attendanceRecords = [],
  scheduleConfig = {},
  overrides = {}
) => {
  const options = resolveOptions(overrides);

  if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
    return buildEmptyResponse();
  }

  const entries = attendanceRecords
    .map((record, index) => buildFeatureEntry(record, scheduleConfig, index, options))
    .filter(Boolean);

  if (!entries.length) {
    return buildEmptyResponse();
  }

  const grouped = groupByStrand(entries);

  const severityCounts = { high: 0, medium: 0, low: 0 };
  const impactedStudents = new Set();
  const anomalies = [];

  for (const strandEntries of grouped.values()) {
    const strandResults =
      strandEntries.length >= options.minimumRecords
        ? runModelledDetection(strandEntries, options)
        : runFallbackDetection(strandEntries, options);

    for (const anomaly of strandResults) {
      anomalies.push(anomaly);
      severityCounts[anomaly.severity] += 1;
      if (anomaly.studentId) impactedStudents.add(anomaly.studentId);
    }
  }

  anomalies.sort((a, b) => {
    const orderA = SEVERITY_ORDER[a.severity] ?? 0;
    const orderB = SEVERITY_ORDER[b.severity] ?? 0;
    if (orderA !== orderB) return orderB - orderA;
    if (b.metrics.mlScore !== a.metrics.mlScore) return b.metrics.mlScore - a.metrics.mlScore;
    return (a.studentName || "").localeCompare(b.studentName || "");
  });

  return {
    generatedAt: new Date().toISOString(),
    anomalies,
    severityCounts,
    totals: {
      anomalies: anomalies.length,
      impactedStudents: impactedStudents.size,
    },
  };
};

/* =========================
 * Core Flow
 * ========================= */

const runModelledDetection = (entries, options) => {
  const X = entries.map((entry) => entry.features);

  const canMahalanobis = entries.length >= options.mahalanobisCutover;
  const canRobust = entries.length <= options.robustCutover;

  let distances = null;
  let strategy = null;

  if (canMahalanobis) {
    try {
      const stats = computeMahalanobisStats(X, options);
      distances = X.map((vector) => mahalanobisDistance(vector, stats));
      strategy = "mahalanobis";
    } catch (error) {
      console.warn("[anomalyDetection] Mahalanobis failed, falling back to robust stats.", error);
    }
  }

  if (!distances && canRobust) {
    try {
      const stats = computeRobustStats(X, options);
      distances = X.map((vector) => robustDistance(vector, stats));
      strategy = "robust";
    } catch (error) {
      console.warn("[anomalyDetection] Robust stats failed, falling back to z-distance.", error);
    }
  }

  if (!distances) {
    const stats = computeZStats(X, options);
    distances = X.map((vector) => zDistance(vector, stats));
    strategy = strategy || "zscore";
  }

  const thresholds = computeDistanceThresholds(distances, options.modelPercentiles);
  const sortedDistances = [...distances].sort((a, b) => a - b);

  return entries
    .map((entry, index) => {
      const distance = distances[index];

      let severity = determineSeverity(distance, thresholds);
      if (!severity) {
        severity = severityFromMinutes(entry.minutesLate, options.scheduleThresholds);
        if (!severity) return null;
      }

      const calibrated = calibrateScore(sortedDistances, distance);
      const mlScore = Math.max(calibrated, options.minScore[severity] ?? 0);

      return buildAnomaly(entry, severity, mlScore, distance, strategy);
    })
    .filter(Boolean);
};

const runFallbackDetection = (entries, options) =>
  entries
    .map((entry) => {
      const severity = severityFromMinutes(entry.minutesLate, options.scheduleThresholds);
      if (!severity) return null;
      const distance = entry.minutesLate !== null ? entry.minutesLate / 30 : 0;
      const mlScore = Math.max(
        1 - Math.exp(-Math.max(distance, 0)),
        options.minScore[severity] ?? 0
      );
      return buildAnomaly(entry, severity, mlScore, distance, "schedule-fallback");
    })
    .filter(Boolean);

/* =========================
 * Features / Records
 * ========================= */

const buildFeatureEntry = (record, scheduleConfig, ordinal, options) => {
  const strand = (record.strand || "").trim() || "Unknown";
  const scheduleInfo = resolveScheduleInfo(record, scheduleConfig, strand, options);
  const dateInfo = resolveDateInfo(record);
  const studentId = record.studentId || record.id || "";
  const studentName = buildStudentName(record, studentId || "Student");
  const hasCheckIn = Boolean(
    record.timeIn || record.timeInRaw || record.attendanceCreatedAt || record.attendanceUpdatedAt
  );
  const hasCheckOut = Boolean(record.timeOut || record.timeOutRaw);
  const guardianEmail = (record.guardianEmail || record.parent_email || "").trim();

  // Encode day-of-week cyclically
  const dayOfWeek = dateInfo.dateObj ? dateInfo.dateObj.getDay() : null;
  const angle = dayOfWeek !== null ? (2 * Math.PI * dayOfWeek) / 7 : null;
  const sinDay = angle !== null ? Math.sin(angle) : 0;
  const cosDay = angle !== null ? Math.cos(angle) : 0;

  const minutesFeature =
    scheduleInfo.minutesLate !== null
      ? Math.min(scheduleInfo.minutesLate, options.maxMinutesFeature)
      : -1; // sentinel when time not available

  const features = [minutesFeature, sinDay, cosDay, hasCheckIn ? 1 : 0, hasCheckOut ? 1 : 0];

  return {
    record,
    strand,
    ordinal,
    studentId,
    studentName,
    guardianEmail,
    dateLabel: dateInfo.label,
    dateObj: dateInfo.dateObj,
    scheduleInfo,
    minutesLate: scheduleInfo.minutesLate,
    features,
    timeOutLabel:
      record.timeOut ||
      record.timeOutRaw ||
      record.attendanceUpdatedAt ||
      record.attendanceCreatedAt ||
      null,
  };
};

const severityFromMinutes = (minutesLate, thresholds) => {
  if (minutesLate === null || minutesLate === undefined) return null;
  if (minutesLate >= thresholds.high) return "high";
  if (minutesLate >= thresholds.medium) return "medium";
  if (minutesLate >= thresholds.warn) return "low";
  return null;
};

const formatDelay = (minutesLate) => {
  if (minutesLate === null || minutesLate === undefined) return "slightly";
  if (minutesLate <= 2) return "just a couple of minutes";
  if (minutesLate < 15) return `${minutesLate} minutes`;
  if (minutesLate < 60) return `about ${minutesLate} minutes`;

  const hours = Math.floor(minutesLate / 60);
  const mins = minutesLate % 60;
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;

  if (mins === 0) {
    return `about ${hourLabel}`;
  }

  if (mins <= 5) {
    return `about ${hourLabel} and a few minutes`;
  }

  return `about ${hourLabel} and ${mins} minutes`;
};

/* =========================
 * Stats & Distances
 * ========================= */

// Z-stats (mean/std per feature) + diagonal distance
const computeZStats = (matrix, options) => {
  const d = matrix[0].length;
  const n = matrix.length;
  const mean = Array(d).fill(0);
  for (const v of matrix) {
    for (let i = 0; i < d; i++) mean[i] += v[i];
  }
  for (let i = 0; i < d; i++) mean[i] /= n;

  const variance = Array(d).fill(0);
  for (const v of matrix) {
    for (let i = 0; i < d; i++) {
      const dv = v[i] - mean[i];
      variance[i] += dv * dv;
    }
  }
  const std = variance.map((s) => Math.max(Math.sqrt(s / n), options.minStd));
  return { mean, std };
};

const zDistance = (vector, { mean, std }) => {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    const z = (vector[i] - mean[i]) / std[i];
    sum += z * z;
  }
  return Math.sqrt(sum);
};

// Robust stats: median + MAD
const computeRobustStats = (matrix, options) => {
  const d = matrix[0].length;
  const n = matrix.length;

  const median = Array(d).fill(0);
  const mad = Array(d).fill(options.minStd);

  for (let i = 0; i < d; i++) {
    const col = matrix
      .map((v) => v[i])
      .sort((a, b) => a - b);
    const m = col[Math.floor(n / 2)];
    const absDev = col
      .map((x) => Math.abs(x - m))
      .sort((a, b) => a - b);
    const md = absDev[Math.floor(n / 2)] || options.minStd;
    // 1.4826 for normal-consistent MAD
    median[i] = m;
    mad[i] = Math.max(md * 1.4826, options.minStd);
  }

  return { median, mad };
};

const robustDistance = (vector, { median, mad }) => {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    const z = (vector[i] - median[i]) / mad[i];
    sum += z * z;
  }
  return Math.sqrt(sum);
};

// Mahalanobis stats: mean + inverse covariance (regularized)
const computeMahalanobisStats = (matrix, options) => {
  const d = matrix[0].length;
  const n = matrix.length;

  const mean = Array(d).fill(0);
  for (const v of matrix) {
    for (let i = 0; i < d; i++) mean[i] += v[i];
  }
  for (let i = 0; i < d; i++) mean[i] /= n;

  const cov = Array.from({ length: d }, () => Array(d).fill(0));
  for (const v of matrix) {
    for (let i = 0; i < d; i++) {
      const di = v[i] - mean[i];
      for (let j = 0; j < d; j++) {
        cov[i][j] += di * (v[j] - mean[j]);
      }
    }
  }
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      cov[i][j] /= n;
    }
    cov[i][i] += options.ridge; // regularization
  }

  const covInv = invertSymmetricPD(cov); // via Cholesky
  return { mean, covInv };
};

const mahalanobisDistance = (vector, { mean, covInv }) => {
  const d = vector.length;
  const diff = Array(d);
  for (let i = 0; i < d; i++) diff[i] = vector[i] - mean[i];

  const tmp = Array(d).fill(0);
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) tmp[i] += covInv[i][j] * diff[j];
  }
  let q = 0;
  for (let i = 0; i < d; i++) q += diff[i] * tmp[i];
  return Math.sqrt(Math.max(q, 0));
};

/* =========================
 * Thresholds / Scoring
 * ========================= */

const computeDistanceThresholds = (distances, percentiles) => {
  const sorted = [...distances].sort((a, b) => a - b);
  return {
    low: percentile(sorted, percentiles.low),
    medium: percentile(sorted, percentiles.medium),
    high: percentile(sorted, percentiles.high),
  };
};

const percentile = (sortedValues, target) => {
  if (!sortedValues.length) return Infinity;
  const t = Math.min(Math.max(target, 0), 1);
  const rank = t * (sortedValues.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedValues[lower];
  const w = rank - lower;
  return sortedValues[lower] * (1 - w) + sortedValues[upper] * w;
};

const determineSeverity = (distance, thresholds) => {
  if (!Number.isFinite(distance)) return null;
  if (distance >= thresholds.high && thresholds.high > 0) return "high";
  if (distance >= thresholds.medium && thresholds.medium > 0) return "medium";
  if (distance >= thresholds.low && thresholds.low > 0) return "low";
  return null;
};

const calibrateScore = (sortedDistances, d) => {
  if (!sortedDistances.length) return 0.5;
  let lo = 0;
  let hi = sortedDistances.length - 1;
  let pos = sortedDistances.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedDistances[mid] >= d) {
      pos = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  const rank = pos / (sortedDistances.length - 1 || 1);
  return Math.min(Math.max(rank, 0), 1);
};

/* =========================
 * Output Objects
 * ========================= */

const buildAnomaly = (entry, severity, mlScore, distance, strategy = "zscore") => {
  const { record, scheduleInfo } = entry;
  const anomalyId = [
    entry.studentId || "unknown",
    entry.dateLabel || "nodate",
    entry.strand || "nostrand",
    entry.ordinal,
  ].join("-");

  const severityLabel = severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "AI";
  const confidencePercent = Math.round(mlScore * 100);
  const confidenceLabel = `${confidencePercent}%`;
  const headline = `${severityLabel} AI Alert: ${entry.studentName}`;

  let message;
  if (entry.minutesLate !== null) {
    const delayLabel = formatDelay(entry.minutesLate);
    message = `${entry.studentName} checked in ${delayLabel} after the expected ${scheduleInfo.thresholdLabel} arrival time. Our AI highlighted this because the arrival time, weekday trend, and scan history look out of the ordinary for this strand. Confidence: ${confidenceLabel}.`;
  } else if (scheduleInfo.arrivalLabel) {
    message = `Our AI detected an unusual check-in for ${entry.studentName} at ${scheduleInfo.arrivalLabel}. The model looked at arrival timing, weekday trends, and check-in/out behaviour when raising this alert. Confidence: ${confidenceLabel}.`;
  } else {
    message = `Our AI flagged ${entry.studentName}'s attendance log as unusual compared with other students in the same strand. Confidence: ${confidenceLabel}.`;
  }

  return {
    id: anomalyId,
    type: "ml-anomaly",
    severity,
    studentId: entry.studentId || "",
    studentName: entry.studentName,
    strand: entry.strand,
    guardianEmail: entry.guardianEmail || null,
    date: entry.dateLabel,
    headline,
    descriptor: "Model-detected anomaly",
    message,
    timeIn: scheduleInfo.arrivalLabel || null,
    timeOut: entry.timeOutLabel || null,
    metrics: {
      minutesLate: entry.minutesLate,
      mlScore: Number(mlScore.toFixed(3)),
      zScore: null,
      distance: Number(distance.toFixed(3)),
      strategy,
    },
    suggestions: [
      "Check attendance scanner health and schedule conflicts.",
      "If this is a false positive, mark it resolved to refine the model configuration.",
    ],
    recordId: record.attendanceId || null,
  };
};

const buildEmptyResponse = () => ({
  generatedAt: new Date().toISOString(),
  anomalies: [],
  severityCounts: { high: 0, medium: 0, low: 0 },
  totals: { anomalies: 0, impactedStudents: 0 },
});

/* =========================
 * Helpers: schedule/date/name/group
 * ========================= */

const resolveScheduleInfo = (record, scheduleConfig, strand, options) => {
  const schedule = getScheduleForStrand(scheduleConfig, strand) || {};
  const scheduleStart = parseTime(schedule.start);
  const graceMinutes = Number.isFinite(schedule.graceMinutes) ? schedule.graceMinutes : 0;
  const thresholdMinutes =
    scheduleStart !== null ? addMinutes(scheduleStart, graceMinutes ?? 0) : null;

  const arrivalMinutes =
    parseTime(record.timeInRaw) ??
    parseTime(record.timeIn) ??
    parseTime(record.attendanceCreatedAt) ??
    parseTime(record.attendanceUpdatedAt);

  const minutesLate =
    arrivalMinutes !== null && thresholdMinutes !== null
      ? Math.max(arrivalMinutes - thresholdMinutes, 0)
      : null;

  return {
    schedule,
    thresholdMinutes,
    thresholdLabel:
      thresholdMinutes !== null ? formatMinutes(thresholdMinutes) : schedule.start || "schedule start",
    arrivalMinutes,
    arrivalLabel:
      arrivalMinutes !== null
        ? formatMinutes(arrivalMinutes)
        : record.timeIn || record.timeInRaw || record.attendanceCreatedAt || null,
    minutesLate: minutesLate !== null ? Math.min(minutesLate, options.maxMinutesFeature) : null,
  };
};

const resolveDateInfo = (record) => {
  const candidates = [record.date, record.attendanceCreatedAt, record.attendanceUpdatedAt];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = parseDateOnly(candidate);
    if (parsed) {
      return {
        dateObj: parsed,
        label: formatDateLabel(parsed),
      };
    }
  }
  return { dateObj: null, label: record.date || null };
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const maybeISO = new Date(value);
  if (!Number.isNaN(maybeISO.getTime())) {
    return new Date(maybeISO.getFullYear(), maybeISO.getMonth(), maybeISO.getDate());
  }

  const trimmed = `${value}`.trim();
  if (!trimmed) return null;

  const clean = trimmed.split("T")[0];
  const match = clean.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day);
  }
  return null;
};

const formatDateLabel = (dateObj) => {
  if (!dateObj) return null;
  const pad = (num) => String(num).padStart(2, "0");
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
};

const buildStudentName = (record, fallback) => {
  const parts = [record.firstName, record.lastName]
    .map((v) => (v || "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(" ");
  return fallback;
};

const groupByStrand = (entries) => {
  const map = new Map();
  entries.forEach((entry) => {
    const key = entry.strand || "Unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  });
  return map;
};

const resolveOptions = (overrides) => {
  const base = {
    ...DEFAULT_ANOMALY_OPTIONS,
    ...overrides,
  };
  base.scheduleThresholds = {
    ...DEFAULT_ANOMALY_OPTIONS.scheduleThresholds,
    ...(overrides?.scheduleThresholds || {}),
  };
  base.modelPercentiles = {
    ...DEFAULT_ANOMALY_OPTIONS.modelPercentiles,
    ...(overrides?.modelPercentiles || {}),
  };
  base.minScore = {
    ...DEFAULT_ANOMALY_OPTIONS.minScore,
    ...(overrides?.minScore || {}),
  };
  return base;
};

/* =========================
 * Linear Algebra Utils
 * =========================
 * Cholesky-based inverse for symmetric positive-definite matrices.
 */

function invertSymmetricPD(A) {
  const n = A.length;
  const M = Array.from({ length: n }, (_, i) => A[i].slice());
  const L = choleskyDecompose(M);
  const Linv = invertLowerTriangular(L);
  const inv = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = i; k < n; k++) sum += Linv[k][i] * Linv[k][j];
      inv[i][j] = sum;
      inv[j][i] = sum;
    }
  }
  return inv;
}

function choleskyDecompose(A) {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) sum -= A[i][k] * A[j][k];
      if (i === j) {
        if (sum <= 0) throw new Error("Matrix not positive definite (try larger ridge).");
        A[i][j] = Math.sqrt(sum);
      } else {
        A[i][j] = sum / A[j][j];
      }
    }
    for (let j = i + 1; j < n; j++) A[i][j] = 0;
  }
  return A;
}

function invertLowerTriangular(L) {
  const n = L.length;
  const Linv = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    Linv[i][i] = 1 / L[i][i];
    for (let j = 0; j < i; j++) {
      let sum = 0;
      for (let k = j; k < i; k++) sum -= L[i][k] * Linv[k][j];
      Linv[i][j] = sum / L[i][i];
    }
  }
  return Linv;
}
