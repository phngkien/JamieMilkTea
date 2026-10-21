import { defineConfig } from 'vitest/config';

export default defineConfig({
  // base './' để game chạy được trong thư mục con trên GitHub Pages
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // preview.html: trang xem trước phong cách vẽ (không ảnh hưởng game)
      input: {
        main: 'index.html',
        preview: 'preview.html',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
