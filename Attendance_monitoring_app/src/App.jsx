import React, { useState } from "react";
import AttendanceDashboard from "./AttendanceDashboard";
import ReportsDashboard from "./ReportsDashboard";
import AllStudents from "./AllStudents";
import ScheduleManager from "./ScheduleManager";
import { createDefaultScheduleMap, DEFAULT_STRAND_SCHEDULE } from "./schedules";
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
  students: {
    badge: "Directory",
    title: "Student Directory",
    description: "Search and filter every registered learner in one place.",
  },
  register: {
    badge: "Admissions",
    title: "Register A Student",
    description: "Quickly onboard new learners so their attendance is captured right away.",
  },
  schedules: {
    badge: "Scheduling",
    title: "Strand Timetables",
    description: "Tune arrival windows and grace periods for each strand.",
  },
};

const SEEDED_STUDENTS = [
  {
      id: "2023001",
      firstName: "Juan",
      lastName: "Dela Cruz",
      timeIn: "08:01 AM",
      timeOut: "03:45 PM",
      strand: "STEM",
      date: "2025-08-23",
    },
    {
      id: "2023002",
      firstName: "Maria",
      lastName: "Santos",
      timeIn: "08:10 AM",
      timeOut: "",
      strand: "ICT",
      date: "2025-08-23",
    },
    {
      id: "2023003",
      firstName: "Pedro",
      lastName: "Reyes",
      timeIn: "",
      timeOut: "",
      strand: "HUMSS",
      date: "2025-08-22",
    },
    {
      id: "2023004",
      firstName: "Ana",
      lastName: "Lopez",
      timeIn: "08:05 AM",
      timeOut: "04:00 PM",
      strand: "ABM",
      date: "2025-08-22",
    },
    {
      id: "2023005",
      firstName: "Carlo",
      lastName: "Garcia",
      timeIn: "08:12 AM",
      timeOut: "03:50 PM",
      strand: "GAS",
      date: "2025-08-23",
    },
    {
      id: "2023006",
      firstName: "Luisa",
      lastName: "Martinez",
      timeIn: "",
      timeOut: "",
      strand: "STEM",
      date: "2025-08-22",
    },
    {
      id: "2023007",
      firstName: "Miguel",
      lastName: "Torres",
      timeIn: "07:52 AM",
      timeOut: "03:40 PM",
      strand: "STEM",
      date: "2025-08-23",
    },
    {
      id: "2023008",
      firstName: "Sofia",
      lastName: "Navarro",
      timeIn: "08:18 AM",
      timeOut: "",
      strand: "ICT",
      date: "2025-08-23",
    },
    {
      id: "2023009",
      firstName: "Rafael",
      lastName: "Domingo",
      timeIn: "07:58 AM",
      timeOut: "04:12 PM",
      strand: "HUMSS",
      date: "2025-08-23",
    },
    {
      id: "2023010",
      firstName: "Bianca",
      lastName: "Soriano",
      timeIn: "08:22 AM",
      timeOut: "",
      strand: "ABM",
      date: "2025-08-24",
    },
    {
      id: "2023011",
      firstName: "Daniel",
      lastName: "Cruz",
      timeIn: "",
      timeOut: "",
      strand: "GAS",
      date: "2025-08-22",
    },
    {
      id: "2023012",
      firstName: "Erika",
      lastName: "Mendoza",
      timeIn: "07:47 AM",
      timeOut: "03:35 PM",
      strand: "STEM",
      date: "2025-08-23",
    },
    {
      id: "2023013",
      firstName: "Gabriel",
      lastName: "Villanueva",
      timeIn: "08:03 AM",
      timeOut: "03:55 PM",
      strand: "ICT",
      date: "2025-08-23",
    },
    {
      id: "2023014",
      firstName: "Hannah",
      lastName: "Sarmiento",
      timeIn: "08:17 AM",
      timeOut: "",
      strand: "HUMSS",
      date: "2025-08-24",
    },
    {
      id: "2023015",
      firstName: "Isaiah",
      lastName: "Ramos",
      timeIn: "07:50 AM",
      timeOut: "04:15 PM",
      strand: "ABM",
      date: "2025-08-23",
    },
    {
      id: "2023016",
      firstName: "Julia",
      lastName: "Ramirez",
      timeIn: "08:06 AM",
      timeOut: "03:58 PM",
      strand: "GAS",
      date: "2025-08-24",
    },
    {
      id: "2023017",
      firstName: "Kevin",
      lastName: "Bautista",
      timeIn: "08:28 AM",
      timeOut: "",
      strand: "STEM",
      date: "2025-08-24",
    },
    {
      id: "2023018",
      firstName: "Lara",
      lastName: "Ocampo",
      timeIn: "",
      timeOut: "",
      strand: "ICT",
      date: "2025-08-22",
    },
    {
      id: "2023019",
      firstName: "Marco",
      lastName: "Hernandez",
      timeIn: "07:42 AM",
      timeOut: "03:30 PM",
      strand: "HUMSS",
      date: "2025-08-23",
    },
    {
      id: "2023020",
      firstName: "Nina",
      lastName: "Velasquez",
      timeIn: "08:09 AM",
      timeOut: "",
      strand: "ABM",
      date: "2025-08-23",
    },
    {
      id: "2023021",
      firstName: "Oscar",
      lastName: "Aguilar",
      timeIn: "08:14 AM",
      timeOut: "04:05 PM",
      strand: "GAS",
      date: "2025-08-23",
    },
    {
      id: "2023022",
      firstName: "Pia",
      lastName: "Estrada",
      timeIn: "07:56 AM",
      timeOut: "03:48 PM",
      strand: "STEM",
      date: "2025-08-23",
    },
    {
      id: "2023023",
      firstName: "Ramon",
      lastName: "Gutierrez",
      timeIn: "08:31 AM",
      timeOut: "",
      strand: "ICT",
      date: "2025-08-24",
    },
    {
      id: "2023024",
      firstName: "Sara",
      lastName: "Jimenez",
      timeIn: "08:02 AM",
      timeOut: "04:10 PM",
      strand: "HUMSS",
      date: "2025-08-23",
    },
    {
      id: "2023025",
      firstName: "Tomas",
      lastName: "Villareal",
      timeIn: "",
      timeOut: "",
      strand: "ABM",
      date: "2025-08-22",
    },
    {
      id: "2023026",
      firstName: "Ursula",
      lastName: "Rivera",
      timeIn: "07:59 AM",
      timeOut: "04:20 PM",
      strand: "GAS",
      date: "2025-08-24",
    },
    {
      id: "2023027",
      firstName: "Victor",
      lastName: "Morales",
      timeIn: "08:11 AM",
      timeOut: "",
      strand: "STEM",
      date: "2025-08-24",
    },
    {
      id: "2023028",
      firstName: "Wendy",
      lastName: "Flores",
      timeIn: "07:54 AM",
      timeOut: "03:42 PM",
      strand: "ICT",
      date: "2025-08-23",
    },
    {
      id: "2023029",
      firstName: "Xavier",
      lastName: "Delos Reyes",
      timeIn: "08:19 AM",
      timeOut: "",
      strand: "HUMSS",
      date: "2025-08-24",
    },
    {
      id: "2023030",
      firstName: "Yara",
      lastName: "Francisco",
      timeIn: "07:53 AM",
      timeOut: "04:18 PM",
      strand: "ABM",
      date: "2025-08-23",
    },
    {
      id: "2023031",
      firstName: "Zachary",
      lastName: "Cabrera",
      timeIn: "",
      timeOut: "",
      strand: "GAS",
      date: "2025-08-22",
    },
    {
      id: "2023032",
      firstName: "Alicia",
      lastName: "Santos",
      timeIn: "08:00 AM",
      timeOut: "03:52 PM",
      strand: "STEM",
      date: "2025-08-23",
    },
    {
      id: "2023033",
      firstName: "Benjie",
      lastName: "Cruz",
      timeIn: "08:24 AM",
      timeOut: "",
      strand: "ICT",
      date: "2025-08-24",
    },
    {
      id: "2023034",
      firstName: "Chloe",
      lastName: "Fajardo",
      timeIn: "07:49 AM",
      timeOut: "04:07 PM",
      strand: "HUMSS",
      date: "2025-08-23",
    },
    {
      id: "2023035",
      firstName: "Diego",
      lastName: "Aquino",
      timeIn: "08:13 AM",
      timeOut: "",
      strand: "ABM",
      date: "2025-08-24",
    },
    {
      id: "2023036",
      firstName: "Eliza",
      lastName: "Pascual",
      timeIn: "07:51 AM",
      timeOut: "03:57 PM",
      strand: "GAS",
      date: "2025-08-23",
    },
    {
      id: "2023037",
      firstName: "Felix",
      lastName: "Arriola",
      timeIn: "08:07 AM",
      timeOut: "04:03 PM",
      strand: "STEM",
      date: "2025-08-23",
    },
    {
      id: "2023038",
      firstName: "Gia",
      lastName: "Manalo",
      timeIn: "08:26 AM",
      timeOut: "",
      strand: "ICT",
      date: "2025-08-24",
    },
    {
      id: "2023039",
      firstName: "Hector",
      lastName: "Vergara",
      timeIn: "",
      timeOut: "",
      strand: "HUMSS",
      date: "2025-08-22",
    },
    {
      id: "2023040",
      firstName: "Ines",
      lastName: "Calderon",
      timeIn: "07:46 AM",
      timeOut: "03:44 PM",
      strand: "ABM",
      date: "2025-08-23",
    },
    {
      id: "2023041",
      firstName: "Joaquin",
      lastName: "Salcedo",
      timeIn: "08:04 AM",
      timeOut: "",
      strand: "GAS",
      date: "2025-08-23",
    },
    {
      id: "2023042",
      firstName: "Kara",
      lastName: "Licup",
      timeIn: "07:57 AM",
      timeOut: "04:09 PM",
      strand: "STEM",
      date: "2025-08-24",
    },
    {
      id: "2023043",
      firstName: "Leo",
      lastName: "Francisco",
      timeIn: "08:20 AM",
      timeOut: "",
      strand: "ICT",
      date: "2025-08-24",
    },
    {
      id: "2023044",
      firstName: "Mila",
      lastName: "Quijano",
      timeIn: "07:45 AM",
      timeOut: "03:46 PM",
      strand: "HUMSS",
      date: "2025-08-23",
    },
    {
      id: "2023045",
      firstName: "Noel",
      lastName: "Santiago",
      timeIn: "08:23 AM",
      timeOut: "",
      strand: "ABM",
      date: "2025-08-24",
    },
    {
      id: "2023046",
      firstName: "Olivia",
      lastName: "Galvez",
      timeIn: "08:08 AM",
      timeOut: "03:59 PM",
      strand: "GAS",
      date: "2025-08-23",
    },
    {
      id: "2023047",
      firstName: "Paolo",
      lastName: "Serrano",
      timeIn: "",
      timeOut: "",
      strand: "STEM",
      date: "2025-08-22",
    },
    {
      id: "2023048",
      firstName: "Queenie",
      lastName: "Abad",
      timeIn: "07:48 AM",
      timeOut: "04:13 PM",
      strand: "ICT",
      date: "2025-08-23",
    },
    {
      id: "2023049",
      firstName: "Rico",
      lastName: "Mendoza",
      timeIn: "08:15 AM",
      timeOut: "",
      strand: "HUMSS",
      date: "2025-08-24",
    },
    {
      id: "2023050",
      firstName: "Selene",
      lastName: "Orfano",
      timeIn: "07:44 AM",
      timeOut: "03:38 PM",
      strand: "ABM",
      date: "2025-08-23",
    },
];

