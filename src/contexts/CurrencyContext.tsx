import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Fallback static rates (1 USD = X) used when API is unavailable
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.58,
  CAD: 1.38,
  CHF: 0.90,
  NOK: 10.8,
  SEK: 10.5,
  DKK: 6.9,
  JPY: 150,
  BRL: 5.1,
  MXN: 17.5,
};

export const SELECTABLE_CURRENCIES = Object.keys(FALLBACK_RATES);

const LS_CURRENCY_KEY = "valyouladder_currency";
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

  const res = await fetch("https://api.frankfurter.app/latest?from=USD");
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
    () => localStorage.getItem(LS_CURRENCY_KEY) ?? "USD"
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
