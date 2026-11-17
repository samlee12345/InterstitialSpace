import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the built site run from any folder, e.g. /InterstitialSpace/ on GitHub Pages.
export default defineConfig({ base: './', plugins: [react()] });
