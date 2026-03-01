type AlertData = Record<string, string | number>;

export const ALERT_MESSAGES: Record<string, (data: AlertData) => string> = {
  NO_ACTIVE_SESSIONS: () => "⚠ No active sessions right now",
  WORKSTATION_IDLE: (data) => `⚠ ${data.workstation_name} has been idle for ${data.hours}h`,
  TEAM_MILESTONE: (data) => `🎯 Team milestone — ${data.count} sessions completed today!`,
  SESSION_STARTED: (data) => `▶ ${data.worker_name} started on ${data.workstation_name}`,
  SESSION_COMPLETED: (data) => `✓ ${data.worker_name} completed — ${data.performance}%`,
  PERFORMANCE_HIGH: (data) => `🏆 ${data.worker_name} just hit ${data.performance}%!`,
  PERFORMANCE_LOW: (data) => `⚠ ${data.worker_name} is below 75% — ${data.performance}%`,
  FIRST_SESSION_TODAY: (data) => `🌅 First session of the day — ${data.worker_name}!`,
};

export const getAlertMessage = (code: string, data: AlertData): string => {
  const fn = ALERT_MESSAGES[code];
  if (!fn) return code;
  return fn(data);
};