/**
 * Arranque de Oikos.
 *
 * Antes de dibujar nada se siembra el historico: si la app se abriera vacia y la semilla
 * llegara un segundo despues, se veria un parpadeo de "no hay datos" que asusta.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { sembrarSiHaceFalta } from './db/repository'
import { registraServiceWorker } from './lib/serviceWorker'
import './styles.css'

async function arranca(): Promise<void> {
  const raiz = document.getElementById('root')
  if (!raiz) return

  try {
    await sembrarSiHaceFalta()
  } catch (error) {
    // Si falla el sembrado, la app sigue abriendo y lo dice en Ajustes. Es mejor que una
    // pantalla en blanco.
    console.error('No se pudo preparar el histórico de partida:', error)
  }

  ReactDOM.createRoot(raiz).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )

  registraServiceWorker({
    alHaberVersionNueva: (actualizar) => {
      // Se avisa por un suceso del navegador en lugar de por una variable global: asi el
      // aviso lo pinta la interfaz, que es quien sabe donde ponerlo.
      window.dispatchEvent(new CustomEvent('oikos:version-nueva', { detail: { actualizar } }))
    },
  })
}

void arranca()
