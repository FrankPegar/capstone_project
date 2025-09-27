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

const COLORS = ["#22c55e", "#f97316", "#94a3b8"];

const parseTime = (time) => {
  if (!time) return null;
  const [hhmm, modifier] = time.split(" ");
  let [hours, minutes] = hhmm.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const LATE_THRESHOLD_LABEL = "08:05 AM";
const LATE_THRESHOLD_MINUTES = parseTime(LATE_THRESHOLD_LABEL);

export default function ReportsDashboard({ students }) {
  const [selectedDate, setSelectedDate] = useState("2025-08-23");

  const filtered = useMemo(
    () => students.filter((student) => student.date === selectedDate),
    [students, selectedDate]
  );

  const total = filtered.length;
  const onTime = filtered.filter((student) => {
    const arrival = parseTime(student.timeIn);
    if (arrival === null) return false;
    return arrival <= LATE_THRESHOLD_MINUTES;
  }).length;

  const late = filtered.filter((student) => {
    const arrival = parseTime(student.timeIn);
    if (arrival === null) return false;
    return arrival > LATE_THRESHOLD_MINUTES;
  }).length;

  const notCheckedIn = total - (onTime + late);
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
    const strandRecords = filtered.filter((student) => student.strand === strand);
    const strandOnTime = strandRecords.filter((student) => {
      const arrival = parseTime(student.timeIn);
      if (arrival === null) return false;
      return arrival <= LATE_THRESHOLD_MINUTES;
    }).length;

    const strandLate = strandRecords.filter((student) => {
      const arrival = parseTime(student.timeIn);
      if (arrival === null) return false;
      return arrival > LATE_THRESHOLD_MINUTES;
    }).length;

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
          <p>Track who arrived on time versus late for {selectedDate}.</p>
        </div>
        <div className="filters-grid">
          <div className="filter-box stack">
            <label>Select Date</label>
            <input
              type="date"
              value={selectedDate}
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
          <span className="stat-subtext">Logged by {LATE_THRESHOLD_LABEL}</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Late Arrivals</span>
          <strong className="stat-value">{late}</strong>
          <span className="stat-subtext">After {LATE_THRESHOLD_LABEL}</span>
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
