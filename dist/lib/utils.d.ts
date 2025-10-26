import type { Country } from "./types.ts";
export declare const fetchCountryData: () => Promise<Country[]>;
export declare const getExchangeRates: () => Promise<Record<string, number>>;
export declare const calculateGDP: (population: number, exchangeRate: number | null) => number | null;
export declare const generateSummaryImage: (totalCountries: number, topCountries: Array<{
    name: string;
    estimatedGdp: string | null;
}>, lastRefreshed: Date) => Promise<string>;
//# sourceMappingURL=utils.d.ts.map