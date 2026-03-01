export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface Timezone {
  value: string;
  label: string;
}

export interface MetaData {
  currencies: Currency[];
  languages: Language[];
  timezones: Timezone[];
}