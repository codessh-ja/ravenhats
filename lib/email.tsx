// ============================================================
// SISTEMA CENTRALIZADO DE EMAILS - RavenHats
// ============================================================
// 
// REGLAS CRITICAS:
// 1. TODOS los emails deben pasar por sendOrderEmail()
// 2. NO enviar emails directamente desde otros lugares
// 3. Siempre verificar flags de duplicados antes de enviar
// 4. Loggear TODOS los envios y errores
//
// TIPOS DE EMAIL SOPORTADOS:
// - order_confirmed: Pago confirmado (Wompi aprobado)
// - order_preparing: Pedido en preparacion
// - order_shipped: Pedido enviado (con tracking)
// - order_delivered: Pedido entregado
// - order_cod_confirmed: Pedido COD confirmado
// ============================================================

import { BUSINESS } from './constants'

// Tipos de email para el sistema centralizado
export type OrderEmailType = 
  | 'order_confirmed' 
  | 'order_preparing' 
  | 'order_shipped' 
  | 'order_delivered'
  | 'order_cod_confirmed'
  | 'order_cancelled'

export interface OrderEmailData {
  orderNumber: string
  customerEmail: string
  customerName: string
  total: number
  items?: { name: string; quantity: number; price: number; image?: string | null }[]
  trackingNumber?: string
  trackingUrl?: string
  shippingAddress?: string
  shippingCity?: string
  shippingDepartment?: string
  paymentMethod?: string
  cancellationReason?: string
}

/**
 * PUNTO DE ENTRADA UNICO PARA EMAILS DE ORDENES
 * 
 * Esta funcion es el UNICO lugar desde donde se deben enviar emails
 * relacionados con ordenes. Maneja:
 * - Logging completo
 * - Validacion de datos
 * - Seleccion de template correcto
 * 
 * Los flags de duplicados se manejan en el nivel del llamador (webhook, admin)
 * para permitir re-envios manuales cuando sea necesario.
 */
