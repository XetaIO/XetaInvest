export function AppLogo() {
    return (
        <>
            <div className="flex aspect-square items-center justify-center rounded-md">
                <img
                    src="/images/logo-brand-light-mode.png"
                    alt="Logo"
                    className="block h-8 dark:hidden"
                />
                <img
                    src="/images/logo-brand-dark-mode.png"
                    alt="Logo"
                    className="hidden h-8 dark:block"
                />
            </div>
        </>
    );
}
