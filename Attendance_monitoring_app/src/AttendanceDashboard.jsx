import React, { useMemo, useState } from "react";
import "./App.css";
import { parseTime, formatMinutes, addMinutes } from "./timeUtils";
import { getScheduleForStrand } from "./schedules";

const averageTime = (records, key) => {
  const times = records
    .map((record) => parseTime(record[key]))
    .filter((value) => value !== null);

  if (!times.length) return null;
  const total = times.reduce((sum, value) => sum + value, 0);
  return Math.round(total / times.length);
};

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
    startLabel: startMinutes !== null ? formatMinutes(startMinutes) : schedule.start,
    arrivalMinutes,
    thresholdMinutes,
    thresholdLabel:
      thresholdMinutes !== null ? formatMinutes(thresholdMinutes) : schedule.start,
    isLate,
  };
};

const isOnTimeArrival = (student, scheduleConfig) => {
  const { arrivalMinutes, thresholdMinutes, isLate } = buildArrivalMeta(
    student,
    scheduleConfig
  );
  if (arrivalMinutes === null || thresholdMinutes === null) return false;
  return !isLate;
};

const isLateArrival = (student, scheduleConfig) => {
  const { arrivalMinutes, thresholdMinutes, isLate } = buildArrivalMeta(
    student,
    scheduleConfig
  );
  if (arrivalMinutes === null || thresholdMinutes === null) return false;
  return isLate;
};

const getStatusMeta = (student, scheduleConfig) => {
  const hasCheckIn = Boolean(student.timeIn);
  const hasCheckOut = Boolean(student.timeOut);
  const arrivalMeta = buildArrivalMeta(student, scheduleConfig);

  if (!hasCheckIn) {
    return {
      label: `Awaiting ${arrivalMeta.startLabel} check-in`,
      tone: "neutral",
      rowClass: "row-none",
      isLate: false,
      thresholdLabel: arrivalMeta.thresholdLabel,
    };
  }

  const baseLabel = arrivalMeta.isLate ? "Late" : "On time";
  const suffix = hasCheckOut ? "Checked out" : "On campus";

  return {
    label: `${baseLabel} - ${suffix}`,
    tone: arrivalMeta.isLate ? "late" : "ontime",
    rowClass: hasCheckOut ? "row-both" : "row-timein",
    isLate: arrivalMeta.isLate,
    thresholdLabel: arrivalMeta.thresholdLabel,
  };
};

