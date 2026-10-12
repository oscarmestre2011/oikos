/**
 * SEMILLA DE OIKOS — FICHERO GENERADO, NO EDITAR A MANO.
 *
 * Lo produce `scripts/generar-semilla.mjs` a partir de `../../datos/historico.json`, que a
 * su vez sale de `../../datos/extraer-historico.py` leyendo el excel real de Oscar
 * (FINANZAS_PERSONALES 2024.xlsx) y su Gastos 2026.csv.
 *
 * Para regenerarlo:   npm run semilla
 *
 * Contenido verificado: las sumas de las partidas de las 36 fotos de patrimonio
 * cuadran EXACTAMENTE con los totales de las formulas del excel (0 descuadres).
 * Extraido el 2026-10-12T21:03:02.
 */

import type { CompraBitcoin, Cuenta, FotoPatrimonio, Movimiento } from '../types'

/** Traza de donde salen los datos, para poder auditar la semilla. */
export const FUENTES_SEMILLA = {
  "excel": "C:\\Users\\Oscar\\Desktop\\FINANZAS_PERSONALES 2024.xlsx",
  "csv": "D:\\obsidian openclaw\\30 Marmota\\30 Organización (Vida)\\05 Finanzas\\Gastos 2026.csv",
  "extraido": "2026-10-12T21:03:02",
  "descuadresContraElExcel": 0
} as const

/** Que trae la semilla, en numeros. */
export const RESUMEN_SEMILLA = {
  "fotos": 36,
  "primeraFoto": "2024-01-01",
  "ultimaFoto": "2026-09-22",
  "movimientos": 24,
  "rangoMovimientos": [
    "2026-03-26",
    "2026-04-12"
  ],
  "comprasBitcoin": 89,
  "btcTotal": 0.11623313,
  "importeBitcoinTotal": 9890.04,
  "descuadres": 0
} as const

/** Las cuentas que aparecen en el historico del excel. */
export const CUENTAS_SEMILLA: Cuenta[] = [
  {
    "nombre": "Cuenta nómina (ING)",
    "bloque": "liquidez",
    "orden": 0,
    "activa": true
  },
  {
    "nombre": "Cuenta Naranja (ING)",
    "bloque": "liquidez",
    "orden": 1,
    "activa": true
  },
  {
    "nombre": "Mediolanum cuenta",
    "bloque": "liquidez",
    "orden": 2,
    "activa": true
  },
  {
    "nombre": "Revolut",
    "bloque": "liquidez",
    "orden": 3,
    "activa": true
  },
  {
    "nombre": "MyInvestor cuenta",
    "bloque": "liquidez",
    "orden": 4,
    "activa": true
  },
  {
    "nombre": "Efectivo",
    "bloque": "liquidez",
    "orden": 5,
    "activa": true
  },
  {
    "nombre": "Fondo 50/50",
    "bloque": "activo",
    "orden": 6,
    "activa": false
  },
  {
    "nombre": "MyInvestor fondos",
    "bloque": "activo",
    "orden": 7,
    "activa": true
  },
  {
    "nombre": "Mintos",
    "bloque": "activo",
    "orden": 8,
    "activa": true
  },
  {
    "nombre": "Crowdlending",
    "bloque": "activo",
    "orden": 9,
    "activa": false
  },
  {
    "nombre": "Mediolanum PIAS",
    "bloque": "activo",
    "orden": 10,
    "activa": true
  },
  {
    "nombre": "XTB",
    "bloque": "activo",
    "orden": 11,
    "activa": false
  },
  {
    "nombre": "Degiro",
    "bloque": "activo",
    "orden": 12,
    "activa": false
  },
  {
    "nombre": "Bitcoin",
    "bloque": "activo",
    "orden": 13,
    "activa": true
  },
  {
    "nombre": "Mediolanum renta fija",
    "bloque": "activo",
    "orden": 14,
    "activa": true
  },
  {
    "nombre": "Fondo largo plazo",
    "bloque": "activo",
    "orden": 15,
    "activa": true
  },
  {
    "nombre": "Préstamo recibido",
    "bloque": "liquidez",
    "orden": 16,
    "activa": false
  },
  {
    "nombre": "Trading",
    "bloque": "liquidez",
    "orden": 17,
    "activa": true
  }
]

