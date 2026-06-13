'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react'
import { Product } from './types'
import { 
  ChatSessionState, 
  createInitialSessionState, 
  updateSessionState,
  calculateIntentScore,
  getIntentLevel,
  getRecommendedAction,
  analyzeMessage
} from './chatbot-scoring'

// State machine states (legacy)
export type ChatState = 
  | 'idle'
  | 'browsing'
  | 'recommending'
  | 'cart'
  | 'checkout_push'
  | 'tracking'
  | 'support'

// PASO 16: Step-based navigation for controlled menu flow
export type ChatStep = 'init' | 'vibe' | 'products' | 'cart' | 'checkout'

// User intent levels for conversion optimization
export type IntentLevel = 'low' | 'medium' | 'high'

// User profile for conversion tracking
export interface UserProfile {
  intent: IntentLevel
  hesitation: boolean
  vibe?: 'clean' | 'street' | 'bold'
  useCase?: 'diario' | 'salida' | 'regalo'
  viewedProducts: Product[]
  cartValue: number
  messagesCount: number
  timeOnSite: number
  hasAskedPrice: boolean
  hasAskedShipping: boolean
  hasClickedProduct: boolean
  hasAddedToCart: boolean
  sessionStart: number
  // New state flags per spec
  productsShown: boolean
  userActed: boolean
}

export interface ChatMessage {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: number
  quickReplies?: QuickReply[]
  products?: Product[]
  orderStatus?: OrderStatus
  cartItems?: { product: Product; quantity: number }[]
  isTyping?: boolean
  isUrgent?: boolean // For checkout push messages
}

export interface QuickReply {
  label: string
  action: string
  payload?: Record<string, unknown>
  isPrimary?: boolean // Highlight important actions
}

export interface OrderStatus {
  orderNumber: string
  status: string
  statusLabel: string
}

interface ChatMemory {
  lastViewedProducts: Product[]
  userIntent: string | null
  cartItemCount: number
  lastInteraction: number
}

interface ChatbotContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  messages: ChatMessage[]
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  state: ChatState
  setState: (state: ChatState) => void
  // PASO 16: Step-based navigation
  step: ChatStep
  setStep: (step: ChatStep) => void
  goBack: () => void
  memory: ChatMemory
  updateMemory: (updates: Partial<ChatMemory>) => void
  isTyping: boolean
  setIsTyping: (typing: boolean) => void
  sendUserMessage: (text: string) => void
  handleQuickReply: (action: string, payload?: Record<string, unknown>) => void
  trackProduct: (product: Product) => void
  // Conversion tracking
  userProfile: UserProfile
  updateUserProfile: (updates: Partial<UserProfile>) => void
  detectIntent: () => IntentLevel
  detectHesitation: (text: string) => boolean
  triggerCheckoutPush: () => void
  // V2 - Advanced scoring
  sessionState: ChatSessionState
  getIntentScore: () => number
  getRecommendation: () => { action: string; urgency: boolean; message?: string }
  trackEvent: (eventType: string, eventData?: Record<string, unknown>) => void
  trackConversion: (type: 'online' | 'cod', orderId?: number, total?: number, productIds?: number[]) => void
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined)

const CHATBOT_STORAGE_KEY = 'raven_chatbot_memory'
const USER_PROFILE_KEY = 'raven_user_profile'
const SESSION_ID_KEY = 'raven_chat_session_id'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateId()
  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
    if (!sessionId) {
      sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    }
    return sessionId
  } catch {
    return generateId()
  }
}

function getStoredMemory(): ChatMemory {
  if (typeof window === 'undefined') {
    return {
      lastViewedProducts: [],
      userIntent: null,
      cartItemCount: 0,
      lastInteraction: Date.now()
    }
  }
  try {
    const stored = localStorage.getItem(CHATBOT_STORAGE_KEY)
    if (!stored) return {
      lastViewedProducts: [],
      userIntent: null,
      cartItemCount: 0,
      lastInteraction: Date.now()
    }
    return JSON.parse(stored)
  } catch {
    return {
      lastViewedProducts: [],
      userIntent: null,
      cartItemCount: 0,
      lastInteraction: Date.now()
    }
  }
}

function saveMemory(memory: ChatMemory): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(memory))
  } catch {
    // Ignore storage errors
  }
}

function getStoredUserProfile(): UserProfile {
  const defaultProfile: UserProfile = {
    intent: 'low',
    hesitation: false,
    viewedProducts: [],
    cartValue: 0,
    messagesCount: 0,
    timeOnSite: 0,
    hasAskedPrice: false,
    hasAskedShipping: false,
    hasClickedProduct: false,
    hasAddedToCart: false,
    sessionStart: Date.now(),
    productsShown: false,
    userActed: false
  }
  
  if (typeof window === 'undefined') return defaultProfile
  
  try {
    const stored = localStorage.getItem(USER_PROFILE_KEY)
    if (!stored) return defaultProfile
    const parsed = JSON.parse(stored)
    // Reset session if more than 30 min ago
    if (Date.now() - parsed.sessionStart > 30 * 60 * 1000) {
      return { ...defaultProfile, sessionStart: Date.now() }
    }
    return { ...defaultProfile, ...parsed }
  } catch {
    return defaultProfile
  }
}

