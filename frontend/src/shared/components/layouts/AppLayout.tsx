import { Outlet } from 'react-router';
import { AppFooter } from '../../components/footer/AppFooter';
import { AppHeader } from '../../components/header/AppHeader';

export function AppLayout() {
    return (
        <>
            <AppHeader />
            <div className="landing-page flex min-h-screen flex-col overflow-x-clip bg-[#050806] text-white">
                <div className="flex flex-1 flex-col">
                    <Outlet />
                </div>
                <AppFooter />
            </div>
        </>
    );
}
