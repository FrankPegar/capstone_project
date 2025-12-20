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
    </div>
  );
}