/** Las 36 fotos mensuales de patrimonio (2024-01 a 2026-09-22). */
export const FOTOS_SEMILLA: FotoPatrimonio[] = [
  {
    "fecha": "2024-01-01",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2769.26
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2769.11
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 0
      },
      {
        "cuenta": "Revolut",
        "importe": 105.36
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 100
      },
      {
        "cuenta": "Efectivo",
        "importe": 650
      },
      {
        "cuenta": "Fondo 50/50",
        "importe": 7920
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 0
      },
      {
        "cuenta": "Mintos",
        "importe": 0
      },
      {
        "cuenta": "Crowdlending",
        "importe": 1657.01
      }
    ],
    "notas": "Según tu Excel: hoja 2024!C (Enero)",
    "origen": "excel",
    "fechaAproximada": true
  },
  {
    "fecha": "2024-03-25",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 657
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2692
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 6800
      },
      {
        "cuenta": "Revolut",
        "importe": 0
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 114.26
      },
      {
        "cuenta": "Efectivo",
        "importe": 0
      },
      {
        "cuenta": "Fondo 50/50",
        "importe": 0
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 2008
      },
      {
        "cuenta": "XTB",
        "importe": 150.08
      },
      {
        "cuenta": "Degiro",
        "importe": 487.54
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 1419.51
      },
      {
        "cuenta": "Mintos",
        "importe": 2549.68
      },
      {
        "cuenta": "Crowdlending",
        "importe": 405.2
      }
    ],
    "notas": "Según tu Excel: hoja 2024!E (Marzo)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-04-20",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 816
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2259
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 6800
      },
      {
        "cuenta": "Revolut",
        "importe": 14
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 14.28
      },
      {
        "cuenta": "Efectivo",
        "importe": 50
      },
      {
        "cuenta": "Fondo 50/50",
        "importe": 0
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 1970.62
      },
      {
        "cuenta": "XTB",
        "importe": 238.95
      },
      {
        "cuenta": "Degiro",
        "importe": 493.44
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 1731.93
      },
      {
        "cuenta": "Mintos",
        "importe": 2864.42
      },
      {
        "cuenta": "Crowdlending",
        "importe": 405.2
      }
    ],
    "notas": "Según tu Excel: hoja 2024!F (Abril)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-05-20",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1706.8
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1078.67
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 850
      },
      {
        "cuenta": "Revolut",
        "importe": 56.62
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 5245.61
      },
      {
        "cuenta": "Efectivo",
        "importe": 100
      },
      {
        "cuenta": "Fondo 50/50",
        "importe": 0
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 2335.16
      },
      {
        "cuenta": "XTB",
        "importe": 250.83
      },
      {
        "cuenta": "Degiro",
        "importe": 526.31
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 1892.58
      },
      {
        "cuenta": "Mintos",
        "importe": 2986.19
      },
      {
        "cuenta": "Crowdlending",
        "importe": 405.2
      }
    ],
    "notas": "Según tu Excel: hoja 2024!G (Mayo)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-06-19",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2376.63
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1172.46
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 556.99
      },
      {
        "cuenta": "Revolut",
        "importe": 6.62
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 5056.73
      },
      {
        "cuenta": "Efectivo",
        "importe": 200
      },
      {
        "cuenta": "Fondo 50/50",
        "importe": 0
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 2659.77
      },
      {
        "cuenta": "XTB",
        "importe": 264.36
      },
      {
        "cuenta": "Degiro",
        "importe": 548.89
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 2137.29
      },
      {
        "cuenta": "Mintos",
        "importe": 3108.16
      },
      {
        "cuenta": "Crowdlending",
        "importe": 420
      }
    ],
    "notas": "Según tu Excel: hoja 2024!H (Junio)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-07-15",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 3005
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1205.21
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 556.99
      },
      {
        "cuenta": "Revolut",
        "importe": 6.62
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 6030.93
      },
      {
        "cuenta": "Efectivo",
        "importe": 50
      },
      {
        "cuenta": "Fondo 50/50",
        "importe": 0
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 2982.31
      },
      {
        "cuenta": "XTB",
        "importe": 369.83
      },
      {
        "cuenta": "Degiro",
        "importe": 550.71
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 2362.07
      },
      {
        "cuenta": "Mintos",
        "importe": 3326.26
      },
      {
        "cuenta": "Crowdlending",
        "importe": 466.12
      }
    ],
    "notas": "Según tu Excel: hoja 2024!I (Julio)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-08-15",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2382
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1346.71
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 356.99
      },
      {
        "cuenta": "Revolut",
        "importe": 6.62
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 5284.33
      },
      {
        "cuenta": "Efectivo",
        "importe": 75
      },
      {
        "cuenta": "Fondo 50/50",
        "importe": 0
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 3114.75
      },
      {
        "cuenta": "XTB",
        "importe": 353.71
      },
      {
        "cuenta": "Degiro",
        "importe": 531.13
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 3756.13
      },
      {
        "cuenta": "Mintos",
        "importe": 3349.63
      },
      {
        "cuenta": "Crowdlending",
        "importe": 481.45
      }
    ],
    "notas": "Según tu Excel: hoja 2024!J (Agosto)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-09-19",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2233.89
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1451
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 356.99
      },
      {
        "cuenta": "Revolut",
        "importe": 59.94
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 4724
      },
      {
        "cuenta": "Efectivo",
        "importe": 100
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 3479
      },
      {
        "cuenta": "XTB",
        "importe": 0
      },
      {
        "cuenta": "Degiro",
        "importe": 532.74
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 4078.89
      },
      {
        "cuenta": "Mintos",
        "importe": 3442.84
      },
      {
        "cuenta": "Crowdlending",
        "importe": 272
      }
    ],
    "notas": "Según tu Excel: hoja 2024!K (Septiembre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-10-19",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2159
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1564
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 356.99
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 4940
      },
      {
        "cuenta": "Efectivo",
        "importe": 350
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 3928.16
      },
      {
        "cuenta": "Degiro",
        "importe": 212.59
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 4851
      },
      {
        "cuenta": "Mintos",
        "importe": 3642.45
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.38
      }
    ],
    "notas": "Según tu Excel: hoja 2024!L (Octubre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-11-19",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2588
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1617.85
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 356.99
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 4385.64
      },
      {
        "cuenta": "Efectivo",
        "importe": 150
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4348.15
      },
      {
        "cuenta": "Degiro",
        "importe": 206.85
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 5146.89
      },
      {
        "cuenta": "Mintos",
        "importe": 3672.03
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.38
      }
    ],
    "notas": "Según tu Excel: hoja 2024!M (Noviembre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2024-12-19",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2373.84
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1211.55
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 356.99
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 4236
      },
      {
        "cuenta": "Efectivo",
        "importe": 40
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4765.14
      },
      {
        "cuenta": "Degiro",
        "importe": 206.85
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 5739.93
      },
      {
        "cuenta": "Mintos",
        "importe": 3804.95
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.38
      }
    ],
    "notas": "Según tu Excel: hoja 2024!N (Diciembre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-01-19",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1281.47
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 6566.13
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 356.99
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 340.54
      },
      {
        "cuenta": "Efectivo",
        "importe": 250
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 5030.29
      },
      {
        "cuenta": "Bitcoin",
        "importe": 203.21
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 6240.38
      },
      {
        "cuenta": "Mintos",
        "importe": 4040.06
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.38
      }
    ],
    "notas": "Según tu Excel: hoja 2025!C (Enero)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-02-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1177.89
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 6025.77
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 356.99
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 644.06
      },
      {
        "cuenta": "Efectivo",
        "importe": 200
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 5515.38
      },
      {
        "cuenta": "Bitcoin",
        "importe": 216.61
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 6736
      },
      {
        "cuenta": "Mintos",
        "importe": 4077.2
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.38
      }
    ],
    "notas": "Según tu Excel: hoja 2025!D (Febrero)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-03-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1265.86
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 3079.05
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 456.99
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 211.07
      },
      {
        "cuenta": "Efectivo",
        "importe": 400
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 5311.06
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 3001.92
      },
      {
        "cuenta": "Bitcoin",
        "importe": 234.04
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 6507.88
      },
      {
        "cuenta": "Mintos",
        "importe": 4112.29
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.38
      }
    ],
    "notas": "Según tu Excel: hoja 2025!E (Marzo)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-04-20",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 925.39
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 3189.56
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 447.19
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 125.07
      },
      {
        "cuenta": "Efectivo",
        "importe": 50
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 5178.23
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 3006.24
      },
      {
        "cuenta": "Bitcoin",
        "importe": 236.11
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 6317.34
      },
      {
        "cuenta": "Mintos",
        "importe": 4149.38
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.38
      }
    ],
    "notas": "Según tu Excel: hoja 2025!F (Abril)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-05-20",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1964.27
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1780.07
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 283.21
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 37.84
      },
      {
        "cuenta": "Efectivo",
        "importe": 185
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 6204.64
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 3014.66
      },
      {
        "cuenta": "Bitcoin",
        "importe": 250.69
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 6885
      },
      {
        "cuenta": "Mintos",
        "importe": 4187.09
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.83
      }
    ],
    "notas": "Según tu Excel: hoja 2025!G (Mayo)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-06-19",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1996.05
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1835.88
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 473.41
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 149.99
      },
      {
        "cuenta": "Efectivo",
        "importe": 240
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 6456.87
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 3020.18
      },
      {
        "cuenta": "Bitcoin",
        "importe": 0
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 6965.84
      },
      {
        "cuenta": "Mintos",
        "importe": 4321.65
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.83
      }
    ],
    "notas": "Según tu Excel: hoja 2025!H (Junio)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-07-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1950
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1935.3
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 463.61
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 432.06
      },
      {
        "cuenta": "Efectivo",
        "importe": 170
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 6903.13
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 3025.92
      },
      {
        "cuenta": "Bitcoin",
        "importe": 0
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 7288.96
      },
      {
        "cuenta": "Mintos",
        "importe": 4455.43
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.83
      }
    ],
    "notas": "Según tu Excel: hoja 2025!I (Julio)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-08-17",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1905
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2076
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 453.81
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 142
      },
      {
        "cuenta": "Efectivo",
        "importe": 455
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 7377.51
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 3030.32
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 7731
      },
      {
        "cuenta": "Mintos",
        "importe": 4493.52
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.83
      }
    ],
    "notas": "Según tu Excel: hoja 2025!J (Agosto)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-09-16",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1445
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1988.52
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 394.01
      },
      {
        "cuenta": "Revolut",
        "importe": 4.73
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 40.15
      },
      {
        "cuenta": "Efectivo",
        "importe": 100
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 3664.63
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4170.45
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 3085
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 8154.69
      },
      {
        "cuenta": "Mintos",
        "importe": 4531.54
      },
      {
        "cuenta": "Crowdlending",
        "importe": 257.83
      }
    ],
    "notas": "Según tu Excel: hoja 2025!K (Septiembre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-10-19",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1393.36
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2079.43
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 384.21
      },
      {
        "cuenta": "Revolut",
        "importe": 1.67
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 178.89
      },
      {
        "cuenta": "Efectivo",
        "importe": 90
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 3875.21
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4417.15
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 3090.03
      },
      {
        "cuenta": "Bitcoin",
        "importe": 3061.7
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 7733.61
      },
      {
        "cuenta": "Mintos",
        "importe": 2213.59
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2025!L (Octubre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-11-11",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1936.97
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 871.95
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 374.41
      },
      {
        "cuenta": "Préstamo recibido",
        "importe": 7900
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 543
      },
      {
        "cuenta": "Efectivo",
        "importe": 100
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4099.68
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4669.96
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 1087.41
      },
      {
        "cuenta": "Bitcoin",
        "importe": 5199
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 8437
      },
      {
        "cuenta": "Mintos",
        "importe": 1205.5
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2025!M (Noviembre)",
    "origen": "excel",
    "fechaAproximada": true
  },
  {
    "fecha": "2025-11-26",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1737
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 909.25
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 1849.2
      },
      {
        "cuenta": "Efectivo",
        "importe": 100
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 3978.55
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4556.61
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 1087.97
      },
      {
        "cuenta": "Bitcoin",
        "importe": 8052
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 10055
      },
      {
        "cuenta": "Mintos",
        "importe": 1289.34
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2025!N (Noviembre)",
    "origen": "excel",
    "fechaAproximada": true
  },
  {
    "fecha": "2025-12-09",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2574.56
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2447.65
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 1482.57
      },
      {
        "cuenta": "Efectivo",
        "importe": 50
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4059.51
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4642.28
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 1088.57
      },
      {
        "cuenta": "Bitcoin",
        "importe": 8915
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 10496.95
      },
      {
        "cuenta": "Mintos",
        "importe": 1292.99
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2025!O (Diciembre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-12-21",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1571.99
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2516.75
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 1023.36
      },
      {
        "cuenta": "Efectivo",
        "importe": 50
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4015.36
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4595.93
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 1089.1
      },
      {
        "cuenta": "Bitcoin",
        "importe": 9325
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 10775
      },
      {
        "cuenta": "Mintos",
        "importe": 1299.22
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2025!P (Diciembre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2025-12-31",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 3810
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 3041.25
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 846.06
      },
      {
        "cuenta": "Efectivo",
        "importe": 600
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4078.68
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4673.15
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 1089.78
      },
      {
        "cuenta": "Bitcoin",
        "importe": 9000
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 11050
      },
      {
        "cuenta": "Mintos",
        "importe": 1501.05
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2025!Q (Diciembre)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2026-01-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2016
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 3110.74
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Revolut",
        "importe": 200.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 229.84
      },
      {
        "cuenta": "Efectivo",
        "importe": 300
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4212.98
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4757.48
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 1090.88
      },
      {
        "cuenta": "Bitcoin",
        "importe": 9721
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 12133.62
      },
      {
        "cuenta": "Mintos",
        "importe": 1506.68
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2026!C (Enero)",
    "origen": "excel",
    "fechaAproximada": true
  },
  {
    "fecha": "2026-02-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 880.54
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2710.34
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 403.84
      },
      {
        "cuenta": "Efectivo",
        "importe": 190
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4095.76
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4691.86
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 88.43
      },
      {
        "cuenta": "Bitcoin",
        "importe": 9025.62
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 12058.41
      },
      {
        "cuenta": "Mintos",
        "importe": 1517.99
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2026!D (Febrero)",
    "origen": "excel",
    "fechaAproximada": true
  },
  {
    "fecha": "2026-03-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1642.74
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2804.01
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 286.73
      },
      {
        "cuenta": "Efectivo",
        "importe": 310
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4059.31
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4618
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 88.44
      },
      {
        "cuenta": "Bitcoin",
        "importe": 10378.2
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 12364
      },
      {
        "cuenta": "Mintos",
        "importe": 1728.62
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2026!E (Marzo)",
    "origen": "excel",
    "fechaAproximada": true
  },
  {
    "fecha": "2026-04-20",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1553.25
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2077.43
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Trading",
        "importe": 432.55
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 155.48
      },
      {
        "cuenta": "Efectivo",
        "importe": 200
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4146.35
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4704.1
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 88.55
      },
      {
        "cuenta": "Bitcoin",
        "importe": 10597
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 13642
      },
      {
        "cuenta": "Mintos",
        "importe": 1942.37
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2026!F (Abril)",
    "origen": "excel",
    "fechaAproximada": true
  },
  {
    "fecha": "2026-05-13",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2189.53
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1336.25
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Trading",
        "importe": 526
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 187.32
      },
      {
        "cuenta": "Efectivo",
        "importe": 500
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4291.2
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4863.1
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 88.67
      },
      {
        "cuenta": "Bitcoin",
        "importe": 11349.51
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 14033
      },
      {
        "cuenta": "Mintos",
        "importe": 1951
      },
      {
        "cuenta": "Crowdlending",
        "importe": 57.07
      }
    ],
    "notas": "Según tu Excel: hoja 2026!G (Mayo)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2026-05-21",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1902.54
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1336.25
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Trading",
        "importe": 566.54
      },
      {
        "cuenta": "Revolut",
        "importe": 0.55
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 37.15
      },
      {
        "cuenta": "Efectivo",
        "importe": 120
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4285.47
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4869.23
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 88.73
      },
      {
        "cuenta": "Bitcoin",
        "importe": 11089.63
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 14185
      },
      {
        "cuenta": "Mintos",
        "importe": 1956.67
      },
      {
        "cuenta": "Crowdlending",
        "importe": 0
      }
    ],
    "notas": "Según tu Excel: hoja 2026!H (Mayo)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2026-06-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1671.33
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1401.17
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Trading",
        "importe": 579.93
      },
      {
        "cuenta": "Revolut",
        "importe": 39.34
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 68.99
      },
      {
        "cuenta": "Efectivo",
        "importe": 30
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4311.62
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4864.01
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 88.85
      },
      {
        "cuenta": "Bitcoin",
        "importe": 9615
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 14181
      },
      {
        "cuenta": "Mintos",
        "importe": 1966.95
      },
      {
        "cuenta": "Crowdlending",
        "importe": 0
      }
    ],
    "notas": "Según tu Excel: hoja 2026!I (Junio)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2026-07-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2200
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2017
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Trading",
        "importe": 1050.33
      },
      {
        "cuenta": "Revolut",
        "importe": 39.34
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 252.03
      },
      {
        "cuenta": "Efectivo",
        "importe": 50
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4474.46
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 5052.22
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 89.01
      },
      {
        "cuenta": "Bitcoin",
        "importe": 9926.32
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 14743
      },
      {
        "cuenta": "Mintos",
        "importe": 2082.28
      },
      {
        "cuenta": "Crowdlending",
        "importe": 0
      }
    ],
    "notas": "Según tu Excel: hoja 2026!J (Julio)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2026-08-18",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 2195
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 1683.44
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Trading",
        "importe": 749.13
      },
      {
        "cuenta": "Revolut",
        "importe": 39.34
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 94.23
      },
      {
        "cuenta": "Efectivo",
        "importe": 45
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4561.41
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 5144.93
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 89.17
      },
      {
        "cuenta": "Bitcoin",
        "importe": 10146
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 14860
      },
      {
        "cuenta": "Mintos",
        "importe": 2098.7
      },
      {
        "cuenta": "Crowdlending",
        "importe": 0
      }
    ],
    "notas": "Según tu Excel: hoja 2026!K (Agosto)",
    "origen": "excel",
    "fechaAproximada": false
  },
  {
    "fecha": "2026-09-22",
    "valores": [
      {
        "cuenta": "Cuenta nómina (ING)",
        "importe": 1190.4
      },
      {
        "cuenta": "Cuenta Naranja (ING)",
        "importe": 2447.7
      },
      {
        "cuenta": "Mediolanum cuenta",
        "importe": 4.41
      },
      {
        "cuenta": "Trading",
        "importe": 199.43
      },
      {
        "cuenta": "Revolut",
        "importe": 39.34
      },
      {
        "cuenta": "MyInvestor cuenta",
        "importe": 25.66
      },
      {
        "cuenta": "Efectivo",
        "importe": 40
      },
      {
        "cuenta": "Fondo largo plazo",
        "importe": 4452.58
      },
      {
        "cuenta": "Mediolanum PIAS",
        "importe": 4995.43
      },
      {
        "cuenta": "Mediolanum renta fija",
        "importe": 89.29
      },
      {
        "cuenta": "Bitcoin",
        "importe": 14687.82
      },
      {
        "cuenta": "MyInvestor fondos",
        "importe": 14996.65
      },
      {
        "cuenta": "Mintos",
        "importe": 2114.63
      }
    ],
    "notas": "Según tu Excel: hoja 2026!L (Septiembre)",
    "origen": "excel",
    "fechaAproximada": false
  }
]

