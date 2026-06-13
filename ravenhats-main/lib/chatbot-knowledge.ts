/**
 * RAVENHATS - Base de conocimiento para el sistema RAG del chatbot
 */

export const STORE_INFO = {
  name: 'RavenHats',
  url: 'ravenhats.store',
  whatsapp: '13412133624',
  instagram: '@ravenhats.store',
  email: 'soporte@ravenhats.store',
  location: 'Acacias, Meta - Colombia',
}

export const SYSTEM_PROMPT = `Eres el asesor de estilo de RavenHats, una tienda colombiana de gorras Goorin Bros originales.

PERSONALIDAD:
- Eres como un amigo con buen gusto en moda, no un bot de soporte
- Tono casual colombiano, tuteo, natural
- Respuestas MUY cortas: 1-2 oraciones máximo
- Solo 1 emoji por respuesta, úsalo cuando aporte (🧢 🔥 💳 🚚 👍)
- Nunca digas "¡Hola! Soy tu asistente virtual..." — habla normal

MISIÓN:
- Ayudar al cliente a encontrar la gorra perfecta según su estilo
- Responder preguntas de envíos, pagos, devoluciones con la info del knowledge base
- Generar confianza y llevar naturalmente hacia la compra
- Si no sabes algo → redirige a WhatsApp

REGLAS:
1. NUNCA inventes precios, productos ni políticas. Solo usa el conocimiento provisto abajo.
2. Si preguntan por talla → talla única ajustable, no hay variaciones
3. Si dudan → sugiere contraentrega (ven primero, pagan cuando llega)
4. Respuestas de máximo 2 líneas. Sin párrafos.
5. Si están listos para comprar → empuja al checkout con naturalidad

EJEMPLOS DE RESPUESTAS BUENAS:
- "Esa es de las que más rotan, la usan para todo 🔥"
- "Te llega en 2-4 días y pagas cuando la ves si quieres"
- "Son 100% originales Goorin Bros, con etiqueta y todo"
- "Esa va perfecta con outfits oscuros, muy versátil 🧢"
- "Pídela contraentrega y ves si te gusta antes de pagar"

CONOCIMIENTO DE LA TIENDA (usa esto para responder):`

export const STORE_KNOWLEDGE = `
## SOBRE RAVENHATS
- Tienda colombiana de gorras Goorin Bros 100% originales
- Ubicados en Acacias, Meta - Colombia
- Instagram: @ravenhats.store | TikTok: @ravenhats.co | WhatsApp: +1 341-213-3624
- Vendemos solo gorras auténticas con etiquetas y empaque original Goorin Bros

## SOBRE LAS GORRAS
- Marca: Goorin Bros, fundada en 1895 en Pittsburgh, USA — icónica marca premium
- Talla: ÚNICA ajustable (snap/velcro en la parte trasera, se adapta a todas las cabezas)
- Material: algodón premium y poliéster de alta calidad, malla transpirable en algunos modelos
- Construcción: parches bordados con detalle excepcional, visera curva o plana según el modelo
- Son unisex — les quedan igual de bien a hombres y mujeres
- Estilos: clean/minimal (colores sólidos), streetwear (logos grandes), animal print (leopardo, tigre, oso), statement (diseños llamativos)
- No hay variación de talla — la única talla se ajusta a cualquier persona

## PRECIOS
- Rango general: entre $130.000 y $230.000 COP según el modelo
- Cada producto tiene su precio exacto visible en la tienda
- No hacemos descuentos individuales salvo drops especiales

## ENVÍOS
- Cobertura: todo Colombia
- Tiempo entrega ciudades principales (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga): 2-4 días hábiles
- Tiempo entrega otras ciudades: 3-5 días hábiles
- Costo envío ciudades principales: $12.000
- Costo envío ciudades intermedias: $15.000
- Costo envío resto del país: $18.000
- Envío GRATIS a Acacias, Meta
- Se envía número de guía por correo y WhatsApp para rastreo

## MÉTODOS DE PAGO
- Tarjeta débito o crédito (Visa, Mastercard)
- PSE (transferencia bancaria directa)
- Nequi
- Bancolombia
- CONTRAENTREGA: pagas en efectivo cuando llega el pedido — la opción más usada
- Pasarela: Wompi de Bancolombia (100% segura, PCI DSS, datos protegidos)

## DEVOLUCIONES Y CAMBIOS
- Solo se aceptan cambios por DEFECTO DE FÁBRICA (costuras malas, parches dañados, manchas de origen)
- NO se aceptan devoluciones por preferencia personal ni por talla (es única)
- Plazo para reportar: 10 días desde la recepción
- Proceso: WhatsApp con número de pedido + fotos → evaluamos → si procede, cubrimos envío y reemplazamos
- Reembolso: 3-5 días hábiles después de recibir y verificar

## PEDIDOS Y RASTREO
- Número de pedido formato: RH-XXXXXX
- Rastrear en el sitio con ese número o por WhatsApp
- Confirmación por correo al hacer el pedido

## CONTACTO
- WhatsApp: +1 341-213-3624 (respuesta en minutos en horario laboral)
- Instagram: @ravenhats.store
- Email: soporte@ravenhats.store

## FAQ — PREGUNTAS FRECUENTES

¿Las gorras son originales?
Sí, 100% Goorin Bros con etiquetas y empaque original. No manejamos réplicas.

¿Por qué son más caras que otras gorras?
Son originales Goorin Bros, marca americana premium de 120+ años. La calidad del bordado y el material no tiene comparación.

¿Cuánto demora el envío?
2-4 días hábiles en ciudades principales, 3-5 días en otras ciudades.

¿Puedo pagar en efectivo?
Sí, con contraentrega. Pagas cuando el domicilio te entrega la gorra.

¿Es seguro comprar aquí?
Sí, usamos Wompi de Bancolombia. Tus datos bancarios están encriptados y protegidos.

¿Qué talla tienen?
Talla única ajustable — el snap de atrás se adapta a cualquier cabeza, de la S a la XL.

¿Tienen gorras para mujer?
Son unisex, les quedan perfectas a todos. Muchas clientas las usan y se ven increíble.

¿Hacen envíos a todo Colombia?
Sí, a todo el territorio nacional.

¿Puedo devolver si no me gusta?
Solo por defecto de fábrica. No por gusto personal — son talla única, se ajustan a todos.

¿Tienen descuentos?
Hacemos drops especiales con precio especial. Síguenos en @ravenhats.store para enterarte.

¿Es para regalo?
Claro, el empaque de Goorin Bros ya es especial. Si quieres algo extra cuéntanos por WhatsApp.

¿Mi pedido lleva más de 5 días y no llega?
Escríbenos por WhatsApp con tu número RH-XXXXXX y lo revisamos de inmediato.

¿Puedo pagar con Nequi?
Sí, aceptamos Nequi, PSE, tarjeta y contraentrega.

¿Qué es Goorin Bros?
Marca americana de gorras premium fundada en 1895, famosa por sus diseños únicos con parches bordados de animales y personajes. Una de las mejores marcas de headwear del mundo.

¿Tienen descuentos por volumen o por varios?
No manejamos descuentos por volumen. Precio fijo para todos.

¿Puedo ver las gorras en persona?
Por ahora somos online. Pero las fotos del sitio y de @ravenhats.store muestran muy bien los detalles.
`

