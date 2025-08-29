import React, { useState } from "react";
import "./App.css";

// Helper function: Convert "HH:MM AM/PM" → minutes since midnight
const parseTime = (time) => {
  if (!time) return null;
  const [hhmm, modifier] = time.split(" ");
  let [hours, minutes] = hhmm.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

export default function AttendanceDashboard({ students }) {
  const [view, setView] = useState("combined");
  const [filterStrand, setFilterStrand] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeType, setTimeType] = useState("none"); // none, timeIn, timeOut
  const [timeValue, setTimeValue] = useState("");
  const [onlyNoTimeOut, setOnlyNoTimeOut] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2025-08-23");

  // === Filter Logic ===
  const filteredStudents = students.filter(student => {
    const matchesDate = student.date === selectedDate;
    const matchesStrand = filterStrand === "All" || student.strand === filterStrand;

    const matchesSearch =
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.includes(searchTerm);

    let matchesTime = true;
    if (timeType !== "none" && timeValue) {
      const studentTime = parseTime(student[timeType]);
      const filterTime = parseTime(timeValue);

      if (!studentTime) {
        matchesTime = false;
      } else {
        matchesTime = studentTime >= filterTime;
      }
    }

    const matchesNoTimeOut = !onlyNoTimeOut || (onlyNoTimeOut && !student.timeOut);

    return matchesDate && matchesStrand && matchesSearch && matchesTime && matchesNoTimeOut;
  });

  return (
    <div className="dashboard-container">
      <h1>📋 Student Attendance</h1>

      {/* === View Switcher === */}
      <div className="button-group">
        <button className={view === "combined" ? "active" : ""} onClick={() => setView("combined")}>Combined View</button>
        <button className={view === "timeIn" ? "active" : ""} onClick={() => setView("timeIn")}>Time-In Only</button>
        <button className={view === "timeOut" ? "active" : ""} onClick={() => setView("timeOut")}>Time-Out Only</button>
      </div>

      {/* === Filters === */}
      <div className="filter-search-box">
        {/* Date Filter */}
        <div className="filter-box">
          <label>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Strand Filter */}
        <div className="filter-box">
          <label>Strand:</label>
          <select value={filterStrand} onChange={(e) => setFilterStrand(e.target.value)}>
            <option value="All">All</option>
            <option value="STEM">STEM</option>
            <option value="ICT">ICT</option>
            <option value="HUMSS">HUMSS</option>
            <option value="ABM">ABM</option>
            <option value="GAS">GAS</option>
          </select>
        </div>

        {/* Search Box */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Time Filter */}
        <div className="filter-box">
          <label>Filter by Time:</label>
          <select value={timeType} onChange={(e) => setTimeType(e.target.value)}>
            <option value="none">None</option>
            <option value="timeIn">Time In</option>
            <option value="timeOut">Time Out</option>
          </select>
          <input
            type="time"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
          />
        </div>

        {/* Missing Time Out Filter */}
        <div className="filter-box">
          <label>
            <input
              type="checkbox"
              checked={onlyNoTimeOut}
              onChange={(e) => setOnlyNoTimeOut(e.target.checked)}
            />
            No Time Out
          </label>
        </div>
      </div>

      {/* === Attendance Table === */}
      <div className="table-container">
        <table className="attendance-table">
          <thead className={
            view === "combined" ? "header-blue" : view === "timeIn" ? "header-green" : "header-red"
          }>
            <tr>
              <th>Student ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Strand</th>
              {view !== "timeOut" && <th>Time In</th>}
              {view !== "timeIn" && <th>Time Out</th>}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id}>
                <td>{student.id}</td>
                <td>{student.firstName}</td>
                <td>{student.lastName}</td>
                <td>{student.strand}</td>
                {view !== "timeOut" && (
                  <td className={student.timeIn ? "time-in" : ""}>{student.timeIn || "-"}</td>
                )}
                {view !== "timeIn" && (
                  <td className={student.timeOut ? "time-out" : ""}>{student.timeOut || "-"}</td>
                )}
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "15px", color: "#64748b" }}>
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
