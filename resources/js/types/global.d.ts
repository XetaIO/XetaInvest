import type { User } from '@/types/auth';
import type { PortfolioTickerEntry } from '@/types/ticker';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: {
                user: User | null;
            };
            sidebarOpen: boolean;
            registrationEnabled: boolean;
            portfolioTicker: PortfolioTickerEntry[] | null;
            [key: string]: unknown;
        };
    }
}
