import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'

// Verify admin session
async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

// Verificar si Wompi esta configurado desde variables de entorno
function getWompiStatus() {
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || ''
  const integrityKey = process.env.WOMPI_INTEGRITY_KEY || ''
  const sandbox = process.env.WOMPI_SANDBOX !== 'false'
  
  return {
    configured: !!(publicKey && integrityKey),
    sandbox,
  }
}

// Default config values
const defaultConfig = {
  store: {
    name: 'RavenHats',
    phone: '+1 341 213 3624',
    instagram: '@ravenhats.store',
    tiktok: '@ravenhats.co',
  },
  shipping: {
    cost: '15000',
    codEnabled: true,
    codFee: '5000',
    showBanner: true,
  },
  wompi: {
    enabled: true,
    configured: false,
    sandbox: true,
  },
  notifications: {
    orders: true,
    lowStock: true,
    lowStockThreshold: '5',
  },
}

export async function GET() {
  const isValid = await verifySession()
  
  if (!isValid) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Obtener estado de Wompi desde .env
  const wompiStatus = getWompiStatus()

  try {
    // Load all config from database
    const results = await query<any[]>('SELECT config_key, config_value FROM store_config')
    
    const config: Record<string, unknown> = { ...defaultConfig }
    
    for (const row of results) {
      if (row.config_value) {
        try {
          // MySQL JSON type returns object directly, string needs parsing
          const value = typeof row.config_value === 'string' 
            ? JSON.parse(row.config_value) 
            : row.config_value
          config[row.config_key] = value
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Agregar estado de Wompi desde .env (no desde BD)
    const wompiConfig = config.wompi as Record<string, unknown> || {}
    config.wompi = {
      enabled: wompiConfig.enabled ?? true,
      configured: wompiStatus.configured,
      sandbox: wompiStatus.sandbox,
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error loading config:', error)
    // Return defaults with Wompi status if DB fails
    return NextResponse.json({
      ...defaultConfig,
      wompi: {
        enabled: true,
        configured: wompiStatus.configured,
        sandbox: wompiStatus.sandbox,
      }
    })
  }
}

export async function POST(request: NextRequest) {
  const isValid = await verifySession()
  
  if (!isValid) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    // Save each config section to database
    const configSections = ['store', 'shipping', 'wompi', 'notifications']
    
    for (const section of configSections) {
      if (data[section] !== undefined) {
        const configValue = JSON.stringify(data[section])
        
        // Upsert config - use CAST for JSON column compatibility
        await query(
          `INSERT INTO store_config (config_key, config_value) 
           VALUES (?, CAST(? AS JSON)) 
           ON DUPLICATE KEY UPDATE config_value = CAST(VALUES(config_value) AS JSON)`,
          [section, configValue]
        )
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving config:', error)
    return NextResponse.json({ error: 'Error al guardar configuracion' }, { status: 500 })
  }
}