export default function AttendanceDashboard({ students, scheduleConfig = {} }) {
  const [view, setView] = useState("combined");
  const [filterStrand, setFilterStrand] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeType, setTimeType] = useState("none");
  const [timeValue, setTimeValue] = useState("");
  const [onlyNoTimeOut, setOnlyNoTimeOut] = useState(false);
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

  const todayRecords = useMemo(
    () => students.filter((student) => student.date === activeDate),
    [students, activeDate]
  );

  const totalStudents = todayRecords.length;
  const checkedInStudents = todayRecords.filter((student) => Boolean(student.timeIn)).length;

  const onTimeStudents = todayRecords.filter((student) =>
    isOnTimeArrival(student, scheduleConfig)
  ).length;

  const lateStudents = todayRecords.filter((student) =>
    isLateArrival(student, scheduleConfig)
  ).length;

  const notCheckedIn = totalStudents - checkedInStudents;

  const missingTimeOut = todayRecords.filter(
    (student) => student.timeIn && !student.timeOut
  ).length;

  const averageIn = averageTime(todayRecords, "timeIn");
  const averageOut = averageTime(todayRecords, "timeOut");

  const filteredStudents = students.filter((student) => {
    const matchesDate = student.date === activeDate;
    const matchesStrand = filterStrand === "All" || student.strand === filterStrand;

    const matchesSearch =
      `${student.firstName} ${student.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) || student.id.includes(searchTerm);

    let matchesTime = true;
    if (timeType !== "none" && timeValue) {
      const studentTime = parseTime(student[timeType]);
      const filterTime = parseTime(timeValue);

      if (studentTime === null) {
        matchesTime = false;
      } else if (filterTime === null) {
        matchesTime = true;
      } else {
        matchesTime = studentTime >= filterTime;
      }
    }

    const matchesNoTimeOut = !onlyNoTimeOut || (onlyNoTimeOut && !student.timeOut);

    return matchesDate && matchesStrand && matchesSearch && matchesTime && matchesNoTimeOut;
  });

  const emptyColumns =
    4 + (view !== "timeOut" ? 1 : 0) + (view !== "timeIn" ? 1 : 0);

  return (
    <div className="dashboard-container">
      <section className="panel surface">
        <div className="panel-header">
          <h2>Filters</h2>
          <p>Zero in on strands, late arrivals, or open time-out slips in seconds.</p>
        </div>
        <div className="filters-grid">
          <div className="filter-box stack">
            <label>Date</label>
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="filter-box stack">
            <label>Strand</label>
            <select value={filterStrand} onChange={(e) => setFilterStrand(e.target.value)}>
              <option value="All">All</option>
              <option value="STEM">STEM</option>
              <option value="ICT">ICT</option>
              <option value="HUMSS">HUMSS</option>
              <option value="ABM">ABM</option>
              <option value="GAS">GAS</option>
            </select>
          </div>

          <div className="filter-box stack">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by ID or name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-box stack">
            <label>Filter by Time</label>
            <div className="time-filter">
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
          </div>

          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={onlyNoTimeOut}
              onChange={(e) => setOnlyNoTimeOut(e.target.checked)}
            />
            Show students missing time-out
          </label>
        </div>
      </section>

      <section className="stat-grid">
        <div className="stat-card surface">
          <span className="stat-label">Students Today</span>
          <strong className="stat-value">{totalStudents}</strong>
          <span className="stat-subtext">{notCheckedIn} awaiting scan</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">On-Time Arrivals</span>
          <strong className="stat-value">{onTimeStudents}</strong>
          <span className="stat-subtext">Strand start + grace window</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Late Arrivals</span>
          <strong className="stat-value">{lateStudents}</strong>
          <span className="stat-subtext">After assigned strand start</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Pending Time-Out</span>
          <strong className="stat-value">{missingTimeOut}</strong>
          <span className="stat-subtext">Checked in but no exit log</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Average Time-In</span>
          <strong className="stat-value">{formatMinutes(averageIn)}</strong>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Average Time-Out</span>
          <strong className="stat-value">{formatMinutes(averageOut)}</strong>
        </div>
      </section>

      <section className="panel surface">
        <div className="panel-header">
          <h2>Attendance Table</h2>
          <div className="button-group">
            <button
              className={view === "combined" ? "active" : ""}
              onClick={() => setView("combined")}
            >
              Combined View
            </button>
            <button
              className={view === "timeIn" ? "active" : ""}
              onClick={() => setView("timeIn")}
            >
              Time-In Only
            </button>
            <button
              className={view === "timeOut" ? "active" : ""}
              onClick={() => setView("timeOut")}
            >
              Time-Out Only
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="attendance-table">
            <thead
              className={
                view === "combined"
                  ? "header-blue"
                  : view === "timeIn"
                  ? "header-green"
                  : "header-red"
              }
            >
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Strand</th>
                <th>Status</th>
                {view !== "timeOut" && <th>Time In</th>}
                {view !== "timeIn" && <th>Time Out</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const { label, tone, rowClass, isLate } = getStatusMeta(student, scheduleConfig);
                const recordKey =
                  student.attendanceId ||
                  `${student.id}-${student.date}-${student.timeIn || student.timeOut || "record"}`;

                return (
                  <tr key={recordKey} className={`attendance-row ${rowClass}`}>
                    <td>{student.id}</td>
                    <td className="cell-name">
                      <span className="name-primary">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="name-secondary">{student.date}</span>
                    </td>
                    <td>{student.strand}</td>
                    <td>
                      <span className={`status-pill status-pill--${tone}`}>{label}</span>
                    </td>
                    {view !== "timeOut" && (
                      <td
                        className={
                          student.timeIn
                            ? `time-in ${isLate ? "late" : ""}`
                            : "muted"
                        }
                      >
                        {student.timeIn || "-"}
                      </td>
                    )}
                    {view !== "timeIn" && (
                      <td className={student.timeOut ? "time-out" : "muted"}>
                        {student.timeOut || "-"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={emptyColumns} className="empty-row">
                    No students match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
