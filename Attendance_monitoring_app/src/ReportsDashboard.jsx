import React, { useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import "./App.css";

const COLORS = ["#22c55e", "#ef4444"];

export default function ReportsDashboard({ students }) {
  const [selectedDate, setSelectedDate] = useState("2025-08-23");

  // Filter dataset by date
  const filtered = students.filter(s => s.date === selectedDate);

  const total = filtered.length;
  const present = filtered.filter(s => s.timeIn).length;
  const absent = total - present;
  const missingTimeOut = filtered.filter(s => s.timeIn && !s.timeOut).length;

  const pieData = [
    { name: "Present", value: present },
    { name: "Absent", value: absent }
  ];

  const strandData = ["STEM", "ICT", "HUMSS", "ABM", "GAS"].map(strand => ({
    strand,
    present: filtered.filter(s => s.strand === strand && s.timeIn).length
  }));

  return (
    <div className="reports-container">
      <h1>📊 Attendance Reports</h1>

      {/* Date Picker */}
      <div className="filter-box" style={{ marginBottom: "20px" }}>
        <label>Select Date: </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Summary */}
      <div className="summary-cards">
        <div className="card">Total Students: {total}</div>
        <div className="card">Present: {present}</div>
        <div className="card">Absent: {absent}</div>
        <div className="card">Missing Time Out: {missingTimeOut}</div>
      </div>

      {/* Charts */}
      <div className="charts-container">
        <div className="chart-box">
          <h3>Present vs Absent</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" outerRadius={80} label>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>Attendance by Strand</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={strandData}>
              <XAxis dataKey="strand" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