export interface ProductContext {
  id: string | number
  name: string
  price: number
  description: string
  category?: string
  stock: number
}

export function extractSearchKeywords(message: string): string[] {
  const lower = message.toLowerCase()
  const keywords: string[] = []

  const colors = ['negra', 'negro', 'blanca', 'blanco', 'gris', 'azul', 'roja', 'rojo', 'verde', 'beige', 'crema', 'cafe', 'marrón', 'marron', 'camel', 'khaki', 'vino', 'mostaza']
  colors.forEach(c => { if (lower.includes(c)) keywords.push(c) })

  const styles = ['minimal', 'clean', 'simple', 'sencilla', 'básica', 'basica', 'streetwear', 'urbana', 'animal', 'print', 'estampada', 'bordada', 'logo', 'tigre', 'leopardo', 'oso', 'lobo']
  styles.forEach(s => { if (lower.includes(s)) keywords.push(s) })

  const uses = ['diario', 'diaria', 'casual', 'salir', 'fiesta', 'outfit', 'regalo', 'deporte', 'trabajo']
  uses.forEach(u => { if (lower.includes(u)) keywords.push(u) })

  const vibes = ['old money', 'streetwear', 'elegante', 'premium', 'cool', 'drip', 'lowkey', 'statement']
  vibes.forEach(v => { if (lower.includes(v)) keywords.push(v) })

  return keywords
}

export function classifyMessageIntent(message: string): 'product' | 'support' | 'order' | 'general' {
  const lower = message.toLowerCase()

  const orderPatterns = ['pedido', 'orden', 'rastrear', 'seguimiento', 'rh-', 'donde esta', 'dónde está', 'llego', 'llegó', 'cuando llega', 'cuándo llega', 'no llega', 'guia', 'guía']
  if (orderPatterns.some(p => lower.includes(p))) return 'order'

  const supportPatterns = ['pagar', 'pago', 'envio', 'envío', 'devolucion', 'devolución', 'cambio', 'defecto', 'seguro', 'confiable', 'garantia', 'garantía', 'costo envio', 'metodo', 'método', 'nequi', 'pse', 'contraentrega', 'wompi', 'tarjeta']
  if (supportPatterns.some(p => lower.includes(p))) return 'support'

  const productPatterns = ['gorra', 'gorras', 'modelo', 'color', 'estilo', 'recomienda', 'quiero', 'busco', 'tienes', 'tienen', 'muestrame', 'muéstrame', 'ver', 'nueva', 'disponible', 'precio', 'cuánto', 'cuanto', 'cuesta', 'vale']
  if (productPatterns.some(p => lower.includes(p))) return 'product'

  return 'general'
}

