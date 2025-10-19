export const parseTime = (time) => {
  if (!time) return null;

  const trimmed = time.trim();
  if (!trimmed) return null;

  const hasMeridiem = /\b(am|pm)\b/i.test(trimmed);
  let hours;
  let minutes;

  const dateTimeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (dateTimeMatch) {
    hours = Number(dateTimeMatch[2]);
    minutes = Number(dateTimeMatch[3]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  if (hasMeridiem) {
    const [timePart, modifierRaw] = trimmed.split(/\s+/);
    const modifier = modifierRaw.toUpperCase();
    const [hh, mm] = timePart.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

    hours = hh % 12;
    minutes = mm;
    if (modifier === "PM") hours += 12;
  } else {
    const [hh, mm] = trimmed.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    hours = hh;
    minutes = mm;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getHours() * 60 + parsed.getMinutes();
  }

  return hours * 60 + minutes;
};

export const formatMinutes = (value) => {
  if (value === null || value === undefined) return "-";
  const hours24 = Math.floor(value / 60);
  const minutes = value % 60;
  const modifier = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")} ${modifier}`;
};

export const addMinutes = (baseMinutes, increment) => {
  if (baseMinutes === null || baseMinutes === undefined) return null;
  return baseMinutes + increment;
};
