/**
 * POST /api/chat/message
 *
 * Motor IA del chatbot RavenHats — powered by Google Gemini 2.5 Flash.
 *
 * Flujo RAG:
 *   1. Clasifica la intención del mensaje del usuario
 *   2. Busca productos relevantes en MySQL por keywords (RAG-lite)
 *   3. Construye system prompt con: conocimiento de tienda + productos + contexto del usuario
 *   4. Llama a Gemini 2.5 Flash con historial de conversación
 *   5. Retorna respuesta natural + IDs de productos sugeridos (si aplica)
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { query } from '@/lib/db'
import {
  SYSTEM_PROMPT,
  STORE_KNOWLEDGE,
  extractSearchKeywords,
  classifyMessageIntent,
  formatProductsForContext,
  checkRateLimit,
  matchFAQ,
  generateLocalResponse,
  type ProductContext,
} from '@/lib/chatbot-knowledge'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  message: string
  history?: ConversationMessage[] // últimas ~12 interacciones para contexto
  sessionId?: string
  userContext?: {
    vibe?: string
    useCase?: string
    hasCart?: boolean
    cartTotal?: number
  }
}

// ────────────────────────────────────────────────────────────
// Gemini client — inicialización lazy para evitar errores en build
// ────────────────────────────────────────────────────────────

let geminiClient: GoogleGenerativeAI | null = null

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurada en .env')
    }
    // Inicializar el cliente de Google Generative AI con la API key
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return geminiClient
}

// ────────────────────────────────────────────────────────────
// Groq — LLaMA 3.3 70B gratuito, OpenAI-compatible
// Obtén tu key gratis en https://console.groq.com
// ────────────────────────────────────────────────────────────

async function callGroq(
  systemPrompt: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  message: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts[0]?.text ?? '',
    })),
    { role: 'user', content: message },
  ]

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 200,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

// ────────────────────────────────────────────────────────────
// RAG-lite: búsqueda de productos en DB por keywords
// Para escalar: reemplazar con búsqueda vectorial (Pinecone/ChromaDB)
// ────────────────────────────────────────────────────────────

async function searchRelevantProducts(
  message: string,
  limit = 4
): Promise<ProductContext[]> {
  try {
    const keywords = extractSearchKeywords(message)

    // Sin keywords → devolver productos destacados
    if (keywords.length === 0) {
      const products = await query<ProductContext[]>(
        `SELECT
           id, name, CAST(price AS DECIMAL(10,0)) as price,
           description, stock
         FROM products
         WHERE stock > 0 AND is_active = TRUE
         ORDER BY is_featured DESC, created_at DESC
         LIMIT ${Number(limit)}`
      )
      return products || []
    }

    // Búsqueda por keywords en nombre y descripción del producto
    const likeConditions = keywords
      .slice(0, 4)
      .map(() => '(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ?)')
      .join(' OR ')

    const params: (string | number)[] = []
    keywords.slice(0, 4).forEach(k => {
      params.push(`%${k}%`)
      params.push(`%${k}%`)
    })

    const products = await query<ProductContext[]>(
      `SELECT
         p.id, p.name, CAST(p.price AS DECIMAL(10,0)) as price,
         p.description, p.stock,
         COALESCE(c.name, '') as category
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.stock > 0 AND p.is_active = TRUE AND (${likeConditions})
       ORDER BY p.is_featured DESC
       LIMIT ${Number(limit)}`,
      params
    )

    // Fallback a productos destacados si no hay coincidencias
    if (!products || products.length === 0) {
      const fallback = await query<ProductContext[]>(
        `SELECT id, name, CAST(price AS DECIMAL(10,0)) as price, description, stock
         FROM products
         WHERE stock > 0 AND is_active = TRUE
         ORDER BY is_featured DESC LIMIT ${Number(limit)}`
      )
      return fallback || []
    }

    return products
  } catch (error) {
    console.error('[chat/message] Error buscando productos:', error)
    return []
  }
}

// ────────────────────────────────────────────────────────────
// Handler principal
// ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let cleanMessage = ''
  let intent: ReturnType<typeof classifyMessageIntent> = 'general'

  try {
    // Rate limiting por IP — 20 mensajes/minuto
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const { allowed, remaining } = checkRateLimit(ip)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados mensajes. Espera un momento.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      )
    }

    // Validar y sanitizar el body
    const body = (await request.json()) as ChatRequest
    const { message, history = [], sessionId: _sessionId, userContext } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    cleanMessage = message.trim().slice(0, 500)

    // Clasificar intención para decidir si buscar productos
    intent = classifyMessageIntent(cleanMessage)

    // ── RAG: inyectar contexto de productos si es relevante ──
    let productContext = ''
    let suggestedProductIds: string[] = []

    if (intent === 'product' || intent === 'general') {
      const products = await searchRelevantProducts(cleanMessage, 4)
      if (products.length > 0) {
        productContext = formatProductsForContext(products)
        suggestedProductIds = products.slice(0, 3).map(p => String(p.id))
      }
    }

    // ── Contexto del usuario (vibe, carrito, uso) ──
    let userContextStr = ''
    if (userContext) {
      const parts: string[] = []
      if (userContext.vibe) parts.push(`Estilo preferido: ${userContext.vibe}`)
      if (userContext.useCase) parts.push(`Caso de uso: ${userContext.useCase}`)
      if (userContext.hasCart && userContext.cartTotal) {
        parts.push(
          `El cliente tiene productos en el carrito ($${userContext.cartTotal.toLocaleString('es-CO')}). Empujarlo suavemente al checkout.`
        )
      }
      if (parts.length > 0) {
        userContextStr = `\n## CONTEXTO DEL CLIENTE:\n${parts.join('\n')}`
      }
    }

    // ── System prompt completo con RAG ──
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n## CONOCIMIENTO DE LA TIENDA:\n${STORE_KNOWLEDGE}${productContext}${userContextStr}`

    // ── Convertir historial al formato de Gemini ──
    // Gemini requiere que el historial empiece con role 'user' (nunca 'model')
    const rawHistory = history.slice(-12).map(m => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }))
    // Si el historial no tiene mensajes de usuario, pasarlo vacío (Gemini exige empezar con 'user')
    const firstUserIdx = rawHistory.findIndex(h => h.role === 'user')
    const geminiHistory = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : []

    // ── 1. Intentar Groq (LLaMA 3.3 70B — gratis) ──
    let responseText = ''
    let lastError: Error | null = null

    if (process.env.GROQ_API_KEY) {
      try {
        responseText = await callGroq(fullSystemPrompt, geminiHistory, cleanMessage)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.warn('[chat/message] Groq no disponible:', lastError.message)
      }
    }

    // ── 2. Fallback a Gemini si Groq no respondió ──
    if (!responseText && process.env.GEMINI_API_KEY) {
      const genAI = getGeminiClient()
      const generationConfig = { maxOutputTokens: 200, temperature: 0.7, topP: 0.9, topK: 40 }
      const modelCandidates = [
        { model: 'gemini-2.0-flash',    apiVersion: 'v1beta' },
        { model: 'gemini-1.5-flash',    apiVersion: 'v1'     },
        { model: 'gemini-1.5-flash-8b', apiVersion: 'v1'     },
      ] as const

      for (const { model, apiVersion } of modelCandidates) {
        try {
          const geminiModel = genAI.getGenerativeModel(
            { model, systemInstruction: fullSystemPrompt },
            { apiVersion }
          )
          const chat = geminiModel.startChat({ history: geminiHistory, generationConfig })
          const result = await chat.sendMessage(cleanMessage)
          responseText = result.response.text()?.trim() ?? ''
          if (responseText) break
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          const msg = lastError.message
          if (
            msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('429') || msg.includes('not found') || msg.includes('404')
          ) {
            console.warn(`[chat/message] ${model} no disponible, probando siguiente...`)
            continue
          }
          throw lastError
        }
      }
    }

    // ── 3. Si ninguna IA respondió, usar dataset local ──
    if (!responseText && lastError) {
      const faqFallback = matchFAQ(cleanMessage)
      if (faqFallback) {
        return NextResponse.json({
          message: faqFallback,
          suggestedProductIds: [],
          intent,
        })
      }
      throw lastError
    }

    if (!responseText) {
      return NextResponse.json({
        message: 'Escríbeme por WhatsApp y te ayudo en un segundo 🧢',
        suggestedProductIds: [],
        intent,
      })
    }

    // Determinar si se deben mostrar tarjetas de producto
    const mentionsProducts = intent === 'product' && suggestedProductIds.length > 0
    const mentionsCheckout = /checkout|pagar|carrito|contraentrega/i.test(responseText)

    return NextResponse.json(
      {
        message: responseText,
        suggestedProductIds: mentionsProducts ? suggestedProductIds : [],
        intent,
        mentionsCheckout,
      },
      {
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      }
    )
  } catch (error: unknown) {
    console.error('[chat/message] Error completo:', error instanceof Error ? error.message : JSON.stringify(error))

    // API key no configurada
    if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        {
          message:
            'El asistente IA no está configurado aún. Escríbenos por WhatsApp 🧢',
          suggestedProductIds: [],
          intent: 'general',
          error: 'API key not configured',
        },
        { status: 503 }
      )
    }

    // Cuota agotada — responder con dataset local
    if (
      error instanceof Error &&
      (error.message.includes('quota') ||
        error.message.includes('RESOURCE_EXHAUSTED') ||
        error.message.includes('429') ||
        error.message.includes('fetch'))
    ) {
      const localReply = matchFAQ(cleanMessage) || generateLocalResponse(cleanMessage)
      return NextResponse.json({
        message: localReply,
        suggestedProductIds: [],
        intent,
      })
    }

    // Fallback genérico — siempre responder con dataset
    return NextResponse.json({
      message: matchFAQ(cleanMessage) || generateLocalResponse(cleanMessage),
      suggestedProductIds: [],
      intent: 'general',
    })
  }
}
