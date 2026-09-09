import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('PWA assets', () => {
  it('possui ícones e meta necessários', () => {
    expect(existsSync(join(root, 'public/icons/icon-192.png'))).toBe(true);
    expect(existsSync(join(root, 'public/icons/icon-512.png'))).toBe(true);
    expect(existsSync(join(root, 'public/icons/maskable-512.png'))).toBe(true);
    expect(existsSync(join(root, 'public/icons/apple-touch-icon.png'))).toBe(true);

    const html = readFileSync(join(root, 'index.html'), 'utf8');
    expect(html).toContain('theme-color');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('viewport-fit=cover');

    const vite = readFileSync(join(root, 'vite.config.js'), 'utf8');
    expect(vite).toContain('VitePWA');
    expect(vite).toContain('standalone');
  });
});