/** Los movimientos del Gastos 2026.csv, con el tipo ya normalizado. */
export const MOVIMIENTOS_SEMILLA: Movimiento[] = [
  {
    "fecha": "2026-03-26",
    "tipo": "gasto",
    "categoria": "Deporte",
    "concepto": "Decathlon",
    "importe": 118.32,
    "origen": "historico",
    "creado": "2026-03-26T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-26",
    "tipo": "amortizacion",
    "categoria": "Amortización",
    "concepto": "Amortización",
    "importe": 100,
    "origen": "historico",
    "creado": "2026-03-26T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-27",
    "tipo": "gasto",
    "categoria": "Alimentación",
    "concepto": "Comida",
    "importe": 11,
    "origen": "historico",
    "creado": "2026-03-27T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-29",
    "tipo": "gasto",
    "categoria": "Ocio",
    "concepto": "Cervezas",
    "importe": 5,
    "origen": "historico",
    "creado": "2026-03-29T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-30",
    "tipo": "gasto",
    "categoria": "Deporte",
    "concepto": "Arreglo bici",
    "importe": 75,
    "origen": "historico",
    "creado": "2026-03-30T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-31",
    "tipo": "ingreso",
    "categoria": "Ingreso",
    "concepto": "Nómina",
    "importe": 2661.32,
    "origen": "historico",
    "creado": "2026-03-31T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-31",
    "tipo": "ingreso",
    "categoria": "Ingreso",
    "concepto": "SME",
    "importe": 480,
    "origen": "historico",
    "creado": "2026-03-31T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-31",
    "tipo": "ingreso",
    "categoria": "Ingreso",
    "concepto": "Devolución Decathlon",
    "importe": 19.99,
    "origen": "historico",
    "creado": "2026-03-31T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-31",
    "tipo": "gasto",
    "categoria": "Alimentación",
    "concepto": "Mercadona",
    "importe": 58.16,
    "origen": "historico",
    "creado": "2026-03-31T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-31",
    "tipo": "gasto",
    "categoria": "Ocio",
    "concepto": "Cerveza con Pere",
    "importe": 13,
    "origen": "historico",
    "creado": "2026-03-31T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-31",
    "tipo": "inversion",
    "categoria": "Inversión",
    "concepto": "Mintos",
    "importe": 200,
    "origen": "historico",
    "creado": "2026-03-31T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-31",
    "tipo": "inversion",
    "categoria": "Inversión",
    "concepto": "Bitcoin",
    "importe": 200,
    "origen": "historico",
    "creado": "2026-03-31T12:00:00.000Z"
  },
  {
    "fecha": "2026-03-31",
    "tipo": "inversion",
    "categoria": "Familia",
    "concepto": "Fondo Paula",
    "importe": 100,
    "origen": "historico",
    "creado": "2026-03-31T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-01",
    "tipo": "amortizacion",
    "categoria": "Amortización",
    "concepto": "Amortización hipoteca",
    "importe": 100,
    "origen": "historico",
    "creado": "2026-04-01T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-01",
    "tipo": "gasto",
    "categoria": "Hipoteca",
    "concepto": "Cuota hipoteca",
    "importe": 469.15,
    "origen": "historico",
    "creado": "2026-04-01T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-01",
    "tipo": "amortizacion",
    "categoria": "Amortización",
    "concepto": "Amortización préstamo",
    "importe": 100,
    "origen": "historico",
    "creado": "2026-04-01T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-03",
    "tipo": "gasto",
    "categoria": "Alimentación",
    "concepto": "Almuerzo",
    "importe": 11,
    "origen": "historico",
    "creado": "2026-04-03T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-04",
    "tipo": "gasto",
    "categoria": "Alimentación",
    "concepto": "Bonarea",
    "importe": 27.63,
    "origen": "historico",
    "creado": "2026-04-04T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-04",
    "tipo": "gasto",
    "categoria": "Ocio",
    "concepto": "Cervezas",
    "importe": 13,
    "origen": "historico",
    "creado": "2026-04-04T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-06",
    "tipo": "gasto",
    "categoria": "Transporte",
    "concepto": "Gasolina",
    "importe": 45,
    "origen": "historico",
    "creado": "2026-04-06T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-07",
    "tipo": "gasto",
    "categoria": "Ocio",
    "concepto": "Entradas Port Aventura",
    "importe": 108,
    "origen": "historico",
    "creado": "2026-04-07T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-08",
    "tipo": "gasto",
    "categoria": "Transporte",
    "concepto": "Parking Port Aventura",
    "importe": 16,
    "origen": "historico",
    "creado": "2026-04-08T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-08",
    "tipo": "gasto",
    "categoria": "Alimentación",
    "concepto": "Comida Port Aventura",
    "importe": 33,
    "origen": "historico",
    "creado": "2026-04-08T12:00:00.000Z"
  },
  {
    "fecha": "2026-04-12",
    "tipo": "gasto",
    "categoria": "Alimentación",
    "concepto": "Aldi",
    "importe": 51.96,
    "origen": "historico",
    "creado": "2026-04-12T12:00:00.000Z"
  }
]