export async function sendOrderEmail(
  type: OrderEmailType, 
  data: OrderEmailData
): Promise<{ success: boolean; error?: string }> {
  const timestamp = new Date().toISOString()
  
  console.log(`[Email System] ${timestamp} - Iniciando envio:`, {
    type,
    orderNumber: data.orderNumber,
    customerEmail: data.customerEmail
  })

  // Validacion basica
  if (!data.customerEmail || !data.orderNumber) {
    console.error(`[Email System] ${timestamp} - DATOS FALTANTES:`, {
      type,
      orderNumber: data.orderNumber,
      customerEmail: data.customerEmail
    })
    return { success: false, error: 'Datos de email incompletos' }
  }

  try {
    let result: { success: boolean; error?: string }

    switch (type) {
      case 'order_confirmed':
        result = await sendOrderConfirmationEmail({
          orderNumber: data.orderNumber,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          total: data.total,
          items: data.items || [],
          paymentMethod: data.paymentMethod || 'WOMPI'
        })
        break

      case 'order_preparing':
        result = await sendOrderPreparingEmail({
          orderNumber: data.orderNumber,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
        })
        break

      case 'order_shipped':
        if (!data.trackingNumber) {
          console.error(`[Email System] ${timestamp} - Tracking requerido para email de envio`)
          return { success: false, error: 'Numero de tracking requerido' }
        }
        result = await sendShippingEmail({
          orderNumber: data.orderNumber,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          trackingNumber: data.trackingNumber,
          trackingUrl: data.trackingUrl,
        })
        break

      case 'order_delivered':
        result = await sendDeliveredEmail({
          orderNumber: data.orderNumber,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
        })
        break

      case 'order_cod_confirmed':
        result = await sendCODOrderConfirmationEmail({
          orderNumber: data.orderNumber,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          total: data.total,
          items: data.items || [],
          shippingAddress: data.shippingAddress || '',
          shippingCity: data.shippingCity || '',
          shippingDepartment: data.shippingDepartment || '',
        })
        break

      case 'order_cancelled':
        result = await sendOrderCancelledEmail({
          orderNumber: data.orderNumber,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          total: data.total,
          cancellationReason: data.cancellationReason,
        })
        break

      default:
        console.error(`[Email System] ${timestamp} - Tipo de email no reconocido: ${type}`)
        return { success: false, error: `Tipo de email no reconocido: ${type}` }
    }

    // Log resultado
    if (result.success) {
      console.log(`[Email System] ${timestamp} - EMAIL ENVIADO EXITOSAMENTE:`, {
        type,
        orderNumber: data.orderNumber,
        to: data.customerEmail
      })
    } else {
      console.error(`[Email System] ${timestamp} - EMAIL FALLIDO:`, {
        type,
        orderNumber: data.orderNumber,
        error: result.error
      })
    }

    return result
  } catch (error: any) {
    console.error(`[Email System] ${timestamp} - ERROR CRITICO:`, {
      type,
      orderNumber: data.orderNumber,
      error: error?.message || error
    })
    return { success: false, error: error?.message || 'Error desconocido' }
  }
}

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// Funcion generica para enviar emails
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY no configurada - emails deshabilitados')
    return { success: false, error: 'Email no configurado' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `RavenHats <${process.env.RESEND_FROM_EMAIL || 'noreply@ravenhats.store'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      console.error('Error enviando email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error enviando email:', error)
    return { success: false, error: 'Error de conexion' }
  }
}

// Template base para emails - PREMIUM MINIMAL DESIGN
function emailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>RavenHats</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b0b0b; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0b; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Logo Header -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-bottom: 0;">
          <tr>
            <td style="padding: 32px 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">RAVENHATS</h1>
            </td>
          </tr>
        </table>
        
        <!-- Main Content Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 0;">
              ${content}
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 40px;">
          <tr>
            <td style="text-align: center; padding: 0 24px;">
              <p style="margin: 0 0 8px 0; color: #737373; font-size: 13px;">
                Gorras Goorin Bros 100% Originales en Colombia
              </p>
              <p style="margin: 0 0 8px 0;">
                <a href="https://${BUSINESS.domain}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px;">${BUSINESS.domain}</a>
              </p>
              <p style="margin: 0 0 6px 0; color: #525252; font-size: 12px;">
                WhatsApp: <a href="${BUSINESS.whatsappLink}" style="color: #25d366; text-decoration: none;">+${BUSINESS.whatsapp}</a>
              </p>
              <p style="margin: 0; color: #525252; font-size: 11px;">
                <a href="${BUSINESS.instagram}" style="color: #525252; text-decoration: none;">Instagram</a>
                &nbsp;·&nbsp;
                <a href="${BUSINESS.tiktok}" style="color: #525252; text-decoration: none;">TikTok</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// Email de confirmacion de pedido - PREMIUM MINIMAL DESIGN
export async function sendOrderConfirmationEmail(order: {
  orderNumber: string
  customerEmail: string
  customerName: string
  total: number
  items: { name: string; quantity: number; price: number; image?: string | null }[]
  paymentMethod: string
}) {
  const validItems = (order.items || []).filter(item => item && item.name)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ravenhats.store'
  
  const itemsHtml = validItems.map(item => {
    const imageUrl = item.image 
      ? (item.image.startsWith('http') ? item.image : `${baseUrl}${item.image}`)
      : null
    
    return `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #f0f0f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 72px; vertical-align: top;">
              ${imageUrl 
                ? `<img src="${imageUrl}" alt="${item.name}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px;" />`
                : `<div style="width: 64px; height: 64px; background-color: #0b0b0b; border-radius: 8px;"></div>`
              }
            </td>
            <td style="padding-left: 16px; vertical-align: middle;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #0b0b0b; font-size: 15px;">${item.name}</p>
              <p style="margin: 0; color: #737373; font-size: 13px;">Cantidad: ${item.quantity}</p>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <p style="margin: 0; color: #0b0b0b; font-size: 15px; font-weight: 600;">$${(item.price || 0).toLocaleString('es-CO')}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `}).join('')
  
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Pago confirmado
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Estamos preparando tu pedido
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <!-- Greeting -->
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${order.customerName}</strong>,<br><br>
        Gracias por tu compra. Ya estamos preparando tu pedido.
      </p>

      <!-- Order Info Card -->
      <div style="background-color: #0b0b0b; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Pedido</p>
              <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;">${order.orderNumber}</p>
            </td>
            <td style="text-align: right;">
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total</p>
              <p style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">$${order.total.toLocaleString('es-CO')}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Products Section -->
      ${validItems.length > 0 ? `
      <div style="margin-bottom: 32px;">
        <h2 style="color: #0b0b0b; margin: 0 0 16px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Tu pedido</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
        </table>
      </div>
      ` : ''}

      <!-- Total Summary -->
      <div style="border-top: 1px solid #e5e5e5; padding-top: 16px; margin-bottom: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color: #0b0b0b; font-size: 16px; font-weight: 600;">Total</td>
            <td style="text-align: right; color: #0b0b0b; font-size: 18px; font-weight: 700;">$${order.total.toLocaleString('es-CO')}</td>
          </tr>
        </table>
      </div>

      <!-- Next Steps -->
      <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <h2 style="color: #0b0b0b; margin: 0 0 20px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Proximos pasos</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #0b0b0b; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 12px; font-weight: 600;">1</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #0b0b0b; font-weight: 600; font-size: 14px;">Preparacion <span style="color: #737373; font-weight: 400;">- 1-2 dias</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #d4d4d4; border-radius: 50%; text-align: center; line-height: 24px; color: #737373; font-size: 12px; font-weight: 600;">2</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #525252; font-size: 14px;">Envio <span style="color: #a1a1aa;">- Recibiras tu guia</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #d4d4d4; border-radius: 50%; text-align: center; line-height: 24px; color: #737373; font-size: 12px; font-weight: 600;">3</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #525252; font-size: 14px;">Entrega <span style="color: #a1a1aa;">- 3-5 dias</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="margin-bottom: 32px;">
        <a href="https://${BUSINESS.domain}/cuenta/pedidos" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Ver mi pedido
        </a>
      </div>

      <!-- WhatsApp Help -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Preguntas? <a href="https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola! Consulta sobre mi pedido ${order.orderNumber}`)}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">Escribenos por WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: order.customerEmail,
    subject: `🧢 Tu gorra está confirmada — ${order.orderNumber}`,
    html: emailTemplate(content),
  })
}

