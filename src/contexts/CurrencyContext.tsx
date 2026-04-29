import { createContext, useContext, useState, ReactNode } from "react";

// Approximate rates: 1 USD = X of this currency (indicative, not live)
const RATES_FROM_USD: Record<string, number> = {
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

export const SELECTABLE_CURRENCIES = Object.keys(RATES_FROM_USD);

function convertAmount(amount: number, from: string, to: string): number {
  const fromRate = RATES_FROM_USD[from] ?? 1;
  const toRate = RATES_FROM_USD[to] ?? 1;
  return (amount / fromRate) * toRate;
}

interface CurrencyContextValue {
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
  format: (amount: number | undefined | null, fromCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: "USD",
  setDisplayCurrency: () => {},
  format: (amount) => `$${amount ?? 0}`,
});

const LS_KEY = "rateref_currency";

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [displayCurrency, setDisplayCurrencyState] = useState<string>(
    () => localStorage.getItem(LS_KEY) ?? "USD"
  );

  const setDisplayCurrency = (currency: string) => {
    localStorage.setItem(LS_KEY, currency);
    setDisplayCurrencyState(currency);
  };

  const format = (amount: number | undefined | null, fromCurrency?: string): string => {
    if (amount == null) return "—";
    const from =
      fromCurrency && fromCurrency !== "Other" && fromCurrency in RATES_FROM_USD
        ? fromCurrency
        : displayCurrency;
    const converted =
      from !== displayCurrency ? convertAmount(amount, from, displayCurrency) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
