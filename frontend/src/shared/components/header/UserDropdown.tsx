import { Bell, ChevronDown, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { useAuth } from '../../../features/Auth/hooks/useAuth';
import { Dropdown } from '../ui/dropdown/Dropdown';
import { DropdownItem } from '../ui/dropdown/DropdownItem';

export default function UserDropdown() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout, isLoggingOut } = useAuth();
    const navigate = useNavigate();

    function toggleDropdown() {
        setIsOpen(!isOpen);
    }

    function closeDropdown() {
        setIsOpen(false);
    }

    async function handleLogout() {
        if (isLoggingOut) return;
        try {
            await logout();
            closeDropdown();
            void navigate('/', { replace: true });
            toast.success(t('header.signedOut'));
        } catch {
            toast.error(t('header.signOutError'));
        }
    }

    return (
        <div className="relative">
            <button
                type="button"
                aria-label={t('header.userMenu')}
                aria-expanded={isOpen}
                onClick={toggleDropdown}
                className="dropdown-toggle flex items-center text-gray-700 hover:cursor-pointer dark:text-gray-400"
            >
                <span className="mr-3 h-11 w-11 overflow-hidden rounded-full">
                    {/*TODO: Replace with Avatar component*/}
                    <img
                        src={'/images/user/default_avatar.png'}
                        alt={user?.name || 'User Avatar'}
                        //className="h-11 w-11 object-cover"
                    />
                </span>

                <span className="mr-1 block text-theme-sm font-medium">
                    {user?.name ?? t('common.user')}
                </span>
                <ChevronDown
                    className={`stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <Dropdown
                isOpen={isOpen}
                onClose={closeDropdown}
                className="absolute right-0 mt-4.25 flex w-65 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-white/5 dark:bg-mist-950 dark:text-white/90 dark:hover:text-gray-200"
            >
                <div>
                    <span className="block text-theme-sm font-medium text-gray-700 dark:text-gray-400">
                        {user?.name ?? t('common.user')}
                    </span>
                    <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                        {user?.email ?? ''}
                    </span>
                </div>

                <ul className="flex flex-col gap-1 border-b border-gray-200 pt-4 pb-3 dark:border-white/5">
                    <li>
                        <DropdownItem
                            onItemClick={closeDropdown}
                            tag="a"
                            to="/account/password"
                            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                            <Settings className="h-5 w-5" />
                            {t('header.settings')}
                        </DropdownItem>
                    </li>
                    <li>
                        <DropdownItem
                            onItemClick={closeDropdown}
                            tag="a"
                            to="/account/notifications"
                            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                            <Bell className="h-5 w-5" />
                            {t('header.notifications')}
                        </DropdownItem>
                    </li>
                </ul>
                <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={isLoggingOut}
                    aria-busy={isLoggingOut}
                    className="group mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-red-500 hover:cursor-pointer hover:bg-gray-100 hover:text-red-500 dark:text-red-400 dark:hover:bg-white/5 dark:hover:text-red-300"
                >
                    <LogOut className="h-5 w-5" />
                    {t(isLoggingOut ? 'header.signingOut' : 'header.signOut')}
                </button>
            </Dropdown>
        </div>
    );
}
