import type { User } from './auth';

export type SharedData = {
    name: string;
    locale: 'fr' | 'en';
    auth: {
        user: User;
    };
    sidebarOpen: boolean;
    registrationEnabled: boolean;
    [key: string]: unknown;
};