function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // Ignore storage errors
  }
}

// Hesitation detection keywords (Spanish)
const HESITATION_KEYWORDS = [
  'no se', 'no sé', 'despues', 'después', 'luego', 'mas tarde', 'más tarde',
  'es seguro', 'seguro?', 'confiable', 'sera que', 'será que', 'no estoy seguro',
  'lo pienso', 'dejame pensar', 'déjame pensar', 'tal vez', 'quiza', 'quizá',
  'caro', 'muy caro', 'costoso', 'economico', 'barato', 'descuento'
]

// High intent keywords
const HIGH_INTENT_KEYWORDS = [
  'precio', 'cuanto', 'cuánto', 'cuesta', 'vale', 'envio', 'envío', 
  'domicilio', 'llega', 'demora', 'tarda', 'comprar', 'pagar', 'contraentrega',
  'efectivo', 'tarjeta', 'nequi', 'pse', 'checkout', 'finalizar'
]

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [state, setState] = useState<ChatState>('idle')
  const [step, setStep] = useState<ChatStep>('init')
  const [memory, setMemory] = useState<ChatMemory>(getStoredMemory)
  const [isTyping, setIsTyping] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile>(getStoredUserProfile)
  const [sessionState, setSessionState] = useState<ChatSessionState>(() => 
    createInitialSessionState(getOrCreateSessionId())
  )
  const sessionIdRef = useRef<string>(sessionState.sessionId)
  
  const goBack = useCallback(() => {
    setStep('init')
    setMessages([])
  }, [])

  // Track event to backend (fire and forget)
  const trackEventToBackend = useCallback(async (
    eventType: string, 
    eventData?: Record<string, unknown>
  ) => {
    try {
      await fetch('/api/chat/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          eventType,
          eventData,
          intentScoreAtEvent: sessionState.intentScore,
          cartValueAtEvent: sessionState.cartValue
        })
      })
    } catch {
      // Silently fail - don't break UX for analytics
    }
  }, [sessionState.intentScore, sessionState.cartValue])

  // Save session state to backend periodically
  const saveSessionToBackend = useCallback(async (state: ChatSessionState) => {
    try {
      await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          state
        })
      })
    } catch {
      // Silently fail
    }
  }, [])

  // Load memory from storage on mount
  useEffect(() => {
    const storedMemory = getStoredMemory()
    setMemory(storedMemory)
    const storedProfile = getStoredUserProfile()
    setUserProfile(storedProfile)
  }, [])

  // Save memory when it changes
  useEffect(() => {
    saveMemory(memory)
  }, [memory])

  // Save user profile when it changes
  useEffect(() => {
    saveUserProfile(userProfile)
  }, [userProfile])

  // Update time on site every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setUserProfile(prev => ({
        ...prev,
        timeOnSite: Math.floor((Date.now() - prev.sessionStart) / 1000)
      }))
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }))
  }, [])

  // V2 - Track event and update session state
  const trackEvent = useCallback((
    eventType: string,
    eventData?: Record<string, unknown>
  ) => {
    // Map to session state event type
    let stateEventType: 'message' | 'view_product' | 'add_to_cart' | 'vibe_selected' | 'use_case_selected' | 'quick_reply' = 'quick_reply'
    
    if (eventType === 'message_sent') stateEventType = 'message'
    else if (eventType === 'product_viewed') stateEventType = 'view_product'
    else if (eventType === 'product_added_to_cart') stateEventType = 'add_to_cart'
    else if (eventType === 'vibe_selected') stateEventType = 'vibe_selected'
    else if (eventType === 'use_case_selected') stateEventType = 'use_case_selected'

    // Update local session state
    setSessionState(prev => {
      const newState = updateSessionState(prev, { type: stateEventType, data: eventData })
      // Save to backend
      saveSessionToBackend(newState)
      return newState
    })

    // Track to backend
    trackEventToBackend(eventType, eventData)
  }, [trackEventToBackend, saveSessionToBackend])

  // V2 - Track conversion
  const trackConversion = useCallback(async (
    type: 'online' | 'cod',
    orderId?: number,
    total?: number,
    productIds?: number[]
  ) => {
    try {
      await fetch('/api/chat/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          conversionType: type,
          orderId,
          orderTotal: total,
          productIds
        })
      })
    } catch {
      // Silently fail
    }
  }, [])

  // V2 - Get current intent score
  const getIntentScore = useCallback(() => {
    return calculateIntentScore(sessionState)
  }, [sessionState])

  // V2 - Get recommended action based on current state
  const getRecommendation = useCallback(() => {
    return getRecommendedAction(sessionState)
  }, [sessionState])

