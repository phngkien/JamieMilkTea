import { defineConfig } from 'vitest/config';

export default defineConfig({
  // base './' để game chạy được trong thư mục con trên GitHub Pages
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
