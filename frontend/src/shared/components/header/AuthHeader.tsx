import { Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { GlobalSearch } from '../../../features/GlobalSearch/views/GlobalSearch';
import { useSidebar } from '../hooks/useSidebar';
import LanguageSwitcher from './LanguageSwitcher';
import { ThemeToggleButton } from './ThemeToggleButton';
import UserDropdown from './UserDropdown';

export const AuthHeader: React.FC = () => {
    const { t } = useTranslation();
    const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

    // Close application menu when mobile sidebar opens
    useEffect(() => {
        if (isMobileOpen) {
            setApplicationMenuOpen(false);
        }
    }, [isMobileOpen]);

    const handleToggle = () => {
        if (window.innerWidth >= 1024) {
            toggleSidebar();
        } else {
            toggleMobileSidebar();
        }
    };

    const toggleApplicationMenu = () => {
        // Close mobile sidebar when opening application menu
        if (!isApplicationMenuOpen && isMobileOpen) {
            toggleMobileSidebar();
        }
        setApplicationMenuOpen(!isApplicationMenuOpen);
    };

    const openSearch = useCallback(() => {
        setIsSearchOpen(true);
    }, []);

    const closeSearch = useCallback(() => {
        setIsSearchOpen(false);
    }, []);

    // Global keyboard shortcut for search (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                openSearch();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [openSearch]);

    return (
        <header className="sticky top-0 z-99999 flex w-full border-gray-200 bg-white lg:border-b dark:border-white/10 dark:bg-[#050806]">
            <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
                <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4 dark:border-white/5">
                    <button
                        className="z-99999 h-10 w-10 items-center justify-center rounded-lg border-gray-200 text-gray-500 hover:cursor-pointer lg:flex lg:h-11 lg:w-11 lg:border dark:border-white/5 dark:text-gray-400"
                        onClick={handleToggle}
                        aria-label="Toggle Sidebar"
                    >
                        {isMobileOpen ? (
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                                    fill="currentColor"
                                />
                            </svg>
                        ) : (
                            <svg
                                width="16"
                                height="12"
                                viewBox="0 0 16 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                                    fill="currentColor"
                                />
                            </svg>
                        )}
                        {/* Cross Icon */}
                    </button>

                    <Link to="/" className="flex items-center gap-2 lg:hidden">
                        <img
                            className="h-10 dark:hidden"
                            src="/images/logo-brand-light-mode.png"
                            alt="XetaInvest"
                        />
                        <img
                            className="hidden h-10 dark:block"
                            src="/images/logo-brand-dark-mode.png"
                            alt="XetaInvest"
                        />
                    </Link>

                    {/* Mobile Right Buttons Group */}
                    <div className="flex items-center gap-1 lg:hidden">
                        {/* Mobile Search Button */}
                        <button
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                            aria-label={t('search.placeholder')}
                            type="button"
                            onClick={openSearch}
                        >
                            <Search className="h-5 w-5" />
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            title="Toggle menu"
                            onClick={toggleApplicationMenu}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="hidden lg:block">
                        <button
                            type="button"
                            onClick={openSearch}
                            aria-label={t('search.placeholder')}
                            className="relative flex h-11 w-full cursor-pointer items-center rounded-lg border border-gray-200 bg-transparent py-2.5 pr-14 pl-12 text-sm text-gray-400 shadow-theme-xs transition-colors hover:border-gray-300 hover:bg-gray-50 xl:w-107.5 dark:border-white/5 dark:text-white/30 dark:hover:border-gray-950 dark:hover:bg-mist-950"
                        >
                            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
                                <Search className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            </span>
                            {t('search.placeholder')}
                            <span className="absolute top-1/2 right-2.5 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-1.75 py-[4.5px] text-xs tracking-[-0.2px] text-gray-500 dark:border-white/5 dark:bg-mist-950 dark:text-gray-400">
                                <span> ⌘ </span>
                                <span> K </span>
                            </span>
                        </button>
                    </div>
                </div>
                <div
                    className={`${
                        isApplicationMenuOpen ? 'flex' : 'hidden'
                    } w-full items-center justify-between gap-4 px-5 py-4 shadow-theme-md lg:flex lg:justify-end lg:px-0 lg:shadow-none`}
                >
                    <div className="flex items-center gap-2 2xsm:gap-3">
                        {/* <!-- Language Switcher --> */}
                        <div className="lg:hidden">
                            <LanguageSwitcher compact />
                        </div>
                        <div className="hidden lg:block">
                            <LanguageSwitcher />
                        </div>
                        {/* <!-- Dark Mode Toggler --> */}
                        <ThemeToggleButton />
                    </div>
                    {/* <!-- User Area --> */}
                    <UserDropdown />
                </div>
            </div>

            {/* Global Search Modal */}
            <GlobalSearch isOpen={isSearchOpen} onClose={closeSearch} />
        </header>
    );
};