export default function App() {
  const [tab, setTab] = useState("attendance");
  const [scheduleConfig, setScheduleConfig] = useState(() => createDefaultScheduleMap());

  const [students, setStudents] = useState(() =>
    SEEDED_STUDENTS.map((student, index) => ({
      ...student,
      gradeLevel: student.gradeLevel ?? (index % 2 === 0 ? "Grade 11" : "Grade 12"),
      guardianContact:
        student.guardianContact ?? `0917${(index + 1234567).toString().padStart(7, "0")}`,
    }))
  );



  const handleScheduleChange = (strand, updates) => {
    setScheduleConfig((prev) => {
      const existing = prev[strand] || DEFAULT_STRAND_SCHEDULE[strand] || {
        start: "08:00 AM",
        end: "04:00 PM",
        graceMinutes: 5,
      };

      return {
        ...prev,
        [strand]: {
          ...existing,
          ...updates,
        },
      };
    });
  };

  const handleScheduleReset = (strand) => {
    setScheduleConfig((prev) => ({
      ...prev,
      [strand]: {
        ...(DEFAULT_STRAND_SCHEDULE[strand] || {
          start: "08:00 AM",
          end: "04:00 PM",
          graceMinutes: 5,
        }),
      },
    }));
  };

  const [newStudent, setNewStudent] = useState({
    id: "",
    firstName: "",
    lastName: "",
    strand: "STEM",
    gradeLevel: "Grade 11",
    guardianContact: "",
  });

  const handleRegister = (e) => {
    e.preventDefault();
    const trimmedId = newStudent.id.trim();
    const trimmedFirst = newStudent.firstName.trim();
    const trimmedLast = newStudent.lastName.trim();
    const trimmedContact = newStudent.guardianContact.trim();

    if (!trimmedId || !trimmedFirst || !trimmedLast || !trimmedContact) return;

    setStudents([
      ...students,
      {
        ...newStudent,
        id: trimmedId,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        guardianContact: trimmedContact,
        timeIn: "",
        timeOut: "",
        date: new Date().toISOString().split("T")[0],
      },
    ]);

    setNewStudent({
      id: "",
      firstName: "",
      lastName: "",
      strand: "STEM",
      gradeLevel: "Grade 11",
      guardianContact: "",
    });
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
          <button onClick={() => setTab("students")} className={tab === "students" ? "active" : ""}>
            Students
          </button>
          <button onClick={() => setTab("register")} className={tab === "register" ? "active" : ""}>
            Register Student
          </button>
          <button onClick={() => setTab("schedules")} className={tab === "schedules" ? "active" : ""}>
            Schedules
          </button>
        </div>
      </nav>

      <main className="main-content">
        <header className="page-hero">
          <div className="page-hero__badge">{badge}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>

        {tab === "attendance" && (
          <AttendanceDashboard students={students} scheduleConfig={scheduleConfig} />
        )}
        {tab === "reports" && (
          <ReportsDashboard students={students} scheduleConfig={scheduleConfig} />
        )}
        {tab === "students" && <AllStudents students={students} />}
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

              <div className="form-row">
                <label>Grade Level</label>
                <select
                  value={newStudent.gradeLevel}
                  onChange={(e) => setNewStudent({ ...newStudent, gradeLevel: e.target.value })}
                >
                  <option>Grade 11</option>
                  <option>Grade 12</option>
                </select>
              </div>

              <div className="form-row">
                <label>Parent / Guardian Contact</label>
                <input
                  type="tel"
                  placeholder="09xxxxxxxxx"
                  value={newStudent.guardianContact}
                  onChange={(e) => setNewStudent({ ...newStudent, guardianContact: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="register-btn">Register Student</button>
            </form>
          </div>
        )}

        {tab === "schedules" && (
          <ScheduleManager
            scheduleConfig={scheduleConfig}
            onChange={handleScheduleChange}
            onReset={handleScheduleReset}
          />
        )}
      </main>
    </div>
  );
}

