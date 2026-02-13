import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения. Cast process to any to avoid type error with cwd()
  const cwd = (process as any).cwd();
  const env = loadEnv(mode, cwd, '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': cwd, // Исправляет ошибку "Module name, '@/supabase' does not resolve"
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    // Это критически важно для работы process.env в браузере
    define: {
      'process.env': env, 
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});