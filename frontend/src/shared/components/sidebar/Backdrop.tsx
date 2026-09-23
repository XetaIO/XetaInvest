import { useSidebar } from '../hooks/useSidebar';

export const Backdrop: React.FC = () => {
    const { isMobileOpen, toggleMobileSidebar } = useSidebar();

    if (!isMobileOpen) return null;

    return (
        <div
            className="fixed inset-0 z-40 bg-neutral-900/50 lg:hidden"
            onClick={toggleMobileSidebar}
        />
    );
};
