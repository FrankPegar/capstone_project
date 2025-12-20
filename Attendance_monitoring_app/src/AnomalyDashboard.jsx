import React, { useMemo, useState } from "react";
import "./App.css";
import { detectAttendanceAnomalies, DEFAULT_ANOMALY_OPTIONS } from "./aiAnomalyDetector";

const SENSITIVITY_PRESETS = {
  balanced: {
    modelPercentiles: DEFAULT_ANOMALY_OPTIONS.modelPercentiles,
    scheduleThresholds: DEFAULT_ANOMALY_OPTIONS.scheduleThresholds,
  },
  strict: {
    modelPercentiles: { low: 0.85, medium: 0.92, high: 0.97 },
    scheduleThresholds: { warn: 10, medium: 30, high: 60 },
  },
  relaxed: {
    modelPercentiles: { low: 0.93, medium: 0.97, high: 0.995 },
    scheduleThresholds: { warn: 25, medium: 55, high: 85 },
  },
};

const TOLERANCE_PRESETS = {
  standard: {},
  lenient: {
    scheduleThresholds: { warn: 25, medium: 55, high: 90 },
  },
  tight: {
    scheduleThresholds: { warn: 10, medium: 30, high: 60 },
  },
};

const SEVERITY_LABEL = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_CLASS = {
  high: "anomaly-pill anomaly-pill--high",
  medium: "anomaly-pill anomaly-pill--medium",
  low: "anomaly-pill anomaly-pill--low",
};

const mergeOptions = (base, overrides) => {
  const merged = { ...base, ...overrides };
  merged.scheduleThresholds = {
    ...base.scheduleThresholds,
    ...(overrides?.scheduleThresholds || {}),
  };
  merged.modelPercentiles = {
    ...base.modelPercentiles,
    ...(overrides?.modelPercentiles || {}),
  };
  merged.minScore = {
    ...base.minScore,
    ...(overrides?.minScore || {}),
  };
  return merged;
};

