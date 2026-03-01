import { useQuery } from "@tanstack/react-query";
import { metaService } from "@/services/meta.service";
import { useMetaStore } from "@/lib/stores";

const META_KEYS = {
  currencies: ["meta", "currencies"],
  languages: ["meta", "languages"],
  timezones: ["meta", "timezones"],
};

export const useMeta = () => {
  const { currencies, languages, timezones, setCurrencies, setLanguages, setTimezones } = useMetaStore();

  const { isLoading: isCurrenciesLoading } = useQuery({
    queryKey: META_KEYS.currencies,
    queryFn: async () => {
      const data = await metaService.getCurrencies();
      setCurrencies(data);
      return data;
    },
    enabled: currencies.length === 0,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: false,
  });

  const { isLoading: isLanguagesLoading } = useQuery({
    queryKey: META_KEYS.languages,
    queryFn: async () => {
      const data = await metaService.getLanguages();
      setLanguages(data);
      return data;
    },
    enabled: languages.length === 0,
    staleTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

  const { isLoading: isTimezonesLoading } = useQuery({
    queryKey: META_KEYS.timezones,
    queryFn: async () => {
      const data = await metaService.getTimezones();
      setTimezones(data);
      return data;
    },
    enabled: timezones.length === 0,
    staleTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

  return {
    currencies: currencies.map((c) => ({
        value: c.code,
        label: `${c.code} - ${c.name}`,
        symbol: c.symbol,
    })),
    languages: languages.map((l) => ({
      value: l.code,
      label: l.name,
    })),
    timezones,
    isLoading: isCurrenciesLoading || isLanguagesLoading || isTimezonesLoading,
  };
};