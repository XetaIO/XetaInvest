export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md">
                <img src="/images/logo.png" alt="Logo" />
            </div>
            <div className="ml-1 mt-1 grid flex-1.5 text-left">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    Xeta<span className="text-emerald-500">Invest</span>
                </span>
            </div>
        </>
    );
}
