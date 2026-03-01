export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

export const TIME_FORMATS = [
  { value: "12h", label: "12h (2:30 PM)" },
  { value: "24h", label: "24h (14:30)" },
];

export const DECIMAL_SEPARATORS = [
  { value: ".", label: "Period (1,000.00)" },
  { value: ",", label: "Comma (1.000,00)" },
];

export const THOUSANDS_SEPARATORS = [
  { value: ",", label: "Comma (1,000.00)" },
  { value: ".", label: "Period (1.000,00)" },
  { value: " ", label: "Space (1 000,00)" },
];

export const WEEK_STARTS = [
  { value: "monday", label: "Monday" },
  { value: "sunday", label: "Sunday" },
];

// Generated from Intl API — no hardcoding needed
export const getTimezones = (): { value: string; label: string }[] => {
  return Intl.supportedValuesOf("timeZone").map((tz) => ({
    value: tz,
    label: tz.replace(/_/g, " "),
  }));
};

export const getLanguages = (): { value: string; label: string }[] => {
  const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
  const common = ["en", "fr", "de", "es", "it", "pt", "nl", "pl", "ru", "zh", "ja", "ar"];
  return common.map((code) => ({
    value: code,
    label: displayNames.of(code) || code,
  }));
};

export const getCurrencies = (): { value: string; label: string }[] => {
  const displayNames = new Intl.DisplayNames(["en"], { type: "currency" });
  const common = ["GBP", "USD", "EUR", "JPY", "CHF", "CAD", "AUD", "CNY", "AED", "SGD"];
  return common.map((code) => ({
    value: code,
    label: `${code} - ${displayNames.of(code) || code}`,
  }));
};