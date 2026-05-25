import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { existsSync } from 'node:fs';
import { resolve as pathResolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Rolldown (Vite 8) generates broken CJS interop shims for es-toolkit/compat/*
// (produces `var require_X = require_X()` self-references). Redirect each
// `es-toolkit/compat/<name>` import to a virtual ESM module that re-exports the
// named function as default from dist/compat/<category>/<name>.mjs.
function esToolkitCompatEsm(): Plugin {
    const base = pathResolve('node_modules/es-toolkit/dist/compat');
    const categories = ['array', 'object', 'math', 'string', 'function', 'predicate', 'util', 'error', 'promise', 'number'];
    const prefix = '\0es-toolkit-compat:';
    return {
        name: 'es-toolkit-compat-esm',
        enforce: 'pre',
        resolveId(id) {
            const m = /^es-toolkit\/compat\/([^/]+)$/.exec(id);
            if (!m) return null;
            const name = m[1];
            for (const cat of categories) {
                const p = `${base}/${cat}/${name}.mjs`;
                if (existsSync(p)) return `${prefix}${cat}/${name}`;
            }
            return null;
        },
        load(id) {
            if (!id.startsWith(prefix)) return null;
            const rest = id.slice(prefix.length);
            const name = rest.split('/')[1];
            const target = `${base}/${rest}.mjs`.replace(/\\/g, '/');
            return `import { ${name} } from ${JSON.stringify(target)};\nexport { ${name} };\nexport default ${name};\n`;
        },
    };
}

export default defineConfig({
    plugins: [
        esToolkitCompatEsm(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia({
            ssr: false,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
});