// Email de pedido en preparacion - PREMIUM MINIMAL DESIGN
export async function sendOrderPreparingEmail(order: {
  orderNumber: string
  customerEmail: string
  customerName: string
}) {
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        En preparacion
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Estamos empacando tu pedido
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${order.customerName}</strong>,<br><br>
        Tu pedido ya esta siendo preparado por nuestro equipo.
      </p>

      <!-- Order Number Card -->
      <div style="background-color: #0b0b0b; padding: 24px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
        <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Pedido</p>
        <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;">${order.orderNumber}</p>
      </div>

      <!-- Progress Timeline -->
      <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <h2 style="color: #0b0b0b; margin: 0 0 20px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Estado</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #0b0b0b; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 12px;">&#10003;</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #0b0b0b; font-weight: 600; font-size: 14px;">Pago confirmado</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #0b0b0b; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 10px;">&#9679;</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #0b0b0b; font-weight: 600; font-size: 14px;">En preparacion</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #d4d4d4; border-radius: 50%; text-align: center; line-height: 24px; color: #737373; font-size: 12px; font-weight: 600;">3</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #737373; font-size: 14px;">Envio</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #d4d4d4; border-radius: 50%; text-align: center; line-height: 24px; color: #737373; font-size: 12px; font-weight: 600;">4</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #737373; font-size: 14px;">Entrega</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Info Notice -->
      <div style="background-color: #fafafa; padding: 16px 20px; border-radius: 8px; margin-bottom: 32px;">
        <p style="margin: 0; color: #525252; font-size: 14px; line-height: 1.5;">
          Te enviaremos un email con tu numero de guia cuando despachemos tu pedido.
        </p>
      </div>

      <!-- CTA -->
      <div style="margin-bottom: 32px;">
        <a href="https://${BUSINESS.domain}/cuenta/pedidos" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Ver mi pedido
        </a>
      </div>

      <!-- WhatsApp -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Preguntas? <a href="https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola! Consulta sobre mi pedido ${order.orderNumber}`)}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">Escribenos por WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: order.customerEmail,
    subject: `📦 Preparando tu pedido — ${order.orderNumber}`,
    html: emailTemplate(content),
  })
}

// Email de recordatorio de pago - PREMIUM MINIMAL DESIGN
export async function sendPaymentReminderEmail(order: {
  orderNumber: string
  customerEmail: string
  customerName: string
  total: number
  createdAt: Date
}) {
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Tu pedido te espera
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Ya casi es tuyo
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${order.customerName}</strong>,<br><br>
        Tu pedido esta esperando. No dejes escapar tus gorras.
      </p>

      <!-- Order Card -->
      <div style="background-color: #0b0b0b; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Pedido</p>
              <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;">${order.orderNumber}</p>
            </td>
            <td style="text-align: right;">
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total</p>
              <p style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">$${order.total.toLocaleString('es-CO')}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Urgency Notice -->
      <div style="background-color: #fafafa; padding: 16px 20px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
        <p style="margin: 0; color: #525252; font-size: 14px;">
          Los pedidos sin pago se cancelan despues de 48h
        </p>
      </div>

      <!-- CTA -->
      <div style="margin-bottom: 32px;">
        <a href="https://${BUSINESS.domain}/checkout/pagar/${order.orderNumber}" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Completar mi compra
        </a>
      </div>

      <!-- Help -->
      <p style="color: #a1a1aa; font-size: 13px; margin: 0; text-align: center;">
        Si ya pagaste, ignora este correo
      </p>
    </div>
  `

  return sendEmail({
    to: order.customerEmail,
    subject: `🚚 Tu gorra ya va en camino — ${order.orderNumber}`,
    html: emailTemplate(content),
  })
}

// Email de confirmacion de pedido contra entrega (COD) - PREMIUM MINIMAL DESIGN
export async function sendCODOrderConfirmationEmail(order: {
  orderNumber: string
  customerEmail: string
  customerName: string
  total: number
  items: { name: string; quantity: number; price: number; image?: string | null }[]
  shippingAddress: string
  shippingCity: string
  shippingDepartment: string
}) {
  const validItems = (order.items || []).filter(item => item && item.name)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ravenhats.store'
  
  const itemsHtml = validItems.map(item => {
    const imageUrl = item.image 
      ? (item.image.startsWith('http') ? item.image : `${baseUrl}${item.image}`)
      : null
    
    return `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #f0f0f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 72px; vertical-align: top;">
              ${imageUrl 
                ? `<img src="${imageUrl}" alt="${item.name}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px;" />`
                : `<div style="width: 64px; height: 64px; background-color: #0b0b0b; border-radius: 8px;"></div>`
              }
            </td>
            <td style="padding-left: 16px; vertical-align: middle;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #0b0b0b; font-size: 15px;">${item.name}</p>
              <p style="margin: 0; color: #737373; font-size: 13px;">Cantidad: ${item.quantity}</p>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <p style="margin: 0; color: #0b0b0b; font-size: 15px; font-weight: 600;">$${(item.price || 0).toLocaleString('es-CO')}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `}).join('')

  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Pedido confirmado
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Pago contra entrega
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${order.customerName}</strong>,<br><br>
        Tu pedido esta confirmado. Ten el dinero listo para pagar al recibir.
      </p>

      <!-- Order Info Card -->
      <div style="background-color: #0b0b0b; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Pedido</p>
              <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;">${order.orderNumber}</p>
            </td>
            <td style="text-align: right;">
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total a pagar</p>
              <p style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">$${order.total.toLocaleString('es-CO')}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Products Section -->
      ${validItems.length > 0 ? `
      <div style="margin-bottom: 32px;">
        <h2 style="color: #0b0b0b; margin: 0 0 16px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Tu pedido</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
        </table>
      </div>
      ` : ''}

      <!-- Total Summary -->
      <div style="border-top: 1px solid #e5e5e5; padding-top: 16px; margin-bottom: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color: #0b0b0b; font-size: 16px; font-weight: 600;">Total a pagar</td>
            <td style="text-align: right; color: #0b0b0b; font-size: 18px; font-weight: 700;">$${order.total.toLocaleString('es-CO')}</td>
          </tr>
        </table>
      </div>

      <!-- Shipping Address -->
      <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #0b0b0b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
          Direccion de entrega
        </h3>
        <p style="margin: 0; color: #525252; font-size: 14px; line-height: 1.5;">
          ${order.shippingAddress}<br>
          ${order.shippingCity}, ${order.shippingDepartment}
        </p>
      </div>

      <!-- COD Notice -->
      <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
        <p style="margin: 0; color: #525252; font-size: 14px; line-height: 1.5;">
          <strong style="color: #0b0b0b;">Ten listo tu pago:</strong> Deberas pagar $${order.total.toLocaleString('es-CO')} en efectivo al recibir. El transportador no maneja cambio grande.
        </p>
      </div>

      <!-- Next Steps -->
      <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <h2 style="color: #0b0b0b; margin: 0 0 20px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Proximos pasos</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #0b0b0b; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 12px; font-weight: 600;">1</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #0b0b0b; font-weight: 600; font-size: 14px;">Preparacion <span style="color: #737373; font-weight: 400;">- 1-2 dias</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #d4d4d4; border-radius: 50%; text-align: center; line-height: 24px; color: #737373; font-size: 12px; font-weight: 600;">2</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #525252; font-size: 14px;">Envio <span style="color: #a1a1aa;">- Recibiras tu guia</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #d4d4d4; border-radius: 50%; text-align: center; line-height: 24px; color: #737373; font-size: 12px; font-weight: 600;">3</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #525252; font-size: 14px;">Entrega y pago</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="margin-bottom: 32px;">
        <a href="https://${BUSINESS.domain}/cuenta/pedidos" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Ver mi pedido
        </a>
      </div>

      <!-- WhatsApp -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Preguntas? <a href="https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola! Consulta sobre mi pedido ${order.orderNumber}`)}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">Escribenos por WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: order.customerEmail,
    subject: `🧢 Pedido recibido — pagas cuando llegue · ${order.orderNumber}`,
    html: emailTemplate(content),
  })
}