export default function AnomalyDashboard({ attendanceRecords = [], scheduleConfig = {} }) {
  const [sensitivity, setSensitivity] = useState("balanced");
  const [tolerance, setTolerance] = useState("standard");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);
  const [resolvedIds, setResolvedIds] = useState(() => new Set());
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const detectionOptions = useMemo(() => {
    const sensitivityPreset = SENSITIVITY_PRESETS[sensitivity] || SENSITIVITY_PRESETS.balanced;
    const tolerancePreset = TOLERANCE_PRESETS[tolerance] || {};
    return mergeOptions(DEFAULT_ANOMALY_OPTIONS, mergeOptions(sensitivityPreset, tolerancePreset));
  }, [sensitivity, tolerance]);

  const detection = useMemo(
    () => detectAttendanceAnomalies(attendanceRecords, scheduleConfig, detectionOptions),
    [attendanceRecords, scheduleConfig, detectionOptions]
  );

  const filteredAnomalies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return detection.anomalies.filter((anomaly) => {
      const matchesSeverity = severityFilter === "all" || anomaly.severity === severityFilter;
      const matchesSearch =
        !term ||
        anomaly.studentName.toLowerCase().includes(term) ||
        (anomaly.message || "").toLowerCase().includes(term);
      const matchesStatus = !onlyUnresolved || !resolvedIds.has(anomaly.id);
      return matchesSeverity && matchesSearch && matchesStatus;
    });
  }, [detection.anomalies, severityFilter, searchTerm, onlyUnresolved, resolvedIds]);

  const markResolved = (id) => {
    if (!id) return;
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toggleExpanded = (id) => {
    if (!id) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const restoreDefaults = () => {
    setSensitivity("balanced");
    setTolerance("standard");
    setSeverityFilter("all");
    setSearchTerm("");
    setOnlyUnresolved(false);
    setResolvedIds(new Set());
  };

  const totals = detection.totals ?? { anomalies: 0, impactedStudents: 0 };
  const severityCounts = detection.severityCounts ?? { high: 0, medium: 0, low: 0 };

  return (
    <div className="anomaly-layout">
      <section className="panel surface">
        <div className="panel-header">
          <h2>Controls</h2>
          <p>Tune anomaly sensitivity to match your tolerance for late arrivals.</p>
        </div>

        <div className="anomaly-controls-grid">
          <label className="filter-box stack">
            <span>Sensitivity</span>
            <select value={sensitivity} onChange={(e) => setSensitivity(e.target.value)}>
              <option value="strict">Tighter</option>
              <option value="balanced">Balanced</option>
              <option value="relaxed">Looser</option>
            </select>
            <small className="anomaly-helper">
              Adjusts how easily lateness triggers a new alert.
            </small>
          </label>

          <label className="filter-box stack">
            <span>Schedule tolerance</span>
            <select value={tolerance} onChange={(e) => setTolerance(e.target.value)}>
              <option value="tight">Tight</option>
              <option value="standard">Standard</option>
              <option value="lenient">Lenient</option>
            </select>
            <small className="anomaly-helper">
              Sets the late minute ladder (warn/medium/high).
            </small>
          </label>

          <label className="filter-box stack">
            <span>Filters</span>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="all">All severities</option>
              <option value="high">High only</option>
              <option value="medium">Medium only</option>
              <option value="low">Low only</option>
            </select>
          </label>

          <label className="filter-box stack">
            <span>Search student or message</span>
            <input
              type="text"
              placeholder="Search by name or note"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>

        <div className="anomaly-control-footer">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={onlyUnresolved}
              onChange={(e) => setOnlyUnresolved(e.target.checked)}
            />
            Show unacknowledged only
          </label>

          <button type="button" className="primary-button ghost" onClick={restoreDefaults}>
            Restore anomaly defaults
          </button>
        </div>
      </section>

      <section className="panel surface">
        <div className="anomaly-header">
          <div className="panel-header">
            <h2>Insights</h2>
            <p>Review the alerts below and acknowledge items once resolved.</p>
          </div>
          <div className="anomaly-metrics">
            <div className="anomaly-metric">
              <span className="anomaly-metric__label">Open Alerts</span>
              <strong className="anomaly-metric__value">{totals.anomalies}</strong>
            </div>
            <div className="anomaly-metric">
              <span className="anomaly-metric__label">Students Impacted</span>
              <strong className="anomaly-metric__value">{totals.impactedStudents}</strong>
            </div>
            <div className="anomaly-pills">
              <span className="anomaly-pill anomaly-pill--high">High {severityCounts.high}</span>
              <span className="anomaly-pill anomaly-pill--medium">
                Medium {severityCounts.medium}
              </span>
              <span className="anomaly-pill anomaly-pill--low">Low {severityCounts.low}</span>
            </div>
          </div>
        </div>

        <div className="anomaly-list">
          {filteredAnomalies.length === 0 && (
            <div className="empty-callout surface anomaly-empty">
              <span className="status-pill status-pill--neutral">No anomalies</span>
              <p>No anomaly alerts match your filters right now.</p>
            </div>
          )}

          {filteredAnomalies.map((anomaly) => {
            const resolved = resolvedIds.has(anomaly.id);
            const expanded = expandedIds.has(anomaly.id);
            return (
              <article
                key={anomaly.id}
                className={`anomaly-card surface anomaly-${anomaly.severity} ${
                  resolved ? "anomaly-resolved" : ""
                }`}
              >
                <header className="anomaly-card__head">
                  <span className={SEVERITY_CLASS[anomaly.severity] || "anomaly-pill"}>
                    {SEVERITY_LABEL[anomaly.severity] || "AI"}
                  </span>
                  <div className="anomaly-card__meta">
                    <strong>{anomaly.studentName}</strong>
                    {anomaly.strand && <span aria-hidden="true"> • {anomaly.strand}</span>}
                    {anomaly.date && <span aria-hidden="true"> • {anomaly.date}</span>}
                  </div>
                </header>

                <div className="anomaly-card__body">
                  <h4>{anomaly.headline}</h4>
                  <p>{anomaly.message}</p>
                  <div className="anomaly-micro">
                    {typeof anomaly.metrics?.minutesLate === "number" && (
                      <span>+{anomaly.metrics.minutesLate} mins</span>
                    )}
                    <span>Confidence: {Math.round((anomaly.metrics?.mlScore || 0) * 100)}%</span>
                    <span className="anomaly-strategy">{anomaly.metrics?.strategy}</span>
                  </div>
                </div>

                <div className="anomaly-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => toggleExpanded(anomaly.id)}
                  >
                    {expanded ? "Hide" : "Details"}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => markResolved(anomaly.id)}
                    disabled={resolved}
                  >
                    {resolved ? "Marked" : "Mark resolved"}
                  </button>
                </div>

                {expanded && (
                  <div className="anomaly-extra">
                    <div>
                      <strong>Strategy:</strong> {anomaly.metrics?.strategy || "model"}
                    </div>
                    {Array.isArray(anomaly.suggestions) && anomaly.suggestions.length > 0 && (
                      <ul className="anomaly-suggestions">
                        {anomaly.suggestions.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
