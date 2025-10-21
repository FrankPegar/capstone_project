export const parseTime = (time) => {
  if (time === null || time === undefined || time === "") return null;

  if (time instanceof Date) {
    if (Number.isNaN(time.getTime())) return null;
    return time.getHours() * 60 + time.getMinutes();
  }

  if (typeof time === "number" && Number.isFinite(time)) {
    const numericDate = new Date(time);
    if (Number.isNaN(numericDate.getTime())) return null;
    return numericDate.getHours() * 60 + numericDate.getMinutes();
  }

  const trimmed = `${time}`.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|([+-]\d{2}):?(\d{2}))?$/i
  );
  if (isoMatch) {
    const hours = Number(isoMatch[2]);
    const minutes = Number(isoMatch[3]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  const meridiemMatch = trimmed.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i
  );
  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    const modifier = meridiemMatch[4].toUpperCase();
    hours = hours % 12;
    if (modifier === "PM") hours += 12;
    return hours * 60 + minutes;
  }

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getHours() * 60 + parsedDate.getMinutes();
  }

  return null;
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
