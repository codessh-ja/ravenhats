-- =====================================================
-- CHATBOT V2 - Advanced Intent Scoring & Learning System
-- MySQL Migration Script
-- =====================================================

-- Chat sessions table - tracks user sessions with scoring
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL UNIQUE,
  
  -- Intent scoring (0-100)
  intent_score INT DEFAULT 0,
  
  -- State tracking
  vibe ENUM('clean', 'street', 'bold') DEFAULT NULL,
  use_case ENUM('diario', 'salida', 'regalo') DEFAULT NULL,
  products_shown BOOLEAN DEFAULT FALSE,
  user_acted BOOLEAN DEFAULT FALSE,
  
  -- Behavioral signals
  messages_count INT DEFAULT 0,
  products_viewed INT DEFAULT 0,
  products_added_to_cart INT DEFAULT 0,
  time_on_site_seconds INT DEFAULT 0,
  
  -- Price/shipping questions
  asked_price BOOLEAN DEFAULT FALSE,
  asked_shipping BOOLEAN DEFAULT FALSE,
  asked_returns BOOLEAN DEFAULT FALSE,
  
  -- Hesitation markers
  hesitation_detected BOOLEAN DEFAULT FALSE,
  hesitation_keywords_used TEXT DEFAULT NULL,
  
  -- Cart state
  cart_value DECIMAL(12,2) DEFAULT 0,
  cart_items_count INT DEFAULT 0,
  
  -- Outcome tracking
  converted BOOLEAN DEFAULT FALSE,
  conversion_type ENUM('online', 'cod') DEFAULT NULL,
  order_id INT DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  converted_at TIMESTAMP NULL,
  
  INDEX idx_session_id (session_id),
  INDEX idx_intent_score (intent_score),
  INDEX idx_converted (converted),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat events table - tracks every significant event for learning
CREATE TABLE IF NOT EXISTS chat_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  
  -- Event type
  event_type ENUM(
    'message_sent',
    'quick_reply_clicked', 
    'product_viewed',
    'product_added_to_cart',
    'checkout_started',
    'checkout_completed',
    'hesitation_detected',
    'vibe_selected',
    'use_case_selected',
    'price_asked',
    'shipping_asked',
    'returns_asked',
    'support_requested',
    'chat_opened',
    'chat_closed',
    'bot_message_sent',
    'auto_trigger_fired'
  ) NOT NULL,
  
  -- Event details (JSON)
  event_data JSON DEFAULT NULL,
  
  -- Context at time of event
  intent_score_at_event INT DEFAULT 0,
  cart_value_at_event DECIMAL(12,2) DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_session_id (session_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product intelligence table - tracks product performance in chat
CREATE TABLE IF NOT EXISTS chat_product_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  
  -- Impressions & clicks
  times_shown INT DEFAULT 0,
  times_clicked INT DEFAULT 0,
  times_added_to_cart INT DEFAULT 0,
  times_purchased INT DEFAULT 0,
  
  -- Conversion metrics
  show_to_cart_rate DECIMAL(5,4) DEFAULT 0,
  cart_to_purchase_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Revenue generated through chat
  total_revenue DECIMAL(12,2) DEFAULT 0,
  
  -- Last shown
  last_shown_at TIMESTAMP NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_product_id (product_id),
  INDEX idx_show_to_cart_rate (show_to_cart_rate DESC),
  INDEX idx_times_purchased (times_purchased DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message patterns table - for learning effective responses
CREATE TABLE IF NOT EXISTS chat_message_patterns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Pattern matching
  pattern_type ENUM('keyword', 'intent', 'context') NOT NULL,
  pattern_value VARCHAR(255) NOT NULL,
  
  -- Response effectiveness
  times_triggered INT DEFAULT 0,
  times_led_to_conversion INT DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Associated response
  response_template TEXT DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_pattern (pattern_type, pattern_value),
  INDEX idx_conversion_rate (conversion_rate DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily aggregates for analytics
CREATE TABLE IF NOT EXISTS chat_daily_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stat_date DATE NOT NULL,
  
  -- Session metrics
  total_sessions INT DEFAULT 0,
  sessions_with_messages INT DEFAULT 0,
  sessions_with_products_shown INT DEFAULT 0,
  
  -- Conversion metrics
  total_conversions INT DEFAULT 0,
  conversions_online INT DEFAULT 0,
  conversions_cod INT DEFAULT 0,
  
  -- Revenue
  total_revenue DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(12,2) DEFAULT 0,
  
  -- Engagement metrics
  avg_messages_per_session DECIMAL(5,2) DEFAULT 0,
  avg_intent_score DECIMAL(5,2) DEFAULT 0,
  
  -- Hesitation handling
  hesitations_detected INT DEFAULT 0,
  hesitations_converted INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default message patterns based on spec
INSERT INTO chat_message_patterns (pattern_type, pattern_value, response_template) VALUES
('keyword', 'precio', '{"action": "show_price", "urgency": false}'),
('keyword', 'cuanto', '{"action": "show_price", "urgency": false}'),
('keyword', 'envio', '{"action": "show_shipping", "urgency": false}'),
('keyword', 'domicilio', '{"action": "show_shipping", "urgency": false}'),
('keyword', 'devolucion', '{"action": "show_returns", "urgency": false}'),
('keyword', 'cambio', '{"action": "show_returns", "urgency": false}'),
('keyword', 'no se', '{"action": "handle_hesitation", "urgency": true}'),
('keyword', 'despues', '{"action": "handle_hesitation", "urgency": true}'),
('keyword', 'luego', '{"action": "handle_hesitation", "urgency": true}'),
('keyword', 'pensarlo', '{"action": "handle_hesitation", "urgency": true}'),
('keyword', 'caro', '{"action": "handle_hesitation", "urgency": true}'),
('intent', 'high', '{"action": "push_checkout", "urgency": true}'),
('intent', 'medium', '{"action": "show_products", "urgency": false}'),
('intent', 'low', '{"action": "ask_vibe", "urgency": false}'),
('context', 'cart_has_items', '{"action": "push_checkout", "urgency": true}'),
('context', 'products_shown_no_action', '{"action": "ask_preference", "urgency": false}')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
