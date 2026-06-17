@php($isLandingPage = ($page['component'] ?? null) === 'welcome')
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => $isLandingPage || ($appearance ?? 'system') == 'dark'])>

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function () {
                const appearance = '{{ $appearance ?? "system" }}';
                const isLandingPage = @js($isLandingPage);

                if (isLandingPage) {
                    document.documentElement.classList.add('dark');
                    return;
                }

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: {{ $isLandingPage ? '#050806' : 'oklch(1 0 0)' }};
            }

            html.dark {
                background-color: {{ $isLandingPage ? '#050806' : 'oklch(0.145 0 0)' }};
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>

    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>

</html>
