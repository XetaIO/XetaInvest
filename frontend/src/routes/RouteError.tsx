export function RouteError() {
    return (
        <main className="page" role="alert">
            <h1>Unable to display this page</h1>
            <p>Please reload the page to try again.</p>
            <button type="button" onClick={() => window.location.reload()}>
                Reload
            </button>
        </main>
    );
}
