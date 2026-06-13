import crypto from 'crypto'

// Interfaz para la configuracion de Wompi
interface WompiConfig {
  enabled: boolean
  testMode: boolean
  publicKey: string
  privateKey: string
  integrityKey: string
  eventsSecret: string
}

// Cache de configuracion (evitar consultas repetidas)
let configCache: WompiConfig | null = null
let configCacheTime = 0
const CONFIG_CACHE_TTL = 60000 // 1 minuto

// Limpiar cache (llamar cuando se actualiza config)
export function clearWompiConfigCache(): void {
  configCache = null
  configCacheTime = 0
}

// Obtener configuracion de Wompi SOLO desde variables de entorno
// Ya no usamos BD para las llaves - solo .env
function getWompiConfig(): WompiConfig {
  const now = Date.now()
  
  // Usar cache si es valido
  if (configCache && (now - configCacheTime) < CONFIG_CACHE_TTL) {
    return configCache
  }

  // Leer configuracion desde variables de entorno
  const config: WompiConfig = {
    enabled: true,
    testMode: process.env.WOMPI_SANDBOX !== 'false', // Default true (sandbox)
    publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '',
    privateKey: process.env.WOMPI_PRIVATE_KEY || '',
    integrityKey: process.env.WOMPI_INTEGRITY_KEY || '',
    eventsSecret: process.env.WOMPI_EVENTS_SECRET || '',
  }

  // Guardar en cache
  configCache = config
  configCacheTime = now
  
  return config
}

// Obtener URL base segun modo
function getApiUrl(testMode: boolean): string {
  return testMode 
    ? 'https://sandbox.wompi.co/v1'
    : 'https://production.wompi.co/v1'
}

export interface WompiCheckoutConfig {
  publicKey: string
  amountInCents: number
  currency: string
  reference: string
  signature: string
  redirectUrl: string
  customerEmail?: string
  testMode: boolean
}

// Generar firma de integridad para Wompi
export function generateWompiSignature(
  reference: string,
  amountInCents: number,
  currency: string
): string {
  const config = getWompiConfig()
  const dataToSign = `${reference}${amountInCents}${currency}${config.integrityKey}`
  return crypto.createHash('sha256').update(dataToSign).digest('hex')
}

// Verificar firma de webhook de Wompi
export function verifyWompiWebhook(
  payload: any,
  receivedChecksum: string
): boolean {
  const config = getWompiConfig()
  
  // Extraer propiedades para el checksum segun documentacion de Wompi
  const properties = payload.signature?.properties || []
  let concatenatedValues = ''
  
  for (const prop of properties) {
    const value = prop.split('.').reduce((obj: any, key: string) => obj?.[key], payload)
    concatenatedValues += value
  }
  
  concatenatedValues += payload.timestamp + config.eventsSecret
  
  const calculatedChecksum = crypto
    .createHash('sha256')
    .update(concatenatedValues)
    .digest('hex')
  
  return calculatedChecksum === receivedChecksum
}

/**
 * Genera una referencia UNICA para cada intento de pago
 * Formato: RH-{orderNumber}-{timestamp}-{random}
 * 
 * CRITICO: Wompi rechaza pagos si se reutiliza la misma referencia.
 * Cada intento de pago DEBE tener una referencia nueva.
 * NUNCA reutilizar referencias - cada intento debe ser unico.
 */
export function generateUniquePaymentReference(orderNumber: string): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  // Formato: RH-XXXXXX-{timestamp}-{random5}
  // El orderNumber ya viene con formato RH-XXXXXX
  return `${orderNumber}-${timestamp}-${random}`
}

// Obtener configuracion para el checkout widget
export function getWompiCheckoutConfig(
  orderNumber: string,
  amountInCents: number,
  currency: string = 'COP',
  customerEmail?: string
): WompiCheckoutConfig {
  const config = getWompiConfig()
  
  // CRITICO: Generar referencia UNICA para cada intento de pago
  // Wompi rechaza si se reutiliza la misma referencia
  const uniqueReference = generateUniquePaymentReference(orderNumber)
  
  const signature = generateWompiSignature(uniqueReference, amountInCents, currency)
  
  // Construir URL de redireccion - usar NEXT_PUBLIC_APP_URL o el dominio configurado
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ravenhats.store'
  // Pasar tanto la referencia unica como el numero de orden para poder vincular
  const redirectUrl = `${baseUrl}/checkout/confirmacion?ref=${uniqueReference}&order=${orderNumber}`

  return {
    publicKey: config.publicKey,
    amountInCents,
    currency,
    reference: uniqueReference,
    signature,
    redirectUrl,
    customerEmail,
    testMode: config.testMode,
  }
}

// Obtener estado de transaccion desde Wompi
export async function getWompiTransaction(transactionId: string) {
  const config = getWompiConfig()
  const apiUrl = getApiUrl(config.testMode)
  
  const response = await fetch(`${apiUrl}/transactions/${transactionId}`, {
    headers: {
      'Authorization': `Bearer ${config.privateKey}`,
    },
  })

  if (!response.ok) {
    throw new Error('Error al obtener transaccion de Wompi')
  }

  return response.json()
}

/**
 * Obtener transaccion por referencia
 * 
 * NOTA: Ahora las referencias tienen formato unico: RH-XXXXXX-{timestamp}-{random}
 * Si se pasa un order_number (RH-XXXXXX), busca la transaccion mas reciente que empiece con ese prefijo.
 * Si se pasa una referencia completa, busca esa referencia exacta.
 */
export async function getWompiTransactionByReference(reference: string) {
  const config = getWompiConfig()
  const apiUrl = getApiUrl(config.testMode)
  
  // Intentar buscar la referencia exacta primero
  const response = await fetch(
    `${apiUrl}/transactions?reference=${encodeURIComponent(reference)}`,
    {
      headers: {
        'Authorization': `Bearer ${config.privateKey}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Error al buscar transaccion de Wompi')
  }

  const data = await response.json()
  
  // Si encontramos una transaccion exacta, devolverla
  if (data.data && data.data.length > 0) {
    // Devolver la transaccion mas reciente (ordenadas por fecha desc)
    return data.data[0]
  }
  
  return null
}

// Verificar si Wompi esta configurado
export function isWompiConfigured(): boolean {
  const config = getWompiConfig()
  return config.enabled && !!config.publicKey && !!config.integrityKey
}

/**
 * Extrae el numero de orden original de una referencia unica de pago
 * La referencia tiene formato: RH-XXXXXX-{timestamp}-{random}
 * El order_number es: RH-XXXXXX
 */
export function extractOrderNumberFromReference(reference: string): string {
  // Formato: RH-XXXXXX-{timestamp}-{random}
  // El order_number son las primeras 2 partes separadas por guion
  const parts = reference.split('-')
  if (parts.length >= 2 && parts[0] === 'RH') {
    return `${parts[0]}-${parts[1]}`
  }
  // Si no tiene el formato esperado, devolver la referencia completa
  return reference
}
