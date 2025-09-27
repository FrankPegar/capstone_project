import React, { useMemo, useState } from "react";
import "./App.css";

const normalize = (value = "") => value.toLowerCase().trim();
const digitsOnly = (value = "") => value.replace(/\D/g, "");

export default function AllStudents({ students }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [strandFilter, setStrandFilter] = useState("All");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [contactFilter, setContactFilter] = useState("");

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
    const contactDigits = digitsOnly(contactFilter);

    return students.filter((student) => {
      const fullName = normalize(`${student.firstName} ${student.lastName}`);
      const idMatch = normalize(student.id || "");
      const matchesSearch = !search || fullName.includes(search) || idMatch.includes(search);

      const matchesStrand = strandFilter === "All" || student.strand === strandFilter;
      const matchesGrade = gradeFilter === "All" || student.gradeLevel === gradeFilter;

      const contactValue = digitsOnly(student.guardianContact || "");
      const matchesContact = !contactDigits || contactValue.includes(contactDigits);

      return matchesSearch && matchesStrand && matchesGrade && matchesContact;
    });
  }, [students, searchTerm, strandFilter, gradeFilter, contactFilter]);

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
    setContactFilter("");
  };

  const emptyColumns = 6;

  return (
    <div className="dashboard-container">
      <section className="panel surface">
        <div className="panel-header">
          <h2>Student Directory</h2>
          <p>Browse every registered learner and drill down by strand, grade, or family contact.</p>
        </div>

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
            <label>Contact Digits</label>
            <input
              type="text"
              placeholder="Type digits to match"
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="button-group">
          <button type="button" className="ghost-button" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      </section>

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
                <th>Guardian Contact</th>
                <th>Last Attendance</th>
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
                    <td>{student.guardianContact || "-"}</td>
                    <td>
                      <span className="name-secondary">{attendanceStamp}</span>
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
