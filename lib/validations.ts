// Validaciones de seguridad para formularios

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// Sanitizar entrada para prevenir XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

// Validar email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

// Validar teléfono colombiano
export function validateColombianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  // Acepta formatos: 3001234567, +573001234567, 573001234567
  return /^(57)?3[0-9]{9}$/.test(cleaned)
}

// Validar nombre (solo letras, espacios y acentos)
export function validateName(name: string): boolean {
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,50}$/
  return nameRegex.test(name.trim())
}

// Validar dirección
export function validateAddress(address: string): boolean {
  const sanitized = sanitizeInput(address)
  return sanitized.length >= 10 && sanitized.length <= 200
}

// Validar ciudad
export function validateCity(city: string): boolean {
  const cityRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,50}$/
  return cityRegex.test(city.trim())
}

// Departamentos válidos de Colombia
export const validDepartments = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas',
  'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
  'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
  'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés', 'Santander',
  'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
]

export function validateDepartment(department: string): boolean {
  return validDepartments.includes(department)
}

// Validar formulario de checkout completo
export function validateCheckoutForm(data: {
  email: string
  firstName: string
  lastName: string
  phone: string
  address: string
  city: string
  department: string
}): ValidationResult {
  const errors: Record<string, string> = {}

  if (!validateEmail(data.email)) {
    errors.email = 'Correo electrónico inválido'
  }

  if (!validateName(data.firstName)) {
    errors.firstName = 'Nombre inválido (solo letras, 2-50 caracteres)'
  }

  if (!validateName(data.lastName)) {
    errors.lastName = 'Apellido inválido (solo letras, 2-50 caracteres)'
  }

  if (!validateColombianPhone(data.phone)) {
    errors.phone = 'Teléfono inválido (formato colombiano)'
  }

  if (!validateAddress(data.address)) {
    errors.address = 'Dirección inválida (10-200 caracteres)'
  }

  if (!validateCity(data.city)) {
    errors.city = 'Ciudad inválida'
  }

  if (!validateDepartment(data.department)) {
    errors.department = 'Selecciona un departamento válido'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Rate limiting simple del lado cliente
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = requestCounts.get(key)

  if (!record || now > record.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// Generar ID seguro para pedidos
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `RH-${timestamp}-${random}`
}

// Formatear número de teléfono colombiano
export function formatColombianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+57 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  return phone
}
