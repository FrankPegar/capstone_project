import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_PARENT_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const FROM_NAME = import.meta.env.VITE_EMAIL_FROM_NAME || "Attendance Team";
const REPLY_TO = import.meta.env.VITE_EMAIL_REPLY_TO || "";

export const isEmailAlertsConfigured = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

export const sendParentAlert = async ({
  toEmail,
  studentName,
  studentId,
  severity,
  date,
  message,
  strand,
  timeIn,
  timeOut,
}) => {
  if (!isEmailAlertsConfigured) {
    throw new Error("Email alerts are not configured. Please set EmailJS env vars.");
  }

  const timeSection = [timeIn && `IN ${timeIn}`, timeOut && `OUT ${timeOut}`]
    .filter(Boolean)
    .join(" | ");
  const alertMessage = timeSection ? `${message || ""} Times: ${timeSection}`.trim() : message || "";

  const templateParams = {
    to_email: toEmail,
    student_name: studentName || "Student",
    student_id: studentId || "",
    severity: severity || "medium",
    attendance_date: date || "",
    strand: strand || "Strand",
    alert_message: alertMessage,
    time_in: timeIn || "",
    time_out: timeOut || "",
    from_name: FROM_NAME,
    reply_to: REPLY_TO,
  };

  return emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, { publicKey: PUBLIC_KEY });
};
