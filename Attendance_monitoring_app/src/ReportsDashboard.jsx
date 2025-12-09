import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./App.css";
import { parseTime, addMinutes } from "./timeUtils";
import { getScheduleForStrand } from "./schedules";

const COLORS = ["#22c55e", "#f97316", "#94a3b8"];

const buildArrivalMeta = (student, scheduleConfig) => {
  const schedule = getScheduleForStrand(scheduleConfig, student.strand);
  const startMinutes = parseTime(schedule.start);
  const thresholdMinutes =
    startMinutes !== null ? addMinutes(startMinutes, schedule.graceMinutes ?? 0) : null;
  const arrivalMinutes = parseTime(student.timeIn);
  const isLate =
    arrivalMinutes !== null &&
    thresholdMinutes !== null &&
    arrivalMinutes > thresholdMinutes;

  return {
    schedule,
    arrivalMinutes,
    thresholdMinutes,
    isLate,
  };
};

export default function ReportsDashboard({ students, scheduleConfig = {} }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");

  const availableDates = useMemo(() => {
    const unique = new Set();
    students.forEach((student) => {
      if (student.date) unique.add(student.date);
    });
    return Array.from(unique).sort((a, b) => b.localeCompare(a));
  }, [students]);

  const defaultDate = useMemo(() => {
    if (availableDates.length > 0) return availableDates[0];
    return new Date().toISOString().split("T")[0];
  }, [availableDates]);

  const activeDate = selectedDate || defaultDate;

  const filtered = useMemo(
    () => students.filter((student) => student.date === activeDate),
    [students, activeDate]
  );

  const arrivalMeta = useMemo(
    () => filtered.map((student) => ({ student, meta: buildArrivalMeta(student, scheduleConfig) })),
    [filtered, scheduleConfig]
  );

  const total = filtered.length;
  const onTime = arrivalMeta.filter(
    ({ meta }) =>
      meta.arrivalMinutes !== null && meta.thresholdMinutes !== null && !meta.isLate
  ).length;

  const late = arrivalMeta.filter(
    ({ meta }) =>
      meta.arrivalMinutes !== null && meta.thresholdMinutes !== null && meta.isLate
  ).length;

  const checkedIn = arrivalMeta.filter(({ meta }) => meta.arrivalMinutes !== null).length;
  const notCheckedIn = total - checkedIn;
  const pendingTimeOut = filtered.filter(
    (student) => student.timeIn && !student.timeOut
  ).length;

  const lookupMatches = useMemo(() => {
    const query = lookupQuery.trim().toLowerCase();
    if (!query) return [];

    return arrivalMeta.filter(({ student }) => {
      const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim().toLowerCase();
      return (
        (student.id || "").toLowerCase().includes(query) ||
        fullName.includes(query) ||
        (student.strand || "").toLowerCase().includes(query)
      );
    });
  }, [arrivalMeta, lookupQuery]);

  const duplicateIds = useMemo(() => {
    const counts = arrivalMeta.reduce((acc, { student }) => {
      const key = student.id || "";
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([id]) => id);
  }, [arrivalMeta]);

  const automationAlerts = [
    late > 0 && {
      title: "Late arrivals detected",
      detail: `${late} student${late !== 1 ? "s" : ""} scanned after the grace window.`,
      hint: "Send reminders to strands with the highest late counts.",
      intent: "warning",
    },
    notCheckedIn > 0 && {
      title: "Open headcount tasks",
      detail: `${notCheckedIn} scheduled student${notCheckedIn !== 1 ? "s" : ""} haven't checked in yet.`,
      hint: "Cross-check class advisers and trigger SMS/email nudges.",
      intent: "info",
    },
    pendingTimeOut > 0 && {
      title: "Pending time-out scans",
      detail: `${pendingTimeOut} student${pendingTimeOut !== 1 ? "s" : ""} are still marked inside the campus.`,
      hint: "Run a quick sweep or schedule an auto follow-up at dismissal.",
      intent: "neutral",
    },
    duplicateIds.length > 0 && {
      title: "Duplicate IDs in today’s feed",
      detail: `Found overlapping scans for ${duplicateIds.join(", ")}.`,
      hint: "Review scans to avoid overcounting and notify the registrar.",
      intent: "critical",
    },
  ].filter(Boolean);

  const pieData = [
    { name: "On Time", value: onTime },
    { name: "Late", value: late },
    { name: "Not Yet Checked In", value: notCheckedIn },
  ];

  const strands = ["STEM", "ICT", "HUMSS", "ABM", "GAS"];
  const strandData = strands.map((strand) => {
    const strandRecords = arrivalMeta.filter(({ student }) => student.strand === strand);
    const strandOnTime = strandRecords.filter(
      ({ meta }) =>
        meta.arrivalMinutes !== null && meta.thresholdMinutes !== null && !meta.isLate
    ).length;

    const strandLate = strandRecords.filter(
      ({ meta }) =>
        meta.arrivalMinutes !== null && meta.thresholdMinutes !== null && meta.isLate
    ).length;

    return {
      strand,
      onTime: strandOnTime,
      late: strandLate,
    };
  });

  const hasData = total > 0;

  return (
    <div className="reports-container">
      <section className="panel surface">
        <div className="panel-header">
          <h2>Daily Snapshot</h2>
          <p>Track who arrived on time versus late for {activeDate}.</p>
        </div>
        <div className="filters-grid">
          <div className="filter-box stack">
            <label>Select Date</label>
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="stat-grid">
        <div className="stat-card surface">
          <span className="stat-label">Total Records</span>
          <strong className="stat-value">{total}</strong>
          <span className="stat-subtext">{notCheckedIn} not yet scanned</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">On-Time Arrivals</span>
          <strong className="stat-value">{onTime}</strong>
          <span className="stat-subtext">Strand start + grace window</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Late Arrivals</span>
          <strong className="stat-value">{late}</strong>
          <span className="stat-subtext">After assigned strand start</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Pending Time-Out</span>
          <strong className="stat-value">{pendingTimeOut}</strong>
        </div>
      </section>

      {!hasData && (
        <div className="empty-callout surface">
          <span className="status-pill status-pill--neutral">No data</span>
          <p>No attendance records were found for the selected date.</p>
        </div>
      )}

      {hasData && (
        <div className="charts-container">
          <div className="chart-box surface">
            <h3>Arrival Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={95} innerRadius={55} paddingAngle={3}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.15)" }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-box surface">
            <h3>Arrival Status by Strand</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={strandData}>
                <XAxis dataKey="strand" stroke="#64748b" tick={{ fontSize: 13 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="onTime" fill="#22c55e" radius={[6, 6, 0, 0]} name="On Time" />
                <Bar dataKey="late" fill="#f97316" radius={[6, 6, 0, 0]} name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasData && (
        <section className="automation-grid">
          <div className="automation-panel surface">
            <div className="automation-header">
              <div>
                <p className="eyebrow">Automation</p>
                <h3>Instant VLOOKUP</h3>
                <p className="automation-subtitle">
                  Type a student ID, name, or strand to auto-run a lookup across the active date.
                </p>
              </div>
              <span className="status-pill status-pill--primary">Event-driven</span>
            </div>

            <div className="lookup-input">
              <input
                type="text"
                placeholder="Search by ID, name, or strand"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
              />
            </div>

            {lookupQuery && lookupMatches.length === 0 && (
              <div className="empty-row">
                <p>No matches found for "{lookupQuery}".</p>
              </div>
            )}

            {lookupMatches.length > 0 && (
              <div className="lookup-results">
                {lookupMatches.slice(0, 4).map(({ student, meta }) => (
                  <div key={`${student.id}-${student.attendanceId || student.date}`} className="lookup-row">
                    <div className="lookup-row__main">
                      <strong>{student.firstName} {student.lastName}</strong>
                      <span className="lookup-meta">{student.id}</span>
                    </div>
                    <div className="lookup-row__tags">
                      <span className="status-pill status-pill--neutral">{student.strand}</span>
                      <span className={`status-pill ${meta.isLate ? "status-pill--warning" : "status-pill--success"}`}>
                        {meta.arrivalMinutes === null
                          ? "No scan"
                          : meta.isLate
                            ? "Late arrival"
                            : "On time"}
                      </span>
                      {student.timeOut ? (
                        <span className="status-pill status-pill--primary">Timed out</span>
                      ) : (
                        <span className="status-pill status-pill--neutral">Pending out</span>
                      )}
                    </div>
                    <div className="lookup-row__details">
                      <p>Time In: {student.timeIn || "--"}</p>
                      <p>Time Out: {student.timeOut || "--"}</p>
                      <p>Schedule: {meta.schedule?.start ?? "--"} (grace {meta.schedule?.graceMinutes ?? 0} mins)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="automation-panel surface">
            <div className="automation-header">
              <div>
                <p className="eyebrow">Playbooks</p>
                <h3>Auto-detected tasks</h3>
                <p className="automation-subtitle">
                  Use these ready-to-run checks to keep data clean without manual VLOOKUPs.
                </p>
              </div>
              <span className="status-pill status-pill--info">Auto</span>
            </div>

            {automationAlerts.length === 0 && (
              <div className="empty-row">
                <p>Everything looks good. No tasks detected for {activeDate}.</p>
              </div>
            )}

            {automationAlerts.length > 0 && (
              <div className="alert-grid">
                {automationAlerts.map((alert) => (
                  <div key={alert.title} className={`alert-card alert-card--${alert.intent}`}>
                    <div className="alert-card__title">{alert.title}</div>
                    <p className="alert-card__detail">{alert.detail}</p>
                    <p className="alert-card__hint">{alert.hint}</p>
                    <div className="alert-card__actions">
                      <button type="button">Auto-run VLOOKUP</button>
                      <button type="button" className="secondary">Create follow-up</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
