import { UserSettings } from "@/types/settings";

export const formatDate = (date: string | Date, settings?: UserSettings | null): string => {
  let d: Date;
  
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(date);
  }

  if (!settings) return d.toLocaleDateString();

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());

  switch (settings.date_format) {
    case "YYYY-MM-DD": return `${year}-${month}-${day}`;
    case "DD-MM-YYYY": return `${day}-${month}-${year}`;
    case "MM-DD-YYYY": return `${month}-${day}-${year}`;
    case "DD/MM/YYYY": return `${day}/${month}/${year}`;
    case "MM/DD/YYYY": return `${month}/${day}/${year}`;
    case "YYYY/MM/DD": return `${year}/${month}/${day}`;
    default: return d.toLocaleDateString();
  }
};

export const formatTime = (date: string | Date, settings?: UserSettings | null): string => {
  const d = new Date(date);
  if (!settings) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const hours24 = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");

  if (settings.time_format === "12h") {
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${minutes} ${period}`;
  }

  return `${String(hours24).padStart(2, "0")}:${minutes}`;
};

export const formatDateTime = (date: string | Date, settings?: UserSettings | null): string => {
  return `${formatDate(date, settings)} ${formatTime(date, settings)}`;
};