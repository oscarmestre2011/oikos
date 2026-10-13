/**
 * Compila Oikos para publicarlo en la subcarpeta de GitHub Pages (/oikos/).
 *
 * ESTA ESCRITO EN NODE, Y NO EN POWERSHELL, y ese detalle costo una publicacion fallida: antes
 * era un `.ps1` que llamaba a `powershell` y a `npm.cmd`, y en el servidor de GitHub (Linux) esas
 * ordenes NO existen. El flujo moria con «exit code 127» (orden no encontrada) antes de publicar
 * nada, y en el portatil de Windows funcionaba perfectamente: otro fallo invisible en local.
 *
 * Node existe en los dos sistemas, asi que este mismo comando vale en el portatil y en GitHub.
 * Es la regla que se aprendio a base de golpes: **lo que se comprueba en casa tiene que ser
 * exactamente lo que se ejecuta al publicar.**
 *
 * Por que hay que compilar distinto para publicar: en GitHub Pages la app vive en
 * `https://<usuario>.github.io/oikos/`, no en la raiz. Vite tiene que saberlo (variable
 * `OIKOS_BASE`) o las rutas de los ficheros apuntaran al sitio equivocado y la pagina se servira
 * en blanco. En local no se nota, porque se sirve desde `/`.
 *
 * Uso:  npm run build:pages
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
process.env.OIKOS_BASE = '/oikos/'

/** Ejecuta un programa de `node_modules` con el propio Node, sin depender de la shell. */
function ejecuta(descripcion, programa, argumentos) {
  console.log('')
  console.log(`== ${descripcion} ==`)
  const resultado = spawnSync(process.execPath, [programa, ...argumentos], {
    stdio: 'inherit',
    env: process.env,
  })
  if (resultado.status !== 0) {
    console.error('')
    console.error(`Ha fallado: ${descripcion}. NO se publica nada.`)
    process.exit(resultado.status ?? 1)
  }
}

const tsc = join(RAIZ, 'node_modules', 'typescript', 'bin', 'tsc')
const vite = join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js')

for (const [nombre, ruta] of [['typescript', tsc], ['vite', vite]]) {
  if (!existsSync(ruta)) {
    console.error(`Falta ${nombre} en node_modules. Ejecuta antes:  npm ci`)
    process.exit(1)
  }
}

// Se revisan los tipos ANTES de compilar: Vite no comprueba tipos, asi que sin esto se podria
// publicar codigo que no compila.
ejecuta('Revisando los tipos', tsc, ['--noEmit'])
ejecuta('Compilando para /oikos/', vite, ['build'])

console.log('')
console.log('Compilado en dist/ con las rutas de /oikos/.')
console.log('Comprueba el despliegue con:  npm run test:pages')
