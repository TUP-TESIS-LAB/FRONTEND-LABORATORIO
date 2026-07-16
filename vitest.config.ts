import { defineConfig, Plugin } from 'vitest/config';
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';

/**
 * Vite plugin: inlines Angular templateUrl/styleUrl/styleUrls at transform time.
 * This lets vitest/jsdom use Angular JIT without needing resolveComponentResources().
 */
function angularTemplateInliner(): Plugin {
  return {
    name: 'angular-template-inliner',
    enforce: 'pre',
    transform(code: string, id: string) {
      // Only process TypeScript component files
      if (!id.endsWith('.ts') || id.endsWith('.spec.ts') || id.endsWith('.d.ts')) {
        return null;
      }
      if (!code.includes('templateUrl') && !code.includes('styleUrl')) {
        return null;
      }

      const fileDir = dirname(id);
      let modified = code;

      // Replace templateUrl: './foo.html' or templateUrl: "foo.html"
      modified = modified.replace(
        /templateUrl\s*:\s*(['"`])([^'"`]+)\1/g,
        (_match: string, _quote: string, url: string) => {
          const absPath = resolve(fileDir, url);
          try {
            const content = readFileSync(absPath, 'utf-8');
            const escaped = content.replace(/`/g, '\\`').replace(/\${/g, '\\${');
            return `template: \`${escaped}\``;
          } catch {
            return `template: ''`;
          }
        },
      );

      // Replace styleUrl: './foo.scss' → styles: [''] (styles not critical for tests)
      modified = modified.replace(
        /styleUrl\s*:\s*(['"`])[^'"`]+\1/g,
        `styles: ['']`,
      );

      // Replace styleUrls: ['./foo.scss', ...] → styles: ['', ...]
      modified = modified.replace(
        /styleUrls\s*:\s*\[([^\]]+)\]/g,
        (_match: string, _urls: string) => `styles: ['']`,
      );

      if (modified === code) return null;
      return { code: modified, map: null };
    },
  };
}

export default defineConfig({
  plugins: [angularTemplateInliner()],
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/app/core'),
      '@shared': resolve(__dirname, 'src/app/shared'),
      '@layout': resolve(__dirname, 'src/app/layout'),
      '@features': resolve(__dirname, 'src/app/features'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
