import bcrypt from 'bcryptjs'
import { query, transaction } from './db'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Tipos
export interface Customer {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string | null
  isVerified: boolean
  createdAt: Date
}

export interface CustomerSession {
  customerId: number
  email: string
  firstName: string
  lastName: string
}

// Generar token de sesion
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Registrar cliente
export async function registerCustomer(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}): Promise<{ success: boolean; error?: string; customer?: Customer }> {
  try {
    // Verificar si el email ya existe
    const existing = await query<any[]>(
      'SELECT id FROM customers WHERE email = ?',
      [data.email.toLowerCase()]
    )

    if (existing.length > 0) {
      return { success: false, error: 'Este correo ya esta registrado' }
    }

    // Hash de la contrasena
    const passwordHash = await bcrypt.hash(data.password, 12)

    // Insertar cliente
    const result = await query<any>(
      `INSERT INTO customers (email, password_hash, first_name, last_name, phone, is_active) 
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [
        data.email.toLowerCase(),
        passwordHash,
        data.firstName,
        data.lastName,
        data.phone || null
      ]
    )

    const customer: Customer = {
      id: result.insertId,
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      isVerified: false,
      createdAt: new Date()
    }

    return { success: true, customer }
  } catch (error) {
    console.error('Error registering customer:', error)
    return { success: false, error: 'Error al registrar. Intenta de nuevo.' }
  }
}

// Login de cliente
export async function loginCustomer(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; sessionToken?: string; customer?: Customer }> {
  try {
    const results = await query<any[]>(
      `SELECT id, email, password_hash, first_name, last_name, phone, is_verified, is_active, created_at 
       FROM customers WHERE email = ?`,
      [email.toLowerCase()]
    )

    if (results.length === 0) {
      return { success: false, error: 'Correo o contrasena incorrectos' }
    }

    const customer = results[0]

    if (!customer.is_active) {
      return { success: false, error: 'Tu cuenta esta desactivada' }
    }

    // Verificar contrasena
    const validPassword = await bcrypt.compare(password, customer.password_hash)
    if (!validPassword) {
      return { success: false, error: 'Correo o contrasena incorrectos' }
    }

    // Generar sesion
    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias

    await query(
      `INSERT INTO sessions (id, user_id, user_type, expires_at) VALUES (?, ?, 'customer', ?)`,
      [sessionToken, customer.id, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    )

    // Actualizar ultimo login
    await query(
      'UPDATE customers SET last_login_at = NOW() WHERE id = ?',
      [customer.id]
    )

    return {
      success: true,
      sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        isVerified: customer.is_verified,
        createdAt: customer.created_at
      }
    }
  } catch (error) {
    console.error('Error logging in customer:', error)
    return { success: false, error: 'Error al iniciar sesion. Intenta de nuevo.' }
  }
}

// Verificar sesion de cliente
export async function verifyCustomerSession(sessionToken: string): Promise<CustomerSession | null> {
  try {
    const results = await query<any[]>(
      `SELECT s.user_id, c.email, c.first_name, c.last_name 
       FROM sessions s
       JOIN customers c ON s.user_id = c.id
       WHERE s.id = ? AND s.user_type = 'customer' AND s.expires_at > NOW() AND c.is_active = TRUE`,
      [sessionToken]
    )

    if (results.length === 0) {
      return null
    }

    return {
      customerId: results[0].user_id,
      email: results[0].email,
      firstName: results[0].first_name,
      lastName: results[0].last_name
    }
  } catch (error) {
    console.error('Error verifying session:', error)
    return null
  }
}

// Obtener sesion actual desde cookies
export async function getCurrentCustomer(): Promise<CustomerSession | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('customer_session')?.value
    
    if (!sessionToken) {
      return null
    }

    return verifyCustomerSession(sessionToken)
  } catch (error) {
    return null
  }
}

// Logout
export async function logoutCustomer(sessionToken: string): Promise<void> {
  try {
    await query('DELETE FROM sessions WHERE id = ?', [sessionToken])
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

// Obtener pedidos del cliente
export async function getCustomerOrders(customerId: number) {
  return query<any[]>(
    `SELECT o.*, 
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
            (SELECT GROUP_CONCAT(CONCAT(oi.product_name, ' x', oi.quantity) SEPARATOR ', ') 
             FROM order_items oi WHERE oi.order_id = o.id LIMIT 3) as items_preview
     FROM orders o
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC`,
    [customerId]
  )
}

// Obtener pedidos por email (para clientes no registrados)
export async function getOrdersByEmail(email: string) {
  return query<any[]>(
    `SELECT o.*, 
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
            (SELECT GROUP_CONCAT(CONCAT(oi.product_name, ' x', oi.quantity) SEPARATOR ', ') 
             FROM order_items oi WHERE oi.order_id = o.id LIMIT 3) as items_preview
     FROM orders o
     WHERE o.customer_email = ?
     ORDER BY o.created_at DESC`,
    [email.toLowerCase()]
  )
}

// Obtener detalle de pedido
export async function getOrderDetail(orderNumber: string, customerId?: number, email?: string) {
  let sql = `
    SELECT o.*, 
           (SELECT JSON_ARRAYAGG(
             JSON_OBJECT(
               'id', oi.id,
               'productName', oi.product_name,
               'productImage', oi.product_image,
               'unitPrice', oi.unit_price,
               'quantity', oi.quantity,
               'subtotal', oi.subtotal
             )
           ) FROM order_items oi WHERE oi.order_id = o.id) as items
    FROM orders o
    WHERE o.order_number = ?
  `
  const params: (string | number)[] = [orderNumber]

  if (customerId) {
    sql += ' AND o.customer_id = ?'
    params.push(customerId)
  } else if (email) {
    sql += ' AND o.customer_email = ?'
    params.push(email.toLowerCase())
  }

  const results = await query<any[]>(sql, params)
  
  if (results.length === 0) {
    return null
  }

  const order = results[0]
  if (order.items && typeof order.items === 'string') {
    order.items = JSON.parse(order.items)
  }

  return order
}

// Vincular pedidos existentes a cliente recien registrado
export async function linkOrdersToCustomer(customerId: number, email: string) {
  try {
    await query(
      'UPDATE orders SET customer_id = ? WHERE customer_email = ? AND customer_id IS NULL',
      [customerId, email.toLowerCase()]
    )
  } catch (error) {
    console.error('Error linking orders:', error)
  }
}

// Generar codigo de 6 digitos
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Solicitar codigo de recuperacion de contrasena
export async function requestPasswordReset(email: string): Promise<{ 
  success: boolean
  error?: string
  code?: string
  firstName?: string
}> {
  try {
    // Verificar si el email existe
    const customers = await query<any[]>(
      'SELECT id, first_name FROM customers WHERE email = ? AND is_active = TRUE',
      [email.toLowerCase()]
    )

    if (customers.length === 0) {
      // No revelamos si el email existe o no por seguridad
      return { success: true }
    }

    const customer = customers[0]
    const code = generateResetCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    // Invalidar codigos anteriores
    await query(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE email = ? AND used_at IS NULL',
      [email.toLowerCase()]
    )

    // Insertar nuevo codigo
    await query(
      'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
      [email.toLowerCase(), code, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    )

    return { 
      success: true, 
      code,
      firstName: customer.first_name
    }
  } catch (error) {
    console.error('Error requesting password reset:', error)
    return { success: false, error: 'Error al procesar la solicitud' }
  }
}

// Verificar codigo de recuperacion
export async function verifyResetCode(email: string, code: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const results = await query<any[]>(
      `SELECT id FROM password_reset_codes 
       WHERE email = ? AND code = ? AND used_at IS NULL AND expires_at > NOW()`,
      [email.toLowerCase(), code]
    )

    if (results.length === 0) {
      return { success: false, error: 'Codigo invalido o expirado' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error verifying reset code:', error)
    return { success: false, error: 'Error al verificar el codigo' }
  }
}

// Cambiar contrasena con codigo
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; firstName?: string }> {
  try {
    // Verificar codigo
    const codeResults = await query<any[]>(
      `SELECT id FROM password_reset_codes 
       WHERE email = ? AND code = ? AND used_at IS NULL AND expires_at > NOW()`,
      [email.toLowerCase(), code]
    )

    if (codeResults.length === 0) {
      return { success: false, error: 'Codigo invalido o expirado' }
    }

    // Obtener cliente
    const customers = await query<any[]>(
      'SELECT id, first_name FROM customers WHERE email = ? AND is_active = TRUE',
      [email.toLowerCase()]
    )

    if (customers.length === 0) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    const customer = customers[0]

    // Hash de la nueva contrasena
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Actualizar contrasena
    await query(
      'UPDATE customers SET password_hash = ? WHERE id = ?',
      [passwordHash, customer.id]
    )

    // Marcar codigo como usado
    await query(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE email = ? AND code = ?',
      [email.toLowerCase(), code]
    )

    // Cerrar todas las sesiones del usuario
    await query(
      "DELETE FROM sessions WHERE user_id = ? AND user_type = 'customer'",
      [customer.id]
    )

    return { success: true, firstName: customer.first_name }
  } catch (error) {
    console.error('Error resetting password:', error)
    return { success: false, error: 'Error al cambiar la contrasena' }
  }
}

// Cambiar contrasena (usuario autenticado)
export async function changePassword(
  customerId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener contrasena actual
    const customers = await query<any[]>(
      'SELECT password_hash FROM customers WHERE id = ? AND is_active = TRUE',
      [customerId]
    )

    if (customers.length === 0) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Verificar contrasena actual
    const validPassword = await bcrypt.compare(currentPassword, customers[0].password_hash)
    if (!validPassword) {
      return { success: false, error: 'Contrasena actual incorrecta' }
    }

    // Hash de la nueva contrasena
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Actualizar
    await query(
      'UPDATE customers SET password_hash = ? WHERE id = ?',
      [passwordHash, customerId]
    )

    return { success: true }
  } catch (error) {
    console.error('Error changing password:', error)
    return { success: false, error: 'Error al cambiar la contrasena' }
  }
}
