export const SAFETY_LIMITS = {
  minAge: 18,
  minHistorySeconds: 600,
  faceMissingPauseSeconds: 5,
  faceMissingDisconnectSeconds: 20,
  maxReportNotesLength: 500,
  maxPingMessageLength: 80,
  maxTextMessageLength: 1000,
};

export const REPORT_REASONS = [
  "Nudity or sexual content",
  "Harassment or bullying",
  "Hate speech",
  "Threats or violence",
  "Spam or scam",
  "Underage user",
  "Camera not showing face",
  "Other",
];

export const PRESET_PING_MESSAGES = [
  "Hey, want to reconnect?",
  "Good chat earlier.",
  "Want to continue talking?",
];