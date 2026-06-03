export function AppLogo() {
    return (
        <>
            <div className="flex aspect-square items-center justify-center rounded-md">
                <img src="/images/logo-brand-light-mode.png" alt="Logo" className="h-8 block dark:hidden" />
                <img src="/images/logo-brand-dark-mode.png" alt="Logo" className="h-8 hidden dark:block" />
            </div>
        </>
    );
}