/** Las compras de Bitcoin de la hoja 'Bitcoin 2025'. */
export const COMPRAS_BITCOIN_SEMILLA: CompraBitcoin[] = [
  {
    "fecha": "2025-10-13",
    "precioBtc": 98730.2,
    "cantidadBtc": 0.004051,
    "importe": 399.96
  },
  {
    "fecha": "2025-10-13",
    "precioBtc": 99000.1,
    "cantidadBtc": 0.00101,
    "importe": 99.99
  },
  {
    "fecha": "2025-10-13",
    "precioBtc": 99880,
    "cantidadBtc": 0.0009912,
    "importe": 99
  },
  {
    "fecha": "2025-10-13",
    "precioBtc": 100000.5,
    "cantidadBtc": 0.001,
    "importe": 100
  },
  {
    "fecha": "2025-10-14",
    "precioBtc": 99000.7,
    "cantidadBtc": 0.00101,
    "importe": 99.99
  },
  {
    "fecha": "2025-10-14",
    "precioBtc": 98500.7,
    "cantidadBtc": 0.001015,
    "importe": 99.98
  },
  {
    "fecha": "2025-10-14",
    "precioBtc": 98000,
    "cantidadBtc": 0.00102,
    "importe": 99.96
  },
  {
    "fecha": "2025-10-14",
    "precioBtc": 97500.5,
    "cantidadBtc": 0.001026,
    "importe": 100.04
  },
  {
    "fecha": "2025-10-14",
    "precioBtc": 97000.5,
    "cantidadBtc": 0.001031,
    "importe": 100.01
  },
  {
    "fecha": "2025-10-14",
    "precioBtc": 96500,
    "cantidadBtc": 0.001751,
    "importe": 168.97
  },
  {
    "fecha": "2025-10-14",
    "precioBtc": 96000,
    "cantidadBtc": 0.002083,
    "importe": 199.97
  },
  {
    "fecha": "2025-10-14",
    "precioBtc": 95500,
    "cantidadBtc": 0.001047,
    "importe": 99.99
  },
  {
    "fecha": "2025-10-15",
    "precioBtc": 96000,
    "cantidadBtc": 0.001042,
    "importe": 100.03
  },
  {
    "fecha": "2025-10-15",
    "precioBtc": 95500,
    "cantidadBtc": 0.001058,
    "importe": 101.04
  },
  {
    "fecha": "2025-10-15",
    "precioBtc": 95000,
    "cantidadBtc": 0.001053,
    "importe": 100.03
  },
  {
    "fecha": "2025-10-16",
    "precioBtc": 94800,
    "cantidadBtc": 0.001055,
    "importe": 100.01
  },
  {
    "fecha": "2025-10-16",
    "precioBtc": 94500,
    "cantidadBtc": 0.001058,
    "importe": 99.98
  },
  {
    "fecha": "2025-10-16",
    "precioBtc": 94000,
    "cantidadBtc": 0.001064,
    "importe": 100.02
  },
  {
    "fecha": "2025-10-16",
    "precioBtc": 93800,
    "cantidadBtc": 0.001038,
    "importe": 97.36
  },
  {
    "fecha": "2025-10-16",
    "precioBtc": 92500,
    "cantidadBtc": 0.0001565,
    "importe": 14.48
  },
  {
    "fecha": "2025-10-16",
    "precioBtc": 92500,
    "cantidadBtc": 0.0009246,
    "importe": 85.53
  },
  {
    "fecha": "2025-10-17",
    "precioBtc": 92000,
    "cantidadBtc": 0.001087,
    "importe": 100
  },
  {
    "fecha": "2025-10-17",
    "precioBtc": 91500,
    "cantidadBtc": 0.001093,
    "importe": 100.01
  },
  {
    "fecha": "2025-10-17",
    "precioBtc": 91000,
    "cantidadBtc": 0.001099,
    "importe": 100.01
  },
  {
    "fecha": "2025-10-19",
    "precioBtc": 93514.9,
    "cantidadBtc": 0.001176,
    "importe": 109.97
  },
  {
    "fecha": "2025-10-20",
    "precioBtc": 95498.9,
    "cantidadBtc": 0.001047,
    "importe": 99.99
  },
  {
    "fecha": "2025-10-20",
    "precioBtc": 95398.1,
    "cantidadBtc": 0.001048,
    "importe": 99.98
  },
  {
    "fecha": "2025-10-20",
    "precioBtc": 94500,
    "cantidadBtc": 0.001058,
    "importe": 99.98
  },
  {
    "fecha": "2025-10-21",
    "precioBtc": 94000,
    "cantidadBtc": 0.001064,
    "importe": 100.02
  },
  {
    "fecha": "2025-10-21",
    "precioBtc": 93800,
    "cantidadBtc": 0.001064,
    "importe": 99.8
  },
  {
    "fecha": "2025-10-21",
    "precioBtc": 93500,
    "cantidadBtc": 0.00107,
    "importe": 100.05
  },
  {
    "fecha": "2025-10-21",
    "precioBtc": 92500,
    "cantidadBtc": 0.001081,
    "importe": 99.99
  },
  {
    "fecha": "2025-10-22",
    "precioBtc": 94000,
    "cantidadBtc": 0.001064,
    "importe": 100.02
  },
  {
    "fecha": "2025-10-22",
    "precioBtc": 93500,
    "cantidadBtc": 0.00107,
    "importe": 100.05
  },
  {
    "fecha": "2025-10-22",
    "precioBtc": 93000,
    "cantidadBtc": 0.001075,
    "importe": 99.97
  },
  {
    "fecha": "2025-10-22",
    "precioBtc": 92800,
    "cantidadBtc": 0.001078,
    "importe": 100.04
  },
  {
    "fecha": "2025-10-22",
    "precioBtc": 92500,
    "cantidadBtc": 0.001081,
    "importe": 99.99
  },
  {
    "fecha": "2025-10-22",
    "precioBtc": 92200,
    "cantidadBtc": 0.001085,
    "importe": 100.04
  },
  {
    "fecha": "2025-10-22",
    "precioBtc": 91800,
    "cantidadBtc": 0.001089,
    "importe": 99.97
  },
  {
    "fecha": "2025-10-23",
    "precioBtc": 94761.4,
    "cantidadBtc": 0.001055,
    "importe": 99.97
  },
  {
    "fecha": "2025-10-24",
    "precioBtc": 95796.3,
    "cantidadBtc": 0.002735,
    "importe": 262
  },
  {
    "fecha": "2025-10-31",
    "precioBtc": 95323.5,
    "cantidadBtc": 0.001049,
    "importe": 99.99
  },
  {
    "fecha": "2025-11-04",
    "precioBtc": 87985,
    "cantidadBtc": 0.001818,
    "importe": 159.96
  },
  {
    "fecha": "2025-11-06",
    "precioBtc": 87198.7,
    "cantidadBtc": 0.0008601,
    "importe": 75
  },
  {
    "fecha": "2025-11-07",
    "precioBtc": 86900,
    "cantidadBtc": 0.0008631,
    "importe": 75
  },
  {
    "fecha": "2025-11-11",
    "precioBtc": 89900,
    "cantidadBtc": 0.001113,
    "importe": 100.06
  },
  {
    "fecha": "2025-11-13",
    "precioBtc": 84487.8,
    "cantidadBtc": 0.001184,
    "importe": 100.03
  },
  {
    "fecha": "2025-11-14",
    "precioBtc": 84000,
    "cantidadBtc": 0.001186,
    "importe": 99.62
  },
  {
    "fecha": "2025-11-14",
    "precioBtc": 83400,
    "cantidadBtc": 0.001199,
    "importe": 100
  },
  {
    "fecha": "2025-11-14",
    "precioBtc": 83000,
    "cantidadBtc": 0.001202,
    "importe": 99.77
  },
  {
    "fecha": "2025-11-15",
    "precioBtc": 80800,
    "cantidadBtc": 0.001238,
    "importe": 100.03
  },
  {
    "fecha": "2025-11-15",
    "precioBtc": 82344.8,
    "cantidadBtc": 0.001214,
    "importe": 99.97
  },
  {
    "fecha": "2025-11-16",
    "precioBtc": 81000,
    "cantidadBtc": 0.0006173,
    "importe": 50
  },
  {
    "fecha": "2025-11-16",
    "precioBtc": 80800,
    "cantidadBtc": 0.0006188,
    "importe": 50
  },
  {
    "fecha": "2025-11-16",
    "precioBtc": 80600,
    "cantidadBtc": 0.0006203,
    "importe": 50
  },
  {
    "fecha": "2025-11-16",
    "precioBtc": 80500,
    "cantidadBtc": 0.0006211,
    "importe": 50
  },
  {
    "fecha": "2025-11-17",
    "precioBtc": 79317,
    "cantidadBtc": 0.001261,
    "importe": 100.02
  },
  {
    "fecha": "2025-11-18",
    "precioBtc": 78800,
    "cantidadBtc": 0.001265,
    "importe": 99.68
  },
  {
    "fecha": "2025-11-19",
    "precioBtc": 79000.1,
    "cantidadBtc": 0.001266,
    "importe": 100.01
  },
  {
    "fecha": "2025-11-19",
    "precioBtc": 78800,
    "cantidadBtc": 0.001264,
    "importe": 99.6
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 79752.1,
    "cantidadBtc": 0.001254,
    "importe": 100.01
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 79100,
    "cantidadBtc": 0.001264,
    "importe": 99.98
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 79000,
    "cantidadBtc": 0.001899,
    "importe": 150.02
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 78900,
    "cantidadBtc": 0.001901,
    "importe": 149.99
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 78800,
    "cantidadBtc": 0.002538,
    "importe": 199.99
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 78500,
    "cantidadBtc": 0.001274,
    "importe": 100.01
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 77500,
    "cantidadBtc": 0.00129,
    "importe": 99.97
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 75010.1,
    "cantidadBtc": 0.001307,
    "importe": 98.04
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 75000,
    "cantidadBtc": 0.002,
    "importe": 150
  },
  {
    "fecha": "2025-11-20",
    "precioBtc": 74910.32,
    "cantidadBtc": 0.001363,
    "importe": 102.1
  },
  {
    "fecha": "2025-11-21",
    "precioBtc": 73711.1,
    "cantidadBtc": 0.001357,
    "importe": 100.03
  },
  {
    "fecha": "2025-11-21",
    "precioBtc": 71200,
    "cantidadBtc": 0.001404,
    "importe": 99.96
  },
  {
    "fecha": "2025-11-21",
    "precioBtc": 71000,
    "cantidadBtc": 0.001408,
    "importe": 99.97
  },
  {
    "fecha": "2025-11-21",
    "precioBtc": 70800,
    "cantidadBtc": 0.001412,
    "importe": 99.97
  },
  {
    "fecha": "2025-11-21",
    "precioBtc": 70600,
    "cantidadBtc": 0.001416,
    "importe": 99.97
  },
  {
    "fecha": "2025-11-21",
    "precioBtc": 70400,
    "cantidadBtc": 0.00142,
    "importe": 99.97
  },
  {
    "fecha": "2025-11-21",
    "precioBtc": 70200,
    "cantidadBtc": 0.001425,
    "importe": 100.03
  },
  {
    "fecha": "2025-11-23",
    "precioBtc": 75494.4,
    "cantidadBtc": 0.002645,
    "importe": 199.68
  },
  {
    "fecha": "2025-11-24",
    "precioBtc": 76737.9,
    "cantidadBtc": 0.0065,
    "importe": 498.8
  },
  {
    "fecha": "2025-12-22",
    "precioBtc": 75792.56,
    "cantidadBtc": 0.002655,
    "importe": 201.23
  },
  {
    "fecha": "2025-12-24",
    "precioBtc": 74198.5,
    "cantidadBtc": 0.002695,
    "importe": 199.96
  },
  {
    "fecha": "2025-12-25",
    "precioBtc": 74500,
    "cantidadBtc": 0.002685,
    "importe": 200.03
  },
  {
    "fecha": "2025-12-30",
    "precioBtc": 74125,
    "cantidadBtc": 0.0003365,
    "importe": 24.94
  },
  {
    "fecha": "2025-12-30",
    "precioBtc": 74125,
    "cantidadBtc": 0.0000742,
    "importe": 5.5
  },
  {
    "fecha": "2025-12-30",
    "precioBtc": 74125,
    "cantidadBtc": 0.00006298,
    "importe": 4.67
  },
  {
    "fecha": "2025-12-30",
    "precioBtc": 74125,
    "cantidadBtc": 0.00002117,
    "importe": 1.57
  },
  {
    "fecha": "2025-12-30",
    "precioBtc": 74125,
    "cantidadBtc": 0.00002128,
    "importe": 1.58
  },
  {
    "fecha": "2025-12-30",
    "precioBtc": 74125,
    "cantidadBtc": 0.002146,
    "importe": 159.07
  },
  {
    "fecha": "2025-12-30",
    "precioBtc": 74125,
    "cantidadBtc": 0.001296,
    "importe": 96.07
  }
]
