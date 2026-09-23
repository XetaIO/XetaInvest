import {
    ChevronDown,
    Ellipsis,
    LayoutGrid,
    PieChart,
    StarCheckIcon,
    Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { useSidebar } from '../hooks/useSidebar';

type NavSubItem = {
    icon: React.ReactNode;
    nameKey: string;
    path: string;
    beta?: boolean;
};

type NavItem = {
    nameKey: string;
    icon: React.ReactNode;
    path?: string;
    subItems?: NavSubItem[];
};

const navItems: NavItem[] = [
    {
        icon: <LayoutGrid />,
        nameKey: 'nav.dashboard',
        path: '/dashboard',
    },
    {
        icon: <StarCheckIcon />,
        nameKey: 'nav.watchlist',
        path: '/watchlists',
    },
    {
        icon: <PieChart />,
        nameKey: 'nav.statistics',
        path: '/statistics',
    },
];

const othersItems: NavItem[] = [
    {
        icon: <Wallet />,
        nameKey: 'nav.budget',
        path: '/budget',
    },
];

export const AppSidebar: React.FC = () => {
    const { t } = useTranslation();
    const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
    const location = useLocation();

    const [openSubmenu, setOpenSubmenu] = useState<{
        type: 'main' | 'others';
        index: number;
    } | null>(null);
    const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
        {},
    );
    const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const isActive = useCallback(
        (path: string) => {
            // Exact match for root path
            if (path === '/') {
                return location.pathname === '/';
            }
            // Exact match first
            if (location.pathname === path) {
                return true;
            }
            // For paths with children, only match if the current path starts with path/
            // but NOT if there's a more specific match (e.g., /zones/tree should not match /zones)
            if (location.pathname.startsWith(`${path}/`)) {
                // Check if this is an ID-based route (e.g., /zones/123) vs a named route (e.g., /zones/tree)
                const remainder = location.pathname.slice(path.length + 1);
                // If remainder starts with a number, it's likely an ID route, so parent should be active
                // If remainder is a named route, let that specific route handle it
                return /^\d+/.test(remainder);
            }
            return false;
        },
        [location.pathname],
    );

    useEffect(() => {
        let submenuMatched = false;
        ['main', 'others'].forEach((menuType) => {
            const items = menuType === 'main' ? navItems : othersItems;
            items.forEach((nav, index) => {
                if (nav.subItems) {
                    nav.subItems.forEach((subItem) => {
                        if (isActive(subItem.path)) {
                            setOpenSubmenu({
                                type: menuType as 'main' | 'others',
                                index,
                            });
                            submenuMatched = true;
                        }
                    });
                }
            });
        });

        if (!submenuMatched) {
            setOpenSubmenu(null);
        }
    }, [location, isActive]);

    useEffect(() => {
        if (openSubmenu !== null) {
            const key = `${openSubmenu.type}-${openSubmenu.index}`;
            if (subMenuRefs.current[key]) {
                setSubMenuHeight((prevHeights) => ({
                    ...prevHeights,
                    [key]: subMenuRefs.current[key]?.scrollHeight || 0,
                }));
            }
        }
    }, [openSubmenu]);

    const handleSubmenuToggle = (
        index: number,
        menuType: 'main' | 'others',
    ) => {
        setOpenSubmenu((prevOpenSubmenu) => {
            if (
                prevOpenSubmenu &&
                prevOpenSubmenu.type === menuType &&
                prevOpenSubmenu.index === index
            ) {
                return null;
            }
            return { type: menuType, index };
        });
    };

    const renderMenuItems = (items: NavItem[], menuType: 'main' | 'others') => (
        <ul className="flex flex-col gap-4">
            {items.map((nav, index) => (
                <li key={nav.nameKey}>
                    {nav.subItems ? (
                        <button
                            onClick={() => handleSubmenuToggle(index, menuType)}
                            className={`group menu-item ${
                                openSubmenu?.type === menuType &&
                                openSubmenu?.index === index
                                    ? 'bg-brand-50 text-brand-500 dark:bg-neutral-800 dark:text-brand-400'
                                    : 'menu-item-inactive'
                            } cursor-pointer ${!isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start'}`}
                        >
                            <span
                                className={`menu-item-icon-size ${
                                    openSubmenu?.type === menuType &&
                                    openSubmenu?.index === index
                                        ? 'menu-item-icon-active'
                                        : 'menu-item-icon-inactive'
                                }`}
                            >
                                {nav.icon}
                            </span>
                            {(isExpanded || isHovered || isMobileOpen) && (
                                <span className="menu-item-text">
                                    {t(nav.nameKey)}
                                </span>
                            )}
                            {(isExpanded || isHovered || isMobileOpen) && (
                                <ChevronDown
                                    className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                                        openSubmenu?.type === menuType &&
                                        openSubmenu?.index === index
                                            ? 'rotate-180 text-brand-500'
                                            : ''
                                    }`}
                                />
                            )}
                        </button>
                    ) : (
                        nav.path && (
                            <Link
                                to={nav.path}
                                className={`group menu-item ${
                                    isActive(nav.path)
                                        ? 'bg-brand-50 text-brand-500 dark:bg-neutral-800 dark:text-brand-400'
                                        : 'menu-item-inactive'
                                }`}
                            >
                                <span
                                    className={`menu-item-icon-size ${
                                        isActive(nav.path)
                                            ? 'menu-item-icon-active'
                                            : 'menu-item-icon-inactive'
                                    }`}
                                >
                                    {nav.icon}
                                </span>
                                {(isExpanded || isHovered || isMobileOpen) && (
                                    <span className="menu-item-text">
                                        {t(nav.nameKey)}
                                    </span>
                                )}
                            </Link>
                        )
                    )}
                    {nav.subItems &&
                        (isExpanded || isHovered || isMobileOpen) && (
                            <div
                                ref={(el) => {
                                    subMenuRefs.current[
                                        `${menuType}-${index}`
                                    ] = el;
                                }}
                                className="overflow-hidden transition-all duration-300"
                                style={{
                                    height:
                                        openSubmenu?.type === menuType &&
                                        openSubmenu?.index === index
                                            ? `${subMenuHeight[`${menuType}-${index}`]}px`
                                            : '0px',
                                }}
                            >
                                <ul className="mt-2 ml-9 space-y-1">
                                    {nav.subItems.map((subItem) => (
                                        <li key={subItem.nameKey}>
                                            <Link
                                                to={subItem.path}
                                                className={`menu-dropdown-item ${
                                                    isActive(subItem.path)
                                                        ? 'bg-brand-50 text-brand-500 dark:bg-neutral-800 dark:text-brand-400'
                                                        : 'menu-dropdown-item-inactive'
                                                }`}
                                            >
                                                {subItem.icon}
                                                {t(subItem.nameKey)}
                                                <span className="ml-auto flex items-center gap-1">
                                                    {subItem.beta && (
                                                        <span
                                                            className={`ml-auto ${
                                                                isActive(
                                                                    subItem.path,
                                                                )
                                                                    ? 'menu-dropdown-badge-active'
                                                                    : 'menu-dropdown-badge-inactive'
                                                            } menu-dropdown-badge`}
                                                        >
                                                            {t('common.beta')}
                                                        </span>
                                                    )}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                </li>
            ))}
        </ul>
    );

    return (
        <aside
            className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 dark:border-white/10 dark:bg-[#050806] ${isExpanded || isMobileOpen ? 'w-72.5' : isHovered ? 'w-72.5' : 'w-22.5'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`${!isMobileOpen ? 'py-5' : 'py-4'} flex ${
                    !isExpanded && !isHovered
                        ? 'lg:justify-center'
                        : 'justify-start'
                }`}
            >
                <Link to="/" className="hidden items-center gap-2 lg:flex">
                    {isExpanded || isHovered ? (
                        <>
                            <img
                                className="h-12 dark:hidden"
                                src="/images/logo-brand-light-mode.png"
                                alt="XetaInvest"
                            />
                            <img
                                className="hidden h-12 dark:block"
                                src="/images/logo-brand-dark-mode.png"
                                alt="XetaInvest"
                            />
                        </>
                    ) : (
                        <img
                            className="h-12 w-12"
                            src="/images/logo.png"
                            alt="XetaInvest"
                        />
                    )}
                </Link>
            </div>

            <div className="flex custom-scrollbar flex-col overflow-y-auto duration-300 ease-linear">
                <nav className="mb-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2
                                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                                    !isExpanded && !isHovered
                                        ? 'lg:justify-center'
                                        : 'justify-start'
                                }`}
                            >
                                {isExpanded || isHovered || isMobileOpen ? (
                                    t('sidebar.platform')
                                ) : (
                                    <Ellipsis className="size-6" />
                                )}
                            </h2>
                            {renderMenuItems(navItems, 'main')}
                        </div>
                        {othersItems.length > 0 && (
                            <div className="">
                                <h2
                                    className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                                        !isExpanded && !isHovered
                                            ? 'lg:justify-center'
                                            : 'justify-start'
                                    }`}
                                >
                                    {isExpanded || isHovered || isMobileOpen ? (
                                        t('sidebar.tools')
                                    ) : (
                                        <Ellipsis className="size-6" />
                                    )}
                                </h2>
                                {renderMenuItems(othersItems, 'others')}
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </aside>
    );
};
