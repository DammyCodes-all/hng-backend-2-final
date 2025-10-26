export type Country = {
    name: string;
    capital: string;
    region: string;
    population: number;
    flag: string;
    currencies: {
        code: string;
        name: string;
        symbol: string;
    }[];
};
export type ExchangeRateResponse = {
    result: string;
    provider: string;
    documentation: string;
    rates: Record<string, number>;
};
//# sourceMappingURL=types.d.ts.map