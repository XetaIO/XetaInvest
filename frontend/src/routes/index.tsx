import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router';
import type { RouteObject } from 'react-router';
import { RequireAuth } from '../features/Auth/components/RequireAuth';
import { RequireGuest } from '../features/Auth/components/RequireGuest';
import { LoadingScreen } from '../shared/components/common/LoadingScreen';
import { AppLayout } from '../shared/components/layouts/AppLayout';
import { AuthLayout } from '../shared/components/layouts/AuthLayout';
import { NotFoundLayout } from '../shared/components/layouts/NotFoundLayout';
import { RouteError } from './RouteError';

const Welcome = lazy(() =>
    import('../features/Pages/views/Welcome').then((module) => ({
        default: module.Welcome,
    })),
);
const Login = lazy(() =>
    import('../features/Auth/views/Login').then((module) => ({
        default: module.Login,
    })),
);
const Signup = lazy(() =>
    import('../features/Auth/views/Signup').then((module) => ({
        default: module.Signup,
    })),
);
const Dashboard = lazy(() =>
    import('../features/Dashboard/views/Home').then((module) => ({
        default: module.Home,
    })),
);
const SymbolPage = lazy(() =>
    import('../features/Symbol/views/SymbolPage').then((module) => ({
        default: module.SymbolPage,
    })),
);
const WatchlistPage = lazy(() =>
    import('../features/Watchlist/views/WatchlistPage').then((module) => ({
        default: module.WatchlistPage,
    })),
);
const NotFoundPage = lazy(
    () => import('../shared/components/errors/NotFoundPage'),
);

export const guestRoutes: RouteObject[] = [
    {
        element: <AppLayout />,
        children: [
            { path: 'login', element: <Login /> },
            { path: 'register', element: <Signup /> },
            { index: true, element: <Welcome /> },
        ],
    },
];

export const protectedRoutes: RouteObject[] = [
    { path: 'dashboard', element: <Dashboard /> },
    { path: 'watchlists', element: <WatchlistPage /> },
    { path: 'symbol/:symbol', element: <SymbolPage /> },
];

export const routes: RouteObject[] = [
    {
        element: (
            <Suspense fallback={<LoadingScreen />}>
                <Outlet />
            </Suspense>
        ),
        errorElement: <RouteError />,
        children: [
            { element: <RequireGuest />, children: guestRoutes },
            {
                element: <RequireAuth />,
                children: [
                    { element: <AuthLayout />, children: protectedRoutes },
                ],
            },
            {
                element: <NotFoundLayout />,
                children: [{ path: '*', element: <NotFoundPage /> }],
            },
        ],
    },
];
