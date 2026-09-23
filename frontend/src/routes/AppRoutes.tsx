import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './index';

const router = createBrowserRouter(routes);

export function AppRoutes() {
    return <RouterProvider router={router} />;
}
