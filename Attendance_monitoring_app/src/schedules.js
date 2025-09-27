export const DEFAULT_STRAND_SCHEDULE = {
  STEM: {
    start: "08:00 AM",
    end: "03:45 PM",
    graceMinutes: 5,
  },
  ICT: {
    start: "07:30 AM",
    end: "03:30 PM",
    graceMinutes: 10,
  },
  HUMSS: {
    start: "09:00 AM",
    end: "04:30 PM",
    graceMinutes: 5,
  },
  ABM: {
    start: "08:30 AM",
    end: "04:00 PM",
    graceMinutes: 5,
  },
  GAS: {
    start: "07:45 AM",
    end: "03:50 PM",
    graceMinutes: 7,
  },
};

export const DEFAULT_SCHEDULE = {
  start: "08:00 AM",
  end: "04:00 PM",
  graceMinutes: 5,
};


export const createDefaultScheduleMap = () =>
  Object.fromEntries(
    Object.entries(DEFAULT_STRAND_SCHEDULE).map(([strand, config]) => [
      strand,
      { ...config },
    ])
  );

export const getScheduleForStrand = (scheduleMap, strand) =>
  (scheduleMap && scheduleMap[strand]) || DEFAULT_SCHEDULE;
