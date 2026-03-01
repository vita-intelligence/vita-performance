import { UserSettings } from "@/types/settings";

export const formatNumber = (value: number, settings?: UserSettings | null): string => {
  const decimal = settings?.decimal_separator || ".";
  const thousands = settings?.thousands_separator || ",";

  const [intPart, decPart] = value.toFixed(2).split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

  return `${formattedInt}${decimal}${decPart}`;
};

export const formatCurrency = (value: number, settings?: UserSettings | null): string => {
  const symbol = settings?.currency_symbol || "";
  return `${symbol}${formatNumber(value, settings)}`;
};