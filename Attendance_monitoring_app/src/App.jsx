import React, { useEffect, useState } from "react";
import AttendanceDashboard from "./AttendanceDashboard";
import ReportsDashboard from "./ReportsDashboard";
import AllStudents from "./AllStudents";
import ScheduleManager from "./ScheduleManager";
import { createDefaultScheduleMap, DEFAULT_STRAND_SCHEDULE } from "./schedules";
import { formatMinutes, parseTime } from "./timeUtils";
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
const DUPLICATE_STUDENT_MESSAGE = "A student with this ID already exists. Please use a unique ID.";

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

const formatDateTime = (date) => {
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatTimeDisplay = (value) => {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date) {
    return formatDateTime(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const asDate = new Date(trimmed);
      if (!Number.isNaN(asDate.getTime())) {
        return formatDateTime(asDate);
      }
      return trimmed.replace("T", " ").split(".")[0];
    }

    const minutes = parseTime(trimmed);
    if (minutes !== null) {
      return formatMinutes(minutes);
    }

    return trimmed;
  }

  const minutes = parseTime(value);
  if (minutes !== null) {
    return formatMinutes(minutes);
  }

  return "";
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

const mapRowToBaseStudent = (row = {}) => ({
  supabaseId: row.id ?? null,
  id: row.student_id ?? row.id ?? "",
  firstName: row.first_name ?? "",
  lastName: row.last_name ?? "",
  strand: row.strand ?? "",
  gradeLevel: gradeNumberToLabel(row.grade_level),
  guardianEmail: row.parent_email ?? "",
  createdAt: row.created_at ?? null,
});

const mapRowToDirectoryStudent = (row = {}) => {
  const base = mapRowToBaseStudent(row);
  const attendanceRecords = Array.isArray(row.attendance) ? row.attendance : [];
  const latestAttendance = attendanceRecords.length > 0 ? attendanceRecords[0] : null;

  return {
    ...base,
    attendanceId: latestAttendance?.id ?? null,
    attendanceCreatedAt: latestAttendance?.created_at ?? null,
    attendanceUpdatedAt: latestAttendance?.updated_at ?? null,
    timeInRaw: latestAttendance?.time_in ?? null,
    timeOutRaw: latestAttendance?.time_out ?? null,
    timeIn: formatTimeDisplay(latestAttendance?.time_in),
    timeOut: formatTimeDisplay(latestAttendance?.time_out),
    date: latestAttendance?.date ?? "",
    status: latestAttendance?.status ?? "",
  };
};

const mapRowToAttendanceRecords = (row = {}) => {
  const base = mapRowToBaseStudent(row);
  const attendanceRecords = Array.isArray(row.attendance) ? row.attendance : [];

  return attendanceRecords.map((record) => ({
    ...base,
    attendanceId: record?.id ?? null,
    attendanceCreatedAt: record?.created_at ?? null,
    attendanceUpdatedAt: record?.updated_at ?? null,
    timeInRaw: record?.time_in ?? null,
    timeOutRaw: record?.time_out ?? null,
    timeIn: formatTimeDisplay(record?.time_in),
    timeOut: formatTimeDisplay(record?.time_out),
    date: record?.date ?? "",
    status: record?.status ?? "",
  }));
};

const getSortableTimestamp = (record) => {
  const candidates = [
    record.timeInRaw,
    record.timeOutRaw,
    record.attendanceUpdatedAt,
    record.attendanceCreatedAt,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  if (record.date) {
    const combined = `${record.date} ${record.timeIn || record.timeOut || ""}`.trim();
    if (combined) {
      const parsed = new Date(combined);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
  }

  const minutes = parseTime(record.timeIn || record.timeOut);
  if (minutes !== null) {
    return minutes * 60 * 1000;
  }

  return Number.NEGATIVE_INFINITY;
};

const sortAttendanceRecords = (records) =>
  [...records].sort((a, b) => {
    const dateCompare = (b.date || "").localeCompare(a.date || "");
    if (dateCompare !== 0) return dateCompare;

    const timeDiff = getSortableTimestamp(b) - getSortableTimestamp(a);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    const updatedCompare = (b.attendanceUpdatedAt || "").localeCompare(a.attendanceUpdatedAt || "");
    if (updatedCompare !== 0) return updatedCompare;

    const lastCompare = (a.lastName || "").localeCompare(b.lastName || "", undefined, {
      sensitivity: "base",
    });
    if (lastCompare !== 0) return lastCompare;

    const firstCompare = (a.firstName || "").localeCompare(b.firstName || "", undefined, {
      sensitivity: "base",
    });
    if (firstCompare !== 0) return firstCompare;

    const aKey = a.attendanceId || `${a.id}-${a.date}-${a.timeIn || a.timeOut || ""}`;
    const bKey = b.attendanceId || `${b.id}-${b.date}-${b.timeIn || b.timeOut || ""}`;
    return bKey.localeCompare(aKey);
  });

const mapStudentToRow = (student) => {
  const gradeValue = labelToGradeNumber(student.gradeLevel);
  return {
    student_id: student.id,
    first_name: student.firstName,
    last_name: student.lastName,
    strand: student.strand,
    grade_level:
      gradeValue !== null && gradeValue !== undefined
        ? String(gradeValue)
        : student.gradeLevel || null,
    parent_email: student.guardianEmail,
  };
};

export default function App() {
  const [tab, setTab] = useState("attendance");
  const [scheduleConfig, setScheduleConfig] = useState(() => createDefaultScheduleMap());

  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [deletingStudentIds, setDeletingStudentIds] = useState(() => new Set());
  const [deleteError, setDeleteError] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editEmailTouched, setEditEmailTouched] = useState(false);
  const [editEmailError, setEditEmailError] = useState("");
  const [editError, setEditError] = useState("");
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
          "student_id, first_name, last_name, strand, grade_level, parent_email, created_at, attendance:attendance(id, date, time_in, time_out, status, created_at, updated_at)"
        )
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .order("date", { referencedTable: "attendance", ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load students from Supabase:", error);
        setLoadError("Unable to load students from Supabase. Please try again.");
        setStudents([]);
        setAttendanceRecords([]);
      } else {
        const rows = Array.isArray(data) ? data : [];
        const directoryEntries = rows.map(mapRowToDirectoryStudent);
        const attendanceEntries = rows.flatMap(mapRowToAttendanceRecords);

        setStudents(sortStudentsByName(directoryEntries));
        setAttendanceRecords(sortAttendanceRecords(attendanceEntries));
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

  const applyStudentUpdate = (updated) => {
    if (!updated || !updated.id) return;
    const targetIdLower = updated.id.toLowerCase();

    setStudents((prev) =>
      sortStudentsByName(
        prev.map((student) =>
          (student.id || "").toLowerCase() === targetIdLower
            ? {
                ...student,
                firstName: updated.firstName,
                lastName: updated.lastName,
                strand: updated.strand,
                gradeLevel: updated.gradeLevel,
                guardianEmail: updated.guardianEmail,
              }
            : student
        )
      )
    );

    setAttendanceRecords((prev) =>
      sortAttendanceRecords(
        prev.map((record) =>
          (record.id || "").toLowerCase() === targetIdLower
            ? {
                ...record,
                firstName: updated.firstName,
                lastName: updated.lastName,
                strand: updated.strand,
                gradeLevel: updated.gradeLevel,
                guardianEmail: updated.guardianEmail,
              }
            : record
        )
      )
    );
  };

  const handleStartEditStudent = (studentId) => {
    const normalizedId = `${studentId || ""}`.trim();
    if (!normalizedId) return;
    const target = students.find(
      (student) => (student.id || "").toLowerCase() === normalizedId.toLowerCase()
    );
    if (!target) return;

    setEditingStudent({
      id: target.id,
      supabaseId: target.supabaseId ?? null,
      firstName: target.firstName || "",
      lastName: target.lastName || "",
      strand: target.strand || "STEM",
      gradeLevel: target.gradeLevel || "",
      guardianEmail: target.guardianEmail || "",
    });
    setEditEmailTouched(false);
    setEditEmailError("");
    setEditError("");
  };

  const handleEditFieldChange = (field, value) => {
    setEditingStudent((prev) => {
      if (!prev) return prev;
      const nextValue = field === "guardianEmail" ? value : value;
      return {
        ...prev,
        [field]: nextValue,
      };
    });

    if (field === "guardianEmail" && editEmailTouched) {
      setEditEmailError(validateGuardianEmail(normalizeEmailInput(value)));
    }
  };

  const handleEditEmailBlur = () => {
    if (!editingStudent) return;
    const normalized = normalizeEmailInput(editingStudent.guardianEmail);
    setEditingStudent((prev) => (prev ? { ...prev, guardianEmail: normalized } : prev));
    setEditEmailTouched(true);
    setEditEmailError(validateGuardianEmail(normalized));
  };

  const handleEditCancel = () => {
    setEditingStudent(null);
    setEditEmailTouched(false);
    setEditEmailError("");
    setEditError("");
  };

  const markDeleting = (id) => {
    if (!id) return;
    setDeletingStudentIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const unmarkDeleting = (id) => {
    if (!id) return;
    setDeletingStudentIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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

    const duplicateLocal = students.some(
      (student) => (student.id || "").toLowerCase() === trimmedId.toLowerCase()
    );
    if (duplicateLocal) {
      setSaveError(DUPLICATE_STUDENT_MESSAGE);
      return;
    }

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
        const { data: existingStudent, error: lookupError } = await supabase
          .from("students")
          .select("student_id")
          .eq("student_id", trimmedId)
          .maybeSingle();

        if (lookupError) throw lookupError;
        if (existingStudent) {
          setSaveError(DUPLICATE_STUDENT_MESSAGE);
          return;
        }

        const { data, error } = await supabase
          .from("students")
          .insert([mapStudentToRow(studentRecord)])
          .select(
            "student_id, first_name, last_name, strand, grade_level, parent_email, created_at, attendance:attendance(id, date, time_in, time_out, status, created_at, updated_at)"
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
          .select("id, date, time_in, time_out, status, created_at, updated_at")
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

        const directoryEntry = {
          ...mapRowToDirectoryStudent({
            ...data,
            attendance: data?.attendance ?? [],
          }),
        };

        if (!directoryEntry.date) {
          directoryEntry.date = studentRecord.date;
        }
        if (!directoryEntry.timeIn) {
          directoryEntry.timeIn = studentRecord.timeIn;
        }
        if (!directoryEntry.timeOut) {
          directoryEntry.timeOut = studentRecord.timeOut;
        }
        if (!directoryEntry.status) {
          directoryEntry.status = studentRecord.status;
        }
        if (!directoryEntry.attendanceCreatedAt) {
          directoryEntry.attendanceCreatedAt = attendanceData?.created_at ?? null;
        }
        if (!directoryEntry.attendanceUpdatedAt) {
          directoryEntry.attendanceUpdatedAt = attendanceData?.updated_at ?? null;
        }

        const attendanceEntry = {
          supabaseId: directoryEntry.supabaseId,
          id: directoryEntry.id,
          firstName: directoryEntry.firstName,
          lastName: directoryEntry.lastName,
          strand: directoryEntry.strand,
          gradeLevel: directoryEntry.gradeLevel,
          guardianEmail: directoryEntry.guardianEmail,
          attendanceId: directoryEntry.attendanceId || attendanceData?.id || null,
          attendanceCreatedAt:
            directoryEntry.attendanceCreatedAt ?? attendanceData?.created_at ?? null,
          attendanceUpdatedAt:
            directoryEntry.attendanceUpdatedAt ?? attendanceData?.updated_at ?? null,
          timeInRaw: directoryEntry.timeInRaw ?? attendanceData?.time_in ?? null,
          timeOutRaw: directoryEntry.timeOutRaw ?? attendanceData?.time_out ?? null,
          timeIn: directoryEntry.timeIn,
          timeOut: directoryEntry.timeOut,
          date: directoryEntry.date,
          status: directoryEntry.status,
        };

        setStudents((prevStudents) => sortStudentsByName([...prevStudents, directoryEntry]));
        setAttendanceRecords((prev) => sortAttendanceRecords([...prev, attendanceEntry]));
      } catch (error) {
        console.error("Failed to register student via Supabase:", error);
        const duplicateViolation =
          error?.code === "23505" ||
          (typeof error?.message === "string" &&
            error.message.toLowerCase().includes("duplicate key value"));

        const message = duplicateViolation
          ? DUPLICATE_STUDENT_MESSAGE
          : error?.message || "Could not register student via Supabase.";
        setSaveError(message);
        if (!duplicateViolation) {
          alert(`${message}\nCheck the browser console for details.`);
        }
        return;
      } finally {
        setIsSavingStudent(false);
      }
    } else {
      const fallbackAttendanceId = `local-${Date.now()}`;
      const fallbackTimestamp = new Date().toISOString();
      const directoryEntry = {
        ...studentRecord,
        attendanceId: fallbackAttendanceId,
        attendanceCreatedAt: fallbackTimestamp,
        attendanceUpdatedAt: fallbackTimestamp,
        timeInRaw: null,
        timeOutRaw: null,
      };
      setStudents((prevStudents) => sortStudentsByName([...prevStudents, directoryEntry]));
      setAttendanceRecords((prev) =>
        sortAttendanceRecords([
          ...prev,
          {
            ...studentRecord,
            attendanceId: fallbackAttendanceId,
            attendanceCreatedAt: fallbackTimestamp,
            attendanceUpdatedAt: fallbackTimestamp,
            timeInRaw: null,
            timeOutRaw: null,
          },
        ])
      );
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

  const handleDeleteStudent = async (studentId) => {
    const normalizedId = `${studentId || ""}`.trim();
    if (!normalizedId) return;

    const normalizedIdLower = normalizedId.toLowerCase();
    const targetStudent = students.find(
      (student) => (student.id || "").toLowerCase() === normalizedIdLower
    );
    const displayName = targetStudent
      ? `${targetStudent.firstName || ""} ${targetStudent.lastName || ""}`.trim()
      : normalizedId;

    const confirmed = window.confirm(
      `Remove ${displayName || normalizedId} from the directory? This will also delete their attendance history.`
    );
    if (!confirmed) return;

    setDeleteError("");

    const removeLocalRecords = () => {
      setStudents((prev) =>
        sortStudentsByName(
          prev.filter((student) => (student.id || "").toLowerCase() !== normalizedIdLower)
        )
      );
      setAttendanceRecords((prev) =>
        sortAttendanceRecords(
          prev.filter((record) => (record.id || "").toLowerCase() !== normalizedIdLower)
        )
      );
      if (editingStudent && (editingStudent.id || "").toLowerCase() === normalizedIdLower) {
        handleEditCancel();
      }
    };

    const trackingId = targetStudent?.id || normalizedId;

    if (isSupabaseConfigured && supabase) {
      markDeleting(trackingId);
      try {
        const { error } = await supabase.from("students").delete().eq("student_id", normalizedId);
        if (error) throw error;
        removeLocalRecords();
        alert("Student removed successfully.");
      } catch (error) {
        console.error("Failed to delete student via Supabase:", error);
        const message = error?.message || "Could not delete student. Please try again.";
        setDeleteError(message);
      } finally {
        unmarkDeleting(trackingId);
      }
    } else {
      removeLocalRecords();
      alert("Student removed successfully.");
    }
  };

  const handleEditSubmit = async (event) => {
    event?.preventDefault?.();
    if (!editingStudent || isSavingEdit) return;

    setEditError("");

    const trimmedFirst = editingStudent.firstName.trim();
    const trimmedLast = editingStudent.lastName.trim();
    const trimmedStrand = editingStudent.strand.trim() || "STEM";
    const trimmedGrade = editingStudent.gradeLevel.trim();
    const normalizedEmail = normalizeEmailInput(editingStudent.guardianEmail);

    if (!trimmedFirst || !trimmedLast) {
      setEditError("First and last name are required.");
      return;
    }

    const emailValidation = validateGuardianEmail(normalizedEmail);
    if (emailValidation) {
      setEditEmailTouched(true);
      setEditEmailError(emailValidation);
      setEditingStudent((prev) => (prev ? { ...prev, guardianEmail: normalizedEmail } : prev));
      return;
    }

    const updatedStudent = {
      id: editingStudent.id,
      supabaseId: editingStudent.supabaseId ?? null,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      strand: trimmedStrand,
      gradeLevel: trimmedGrade,
      guardianEmail: normalizedEmail,
    };

    if (isSupabaseConfigured && supabase) {
      setIsSavingEdit(true);
      try {
        const gradeValue = labelToGradeNumber(updatedStudent.gradeLevel);
        const updates = {
          first_name: updatedStudent.firstName,
          last_name: updatedStudent.lastName,
          strand: updatedStudent.strand,
          grade_level:
            gradeValue !== null && gradeValue !== undefined
              ? String(gradeValue)
              : updatedStudent.gradeLevel || null,
          parent_email: updatedStudent.guardianEmail,
        };

        const { error } = await supabase
          .from("students")
          .update(updates)
          .eq("student_id", updatedStudent.id);

        if (error) throw error;

        applyStudentUpdate({
          ...updatedStudent,
          gradeLevel:
            gradeValue !== null && gradeValue !== undefined
              ? `Grade ${gradeValue}`
              : updatedStudent.gradeLevel,
        });
        handleEditCancel();
        alert("Student details updated.");
      } catch (error) {
        console.error("Failed to update student via Supabase:", error);
        const message = error?.message || "Could not update student. Please try again.";
        setEditError(message);
      } finally {
        setIsSavingEdit(false);
      }
    } else {
      applyStudentUpdate(updatedStudent);
      handleEditCancel();
      alert("Student details updated.");
    }
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
          <AttendanceDashboard students={attendanceRecords} scheduleConfig={scheduleConfig} />
        )}
        {tab === "reports" && (
          <ReportsDashboard students={attendanceRecords} scheduleConfig={scheduleConfig} />
        )}
        {tab === "students" && (
          <AllStudents
            students={students}
            onDeleteStudent={handleDeleteStudent}
            deletingStudentIds={deletingStudentIds}
            deleteError={deleteError}
            onEditRequest={handleStartEditStudent}
            editingStudent={editingStudent}
            onEditFieldChange={handleEditFieldChange}
            onEditEmailBlur={handleEditEmailBlur}
            editEmailTouched={editEmailTouched}
            editEmailError={editEmailError}
            onEditCancel={handleEditCancel}
            onEditSubmit={handleEditSubmit}
            isSavingEdit={isSavingEdit}
            editError={editError}
          />
        )}
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
