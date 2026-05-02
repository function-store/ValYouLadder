import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Fallback static rates (1 USD = X) used when API is unavailable
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.58,
  CAD: 1.38,
  CHF: 0.90,
  HUF: 380,
  NOK: 10.8,
  SEK: 10.5,
  DKK: 6.9,
  JPY: 150,
  BRL: 5.1,
  MXN: 17.5,
};

export const SELECTABLE_CURRENCIES = Object.keys(FALLBACK_RATES);

const LS_CURRENCY_KEY = "valyouladder_currency";

const REGION_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP", AU: "AUD", CA: "CAD", CH: "CHF", HU: "HUF",
  NO: "NOK", SE: "SEK", DK: "DKK", JP: "JPY", BR: "BRL", MX: "MXN",
  NZ: "NZD", HK: "HKD", SG: "SGD",
  CZ: "CZK", PL: "PLN", RO: "RON", BG: "BGN", RS: "RSD",
  UA: "UAH", GE: "GEL", TR: "TRY", RU: "RUB", KZ: "KZT",
  AZ: "AZN", AM: "AMD", IL: "ILS", AE: "AED", SA: "SAR",
  QA: "QAR", KW: "KWD", BH: "BHD", EG: "EGP", MA: "MAD",
  TN: "TND", DZ: "DZD", ZA: "ZAR", NG: "NGN", KE: "KES",
  GH: "GHS", ET: "ETB", TZ: "TZS", IN: "INR", PK: "PKR",
  BD: "BDT", LK: "LKR", NP: "NPR", CN: "CNY", KR: "KRW",
  TW: "TWD", TH: "THB", ID: "IDR", MY: "MYR", PH: "PHP",
  VN: "VND", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  UY: "UYU", CR: "CRC", GT: "GTQ", JM: "JMD", TT: "TTD",
  // Eurozone
  DE: "EUR", AT: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", PT: "EUR", FI: "EUR", IE: "EUR", GR: "EUR", SK: "EUR",
  SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR",
  CY: "EUR", HR: "EUR",
};

const LANG_CURRENCY: Record<string, string> = {
  ja: "JPY", hu: "HUF", nb: "NOK", nn: "NOK", no: "NOK", sv: "SEK", da: "DKK",
  ko: "KRW", th: "THB", vi: "VND", id: "IDR", ms: "MYR",
  zh: "CNY", uk: "UAH", tr: "TRY", he: "ILS", ar: "AED",
};

function inferCurrencyFromLocale(): string {
  const locale = navigator.language ?? "en-US";
  const region = locale.split("-")[1]?.toUpperCase();
  if (region && region in REGION_CURRENCY) return REGION_CURRENCY[region];
  const lang = locale.split("-")[0].toLowerCase();
  return LANG_CURRENCY[lang] ?? "USD";
}

const LS_RATES_KEY = "valyouladder_rates";
const RATES_TTL_MS = 60 * 60 * 1000; // 1 hour

interface RatesCache {
  rates: Record<string, number>;
  timestamp: number;
}

export async function fetchRates(): Promise<Record<string, number>> {
  const cached = localStorage.getItem(LS_RATES_KEY);
  if (cached) {
    const parsed: RatesCache = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < RATES_TTL_MS) {
      return parsed.rates;
    }
  }

  const res = await fetch("https://api.frankfurter.dev/v1/latest?from=USD");
  if (!res.ok) throw new Error("rates fetch failed");
  const data = await res.json();
  const rates: Record<string, number> = { USD: 1, ...data.rates };

  localStorage.setItem(LS_RATES_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
  return rates;
}

function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return (amount / fromRate) * toRate;
}

interface CurrencyContextValue {
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
  format: (amount: number | undefined | null, fromCurrency?: string) => string;
  ratesLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: "USD",
  setDisplayCurrency: () => {},
  format: (amount) => `$${amount ?? 0}`,
  ratesLoading: false,
});

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [displayCurrency, setDisplayCurrencyState] = useState<string>(
    () => localStorage.getItem(LS_CURRENCY_KEY) ?? inferCurrencyFromLocale()
  );
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    fetchRates()
      .then(setRates)
      .catch(() => {/* silently keep fallback rates */})
      .finally(() => setRatesLoading(false));
  }, []);

  const setDisplayCurrency = (currency: string) => {
    localStorage.setItem(LS_CURRENCY_KEY, currency);
    setDisplayCurrencyState(currency);
  };

  const format = (amount: number | undefined | null, fromCurrency?: string): string => {
    if (amount == null) return "—";
    const from =
      fromCurrency && fromCurrency !== "Other" && fromCurrency in rates
        ? fromCurrency
        : "USD";
    const converted =
      from !== displayCurrency ? convertAmount(amount, from, displayCurrency, rates) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency in rates ? displayCurrency : "USD",
      maximumFractionDigits: 0,
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, format, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
