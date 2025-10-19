import React, { useEffect, useState } from "react";
import AttendanceDashboard from "./AttendanceDashboard";
import ReportsDashboard from "./ReportsDashboard";
import AllStudents from "./AllStudents";
import ScheduleManager from "./ScheduleManager";
import { createDefaultScheduleMap, DEFAULT_STRAND_SCHEDULE } from "./schedules";
import supabase, { isSupabaseConfigured } from "./supabaseClient";
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

const GUARDIAN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmailInput = (raw = "") => raw.trim().toLowerCase();

const validateGuardianEmail = (value = "") => {
  if (!value) return "Parent email is required.";
  if (!GUARDIAN_EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }
  return "";
};

const gradeNumberToLabel = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return `Grade ${numeric}`;
  return value;
};

const labelToGradeNumber = (label) => {
  if (!label) return null;
  const match = `${label}`.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const formatTimeDisplay = (value) => {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const sortStudentsByName = (records) =>
  [...records].sort((a, b) => {
    const lastCompare = (a.lastName || "").localeCompare(b.lastName || "", undefined, {
      sensitivity: "base",
    });
    if (lastCompare !== 0) return lastCompare;
    return (a.firstName || "").localeCompare(b.firstName || "", undefined, {
      sensitivity: "base",
    });
  });

const mapRowToStudent = (row = {}) => {
  const latestAttendance =
    Array.isArray(row.attendance) && row.attendance.length > 0 ? row.attendance[0] : null;

  return {
    supabaseId: row.id ?? null,
    id: row.student_id ?? row.id ?? "",
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    strand: row.strand ?? "",
    gradeLevel: gradeNumberToLabel(row.grade_level),
    guardianEmail: row.parent_email ?? "",
    timeIn: formatTimeDisplay(latestAttendance?.time_in),
    timeOut: formatTimeDisplay(latestAttendance?.time_out),
    date: latestAttendance?.date ?? "",
    status: latestAttendance?.status ?? "",
  };
};

const mapStudentToRow = (student) => ({
  student_id: student.id,
  first_name: student.firstName,
  last_name: student.lastName,
  strand: student.strand,
  grade_level: labelToGradeNumber(student.gradeLevel),
  parent_email: student.guardianEmail,
});

export default function App() {
  const [tab, setTab] = useState("attendance");
  const [scheduleConfig, setScheduleConfig] = useState(() => createDefaultScheduleMap());

  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState("");
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoadingStudents(false);
      return;
    }

    let isMounted = true;

    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      const { data, error } = await supabase
        .from("students")
        .select(
          "id, student_id, first_name, last_name, strand, grade_level, parent_email, attendance:attendance(date, time_in, time_out, status)"
        )
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .order("date", { referencedTable: "attendance", ascending: false })
        .limit(1, { referencedTable: "attendance" });

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load students from Supabase:", error);
        setLoadError("Unable to load students from Supabase. Please try again.");
        setStudents([]);
      } else {
        setStudents(sortStudentsByName((data || []).map(mapRowToStudent)));
        setLoadError("");
      }
      setIsLoadingStudents(false);
    };

    fetchStudents();

    return () => {
      isMounted = false;
    };
  }, [isSupabaseConfigured, supabase]);

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
    guardianEmail: "",
  });
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [saveError, setSaveError] = useState("");
  const handleGuardianEmailChange = (value) => {
    setNewStudent((prev) => ({ ...prev, guardianEmail: value }));

    if (emailTouched) {
      setEmailError(validateGuardianEmail(normalizeEmailInput(value)));
    }
  };

  const handleEmailBlur = () => {
    const normalized = normalizeEmailInput(newStudent.guardianEmail);
    setNewStudent((prev) => ({ ...prev, guardianEmail: normalized }));
    setEmailTouched(true);
    setEmailError(validateGuardianEmail(normalized));
  };

  const resetEmailValidation = () => {
    setEmailTouched(false);
    setEmailError("");
  };

  const isRegisterDisabled = isLoadingStudents || isSavingStudent;
  const registerButtonLabel = isSavingStudent
    ? "Saving..."
    : isLoadingStudents
    ? "Loading..."
    : "Register Student";

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isRegisterDisabled) return;
    setSaveError("");

    const trimmedId = newStudent.id.trim();
    const trimmedFirst = newStudent.firstName.trim();
    const trimmedLast = newStudent.lastName.trim();
    const normalizedEmail = normalizeEmailInput(newStudent.guardianEmail);

    if (!trimmedId || !trimmedFirst || !trimmedLast) return;

    const emailValidation = validateGuardianEmail(normalizedEmail);
    if (emailValidation) {
      setEmailTouched(true);
      setEmailError(emailValidation);
      setNewStudent((prev) => ({ ...prev, guardianEmail: normalizedEmail }));
      return;
    }

    const studentRecord = {
      ...newStudent,
      id: trimmedId,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      guardianEmail: normalizedEmail,
      timeIn: "",
      timeOut: "",
      date: new Date().toISOString().split("T")[0],
      status: "Registered",
      supabaseId: null,
    };

    if (isSupabaseConfigured && supabase) {
      setIsSavingStudent(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .insert([mapStudentToRow(studentRecord)])
          .select(
            "id, student_id, first_name, last_name, strand, grade_level, parent_email, attendance:attendance(date, time_in, time_out, status)"
          )
          .single();

        if (error) throw error;

        let attendanceData = null;
        const { data: attendanceInsert, error: attendanceError } = await supabase
          .from("attendance")
          .insert([
            {
              student_id: studentRecord.id,
              date: studentRecord.date,
              status: studentRecord.status,
            },
          ])
          .select("date, time_in, time_out, status")
          .single();

        if (attendanceError) {
          console.error("Failed to seed attendance record via Supabase:", attendanceError);
        } else {
          attendanceData = attendanceInsert;
        }

        if (attendanceData) {
          data.attendance = Array.isArray(data.attendance) ? data.attendance : [];
          data.attendance.unshift(attendanceData);
        }

        const mappedStudent = mapRowToStudent(data);
        const hydratedStudent = {
          ...mappedStudent,
          date: mappedStudent.date || studentRecord.date,
          timeIn: mappedStudent.timeIn || studentRecord.timeIn,
          timeOut: mappedStudent.timeOut || studentRecord.timeOut,
          status: mappedStudent.status || studentRecord.status,
        };
        setStudents((prevStudents) => sortStudentsByName([...prevStudents, hydratedStudent]));
      } catch (error) {
        console.error("Failed to register student via Supabase:", error);
        const message = error?.message || "Could not register student via Supabase.";
        setSaveError(message);
        alert(`${message}\nCheck the browser console for details.`);
        return;
      } finally {
        setIsSavingStudent(false);
      }
    } else {
      setStudents((prevStudents) => sortStudentsByName([...prevStudents, studentRecord]));
    }

    setNewStudent({
      id: "",
      firstName: "",
      lastName: "",
      strand: "STEM",
      gradeLevel: "Grade 11",
      guardianEmail: "",
    });
    resetEmailValidation();
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
              {isSupabaseConfigured && !loadError && (
                <div className="form-alert success">
                  Connected to Supabase — new registrations will sync automatically.
                </div>
              )}
              {loadError && <div className="form-alert warning">{loadError}</div>}
              {saveError && <div className="form-alert warning">{saveError}</div>}

              <div className="form-grid">
                <div className="form-field span-2">
                  <label htmlFor="student-id">Student ID</label>
                  <input
                    id="student-id"
                    type="text"
                    value={newStudent.id}
                    onChange={(e) =>
                      setNewStudent((prev) => ({ ...prev, id: e.target.value }))
                    }
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="first-name">First Name</label>
                  <input
                    id="first-name"
                    type="text"
                    value={newStudent.firstName}
                    onChange={(e) =>
                      setNewStudent((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    autoComplete="given-name"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="last-name">Last Name</label>
                  <input
                    id="last-name"
                    type="text"
                    value={newStudent.lastName}
                    onChange={(e) =>
                      setNewStudent((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    autoComplete="family-name"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="strand">Strand</label>
                  <select
                    id="strand"
                    value={newStudent.strand}
                    onChange={(e) =>
                      setNewStudent((prev) => ({ ...prev, strand: e.target.value }))
                    }
                  >
                    <option>STEM</option>
                    <option>ICT</option>
                    <option>HUMSS</option>
                    <option>ABM</option>
                    <option>GAS</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="grade-level">Grade Level</label>
                  <select
                    id="grade-level"
                    value={newStudent.gradeLevel}
                    onChange={(e) =>
                      setNewStudent((prev) => ({ ...prev, gradeLevel: e.target.value }))
                    }
                  >
                    <option>Grade 11</option>
                    <option>Grade 12</option>
                  </select>
                </div>

                <div className={"form-field span-2" + (emailTouched && emailError ? " has-error" : "")}>
                  <div className="field-label">
                    <label htmlFor="guardian-email">Parent / Guardian Email</label>
                    <span className="field-hint">Format: name@example.com</span>
                  </div>
                  <input
                    id="guardian-email"
                    type="email"
                    placeholder="parent@example.com"
                    value={newStudent.guardianEmail}
                    onChange={(e) => handleGuardianEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    aria-invalid={emailTouched && !!emailError}
                    aria-describedby={emailTouched && emailError ? "guardian-email-error" : undefined}
                    autoComplete="email"
                    required
                  />
                  {emailTouched && emailError && (
                    <p id="guardian-email-error" className="field-error">
                      {emailError}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="register-btn" disabled={isRegisterDisabled}>
                  {registerButtonLabel}
                </button>
              </div>
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

