/**
 * Guardar y compartir archivos desde el movil.
 *
 * Lo importante aqui es `comparteOFicha`: en el movil, descargar un archivo lo deja dentro
 * del telefono, y una copia de seguridad dentro del mismo telefono no protege de perderlo.
 * Compartirlo (WhatsApp, correo, Drive) es lo que lo saca de ahi. Pero no todos los
 * navegadores saben compartir archivos, asi que si no se puede, se descarga igual: nunca se
 * deja al usuario sin copia.
 */

/** Descarga un texto como archivo. */
export function descargaTexto(nombre: string, contenido: string, tipo = 'application/json'): void {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` })
  descargaBlob(nombre, blob)
}

export function descargaJson(nombre: string, datos: unknown): void {
  descargaTexto(nombre, JSON.stringify(datos, null, 2))
}

export function descargaBlob(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  // Se revoca en cuanto el navegador ha tenido ocasión de empezar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export type ResultadoCompartir = 'compartido' | 'descartado' | 'descargado'

/**
 * Intenta compartir el archivo; si el navegador no sabe, lo descarga.
 * Devuelve que ha pasado, para poder decirlo en pantalla.
 */
export async function comparteOFicha(
  nombre: string,
  contenido: string,
  tipo: string,
  titulo: string,
): Promise<ResultadoCompartir> {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` })

  const navegador = navigator as Navigator & {
    canShare?: (datos: { files: File[] }) => boolean
    share?: (datos: { files: File[]; title: string; text: string }) => Promise<void>
  }

  if (navegador.share && navegador.canShare) {
    try {
      const archivo = new File([blob], nombre, { type: `${tipo};charset=utf-8` })
      if (navegador.canShare({ files: [archivo] })) {
        await navegador.share({ files: [archivo], title: titulo, text: 'Copia de Oikos' })
        return 'compartido'
      }
    } catch (error) {
      // El usuario puede haber cancelado el dialogo de compartir: eso no es un error.
      if ((error as Error)?.name === 'AbortError') return 'descartado'
    }
  }

  descargaBlob(nombre, blob)
  return 'descargado'
}

/** Nombre de archivo con la fecha, como en el vault: `oikos-2026-09-22.json`. */
export function nombreConFecha(prefijo: string, extension: string, fecha: string): string {
  return `${prefijo}-${fecha}.${extension}`
}
