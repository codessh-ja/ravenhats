-- RavenHats MySQL Schema
-- Base de datos para e-commerce de gorras
-- Compatible con MySQL 8.0+

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS ravenhats_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ravenhats_db;

-- =====================================================
-- TABLA: categories (Categorias de productos)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: collections (Colecciones de productos)
-- =====================================================
CREATE TABLE IF NOT EXISTS collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: products (Productos)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  compare_at_price DECIMAL(12, 2),
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  stock INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  category_id INT,
  collection_id INT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  show_in_descuentos BOOLEAN DEFAULT FALSE,
  weight_grams INT,
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_sku (sku),
  INDEX idx_featured (is_featured),
  INDEX idx_active (is_active),
  INDEX idx_show_in_descuentos (show_in_descuentos),
  INDEX idx_price (price),
  INDEX idx_stock (stock),
  FULLTEXT INDEX idx_search (name, description)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: product_images (Imagenes de productos)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id),
  INDEX idx_position (position)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: product_tags (Tags de productos)
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_tags (
  product_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (product_id, tag_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: customers (Clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  document_type ENUM('CC', 'CE', 'NIT', 'PASSPORT') DEFAULT 'CC',
  document_number VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: addresses (Direcciones de envio)
-- =====================================================
CREATE TABLE IF NOT EXISTS addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  label VARCHAR(50),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'Colombia',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer (customer_id),
  INDEX idx_default (is_default)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: orders (Pedidos)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT,
  -- Datos del cliente (copia para historico)
  customer_email VARCHAR(255) NOT NULL,
  customer_first_name VARCHAR(100) NOT NULL,
  customer_last_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20),
  customer_document_type VARCHAR(20),
  customer_document_number VARCHAR(50),
  -- Direccion de envio
  shipping_address_line1 VARCHAR(255) NOT NULL,
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_department VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(50) DEFAULT 'Colombia',
  -- Totales
  subtotal DECIMAL(12, 2) NOT NULL,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  -- Estado
  status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
  payment_status ENUM('pending', 'approved', 'rejected', 'refunded') DEFAULT 'pending',
  -- Metodo de pago
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  -- Envio
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(255),
  tracking_url VARCHAR(500),
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  -- Notas
  customer_notes TEXT,
  admin_notes TEXT,
  -- Control de stock (para evitar doble descuento)
  stock_deducted BOOLEAN DEFAULT FALSE,
  -- Control de recordatorios
  payment_reminder_sent BOOLEAN DEFAULT FALSE,
  -- Control de emails (idempotencia para webhooks)
  confirmation_email_sent BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_order_number (order_number),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: order_items (Items del pedido)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT,
  -- Datos del producto (copia para historico)
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  product_image VARCHAR(500),
  -- Precios
  unit_price DECIMAL(12, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order (order_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: payments (Transacciones de pago - Wompi)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  -- Datos de Wompi
  wompi_transaction_id VARCHAR(255) UNIQUE,
  wompi_reference VARCHAR(255),
  wompi_status VARCHAR(50),
  -- Monto
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  -- Metodo de pago
  payment_method VARCHAR(50),
  payment_method_type VARCHAR(50),
  -- Datos adicionales
  card_last_four VARCHAR(4),
  card_brand VARCHAR(50),
  pse_bank VARCHAR(100),
  -- Respuesta completa de Wompi (JSON)
  raw_response JSON,
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_wompi_transaction (wompi_transaction_id),
  INDEX idx_wompi_reference (wompi_reference),
  INDEX idx_status (wompi_status)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: coupons (Cupones de descuento)
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(12, 2) NOT NULL,
  minimum_order DECIMAL(12, 2) DEFAULT 0,
  maximum_discount DECIMAL(12, 2),
  usage_limit INT,
  usage_count INT DEFAULT 0,
  starts_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active (is_active),
  INDEX idx_dates (starts_at, expires_at)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: admin_users (Usuarios administradores)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: sessions (Sesiones de usuario)
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT,
  user_type ENUM('customer', 'admin') NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  payload TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, user_type),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: newsletter_subscribers (Suscriptores)
-- =====================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: inventory_logs (Historial de inventario)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  change_amount INT NOT NULL,
  reason ENUM('sale', 'restock', 'adjustment', 'return', 'damage') NOT NULL,
  reference_id INT,
  reference_type VARCHAR(50),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id),
  INDEX idx_reason (reason),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: store_config (Configuracion de la tienda)
-- =====================================================
CREATE TABLE IF NOT EXISTS store_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (config_key)
) ENGINE=InnoDB;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Categorias por defecto
INSERT INTO categories (name, slug, description) VALUES
  ('Trucker', 'trucker', 'Gorras trucker con malla transpirable'),
  ('Snapback', 'snapback', 'Gorras snapback con cierre ajustable'),
  ('Fitted', 'fitted', 'Gorras fitted de talla exacta');

-- Colecciones por defecto  
INSERT INTO collections (name, slug, description) VALUES
  ('The Farm', 'the-farm', 'La coleccion iconica de animales'),
  ('Classics', 'classics', 'Disenos atemporales'),
  ('Limited Edition', 'limited-edition', 'Ediciones exclusivas');

-- Tags por defecto
INSERT INTO tags (name, slug) VALUES
  ('animal', 'animal'),
  ('bestseller', 'bestseller'),
  ('limited', 'limited'),
  ('premium', 'premium'),
  ('classic', 'classic'),
  ('new', 'new');

-- Usuario admin por defecto
-- Las credenciales se manejan desde el codigo (ravadmin / ZXbTk3xb6Ow3ZWBrw)
-- INSERT INTO admin_users (email, password_hash, name, role) VALUES
--   ('admin@ravenhats.store', '$2b$10$placeholder', 'Administrador', 'admin');

-- =====================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =====================================================

-- Generar numero de orden
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS generate_order_number(OUT new_order_number VARCHAR(50))
BEGIN
  DECLARE order_count INT;
  SELECT COUNT(*) + 1 INTO order_count FROM orders;
  SET new_order_number = CONCAT('RC-', LPAD(order_count, 6, '0'));
END //
DELIMITER ;

-- Actualizar stock despues de venta
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS update_stock_after_sale(
  IN p_product_id INT,
  IN p_quantity INT,
  IN p_order_id INT
)
BEGIN
  DECLARE current_stock INT;
  
  SELECT stock INTO current_stock FROM products WHERE id = p_product_id FOR UPDATE;
  
  UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;
  
  INSERT INTO inventory_logs (product_id, previous_stock, new_stock, change_amount, reason, reference_id, reference_type)
  VALUES (p_product_id, current_stock, current_stock - p_quantity, -p_quantity, 'sale', p_order_id, 'order');
END //
DELIMITER ;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para calcular subtotal de order_items
DELIMITER //
CREATE TRIGGER IF NOT EXISTS calculate_order_item_subtotal
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.unit_price * NEW.quantity;
END //
DELIMITER ;

-- Trigger para registrar cambios de inventario
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_inventory_change
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
  IF OLD.stock != NEW.stock THEN
    INSERT INTO inventory_logs (product_id, previous_stock, new_stock, change_amount, reason)
    VALUES (NEW.id, OLD.stock, NEW.stock, NEW.stock - OLD.stock, 'adjustment');
  END IF;
END //
DELIMITER ;
