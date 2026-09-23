import { Outlet } from 'react-router';
import { AuthHeader } from '../header/AuthHeader';
import { SidebarProvider } from '../hooks/SidebarProvider';
import { useSidebar } from '../hooks/useSidebar';
import { AppSidebar } from '../sidebar/AppSidebar';
import { Backdrop } from '../sidebar/Backdrop';

const LayoutContent: React.FC = () => {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();

    return (
        <div>
            <div>
                <AppSidebar />
                <Backdrop />
            </div>
            <div
                className={`flex-1 transition-all duration-300 ease-in-out ${
                    isExpanded || isHovered ? 'lg:ml-72.5' : 'lg:ml-22.5'
                } ${isMobileOpen ? 'ml-0' : ''}`}
            >
                <AuthHeader />
                <div className="mx-auto p-4 md:p-6">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export const AuthLayout: React.FC = () => {
    return (
        <SidebarProvider>
            <LayoutContent />
        </SidebarProvider>
    );
};
