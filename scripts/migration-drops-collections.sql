-- =====================================================
-- MIGRACION: Sistema de Drops con Colecciones
-- Para MySQL 5.7+ / MariaDB 10.2+
-- =====================================================
-- NOTA: MySQL no soporta "ADD COLUMN IF NOT EXISTS"
-- Ejecutar cada ALTER por separado. Si la columna ya existe, ignorar el error.
-- =====================================================

USE ravenhats_db;

-- =====================================================
-- 1. MODIFICAR TABLA COLLECTIONS PARA SOPORTAR DROPS
-- =====================================================
-- Ejecutar cada linea por separado:

ALTER TABLE collections ADD COLUMN is_drop BOOLEAN DEFAULT FALSE;
ALTER TABLE collections ADD COLUMN drop_date TIMESTAMP NULL;
ALTER TABLE collections ADD COLUMN drop_end_date TIMESTAMP NULL;
ALTER TABLE collections ADD COLUMN banner_url VARCHAR(500);
ALTER TABLE collections ADD COLUMN video_url VARCHAR(500);
ALTER TABLE collections ADD COLUMN sort_order INT DEFAULT 0;

-- Indices (ejecutar solo si no existen, ignorar error si ya existen)
ALTER TABLE collections ADD INDEX idx_is_drop (is_drop);
ALTER TABLE collections ADD INDEX idx_drop_date (drop_date);
ALTER TABLE collections ADD INDEX idx_sort_order (sort_order);

-- =====================================================
-- 2. CREAR TABLA DROPS_NEWSLETTER (Suscriptores de drops)
-- =====================================================

CREATE TABLE IF NOT EXISTS drops_newsletter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  collection_id INT NULL COMMENT 'Si es null, suscrito a todos los drops',
  is_active BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL,
  UNIQUE KEY unique_email_collection (email, collection_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- 3. ACTUALIZAR COLECCIONES EXISTENTES COMO DROPS
-- =====================================================

-- Marcar colecciones existentes como drops
UPDATE collections 
SET is_drop = TRUE, 
    drop_date = created_at,
    sort_order = id
WHERE is_active = TRUE;

-- =====================================================
-- 4. INSERTAR DROPS DE EJEMPLO (si no existen)
-- =====================================================

-- Drop: The Farm (coleccion iconical de animales)
INSERT INTO collections (name, slug, description, is_drop, drop_date, is_active, sort_order, image_url)
SELECT 'The Farm', 'the-farm', 
  'La coleccion mas iconica de Goorin Bros. Animales bordados con personalidad unica. Cada gorra cuenta una historia.',
  TRUE, NOW(), TRUE, 1,
  'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'the-farm');

-- Drop: Classics
INSERT INTO collections (name, slug, description, is_drop, drop_date, is_active, sort_order, image_url)
SELECT 'Classics', 'classics',
  'Disenos atemporales que nunca pasan de moda. Elegancia y estilo en cada detalle.',
  TRUE, NOW(), TRUE, 2,
  'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'classics');

-- Drop: Limited Edition
INSERT INTO collections (name, slug, description, is_drop, drop_date, is_active, sort_order, image_url)
SELECT 'Limited Edition', 'limited-edition',
  'Ediciones exclusivas de tiraje limitado. Una vez se agotan, no vuelven.',
  TRUE, NOW(), TRUE, 3,
  'https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'limited-edition');

-- Drop: Street Culture
INSERT INTO collections (name, slug, description, is_drop, drop_date, is_active, sort_order, image_url)
SELECT 'Street Culture', 'street-culture',
  'Inspirada en la cultura urbana. Para los que marcan tendencia en las calles.',
  TRUE, NOW(), TRUE, 4,
  'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'street-culture');

-- Drop: Premium Collection
INSERT INTO collections (name, slug, description, is_drop, drop_date, is_active, sort_order, image_url)
SELECT 'Premium Collection', 'premium-collection',
  'Materiales de primera calidad y acabados de lujo. Para los mas exigentes.',
  TRUE, NOW(), TRUE, 5,
  'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'premium-collection');

-- =====================================================
-- 5. QUERY DE CONSULTA PARA VERIFICAR
-- =====================================================

-- Ver todos los drops activos
-- SELECT id, name, slug, description, is_drop, drop_date, image_url, sort_order 
-- FROM collections 
-- WHERE is_drop = TRUE AND is_active = TRUE 
-- ORDER BY sort_order;

-- Ver productos por drop
-- SELECT c.name as drop_name, COUNT(p.id) as product_count
-- FROM collections c
-- LEFT JOIN products p ON p.collection_id = c.id AND p.is_active = TRUE
-- WHERE c.is_drop = TRUE AND c.is_active = TRUE
-- GROUP BY c.id, c.name
-- ORDER BY c.sort_order;

-- =====================================================
-- 6. TABLA PARA CODIGOS DE RECUPERACION DE CONTRASENA
-- =====================================================

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_code (code),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VERIFICACION FINAL
-- =====================================================

-- Verificar estructura
DESCRIBE collections;
DESCRIBE drops_newsletter;
DESCRIBE password_reset_codes;

-- Verificar datos
SELECT id, name, slug, is_drop, drop_date FROM collections WHERE is_active = TRUE;
