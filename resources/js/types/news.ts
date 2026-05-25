export type NewsItem = {
    symbol: string;
    title: string;
    link: string;
    source: string;
    image: string | null;
    time: string;
};

export type PaginatorLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginatorLink[];
};

export type NewsProps = {
    news: Paginated<NewsItem>;
    available_symbols: string[];
    scope: { symbol: string | null };
    aiNewsReport?: import('./ai').AiReport | null;
};
