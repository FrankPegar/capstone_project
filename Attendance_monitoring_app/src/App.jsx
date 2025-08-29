import React, { useState } from "react";
import AttendanceDashboard from "./AttendanceDashboard";
import ReportsDashboard from "./ReportsDashboard";
import "./App.css";

const students = [
  { id: "2023001", firstName: "Juan", lastName: "Dela Cruz", timeIn: "08:01 AM", timeOut: "03:45 PM", strand: "STEM", date: "2025-08-23" },
  { id: "2023002", firstName: "Maria", lastName: "Santos", timeIn: "08:10 AM", timeOut: "", strand: "ICT", date: "2025-08-23" },
  { id: "2023003", firstName: "Pedro", lastName: "Reyes", timeIn: "", timeOut: "", strand: "HUMSS", date: "2025-08-22" },
  { id: "2023004", firstName: "Ana", lastName: "Lopez", timeIn: "08:05 AM", timeOut: "04:00 PM", strand: "ABM", date: "2025-08-22" },
  { id: "2023005", firstName: "Carlo", lastName: "Garcia", timeIn: "08:12 AM", timeOut: "03:50 PM", strand: "GAS", date: "2025-08-23" }
];

export default function App() {
  const [tab, setTab] = useState("attendance");

  return (
    <div className="app-container">
      {/* Navigation Tabs */}
      <nav className="navbar">
        <button onClick={() => setTab("attendance")} className={tab === "attendance" ? "active" : ""}>Attendance</button>
        <button onClick={() => setTab("reports")} className={tab === "reports" ? "active" : ""}>Reports</button>
      </nav>

      {/* Render Pages */}
      <div className="page-container">
        {tab === "attendance" && <AttendanceDashboard students={students} />}
        {tab === "reports" && <ReportsDashboard students={students} />}
      </div>
    </div>
  );
}
