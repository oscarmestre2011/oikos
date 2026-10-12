import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Configuracion pensada para movil, heredada del aprendizaje de Kairos:
 * - `base` relativa por defecto, para poder servir la app desde cualquier ruta
 *   (localhost, red local o una carpeta de un hosting estatico).
 * - En GitHub Pages la app vive en una subcarpeta (/oikos/), asi que el flujo de
 *   publicacion pasa OIKOS_BASE=/oikos/ y las rutas se construyen con esa base.
 *   Sin esto la pagina se sirve pero se queda en blanco, porque no encuentra sus ficheros.
 * - `dev:lan` expone el servidor en la red local para probar desde el telefono.
 */
const base = process.env.OIKOS_BASE ?? './'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5274,
    strictPort: false,
  },
  preview: {
    port: 5274,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Las pruebas que tocan la interfaz o la base de datos necesitan un navegador simulado.
    environmentMatchGlobs: [
      ['src/db/**/*.test.ts', 'jsdom'],
      ['src/components/**/*.test.tsx', 'jsdom'],
      ['src/screens/**/*.test.tsx', 'jsdom'],
    ],
  },
} as never)
