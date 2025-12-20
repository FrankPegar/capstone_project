import React from "react";
import "./App.css";
import { parseTime, formatMinutes } from "./timeUtils";
import { DEFAULT_STRAND_SCHEDULE } from "./schedules";

const toTimeInputValue = (time) => {
  const minutes = parseTime(time);
  if (minutes === null) return "";
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
};

const fromTimeInputValue = (value) => {
  if (!value) return "";
  const minutes = parseTime(value);
  if (minutes === null) return "";
  return formatMinutes(minutes);
};

export default function ScheduleManager({
  scheduleConfig,
  onChange = () => {},
  onReset = () => {},
}) {
  const strands = Array.from(
    new Set([
      ...Object.keys(DEFAULT_STRAND_SCHEDULE),
      ...Object.keys(scheduleConfig ?? {}),
    ])
  );

  return (
    <section className="panel surface">
      <div className="panel-header">
        <h2>Strand Schedules</h2>
        <p>Adjust arrival expectations, dismissal times, and grace windows per strand.</p>
      </div>

      <div className="schedule-grid">
        {strands.map((strand) => {
          const schedule = scheduleConfig?.[strand] ?? DEFAULT_STRAND_SCHEDULE[strand] ?? {
            start: "08:00 AM",
            end: "04:00 PM",
            graceMinutes: 5,
          };

          const handleTimeChange = (field) => (event) => {
            const nextValue = fromTimeInputValue(event.target.value);
            if (!nextValue) return;
            onChange(strand, { [field]: nextValue });
          };

          const handleGraceChange = (event) => {
            const parsed = Number(event.target.value);
            onChange(strand, {
              graceMinutes: Number.isNaN(parsed) ? schedule.graceMinutes : Math.max(0, parsed),
            });
          };

          return (
            <div key={strand} className="schedule-card surface">
              <div className="schedule-card__header">
                <h3>{strand}</h3>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onReset(strand)}
                >
                  Reset
                </button>
              </div>

              <div className="schedule-fields">
                <label>
                  Arrival Time
                  <input
                    type="time"
                    value={toTimeInputValue(schedule.start)}
                    onChange={handleTimeChange("start")}
                  />
                </label>

                <label>
                  Dismissal Time
                  <input
                    type="time"
                    value={toTimeInputValue(schedule.end)}
                    onChange={handleTimeChange("end")}
                  />
                </label>

                <label>
                  Grace Minutes
                  <input
                    type="number"
                    min="0"
                    value={schedule.graceMinutes}
                    onChange={handleGraceChange}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
