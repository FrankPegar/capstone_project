import React, { useMemo, useState } from "react";
import "./App.css";

const normalize = (value = "") => value.toLowerCase().trim();

export default function AllStudents({
  students,
  onDeleteStudent = () => {},
  deletingStudentIds = new Set(),
  deleteError = "",
  onEditRequest = () => {},
  editingStudent = null,
  onEditFieldChange = () => {},
  onEditEmailBlur = () => {},
  editEmailTouched = false,
  editEmailError = "",
  onEditCancel = () => {},
  onEditSubmit = () => {},
  isSavingEdit = false,
  editError = "",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [strandFilter, setStrandFilter] = useState("All");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [emailFilter, setEmailFilter] = useState("");

  const strandOptions = useMemo(() => {
    const unique = new Set();
    students.forEach((student) => {
      if (student.strand) unique.add(student.strand);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const gradeOptions = useMemo(() => {
    const unique = new Set();
    students.forEach((student) => {
      if (student.gradeLevel) unique.add(student.gradeLevel);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const search = normalize(searchTerm);
    const emailQuery = normalize(emailFilter);

    return students.filter((student) => {
      const fullName = normalize(`${student.firstName} ${student.lastName}`);
      const idMatch = normalize(student.id || "");
      const matchesSearch = !search || fullName.includes(search) || idMatch.includes(search);

      const matchesStrand = strandFilter === "All" || student.strand === strandFilter;
      const matchesGrade = gradeFilter === "All" || student.gradeLevel === gradeFilter;

      const guardianEmail = normalize(student.guardianEmail || "");
      const matchesEmail = !emailQuery || guardianEmail.includes(emailQuery);

      return matchesSearch && matchesStrand && matchesGrade && matchesEmail;
    });
  }, [students, searchTerm, strandFilter, gradeFilter, emailFilter]);

  const sortedStudents = useMemo(
    () =>
      [...filteredStudents].sort((a, b) => {
        const lastCompare = normalize(a.lastName).localeCompare(normalize(b.lastName));
        if (lastCompare !== 0) return lastCompare;
        return normalize(a.firstName).localeCompare(normalize(b.firstName));
      }),
    [filteredStudents]
  );

  const totalStudents = students.length;
  const totalFiltered = sortedStudents.length;
  const strandCount = strandOptions.length;

  const gradeCounts = useMemo(() => {
    const counts = {};
    students.forEach((student) => {
      if (!student.gradeLevel) return;
      counts[student.gradeLevel] = (counts[student.gradeLevel] || 0) + 1;
    });
    return counts;
  }, [students]);

  const gradeSummary = gradeOptions
    .map((grade) => `${grade}: ${gradeCounts[grade] ?? 0}`)
    .join(" | ");

  const resetFilters = () => {
    setSearchTerm("");
    setStrandFilter("All");
    setGradeFilter("All");
    setEmailFilter("");
  };

  const emptyColumns = 7;

  return (
    <div className="dashboard-container">
      <section className="panel surface">
        <div className="panel-header">
          <h2>Student Directory</h2>
          <p>Browse every registered learner and drill down by strand, grade, or family contact.</p>
        </div>

        {deleteError && <div className="form-alert warning">{deleteError}</div>}

        <div className="filters-grid">
          <div className="filter-box stack">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by name or ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-box stack">
            <label>Strand</label>
            <select value={strandFilter} onChange={(e) => setStrandFilter(e.target.value)}>
              <option value="All">All</option>
              {strandOptions.map((strand) => (
                <option key={strand} value={strand}>
                  {strand}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-box stack">
            <label>Grade Level</label>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
              <option value="All">All</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-box stack">
            <label>Parent Email</label>
            <input
              type="text"
              placeholder="Search by email"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="button-group">
          <button type="button" className="ghost-button" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      </section>

      {editingStudent && (
        <section className="panel surface">
          <div className="panel-header">
            <h2>Edit Student</h2>
            <p>Update the student’s details and save to sync changes.</p>
          </div>

          {editError && <div className="form-alert warning">{editError}</div>}

          <form className="register-form" onSubmit={onEditSubmit}>
            <div className="form-grid">
              <div className="form-field span-2">
                <label htmlFor="edit-student-id">Student ID</label>
                <input id="edit-student-id" type="text" value={editingStudent.id} disabled />
              </div>

              <div className="form-field">
                <label htmlFor="edit-first-name">First Name</label>
                <input
                  id="edit-first-name"
                  type="text"
                  value={editingStudent.firstName}
                  onChange={(e) => onEditFieldChange("firstName", e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="edit-last-name">Last Name</label>
                <input
                  id="edit-last-name"
                  type="text"
                  value={editingStudent.lastName}
                  onChange={(e) => onEditFieldChange("lastName", e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="edit-strand">Strand</label>
                <select
                  id="edit-strand"
                  value={editingStudent.strand}
                  onChange={(e) => onEditFieldChange("strand", e.target.value)}
                >
                  <option>STEM</option>
                  <option>ICT</option>
                  <option>HUMSS</option>
                  <option>ABM</option>
                  <option>GAS</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="edit-grade-level">Grade Level</label>
                <select
                  id="edit-grade-level"
                  value={editingStudent.gradeLevel}
                  onChange={(e) => onEditFieldChange("gradeLevel", e.target.value)}
                >
                  <option value="">Select grade</option>
                  <option>Grade 11</option>
                  <option>Grade 12</option>
                </select>
              </div>

              <div
                className={
                  "form-field span-2" +
                  (editEmailTouched && editEmailError ? " has-error" : "")
                }
              >
                <div className="field-label">
                  <label htmlFor="edit-guardian-email">Parent / Guardian Email</label>
                  <span className="field-hint">Format: name@example.com</span>
                </div>
                <input
                  id="edit-guardian-email"
                  type="email"
                  value={editingStudent.guardianEmail}
                  onChange={(e) => onEditFieldChange("guardianEmail", e.target.value)}
                  onBlur={onEditEmailBlur}
                  aria-invalid={editEmailTouched && !!editEmailError}
                  aria-describedby={
                    editEmailTouched && editEmailError ? "edit-guardian-email-error" : undefined
                  }
                  required
                />
                {editEmailTouched && editEmailError && (
                  <p id="edit-guardian-email-error" className="field-error">
                    {editEmailError}
                  </p>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="ghost-button" onClick={onEditCancel}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={isSavingEdit}>
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="stat-grid">
        <div className="stat-card surface">
          <span className="stat-label">Total Students</span>
          <strong className="stat-value">{totalStudents}</strong>
          <span className="stat-subtext">{totalFiltered} match current filters</span>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Strands Represented</span>
          <strong className="stat-value">{strandCount}</strong>
        </div>
        <div className="stat-card surface">
          <span className="stat-label">Grades Overview</span>
          <strong className="stat-value">{gradeOptions.length}</strong>
          <span className="stat-subtext">{gradeSummary || "No grade data yet"}</span>
        </div>
      </section>

      <section className="panel surface">
        <div className="panel-header">
          <h2>Registered Students</h2>
          <p>Sorts alphabetically by last name, showing latest attendance stamp.</p>
        </div>

        <div className="table-container">
          <table className="attendance-table">
            <thead className="header-blue">
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Strand</th>
                <th>Grade Level</th>
                <th>Parent Email</th>
                <th>Last Attendance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => {
                const attendanceStamp = [
                  student.date,
                  student.timeIn && `IN ${student.timeIn}`,
                  student.timeOut && `OUT ${student.timeOut}`,
                ]
                  .filter(Boolean)
                  .join(" | ") || "-";

                const isDeleting =
                  Boolean(
                    deletingStudentIds &&
                      typeof deletingStudentIds.has === "function" &&
                      deletingStudentIds.has(student.id)
                  ) ||
                  (Array.isArray(deletingStudentIds) && deletingStudentIds.includes(student.id));

                return (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td className="cell-name">
                      <span className="name-primary">
                        {student.firstName} {student.lastName}
                      </span>
                    </td>
                    <td>{student.strand}</td>
                    <td>{student.gradeLevel || "-"}</td>
                    <td>{student.guardianEmail || "-"}</td>
                    <td>
                      <span className="name-secondary">{attendanceStamp}</span>
                    </td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => onEditRequest(student.id)}
                        disabled={isSavingEdit}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => onDeleteStudent(student.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedStudents.length === 0 && (
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
