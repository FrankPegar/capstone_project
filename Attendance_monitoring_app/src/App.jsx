import React, { useState } from "react";
import AttendanceDashboard from "./AttendanceDashboard";
import ReportsDashboard from "./ReportsDashboard";
import "./App.css";

const PAGE_META = {
  attendance: {
    badge: "Live Overview",
    title: "Daily Attendance",
    description: "See on-time arrivals, late scans, and open time-outs at a glance.",
  },
  reports: {
    badge: "Insights",
    title: "Attendance Reports",
    description: "Compare on-time versus late patterns and drill into strands instantly.",
  },
  register: {
    badge: "Admissions",
    title: "Register A Student",
    description: "Quickly onboard new learners so their attendance is captured right away.",
  },
};

export default function App() {
  const [tab, setTab] = useState("attendance");
  const [students, setStudents] = useState([
    { id: "2023001", firstName: "Juan",  lastName: "Dela Cruz", timeIn: "08:01 AM", timeOut: "03:45 PM", strand: "STEM",  date: "2025-08-23" },
    { id: "2023002", firstName: "Maria", lastName: "Santos",    timeIn: "08:10 AM", timeOut: "",        strand: "ICT",   date: "2025-08-23" },
    { id: "2023003", firstName: "Pedro", lastName: "Reyes",     timeIn: "",         timeOut: "",        strand: "HUMSS", date: "2025-08-22" },
    { id: "2023004", firstName: "Ana",   lastName: "Lopez",     timeIn: "08:05 AM", timeOut: "04:00 PM",strand: "ABM",   date: "2025-08-22" },
    { id: "2023005", firstName: "Carlo", lastName: "Garcia",    timeIn: "08:12 AM", timeOut: "03:50 PM",strand: "GAS",   date: "2025-08-23" },
    { id: "2023006", firstName: "Luisa", lastName: "Martinez",  timeIn: "",         timeOut: "",        strand: "STEM",  date: "2025-08-22" },
  ]);

  const [newStudent, setNewStudent] = useState({
    id: "",
    firstName: "",
    lastName: "",
    strand: "STEM",
  });

  const handleRegister = (e) => {
    e.preventDefault();
    if (!newStudent.id || !newStudent.firstName || !newStudent.lastName) return;

    setStudents([
      ...students,
      {
        ...newStudent,
        timeIn: "",
        timeOut: "",
        date: new Date().toISOString().split("T")[0],
      },
    ]);

    setNewStudent({ id: "", firstName: "", lastName: "", strand: "STEM" });
    alert("Student successfully registered!");
  };

  const { badge, title, description } = PAGE_META[tab];

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-mark">Smart</span>
          <span className="logo-text">Attendance</span>
        </div>
        <div className="nav-links">
          <button onClick={() => setTab("attendance")} className={tab === "attendance" ? "active" : ""}>
            Attendance
          </button>
          <button onClick={() => setTab("reports")} className={tab === "reports" ? "active" : ""}>
            Reports
          </button>
          <button onClick={() => setTab("register")} className={tab === "register" ? "active" : ""}>
            Register Student
          </button>
        </div>
      </nav>

      <main className="main-content">
        <header className="page-hero">
          <div className="page-hero__badge">{badge}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>

        {tab === "attendance" && <AttendanceDashboard students={students} />}
        {tab === "reports" && <ReportsDashboard students={students} />}
        {tab === "register" && (
          <div className="register-wrapper">
            <h1 className="register-title">Register New Student</h1>
            <form className="register-form" onSubmit={handleRegister}>
              <div className="form-row">
                <label>Student ID</label>
                <input
                  type="text"
                  value={newStudent.id}
                  onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <label>First Name</label>
                <input
                  type="text"
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <label>Last Name</label>
                <input
                  type="text"
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <label>Strand</label>
                <select
                  value={newStudent.strand}
                  onChange={(e) => setNewStudent({ ...newStudent, strand: e.target.value })}
                >
                  <option>STEM</option>
                  <option>ICT</option>
                  <option>HUMSS</option>
                  <option>ABM</option>
                  <option>GAS</option>
                </select>
              </div>

              <button type="submit" className="register-btn">Register Student</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

