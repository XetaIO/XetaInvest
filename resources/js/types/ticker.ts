export type PortfolioTickerEntry = {
    symbol: string;
    name: string;
    currency: string;
    price: number;
    change: number;
    change_percent: number;
    sparkline: number[];
};