export function formatProductsForContext(products: ProductContext[]): string {
  if (products.length === 0) return ''
  const lines = products.map(p =>
    `- ${p.name} | $${Number(p.price).toLocaleString('es-CO')} | ${p.stock > 0 ? 'Disponible' : 'Agotada'}${p.description ? ' | ' + p.description.slice(0, 80) : ''}`
  )
  return `\n## PRODUCTOS DISPONIBLES AHORA:\n${lines.join('\n')}\n(Menciona estos si son relevantes para la consulta)`
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 25
const RATE_LIMIT_WINDOW = 60000

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Strips accents and lowercases — makes matching accent-agnostic
function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * matchFAQ — Dataset local con +50 patrones. Usa texto normalizado (sin tildes)
 * para tolerar errores de escritura y variantes del español colombiano.
 */
export function matchFAQ(message: string): string | null {
  const m = norm(message)

  // ── Saludos ──────────────────────────────────────────────────────────────
  if (/^(hola|hey|hi|buenas|ola|buenos|saludos|good|sup|que mas|que hubo|quiubo)[s!.,? ]*$/.test(m))
    return pick([
      'Ey 🧢 ¿Qué andas buscando?',
      '¡Hola! ¿Buscas gorra o tienes alguna duda?',
      'Ey, ¿en qué te puedo ayudar? 🧢',
    ])

  // ── Talla / ajuste ───────────────────────────────────────────────────────
  if (/talla|talle|size|ajusta|medida|cabeza grande|cabeza pequena|le queda|no me queda|que talla|que talle/.test(m))
    return pick([
      'Talla única ajustable — el snap de atrás se adapta de la S a la XL. Le queda a todos sin excepción 🧢',
      'Una sola talla con cierre ajustable atrás. No importa el tamaño de tu cabeza, se adapta 🧢',
      'No hay problema con la talla — es única y ajustable. Queda perfecta en todas las cabezas 🧢',
    ])

  // ── Envíos: información general ─────────────────────────────────────────
  // Catch broad "envio/envios/informacion de envio/evios/envios" BEFORE price check
  if (/^(envios?|evios?|informaci[oó]n.*(envio|envios|despacho|entrega)|info.*(envio|despacho|entrega)|como.*envian?|como.*mandan?|como.*despachan?)$/.test(m) ||
      /envio(s)?\s*$/.test(m) ||
      (m.includes('envio') && m.length < 20))
    return pick([
      'Enviamos a todo Colombia 🚚 En ciudades principales (Bogotá, Medellín, Cali...) llega en 2-4 días hábiles. Costo: $12.000. Otras ciudades 3-5 días · $15.000-$18.000. Gratis en Acacias, Meta.',
      'Cobertura total Colombia 🚚 2-4 días hábiles capitales · 3-5 días otras ciudades. Costo desde $12.000. Te enviamos número de guía por WhatsApp y correo.',
    ])

  // ── Precio ───────────────────────────────────────────────────────────────
  if (/cuanto.*(cuesta|cuestan|vale|valen|sale|salen|cobran|precio|valor|estan|es una|son)|(precio|costo|valor).*(gorr|goorin|model|una|las)|cuanto.*(gorr|es$|son$)|que precio|cuanto es|cuanto son|cuanto valen|cuanto salen|cuanto cuestan|cuanto cobran|a cuanto|a como/.test(m))
    return pick([
      'Entre $130.000 y $230.000 COP según el modelo. El precio exacto lo ves en cada una en la tienda 🧢',
      'Van de $130.000 a $230.000 dependiendo del diseño. Cada gorra tiene su precio visible en la tienda 🧢',
    ])

  // ── Métodos de pago ──────────────────────────────────────────────────────
  if (/nequi|pse|tarjeta|contraentrega|efectivo|como pago|metodo.*pago|formas.*pago|se puede pagar|puedo pagar|metodos de pago|como se paga|como puedo pagar/.test(m))
    return pick([
      'Nequi, PSE, tarjeta débito/crédito y contraentrega — pagas en efectivo cuando llega 💳',
      'Puedes pagar con Nequi, PSE, tarjeta (Visa/Mastercard) o contraentrega. Con contra te llega primero y pagas al recibirla 💳',
      'Aceptamos todo: Nequi, PSE, tarjeta y contraentrega. La más usada es contraentrega — pagas cuando la ves 💳',
    ])

  // ── Costo de envío ───────────────────────────────────────────────────────
  if (/(cuanto|precio|costo).*(envio|domicilio|despacho)|(envio|domicilio).*(cuesta|vale|precio|costo|cobran)|cuanto.*envio/.test(m))
    return '$12.000 en ciudades principales · $15.000 ciudades intermedias · $18.000 resto del país · Gratis en Acacias, Meta 🚚'

  // ── Tiempo de envío ──────────────────────────────────────────────────────
  if (/(cuando).*(llega|entrega)|(cuanto).*(tarda|demora|dias)|(dias|tiempo|plazo).*(envio|entrega|llegar)|demora.*envio|cuanto.*demora|cuanto.*tarda/.test(m))
    return pick([
      '2-4 días hábiles en ciudades principales (Bogotá, Medellín, Cali...), 3-5 días en otras 🚚 Te mandamos guía de rastreo',
      'En capitales principales llega en 2-4 días hábiles. Otras ciudades 3-5 días. Siempre con número de guía 🚚',
    ])

  // ── Envío gratis ─────────────────────────────────────────────────────────
  if (/(envio).*(gratis|sin costo)|(gratis|sin costo).*(envio)/.test(m))
    return 'Envío gratis solo en Acacias, Meta 🚚 Al resto del país: $12.000-$18.000 según la ciudad'

  // ── Originales / autenticidad ────────────────────────────────────────────
  if (/original(es)?|autentic|replica|falsa|pirat|copi|son verdaderas|son originales|garantia de original/.test(m))
    return pick([
      '100% Goorin Bros originales con etiqueta y empaque oficial. No manejamos réplicas 🔥',
      'Originales garantizados — cada gorra tiene etiqueta auténtica de Goorin Bros y empaque de fábrica 🔥',
      'Son las mismas que encuentras en tiendas Goorin Bros en EE.UU. Con etiqueta y todo 🔥',
    ])

  // ── Devoluciones / cambios ───────────────────────────────────────────────
  if (/devoluci|devolver|cambio.*(defecto|fabrica)|defecto de fabrica|llego.*mal|llego.*danad|no sirve|politica.*devolucion|devolucion/.test(m))
    return 'Cambios por defecto de fábrica dentro de 10 días desde que la recibes. Escríbenos al WhatsApp con fotos del defecto 📸'

  // ── ¿No me gustó / cambio por gusto? ─────────────────────────────────────
  if (/no me gusto|no me gust|cambiar.*porque.*no|devolver.*porque.*no/.test(m))
    return 'Solo aceptamos cambios por defecto de fábrica, no por preferencia personal. Por eso recomendamos contraentrega — la ves antes de pagar 🧢'

  // ── Seguridad ────────────────────────────────────────────────────────────
  if (/seguro|confiable|estafa|wompi|datos.*banco|pago.*seguro|es.*confiable|puedo confiar|es de confianza/.test(m))
    return pick([
      'Sí, usamos Wompi de Bancolombia — pagos encriptados con certificación PCI DSS. Tus datos están protegidos 💳',
      'Totalmente seguro. La pasarela es Wompi (Bancolombia), la misma que usan las tiendas grandes en Colombia 💳',
    ])

  // ── Para mujer / unisex ──────────────────────────────────────────────────
  if (/para mujer|gorras.*mujer|mujer.*gorr|femenin|chica|nina|senora|mi novia|para ella/.test(m))
    return pick([
      'Son unisex — les quedan igual de bien a todos. Tenemos muchas clientas que las llevan increíble 🧢',
      'Claro, son unisex. De hecho muchas clientas las usan y quedan perfectas 🧢',
    ])

  // ── Qué es Goorin Bros ───────────────────────────────────────────────────
  if (/que es goorin|goorin bros|historia.*marca|fundad|de donde.*marca|quien es goorin/.test(m))
    return 'Goorin Bros es una marca americana de gorras premium fundada en 1895 en Pittsburgh. 130 años haciendo headwear de primera — famosa por los parches bordados de animales 🔥'

  // ── Por qué son caras ────────────────────────────────────────────────────
  if (/por que.*car|muy car|caro|costoso|expensive|vale.*mucho|tan costosa/.test(m))
    return pick([
      'Son Goorin Bros originales — marca americana premium de 1895. El bordado y los materiales no tienen comparación con gorras genéricas 🔥',
      'Calidad premium real: algodón de alta calidad, parches bordados a mano, marca con 130 años de historia. No es una gorra cualquiera 🔥',
    ])

  // ── WhatsApp / contacto ──────────────────────────────────────────────────
  if (/whatsapp|telefono|numero.*contacto|llamar|comunicar|hablar.*alguien|contacto/.test(m))
    return 'WhatsApp: +1 341-213-3624 📱 Respondemos en minutos en horario laboral'

  // ── Instagram ────────────────────────────────────────────────────────────
  if (/instagram|insta|redes|@ravenhats/.test(m))
    return 'Estamos en Instagram como @ravenhats.store 📱 Ahí subimos fotos de todas las gorras, outfits y drops nuevos. TikTok: @ravenhats.co'

  // ── Rastrear pedido ──────────────────────────────────────────────────────
  if (/rastrear|rastreo|seguimiento|donde.*pedido|mi.*pedido|numero de pedido|estado del pedido/.test(m))
    return 'Escríbeme tu número de pedido (ej: RH-000001) y te digo el estado al momento 📦'

  // ── Pedido no llegó ──────────────────────────────────────────────────────
  if (/no llega|no.*llego|tardando|no ha llegado|se perdio|perdido|no llego el pedido/.test(m))
    return 'Escríbenos al WhatsApp con tu número RH-XXXXXX y lo revisamos de inmediato 📦'

  // ── Cómo hacer el pedido ─────────────────────────────────────────────────
  if (/como pido|como compro|como funciona|pasos para comprar|como hago el pedido|como se hace|como se pide/.test(m))
    return 'Fácil: elige la gorra en la tienda → Agregar al carrito → Checkout → elige pago (contraentrega o digital) → ¡listo! 🧢'

  // ── Descuentos ───────────────────────────────────────────────────────────
  if (/descuento|promo|oferta|rebaja|mas barato|precio especial|cupon/.test(m))
    return 'No hacemos descuentos individuales. Pero hacemos drops con precio especial — síguenos en @ravenhats.store para ser el primero en enterarte 🧢'

  // ── Regalo ───────────────────────────────────────────────────────────────
  if (/regalo|regalar|para regalo|gifting|sorpresa|cumpleanos|navidad/.test(m))
    return pick([
      'El empaque de Goorin Bros ya es especial — perfecto para regalo. Si quieres algo extra cuéntanos por WhatsApp 🧢',
      'Quedan increíble como regalo. El empaque viene bien presentado de fábrica. Para algo personalizado escríbenos 🧢',
    ])

  // ── Tienda física ────────────────────────────────────────────────────────
  if (/tienda fisica|punto fisico|local|donde estan|direccion|ir en persona|recoger|ir a buscar|van a abrir tienda/.test(m))
    return 'Somos solo online — enviamos a todo Colombia. Por ahora no hay punto físico, pero en @ravenhats.store ves todo el catálogo 🧢'

  // ── Recomendación por tipo de cara ───────────────────────────────────────
  if (/cara redonda|cara oval|cara larga|cara.*forma|forma.*cara/.test(m))
    return 'Para cara redonda quedan bien las de visera curva — estilizan el rostro. Las truckers también van bien. Evita las muy anchas 🧢'

  // ── Recomendación para outfits ───────────────────────────────────────────
  if (/outfit|combinar|con que va|ropa oscura|ropa negra|look|estilo.*outfit/.test(m))
    return pick([
      'Las negras y blancas van con todo. Si tu ropa es oscura, una beige o crema da buen contraste 🧢',
      'Depende del outfit. Los colores neutros (negro, blanco, camel) son los más versátiles. Las de animal print dan más carácter 🔥',
    ])

  // ── Recomendación para el calor / sol ────────────────────────────────────
  if (/calor|verano|sol|playa|sudor|transpir/.test(m))
    return 'Para el calor las truckers de malla son lo mejor — transpiran bien y protegen del sol. Las tenemos en varios colores 🧢'

  // ── Streetwear / urbano ───────────────────────────────────────────────────
  if (/streetwear|urbano|rapero|hip.?hop|trap|drip/.test(m))
    return 'Para streetwear lo más pedido son las de visera plana y la línea animal print de Goorin Bros. Sí se notan 🔥'

  // ── Deportivo ────────────────────────────────────────────────────────────
  if (/deportivo|correr|gym|ejercicio|deporte|running/.test(m))
    return 'Las truckers transpirables son perfectas para deporte — livianas, ajustables y bien ventiladas 🧢'

  // ── Old money / elegante ─────────────────────────────────────────────────
  if (/old money|elegante|formal|clasico|discreto|sobrio/.test(m))
    return 'Para ese estilo las de colores sólidos sin logos grandes — las dad hats de Goorin en negro, camel o crema son perfectas 🧢'

  // ── Animal print ─────────────────────────────────────────────────────────
  if (/animal print|tigre|leopardo|oso|lobo|vaca|toro|bull|bear|peligros/.test(m))
    return 'Sí, tenemos la línea animal print de Goorin Bros 🔥 Tigres, leopardos, osos, toros — son las más llamativas. Las ves en la tienda'

  // ── Visera plana ─────────────────────────────────────────────────────────
  if (/visera plana|plana|flat|snapback/.test(m))
    return 'Tenemos modelos de visera plana — el estilo snapback de Goorin. Muy solicitadas para streetwear 🧢'

  // ── Visera curva / dad hat ───────────────────────────────────────────────
  if (/visera curva|curva|dad hat|trucker|malla/.test(m))
    return 'Las de visera curva son las más clásicas y cómodas. Las truckers tienen malla atrás — transpiran bien 🧢'

  // ── Diferencia entre modelos ─────────────────────────────────────────────
  if (/diferencia.*(model|gorr)|cual.*mejor|cual.*recomiend|que.*recomiend/.test(m))
    return pick([
      '¿La prefieres más tranquila (colores sólidos, discreta) o que destaque (animal print, logos)? Cuéntame y te oriento 🧢',
      'Todo depende del estilo. Las hay minimalistas (ideales para combinar con todo) y las de animal print que son más statement. ¿Qué buscas? 🧢',
    ])

  // ── Cuántas gorras tienen ────────────────────────────────────────────────
  if (/cuantas.*tienen|cuantos.*modelos|catalogo|todas.*gorr|que.*tienen|que.*modelos|que gorras tienen/.test(m))
    return 'Tenemos varias colecciones activas. El catálogo completo con disponibilidad y precios lo ves en la tienda 🧢'

  // ── Materiales ───────────────────────────────────────────────────────────
  if (/material|tela|algodon|calidad.*tela|de que.*hech/.test(m))
    return 'Algodón premium y poliéster de alta calidad. Las truckers llevan malla transpirable atrás. Parches bordados con mucho detalle 🧢'

  // ── Volumen / mayorista ───────────────────────────────────────────────────
  if (/mayor|volumen|varios|muchas|lote|revender|distribu/.test(m))
    return 'No manejamos descuentos por volumen — precio fijo para todos. Para algo especial escríbenos al WhatsApp 🧢'

  // ── Colores disponibles ───────────────────────────────────────────────────
  if (/colores|que colores|colores tienen|hay en negro|hay en blanco|en que colores/.test(m))
    return 'Las hay en negro, blanco, camel, beige, gris, azul marino y más. El inventario exacto lo ves en la tienda — los colores varían por modelo 🧢'

  // ── Garantía / vida útil ──────────────────────────────────────────────────
  if (/garantia|durabilidad|dura mucho|se daña|vida util/.test(m))
    return 'Son de muy buena calidad — Goorin Bros dura años si la cuidas bien. Garantía por defecto de fábrica dentro de los primeros 10 días 🧢'

  // ── Horario de atención ────────────────────────────────────────────────────
  if (/horario|cuando atienden|que horario|hora de atencion|cuando responden/.test(m))
    return 'Respondemos por WhatsApp en horario laboral (lunes a sábado). Fuera de horario te respondemos a primera hora 📱'

  // ── Confirmación de pedido ─────────────────────────────────────────────────
  if (/confirmar pedido|recibi confirmacion|me llego correo|donde esta mi confirmacion/.test(m))
    return 'La confirmación llega al correo que registraste. Si no la ves, revisa spam o escríbenos al WhatsApp con tu número RH- 📦'

  // ── Envíos internacionales ───────────────────────────────────────────────
  if (/venezuel|ecuador|peru|mexico|internacional|exterior|otro pais|otro país|fuera.*colombia|afuera/.test(m))
    return 'Por ahora solo enviamos dentro de Colombia 🇨🇴 No hacemos envíos internacionales aún.'

  // ── Cédula / documento ───────────────────────────────────────────────────
  if (/cedula|cédula|documento|identificacion|identificación|nit|ci\b/.test(m))
    return 'Solo necesitas cédula para pago con PSE. Para contraentrega o tarjeta no es requerida 🧢'

  // ── Cuidado / lavado de gorras ───────────────────────────────────────────
  if (/lavar|lavado|limpiar|limpieza|cuidado|mantenimiento|se puede mojar|agua|lavadora/.test(m))
    return 'Se limpia con un trapo húmedo suave — no en lavadora. Guárdala en un lugar seco para conservar la forma 🧢'

  // ── Cuántos productos se pueden pedir ────────────────────────────────────
  if (/varias|varios|dos gorras|2 gorras|más de una|pedido.*varias|puedo pedir.*mas|pedido.*multiple/.test(m))
    return 'Sí, puedes pedir varias gorras en un mismo pedido — se agregan al carrito y van en el mismo envío 🧢'

  // ── Cambiar dirección después de pedir ──────────────────────────────────
  if (/cambiar.*direccion|cambiar.*dirección|cambiar.*domicilio|corrección.*direccion|me equivoque.*direccion/.test(m))
    return 'Si ya enviaste el pedido, escríbenos por WhatsApp lo antes posible con tu número RH- y la dirección correcta — lo gestionamos si aún no salió 📦'

  // ── Si no hay nadie en casa ──────────────────────────────────────────────
  if (/no habia nadie|no estaba|nadie en casa|me lo devolvieron|intento.*entrega|re.?entrega|segunda.*entrega/.test(m))
    return 'Si el domiciliario no pudo entregar, InterRapidísimo hace hasta 2 intentos más. Escríbenos al WhatsApp con tu número RH- para coordinarlo 📦'

  // ── Empaque dañado al llegar ─────────────────────────────────────────────
  if (/caja.*danad|empaque.*danad|embalaje.*danad|llego.*roto|llego.*aplastado|llego.*golpead/.test(m))
    return 'Toma fotos del empaque y la gorra y escríbenos al WhatsApp con tu número RH- — lo resolvemos de inmediato 📸'

  // ── Número de pedido / qué es RH ────────────────────────────────────────
  if (/que es rh|rh-|numero.*pedido|formato.*pedido|donde.*numero.*pedido/.test(m))
    return 'Tu número de pedido tiene el formato RH-000001 — lo recibes por correo al confirmar la compra. Con ese número puedes rastrear tu envío 📦'

  // ── Cuánto tarda en procesar / preparar ─────────────────────────────────
  if (/cuanto.*prepara|tiempo.*alistar|procesar.*pedido|antes.*enviar|cuando.*sale|cuando.*despacha/.test(m))
    return 'Procesamos en 24 horas hábiles — luego InterRapidísimo tarda 2-4 días en ciudades principales 🚚'

  // ── Disponibilidad / stock ───────────────────────────────────────────────
  if (/hay disponible|en stock|quedan|disponibilidad|agotad|sin stock|hay.*unidades/.test(m))
    return 'La disponibilidad la ves en tiempo real en cada producto de la tienda. Si aparece "Agotado" no hay stock — escríbenos por WhatsApp para avisarte cuando vuelva 🧢'

  // ── Confirmación de pago / no llegó correo ──────────────────────────────
  if (/no llego.*correo|no recibi.*confirmacion|no me llego.*email|donde.*confirmacion|no veo.*correo/.test(m))
    return 'Revisa la carpeta de spam. Si no está, escríbenos al WhatsApp con tu número de pedido RH- y verificamos 📧'

  // ── Factura / comprobante ────────────────────────────────────────────────
  if (/factura|comprobante|recibo|boleta|soporte.*pago/.test(m))
    return 'El comprobante de pago lo envía Wompi directamente a tu correo. Para facturas adicionales escríbenos al WhatsApp 📄'

  // ── Garantía extendida ───────────────────────────────────────────────────
  if (/garantia extendida|seguro.*gorra|proteccion.*compra/.test(m))
    return 'No manejamos garantía extendida. La garantía es por defecto de fábrica dentro de los primeros 10 días. Son gorras de alta calidad — duran años con buen cuidado 🧢'

  // ── Foto de referencia / talla en persona ───────────────────────────────
  if (/como se ve puesta|foto.*puesta|modelo.*puesta|en persona como|probador/.test(m))
    return 'En @ravenhats.store subimos fotos de las gorras puestas para que veas cómo quedan. También puedes preguntar por un modelo específico en WhatsApp 🧢'

  // ── Cancelar pedido ──────────────────────────────────────────────────────
  if (/cancelar.*pedido|anular.*pedido|no quiero.*pedido|arrepent/.test(m))
    return 'Para cancelar un pedido escríbenos al WhatsApp con tu número RH- lo antes posible — si aún no salió lo cancelamos sin problema 📦'

  // ── Cuándo regresan modelos agotados ────────────────────────────────────
  if (/cuando vuelve|cuando regresan|proxima.*llegada|nuevo.*inventario|van a traer/.test(m))
    return 'No tenemos fechas fijas de reposición. Síguenos en @ravenhats.store para enterarte de los drops nuevos 🔥'

  // ── Comparación con otras marcas ────────────────────────────────────────
  if (/new era|mitchell|carhartt|otras marcas|comparado|mejor que|vs\b|versus/.test(m))
    return 'Goorin Bros es única en su categoría — los parches bordados a mano y la historia de 1895 la distinguen de cualquier otra marca de gorras 🔥'

  // ── Gracias ──────────────────────────────────────────────────────────────
  if (/^(gracias|gracia|thank|thanks|listo|entendido|ok|perfecto|listo gracias|muchas gracias)[s!. ]*$/.test(m))
    return pick([
      'Con gusto 🧢 ¿Algo más en lo que te pueda ayudar?',
      '¡Claro! Si necesitas algo más, aquí estoy 🧢',
      'Para eso estamos 🧢 ¿Necesitas algo más?',
    ])

  return null
}

/**
 * generateLocalResponse — Siempre devuelve una respuesta relevante basada en scoring de tópicos.
 * Úsalo como fallback cuando matchFAQ retorna null o cuando la IA no está disponible.
 */
export function generateLocalResponse(message: string): string {
  const m = message.toLowerCase()
  const score = (kws: string[]) => kws.filter(kw => m.includes(kw)).length

  const s = {
    price:         score(['precio', 'cuánto', 'cuanto', 'cuesta', 'cuestan', 'vale', 'valen', 'salen', 'sale', 'cobran', 'valor', 'cuántos', 'cuantos']),
    size:          score(['talla', 'talle', 'ajuste', 'ajusta', 'medida', 'cabeza', 'queda', 'tamaño', 'le queda', 'me queda']),
    shippingCost:  score(['costo envío', 'costo envio', 'precio envio', 'precio envío', 'envio cuesta', 'envio vale', 'cobran envio', 'cobran envío', 'envio gratis', 'envío gratis']),
    shippingTime:  score(['demora', 'tarda', 'cuándo', 'cuando', 'días', 'dias', 'tiempo envio', 'tiempo envío', 'plazo', 'cuánto tiempo', 'cuanto tiempo']),
    shippingGen:   score(['envío', 'envio', 'domicilio', 'despacho', 'entrega', 'mandan', 'llega', 'envían', 'envian']),
    payment:       score(['pago', 'pagar', 'nequi', 'pse', 'tarjeta', 'contraentrega', 'efectivo', 'wompi', 'bancolombia', 'débito', 'debito', 'crédito', 'credito', 'transferencia']),
    returns:       score(['devoluci', 'devolver', 'cambio', 'cambiar', 'defecto', 'reembolso', 'garantia', 'garantía', 'dañada', 'dañado', 'llegó mal', 'mal estado', 'fábrica']),
    authenticity:  score(['original', 'autentico', 'auténtico', 'réplica', 'replica', 'falsa', 'falso', 'pirata', 'copia', 'verdadera', 'certificado']),
    brand:         score(['goorin', 'marca', 'historia', 'fundada', 'americana', 'pittsburgh']),
    women:         score(['mujer', 'femenin', 'dama', 'señora', 'niña', 'novia', 'mamá', 'mama', 'chica', 'para ella']),
    security:      score(['seguro', 'confiable', 'confianza', 'estafa', 'robo', 'datos', 'proteg', 'encript']),
    discount:      score(['descuento', 'descuentos', 'promo', 'promoción', 'oferta', 'rebaja', 'barato', 'cupón', 'precio especial']),
    contact:       score(['whatsapp', 'teléfono', 'telefono', 'contacto', 'comunicar', 'hablar con', 'número de', 'numero de']),
    howToBuy:      score(['cómo compro', 'como compro', 'cómo pido', 'como pido', 'pasos', 'proceso', 'cómo funciona', 'como funciona', 'cómo comprar', 'como comprar']),
    gift:          score(['regalo', 'regalar', 'cumpleaños', 'navidad', 'sorpresa', 'gifting']),
    material:      score(['material', 'tela', 'algodón', 'algodon', 'calidad tela', 'de qué', 'fabricad']),
    products:      score(['gorra', 'gorras', 'modelo', 'modelos', 'colores', 'catálogo', 'catalogo', 'disponible', 'tienen', 'tienes', 'ver más']),
    style:         score(['recomienda', 'recomiéndame', 'cuál me queda', 'cual me queda', 'cuál es mejor', 'cual es mejor', 'sugiere', 'outfit', 'combina', 'estilo', 'look', 'combinar']),
    priceWhy:      score(['por qué', 'porque', 'tan caro', 'muy caro', 'costosa', 'costoso', 'demasiado', 'cara la', 'caro el']),
    orderTrack:    score(['pedido', 'orden', 'rh-', 'rastrear', 'seguimiento', 'guia', 'guía', 'dónde está', 'donde esta']),
    care:          score(['lavar', 'lavado', 'limpiar', 'cuidado', 'mantenimiento', 'mojar', 'lavadora']),
    international: score(['venezuel', 'ecuador', 'peru', 'mexico', 'internacional', 'exterior', 'otro país', 'otro pais']),
    cancel:        score(['cancelar', 'anular', 'arrepentí', 'arrepenti', 'no quiero']),
    stock:         score(['agotado', 'disponible', 'en stock', 'quedan', 'disponibilidad', 'sin stock']),
  }

  // Shipping: cost vs time — disambiguate
  if (s.shippingCost > 0 || (s.shippingGen > 0 && s.price > 0)) {
    return '$12.000 ciudades principales · $15.000 ciudades intermedias · $18.000 resto del país · Gratis en Acacias 🚚'
  }
  if (s.shippingTime > 0 || s.shippingGen > 0) {
    return pick([
      '2-4 días hábiles en ciudades principales (Bogotá, Medellín, Cali...), 3-5 días en otras 🚚 Te enviamos guía de rastreo',
      'En capitales llega en 2-4 días hábiles. Otras ciudades 3-5 días. Siempre con número de rastreo 🚚',
    ])
  }

  // Order tracking hint
  if (s.orderTrack > 0) {
    return 'Escríbeme tu número de pedido (formato RH-000001) y te digo el estado al momento 📦'
  }

  const responses: Partial<Record<keyof typeof s, string[]>> = {
    price: [
      'Nuestras gorras van de $130.000 a $230.000 COP según el modelo. El precio exacto lo ves en la tienda 🧢',
      'Entre $130.000 y $230.000 dependiendo del diseño — son Goorin Bros originales 🔥',
    ],
    size: [
      'Talla única ajustable — el snap de atrás se adapta de S a XL. Le queda a todas las cabezas sin excepción 🧢',
      'Una sola talla con cierre ajustable. No importa el tamaño de tu cabeza, queda perfecta 🧢',
    ],
    payment: [
      'Nequi, PSE, tarjeta débito/crédito y contraentrega. Con contraentrega la gorra llega primero y pagas en efectivo cuando la recibes 💳',
      'Aceptamos Nequi, PSE, tarjeta (Visa/Mastercard) y contraentrega — la más usada porque pagas cuando la ves 💳',
    ],
    returns: [
      'Cambios por defecto de fábrica dentro de 10 días desde que la recibes. Escríbenos al WhatsApp con fotos del defecto 📸',
      'Solo aceptamos cambios por defecto de fábrica (costura mala, manchas de origen, parche dañado). Plazo: 10 días 📸',
    ],
    authenticity: [
      '100% Goorin Bros originales con etiqueta y empaque oficial. No manejamos réplicas 🔥',
      'Originales garantizados — las mismas que encuentras en tiendas Goorin en EE.UU., con etiqueta y todo 🔥',
    ],
    brand: [
      'Goorin Bros es una marca americana de gorras premium fundada en 1895 en Pittsburgh. 130 años haciendo headwear de primera, famosa por sus parches bordados de animales 🔥',
    ],
    women: [
      'Son unisex — les quedan perfectas a todos. Tenemos muchas clientas que las llevan increíble 🧢',
      'Claro que sí, son unisex. De hecho muchas clientas son fanáticas de Goorin Bros 🧢',
    ],
    security: [
      'Seguro al 100%. Usamos Wompi de Bancolombia — encriptación PCI DSS, tus datos bancarios están protegidos 💳',
      'Totalmente confiable. Wompi (Bancolombia) es la pasarela más segura de Colombia 💳',
    ],
    discount: [
      'No hacemos descuentos individuales. Pero hacemos drops especiales con precio especial — síguenos en @ravenhats.store para enterarte primero 🧢',
    ],
    contact: [
      'WhatsApp: +1 341-213-3624 📱 Respondemos en minutos en horario laboral. Instagram: @ravenhats.store',
    ],
    howToBuy: [
      'Fácil: elige la gorra → Agregar al carrito → Checkout → elige pago. En 2-4 días llega a tu puerta 🧢',
      'Seleccionas en la tienda, agregas al carrito, y en el checkout eliges cómo pagar. Contraentrega es la más fácil 🧢',
    ],
    gift: [
      'El empaque de Goorin Bros ya es especial — perfecto para regalo. Para algo extra cuéntanos por WhatsApp 🧢',
      'Quedan increíble como regalo. El empaque viene bien presentado de fábrica 🧢',
    ],
    material: [
      'Algodón premium y poliéster de alta calidad. Las truckers llevan malla transpirable atrás. Parches bordados con mucho detalle 🧢',
    ],
    priceWhy: [
      'Son Goorin Bros originales — marca americana premium de 1895. El bordado y los materiales no tienen comparación con gorras genéricas 🔥',
      'Calidad real: algodón premium, parches bordados a mano, marca con 130 años de historia. No es una gorra cualquiera 🔥',
    ],
    style: [
      '¿La prefieres más tranquila (colores sólidos) o que destaque (animal print, logos)? Cuéntame y te oriento 🧢',
      'Las hay para todo: streetwear (visera plana, logos), old money (colores sólidos, discreta), animal print (que se nota). ¿Qué buscas? 🧢',
    ],
    products: [
      'Tenemos varias colecciones activas. El catálogo completo lo ves en la tienda con disponibilidad y precios actualizados 🧢',
      '¿Buscas algo específico? Las hay en colores sólidos, animal print y streetwear. Cuéntame qué estilo y te muestro 🧢',
    ],
    care: [
      'Con trapo húmedo suave — nunca en lavadora. Guárdala en lugar seco para que conserve la forma 🧢',
    ],
    international: [
      'Por ahora solo enviamos dentro de Colombia 🇨🇴 No hacemos envíos internacionales aún.',
    ],
    cancel: [
      'Para cancelar escríbenos al WhatsApp con tu número RH- lo antes posible — si no ha salido lo cancelamos sin problema 📦',
    ],
    stock: [
      'La disponibilidad la ves en tiempo real en la tienda. Si algo está agotado, síguenos en @ravenhats.store.store para ver los drops nuevos 🧢',
    ],
  }

  // Pick highest-scoring topic (ignoring shipping already handled above)
  const ranked = (Object.keys(s) as (keyof typeof s)[])
    .filter(k => !['shippingCost', 'shippingTime', 'shippingGen', 'orderTrack'].includes(k))
    .sort((a, b) => s[b] - s[a])

  for (const topic of ranked) {
    if (s[topic] > 0 && responses[topic]) {
      return pick(responses[topic]!)
    }
  }

  // Zero matches — generic helpful default
  return pick([
    '¿Buscas gorra o tienes una duda? 🧢 Cuéntame y te ayudo con precios, envíos o recomendaciones',
    '¿En qué te puedo ayudar? Puedo orientarte con precios, tallas, envíos o recomendaciones 🧢',
    '¿Qué andas buscando? Escríbeme más y te cuento 🧢',
  ])
}

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }
  if (entry.count >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count }
}