// Email de pedido enviado - PREMIUM MINIMAL DESIGN
export async function sendShippingEmail(order: {
  orderNumber: string
  customerEmail: string
  customerName: string
  trackingNumber: string
  trackingUrl?: string
}) {
  const today = new Date()
  const minDate = new Date(today)
  const maxDate = new Date(today)
  minDate.setDate(minDate.getDate() + 3)
  maxDate.setDate(maxDate.getDate() + 5)
  
  const formatDate = (d: Date) => d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Va en camino
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Tu pedido esta viajando hacia ti
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${order.customerName}</strong>,<br><br>
        Tu pedido ya esta en camino. Ya casi es tuyo.
      </p>

      <!-- Tracking Card -->
      <div style="background-color: #0b0b0b; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #262626;">
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Numero de guia</p>
              <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;">${order.trackingNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-top: 16px;">
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Entrega estimada</p>
              <p style="margin: 0; color: #ffffff; font-size: 14px;">
                ${formatDate(minDate)} - ${formatDate(maxDate)}
              </p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Track CTA -->
      ${order.trackingUrl ? `
      <div style="margin-bottom: 32px;">
        <a href="${order.trackingUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Seguir envio
        </a>
      </div>
      ` : ''}

      <!-- Delivery Tips -->
      <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #0b0b0b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Para tu entrega</h3>
        <ul style="margin: 0; padding-left: 20px; color: #525252; font-size: 14px; line-height: 1.8;">
          <li>La transportadora te llamara antes de entregar</li>
          <li>Ten tu documento de identidad a la mano</li>
          <li>Si no estas, reprogramaran la entrega</li>
        </ul>
      </div>

      <!-- WhatsApp -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Tambien te compartimos la guia por <a href="https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola! Consulta sobre mi envio ${order.orderNumber}`)}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: order.customerEmail,
    subject: `🚚 Tu Goorin Bros sale hoy — ${order.orderNumber}`,
    html: emailTemplate(content),
  })
}