// POINT-BASED INTENT SCORING per spec:
  // precio/cuanto → +3, envio/llega → +2, quiero/comprar → +4
  // click producto → +2, add to cart → +4
  // if score >= 5 → HIGH, if score >= 2 → MEDIUM, else LOW
  const detectIntent = useCallback((): IntentLevel => {
  const { hasAskedPrice, hasAskedShipping, hasClickedProduct, hasAddedToCart } = userProfile
  
  let score = 0
  
  // Per spec scoring
  if (hasAddedToCart) score += 4      // add to cart → +4
  if (hasAskedPrice) score += 3       // precio/cuanto → +3
  if (hasAskedShipping) score += 2    // envio/llega → +2
  if (hasClickedProduct) score += 2   // click producto → +2
  
  // HIGH INTENT: score >= 5
  if (score >= 5) return 'high'
  
  // MEDIUM INTENT: score >= 2
  if (score >= 2) return 'medium'
  
  // LOW INTENT: score < 2
  return 'low'
  }, [userProfile])

  // Detect hesitation from user message
  const detectHesitation = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase()
    return HESITATION_KEYWORDS.some(keyword => lowerText.includes(keyword))
  }, [])

  // Check if message contains high intent signals
  const checkHighIntent = useCallback((text: string): { hasPrice: boolean; hasShipping: boolean } => {
    const lowerText = text.toLowerCase()
    const priceKeywords = ['precio', 'cuanto', 'cuánto', 'cuesta', 'vale']
    const shippingKeywords = ['envio', 'envío', 'domicilio', 'llega', 'demora', 'tarda']
    
    return {
      hasPrice: priceKeywords.some(k => lowerText.includes(k)),
      hasShipping: shippingKeywords.some(k => lowerText.includes(k))
    }
  }, [])

  // Trigger checkout push (called externally by automatic triggers)
  const triggerCheckoutPush = useCallback(() => {
    // Don't push if already in checkout_push state or cart is empty
    if (state === 'checkout_push' || memory.cartItemCount === 0) return
    
    setState('checkout_push')
  }, [state, memory.cartItemCount])

  // Welcome is handled by the widget component, not here

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, newMessage])
    setMemory(prev => ({ ...prev, lastInteraction: Date.now() }))
    
    // Track message count
    if (message.type === 'user') {
      setUserProfile(prev => ({ ...prev, messagesCount: prev.messagesCount + 1 }))
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const updateMemory = useCallback((updates: Partial<ChatMemory>) => {
    setMemory(prev => ({ ...prev, ...updates }))
  }, [])

  const trackProduct = useCallback((product: Product) => {
    setMemory(prev => {
      const existing = prev.lastViewedProducts.filter(p => p.id !== product.id)
      return {
        ...prev,
        lastViewedProducts: [product, ...existing].slice(0, 5)
      }
    })
    // Mark that user clicked a product - medium intent signal
    setUserProfile(prev => ({ ...prev, hasClickedProduct: true }))
  }, [])

  const sendUserMessage = useCallback((text: string) => {
    addMessage({ type: 'user', content: text })
    
    // Check for high intent signals
    const { hasPrice, hasShipping } = checkHighIntent(text)
    if (hasPrice) {
      setUserProfile(prev => ({ ...prev, hasAskedPrice: true }))
    }
    if (hasShipping) {
      setUserProfile(prev => ({ ...prev, hasAskedShipping: true }))
    }
    
    // Check for hesitation
    if (detectHesitation(text)) {
      setUserProfile(prev => ({ ...prev, hesitation: true }))
    }
  }, [addMessage, checkHighIntent, detectHesitation])

  const handleQuickReply = useCallback((action: string, payload?: Record<string, unknown>) => {
    // Handle different quick reply actions
    switch (action) {
      case 'browse':
        setState('browsing')
        updateMemory({ userIntent: 'browsing' })
        break
      case 'recommend':
        setState('recommending')
        updateMemory({ userIntent: 'recommendation' })
        break
      case 'track_order':
        setState('tracking')
        updateMemory({ userIntent: 'tracking' })
        break
      case 'support':
        setState('support')
        updateMemory({ userIntent: 'support' })
        break
      case 'checkout':
      case 'go_checkout':
        setState('checkout_push')
        updateMemory({ userIntent: 'checkout' })
        break
      case 'add_to_cart':
        // Mark high intent when adding to cart
        setUserProfile(prev => ({ ...prev, hasAddedToCart: true }))
        break
      default:
        break
    }
  }, [setState, updateMemory])

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        addMessage,
        clearMessages,
        state,
        setState,
        step,
        setStep,
        goBack,
        memory,
        updateMemory,
        isTyping,
        setIsTyping,
        sendUserMessage,
        handleQuickReply,
        trackProduct,
        userProfile,
        updateUserProfile,
        detectIntent,
        detectHesitation,
        triggerCheckoutPush,
        // V2 - Advanced scoring
        sessionState,
        getIntentScore,
        getRecommendation,
        trackEvent,
        trackConversion
      }}
    >
      {children}
    </ChatbotContext.Provider>
  )
}

export function useChatbot() {
  const context = useContext(ChatbotContext)
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider')
  }
  return context
}
