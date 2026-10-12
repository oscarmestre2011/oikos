/**
 * Comprueba el flujo de publicacion de GitHub Actions SIN publicar.
 *
 * Existe porque es la unica pieza del proyecto que no se puede probar de verdad antes de
 * publicar: hasta que no se sube el codigo y GitHub lo ejecuta, nadie sabe si funcionara. Y un
 * fallo ahi significa que la app no se publica (o se publica rota), con la particularidad de que
 * el error aparece en la pestana Actions de GitHub, donde es incomodo depurarlo.
 *
 * Esto NO es un analizador de YAML (no hay ninguno disponible sin instalar dependencias): es una
 * lista de comprobaciones sobre las cosas que de verdad rompen un flujo de estos, empezando por
 * la mas habitual: que el flujo llame a un comando de npm que NO existe.
 *
 * Uso:  npm run comprobar:flujo
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RUTA_FLUJO = join(RAIZ, '.github', 'workflows', 'deploy.yml')

let correctas = 0
const fallos = []

function comprueba(condicion, descripcion) {
  if (condicion) {
    correctas += 1
    console.log(`  ✅ ${descripcion}`)
  } else {
    fallos.push(descripcion)
    console.log(`  ❌ ${descripcion}`)
  }
}

function main() {
  if (!existsSync(RUTA_FLUJO)) {
    console.error('No existe .github/workflows/deploy.yml: sin el, no se publica nada.')
    process.exit(1)
  }

  const flujo = readFileSync(RUTA_FLUJO, 'utf8')
  const paquete = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'))
  const guiones = new Set(Object.keys(paquete.scripts ?? {}))
  const lineas = flujo.split(/\r?\n/)

  console.log('Comprobando el flujo de publicación (sin publicar)')
  console.log('')

  // --- 1. Lo basico del formato YAML -----------------------------------
  // Un tabulador en YAML es un error de sintaxis, y se cuela facil al copiar y pegar.
  comprueba(!/^\t/m.test(flujo), 'No hay tabuladores (en YAML la indentación con tabulador es un error)')

  const conSangriaImpar = lineas.filter((linea) => {
    const espacios = /^( *)\S/.exec(linea)
    return espacios && espacios[1].length % 2 !== 0
  })
  comprueba(
    conSangriaImpar.length === 0,
    `La indentación es de dos en dos${conSangriaImpar.length ? ` (línea ${lineas.indexOf(conSangriaImpar[0]) + 1})` : ''}`,
  )

  // --- 2. Claves obligatorias -----------------------------------------
  for (const clave of ['name:', 'on:', 'jobs:', 'permissions:', 'runs-on:', 'steps:']) {
    comprueba(new RegExp(`^\\s*${clave}`, 'm').test(flujo), `El flujo declara «${clave.replace(':', '')}»`)
  }

  // --- 3. LO IMPORTANTE: que no llame a un comando que no existe --------
  const llamadas = [...flujo.matchAll(/npm run ([\w:.-]+)/g)].map((c) => c[1])
  comprueba(llamadas.length > 0, `El flujo lanza comandos de npm (${llamadas.length})`)
  for (const guion of new Set(llamadas)) {
    comprueba(guiones.has(guion), `El comando «npm run ${guion}» existe en package.json`)
  }

  // `npm test` y `npm ci` son atajos: `test` tiene que existir como guion, `ci` es de npm.
  for (const atajo of new Set([...flujo.matchAll(/npm (test|ci)\b/g)].map((c) => c[1]))) {
    if (atajo === 'ci') {
      comprueba(true, 'El flujo usa «npm ci» (instala exactamente lo del package-lock)')
    } else {
      comprueba(guiones.has(atajo), `El atajo «npm ${atajo}» tiene su guion en package.json`)
    }
  }

  // --- 4. Acciones con version fijada ---------------------------------
  const acciones = [...flujo.matchAll(/uses:\s*([^\s#]+)/g)].map((c) => c[1])
  comprueba(acciones.length > 0, `El flujo usa acciones oficiales (${acciones.length})`)
  for (const accion of acciones) {
    comprueba(accion.includes('@'), `La acción «${accion}» lleva la versión fijada`)
  }

  // --- 5. Que se publique lo que se compila ---------------------------
  // El artefacto que se sube tiene que ser la carpeta que genera la compilación en modo
  // subcarpeta. Si no coincide, se publica una carpeta vacía o incompleta.
  const configuracion = readFileSync(join(RAIZ, 'vite.config.ts'), 'utf8')
  const outDir = /outDir:\s*['"]([^'"]+)['"]/.exec(configuracion)?.[1]
  comprueba(
    outDir === undefined,
    `La compilación usa la carpeta por defecto (dist)${outDir ? `, pero vite.config.ts la cambia a ${outDir}` : ''}`,
  )
  comprueba(/path:\s*dist\b/.test(flujo), 'Se publica la carpeta dist, que es la que se compila')

  // --- 6. Que compile en modo SUBCARPETA ------------------------------
  // Es el fallo que deja la app en blanco al publicar y que en local no se ve.
  comprueba(
    /npm run build:pages/.test(flujo) || /npm run verify:all/.test(flujo),
    'El flujo compila en modo subcarpeta (o lanza verify:all, que lo incluye)',
  )

  // --- 7. Que las pruebas se ejecuten ANTES de publicar ---------------
  const indicePruebas = flujo.search(/verify:all|npm test/)
  const indicePublicar = flujo.indexOf('deploy-pages')
  comprueba(
    indicePruebas > -1 && indicePublicar > -1 && indicePruebas < indicePublicar,
    'Las comprobaciones van antes de publicar (si fallan, no se publica)',
  )
  comprueba(
    /needs:\s*comprobar/.test(flujo),
    'Publicar depende de que las comprobaciones hayan pasado',
  )
  comprueba(
    /branches:\s*\[main\]/.test(flujo),
    'Se publica al subir a main (una sola rama, sin sorpresas)',
  )

  console.log('')
  console.log(`Flujo de publicación: ${correctas} comprobaciones correctas, ${fallos.length} fallos`)
  if (fallos.length > 0) {
    console.log('Fallos:')
    for (const fallo of fallos) console.log(`  - ${fallo}`)
    console.log('')
    console.log('OJO: esto no es un analizador de YAML. Comprueba lo que de verdad rompe un flujo')
    console.log('de estos, pero la única prueba definitiva es publicarlo.')
    process.exitCode = 1
  }
}

main()