// Email de pedido entregado - PREMIUM MINIMAL DESIGN
export async function sendDeliveredEmail(order: {
  orderNumber: string
  customerEmail: string
  customerName: string
}) {
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Ya llego tu pedido
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Disfruta tu nueva gorra
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${order.customerName}</strong>,<br><br>
        Tu pedido ha sido entregado. Esperamos que ames tu nueva gorra.
      </p>

      <!-- Order Number Card -->
      <div style="background-color: #0b0b0b; padding: 24px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
        <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Pedido</p>
        <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;">${order.orderNumber}</p>
      </div>

      <!-- Thank You Section -->
      <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
        <h2 style="color: #0b0b0b; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Gracias por elegirnos</h2>
        <p style="color: #737373; margin: 0; font-size: 14px;">Tu confianza nos impulsa a seguir creando</p>
      </div>

      <!-- Share Section -->
      <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 15px; color: #0b0b0b; font-weight: 600;">Te gusto tu gorra?</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #737373;">Comparte tu estilo con el mundo</p>
        <a href="https://www.instagram.com/ravenhats.store" style="color: #0b0b0b; text-decoration: none; font-weight: 600; font-size: 14px;">
          Tagueanos en Instagram @ravenhats.store
        </a>
      </div>

      <!-- Shop Again CTA -->
      <div style="margin-bottom: 32px;">
        <a href="https://${BUSINESS.domain}/tienda" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Explorar mas gorras
        </a>
      </div>

      <!-- WhatsApp -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Algun problema? <a href="https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola! Necesito ayuda con mi pedido ${order.orderNumber}`)}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">Escribenos por WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: order.customerEmail,
    subject: `✅ Tu Goorin Bros llegó — ¿Cómo te quedó? · ${order.orderNumber}`,
    html: emailTemplate(content),
  })
}

// Email de pedido cancelado - PREMIUM MINIMAL DESIGN
export async function sendOrderCancelledEmail(order: {
  orderNumber: string
  customerEmail: string
  customerName: string
  total: number
  cancellationReason?: string
}) {
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Pedido cancelado
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Lamentamos que esto no funcionara
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${order.customerName}</strong>,<br><br>
        Tu pedido ha sido cancelado.
        ${order.cancellationReason ? `<br><br><strong style="color: #0b0b0b;">Motivo:</strong> ${order.cancellationReason}` : ''}
      </p>

      <!-- Order Info Card -->
      <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Pedido</p>
              <p style="margin: 0; color: #a1a1aa; font-size: 20px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;">${order.orderNumber}</p>
            </td>
            <td style="text-align: right;">
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Monto</p>
              <p style="margin: 0; color: #a1a1aa; font-size: 22px; font-weight: 700; text-decoration: line-through;">$${order.total.toLocaleString('es-CO')}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Refund Notice -->
      <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #0b0b0b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
          Sobre tu reembolso
        </h3>
        <p style="margin: 0; color: #525252; font-size: 14px; line-height: 1.5;">
          Si ya realizaste un pago, el reembolso se procesara automaticamente en 5-10 dias habiles al mismo metodo de pago.
        </p>
      </div>

      <!-- New Order CTA -->
      <div style="margin-bottom: 32px;">
        <a href="https://${BUSINESS.domain}/tienda" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Ver otras gorras
        </a>
      </div>

      <!-- WhatsApp -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Preguntas? <a href="https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola! Consulta sobre mi pedido cancelado ${order.orderNumber}`)}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">Escribenos por WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: order.customerEmail,
    subject: `Pedido cancelado — ${order.orderNumber}`,
    html: emailTemplate(content),
  })
}

// Email de bienvenida al registrarse - PREMIUM MINIMAL DESIGN
export async function sendWelcomeEmail(customer: {
  email: string
  firstName: string
}) {
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Bienvenido, ${customer.firstName}
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Tu cuenta esta lista
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Gracias por registrarte. Ahora puedes disfrutar de una experiencia de compra mas rapida y personalizada.
      </p>

      <!-- Benefits Section -->
      <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <h2 style="color: #0b0b0b; margin: 0 0 20px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Tu cuenta incluye</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #0b0b0b; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 12px;">&#10003;</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #0b0b0b; font-size: 14px;">Seguimiento de pedidos en tiempo real</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #0b0b0b; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 12px;">&#10003;</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #0b0b0b; font-size: 14px;">Checkout express con tus datos guardados</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #0b0b0b; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 12px;">&#10003;</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #0b0b0b; font-size: 14px;">Acceso anticipado a nuevos drops</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 32px; vertical-align: top;">
                    <div style="width: 24px; height: 24px; background-color: #0b0b0b; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 12px;">&#10003;</div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #0b0b0b; font-size: 14px;">Promociones y descuentos exclusivos</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="margin-bottom: 32px;">
        <a href="https://${BUSINESS.domain}/tienda" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Explorar la coleccion
        </a>
      </div>

      <!-- WhatsApp -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Preguntas? <a href="https://wa.me/${BUSINESS.whatsapp}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">Escribenos por WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: customer.email,
    subject: `🧢 Bienvenido a RavenHats, ${customer.firstName}`,
    html: emailTemplate(content),
  })
}

// Email con codigo de recuperacion de contrasena - PREMIUM MINIMAL DESIGN
export async function sendPasswordResetCodeEmail(data: {
  email: string
  firstName: string
  code: string
}) {
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Recupera tu contrasena
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Usa este codigo para restablecer tu acceso
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px; text-align: center;">
        Hola <strong style="color: #0b0b0b;">${data.firstName}</strong>, ingresa este codigo en la app:
      </p>

      <!-- Code Card - Main Visual Element -->
      <div style="background-color: #0b0b0b; padding: 40px 32px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
        <p style="margin: 0 0 12px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Codigo de verificacion</p>
        <p style="margin: 0; color: #ffffff; font-size: 56px; font-weight: 700; letter-spacing: 12px; font-family: 'SF Mono', Monaco, monospace;">${data.code}</p>
      </div>

      <!-- Expiry Notice -->
      <div style="background-color: #fafafa; padding: 16px 20px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
        <p style="margin: 0; color: #525252; font-size: 14px; font-weight: 600;">
          Este codigo expira en 15 minutos
        </p>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
        <p style="margin: 0; color: #737373; font-size: 13px; line-height: 1.5; text-align: center;">
          Si no solicitaste este cambio, puedes ignorar este correo.<br>
          Tu cuenta permanece segura.
        </p>
      </div>

      <!-- WhatsApp -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Problemas? <a href="https://wa.me/${BUSINESS.whatsapp}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">Escribenos por WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: data.email,
    subject: `Tu código de verificación es ${data.code} — RavenHats`,
    html: emailTemplate(content),
  })
}

// Email de confirmacion de cambio de contrasena - PREMIUM MINIMAL DESIGN
export async function sendPasswordChangedEmail(data: {
  email: string
  firstName: string
}) {
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Contrasena actualizada
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Tu cuenta esta segura
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${data.firstName}</strong>,<br><br>
        Tu contrasena ha sido actualizada exitosamente. Ya puedes iniciar sesion con tu nueva contrasena.
      </p>

      <!-- Security Tip -->
      <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; color: #525252; font-size: 14px; line-height: 1.5;">
          <strong style="color: #0b0b0b;">Tip de seguridad:</strong> Usa una contrasena unica que no uses en otros sitios.
        </p>
      </div>

      <!-- Warning -->
      <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
        <p style="margin: 0; color: #525252; font-size: 14px; line-height: 1.5;">
          Si no realizaste este cambio, <a href="https://wa.me/${BUSINESS.whatsapp}" style="color: #0b0b0b; font-weight: 600; text-decoration: none;">contactanos inmediatamente</a>.
        </p>
      </div>

      <!-- CTA -->
      <div style="margin-bottom: 32px;">
        <a href="https://${BUSINESS.domain}/login" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Iniciar sesion
        </a>
      </div>

      <!-- WhatsApp -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Preguntas? <a href="https://wa.me/${BUSINESS.whatsapp}" style="color: #0b0b0b; text-decoration: none; font-weight: 600;">Escribenos por WhatsApp</a>
      </p>
    </div>
  `

  return sendEmail({
    to: data.email,
    subject: `Contraseña actualizada — RavenHats`,
    html: emailTemplate(content),
  })
}

// Email de pago pendiente (recordatorio) - PREMIUM MINIMAL DESIGN
export async function sendPendingPaymentEmail(order: {
  orderNumber: string
  customerEmail: string
  customerName: string
  total: number
  paymentUrl: string
}) {
  const content = `
    <!-- Hero Section -->
    <div style="background-color: #0b0b0b; padding: 48px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        Tu pago esta pendiente
      </h1>
      <p style="color: #737373; margin: 0; font-size: 15px;">
        Completa tu compra
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; margin: 0 0 32px 0; line-height: 1.7; font-size: 15px;">
        Hola <strong style="color: #0b0b0b;">${order.customerName}</strong>,<br><br>
        Tu pedido esta esperando el pago. Completa tu compra para que podamos enviarte tus gorras.
      </p>

      <!-- Order Info Card -->
      <div style="background-color: #0b0b0b; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Pedido</p>
              <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;">${order.orderNumber}</p>
            </td>
            <td style="text-align: right;">
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total</p>
              <p style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">$${order.total.toLocaleString('es-CO')}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Urgency Notice -->
      <div style="background-color: #fafafa; padding: 16px 20px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
        <p style="margin: 0; color: #525252; font-size: 14px;">
          Los pedidos sin pago se cancelan despues de 48h
        </p>
      </div>

      <!-- CTA -->
      <div style="margin-bottom: 32px;">
        <a href="${order.paymentUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #0b0b0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
          Completar pago
        </a>
      </div>

      <!-- Help -->
      <p style="color: #737373; font-size: 13px; margin: 0; text-align: center;">
        Si ya realizaste el pago, puedes ignorar este correo
      </p>
    </div>
  `

  return sendEmail({
    to: order.customerEmail,
    subject: `⏳ Tienes un pedido esperando pago — ${order.orderNumber}`,
    html: emailTemplate(content),
  })
}

// ============================================================
// ADMIN NOTIFICATION EMAILS
// ============================================================

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ravenhats.store'

// Email de notificacion al admin cuando llega un nuevo pedido
export async function sendAdminNewOrderEmail(order: {
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string
  total: number
  paymentMethod: string
  productNames: string
  shippingCity: string
  shippingDepartment: string
}) {
  const isCOD = order.paymentMethod === 'COD' || order.paymentMethod === 'cod'

  const content = `
    <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
      Nuevo Pedido Recibido - ${order.orderNumber}
    </h2>

    <div style="background-color: ${isCOD ? '#dbeafe' : '#ecfdf5'}; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid ${isCOD ? '#3b82f6' : '#10b981'};">
      <p style="margin: 0; color: ${isCOD ? '#1d4ed8' : '#059669'}; font-weight: bold; font-size: 16px;">
        ${isCOD ? 'CONTRA ENTREGA - Contactar al cliente' : 'PAGO ONLINE - Verificar pago en Wompi'}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
          <span style="color: #71717a;">Cliente:</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: 500;">
          ${order.customerName}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
          <span style="color: #71717a;">Telefono:</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: 500;">
          <a href="https://wa.me/${order.customerPhone?.replace(/\D/g, '')}" style="color: #059669; text-decoration: none;">
            ${order.customerPhone}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
          <span style="color: #71717a;">Email:</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
          ${order.customerEmail}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
          <span style="color: #71717a;">Destino:</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
          ${order.shippingCity}, ${order.shippingDepartment}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
          <span style="color: #71717a;">Productos:</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: 500;">
          ${order.productNames}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
          <span style="color: #71717a;">Metodo:</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: bold; color: ${isCOD ? '#1d4ed8' : '#059669'};">
          ${isCOD ? 'Contra Entrega' : 'Wompi (Online)'}
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 0;">
          <span style="color: #71717a; font-size: 16px;">Total:</span>
        </td>
        <td style="padding: 16px 0; text-align: right; font-weight: bold; font-size: 24px; color: #18181b;">
          $${order.total.toLocaleString('es-CO')}
        </td>
      </tr>
    </table>

    ${isCOD ? `
    <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 8px 0; color: #92400e; font-weight: bold;">Pasos para COD:</p>
      <ol style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
        <li>Contactar al cliente para confirmar pedido</li>
        <li>Confirmar disponibilidad de producto</li>
        <li>Despachar pedido</li>
        <li>Marcar como entregado y cobrado cuando se reciba el pago</li>
      </ol>
    </div>
    ` : `
    <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        El pago sera verificado automaticamente por Wompi. Cuando se confirme, recibiras notificacion para despachar.
      </p>
    </div>
    `}

    <div style="text-align: center;">
      <a href="https://${BUSINESS.domain}/admin/pedidos" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        Ver en Panel Admin
      </a>
    </div>
  `

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `${isCOD ? '[COD]' : '[ONLINE]'} Nuevo pedido ${order.orderNumber} - $${order.total.toLocaleString('es-CO')}`,
    html: emailTemplate(content),
  })
}

// Email al admin cuando un pedido esta listo para despachar
export async function sendAdminDispatchEmail(order: {
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string
  shippingAddress: string
  shippingCity: string
  shippingDepartment: string
  total: number
  paymentMethod: string
  productNames: string
}) {
  const content = `
    <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
      DESPACHAR - Pedido ${order.orderNumber}
    </h2>

    <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #10b981;">
      <p style="margin: 0; color: #059669; font-weight: bold; font-size: 16px;">
        Pago confirmado - Listo para despachar
      </p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
      <h3 style="margin: 0 0 12px 0; color: #18181b; font-size: 16px;">Datos de envio:</h3>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 6px 0; color: #71717a; width: 120px;">Cliente:</td>
          <td style="padding: 6px 0; font-weight: 500;">${order.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a;">Telefono:</td>
          <td style="padding: 6px 0;">
            <a href="https://wa.me/${order.customerPhone?.replace(/\D/g, '')}" style="color: #059669; text-decoration: none; font-weight: 500;">
              ${order.customerPhone}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a;">Direccion:</td>
          <td style="padding: 6px 0; font-weight: 500;">${order.shippingAddress}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a;">Ciudad:</td>
          <td style="padding: 6px 0; font-weight: 500;">${order.shippingCity}, ${order.shippingDepartment}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a;">Productos:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #18181b;">${order.productNames}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a;">Metodo pago:</td>
          <td style="padding: 6px 0;">${order.paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #71717a; font-size: 16px;">Total:</td>
          <td style="padding: 12px 0; font-weight: bold; font-size: 20px; color: #059669;">$${order.total.toLocaleString('es-CO')}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Recuerda:</strong> Una vez despachado, agrega el numero de guia en el panel admin para notificar al cliente.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="https://${BUSINESS.domain}/admin/pedidos" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        Ir al Panel de Pedidos
      </a>
    </div>
  `

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `DESPACHAR - Pedido ${order.orderNumber} - ${order.customerName} - ${order.shippingCity}`,
    html: emailTemplate(content),
  })
}

// ============================================================
// EMAIL DATA CONTRACTS - FOR EXTERNAL DESIGN SYSTEM
// ============================================================
// These interfaces define the structured payloads for each email type.
// Use these contracts when integrating with an external email design system.
// ============================================================

export interface EmailPayloadOrderConfirmed {
  type: 'order_confirmed'
  data: {
    orderNumber: string
    customerName: string
    customerEmail: string
    items: Array<{
      name: string
      image: string | null
      quantity: number
      price: number
    }>
    subtotal: number
    shipping: number
    total: number
    paidAmount: number
    paymentMethod: 'WOMPI' | 'COD' | string
    statusMessage: string
    nextSteps: Array<{
      step: number
      title: string
      description: string
      completed: boolean
    }>
    ctaUrl: string
    ctaText: string
  }
}

export interface EmailPayloadOrderPreparing {
  type: 'order_preparing'
  data: {
    orderNumber: string
    customerName: string
    customerEmail: string
    statusMessage: string
    estimatedShipDate: string
    ctaUrl: string
    ctaText: string
  }
}

export interface EmailPayloadOrderShipped {
  type: 'order_shipped'
  data: {
    orderNumber: string
    customerName: string
    customerEmail: string
    trackingNumber: string
    trackingUrl: string | null
    carrier: string
    estimatedDeliveryMin: string
    estimatedDeliveryMax: string
    ctaUrl: string
    ctaText: string
  }
}

export interface EmailPayloadOrderDelivered {
  type: 'order_delivered'
  data: {
    orderNumber: string
    customerName: string
    customerEmail: string
    deliveredAt: string
    ctaUrl: string
    ctaText: string
  }
}

export interface EmailPayloadOrderCancelled {
  type: 'order_cancelled'
  data: {
    orderNumber: string
    customerName: string
    customerEmail: string
    total: number
    cancellationReason: string | null
    refundInfo: string
    ctaUrl: string
    ctaText: string
  }
}

export interface EmailPayloadWelcome {
  type: 'welcome_user'
  data: {
    firstName: string
    email: string
    benefits: string[]
    ctaUrl: string
    ctaText: string
  }
}

export interface EmailPayloadPasswordReset {
  type: 'password_reset'
  data: {
    firstName: string
    email: string
    code: string
    expiresIn: string
    ctaUrl: string
  }
}

export interface EmailPayloadCartReminder {
  type: 'cart_reminder'
  data: {
    customerName: string
    customerEmail: string
    items: Array<{
      name: string
      image: string | null
      price: number
      quantity: number
    }>
    subtotal: number
    ctaUrl: string
    ctaText: string
    expiresMessage: string
  }
}

// Union type of all email payloads
export type EmailPayload =
  | EmailPayloadOrderConfirmed
  | EmailPayloadOrderPreparing
  | EmailPayloadOrderShipped
  | EmailPayloadOrderDelivered
  | EmailPayloadOrderCancelled
  | EmailPayloadWelcome
  | EmailPayloadPasswordReset
  | EmailPayloadCartReminder

/**
 * Generate structured payload for external email design system
 * Use this function to create email data contracts for external rendering
 */
export function generateEmailPayload(type: OrderEmailType | 'welcome_user' | 'password_reset' | 'cart_reminder', data: OrderEmailData): EmailPayload {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ravenhats.store'
  
  switch (type) {
    case 'order_confirmed':
      return {
        type: 'order_confirmed',
        data: {
          orderNumber: data.orderNumber,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          items: (data.items || []).map(item => ({
            name: item.name,
            image: item.image || null,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: data.total,
          shipping: 0,
          total: data.total,
          paidAmount: data.total,
          paymentMethod: data.paymentMethod || 'WOMPI',
          statusMessage: 'Tu pago ha sido confirmado y tu pedido esta en preparacion',
          nextSteps: [
            { step: 1, title: 'Preparacion', description: 'Estamos preparando tu pedido (1-2 dias)', completed: false },
            { step: 2, title: 'Envio', description: 'Recibiras un email con tu numero de guia', completed: false },
            { step: 3, title: 'Entrega', description: 'Tiempo estimado: 3-5 dias habiles', completed: false },
          ],
          ctaUrl: `${baseUrl}/mi-cuenta/pedido/${data.orderNumber}`,
          ctaText: 'Ver mi pedido',
        }
      }
    
    case 'order_preparing':
      return {
        type: 'order_preparing',
        data: {
          orderNumber: data.orderNumber,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          statusMessage: 'Tu pedido esta siendo preparado por nuestro equipo',
          estimatedShipDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO'),
          ctaUrl: `${baseUrl}/mi-cuenta/pedido/${data.orderNumber}`,
          ctaText: 'Ver estado del pedido',
        }
      }

    case 'order_shipped':
      return {
        type: 'order_shipped',
        data: {
          orderNumber: data.orderNumber,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          trackingNumber: data.trackingNumber || '',
          trackingUrl: data.trackingUrl || null,
          carrier: 'Transportadora',
          estimatedDeliveryMin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO'),
          estimatedDeliveryMax: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO'),
          ctaUrl: data.trackingUrl || `${baseUrl}/mi-cuenta/pedido/${data.orderNumber}`,
          ctaText: 'Rastrear envio',
        }
      }

    case 'order_delivered':
      return {
        type: 'order_delivered',
        data: {
          orderNumber: data.orderNumber,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          deliveredAt: new Date().toLocaleDateString('es-CO'),
          ctaUrl: `${baseUrl}/tienda`,
          ctaText: 'Seguir comprando',
        }
      }

    case 'order_cancelled':
      return {
        type: 'order_cancelled',
        data: {
          orderNumber: data.orderNumber,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          total: data.total,
          cancellationReason: data.cancellationReason || null,
          refundInfo: 'Si ya realizaste un pago, el reembolso se procesara en 5-10 dias habiles',
          ctaUrl: `${baseUrl}/tienda`,
          ctaText: 'Volver a la tienda',
        }
      }

    default:
      throw new Error(`Payload type not supported: ${type}`)
  }
}
