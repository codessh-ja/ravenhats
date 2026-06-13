-- Migracion para agregar soporte de zonas de envio y tarifas por ciudad
-- Ejecutar este script para habilitar tarifas de envio dinamicas

-- Tabla para configurar zonas de envio
CREATE TABLE IF NOT EXISTS shipping_zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zone_name VARCHAR(50) NOT NULL,
  zone_code VARCHAR(20) NOT NULL UNIQUE,
  price DECIMAL(10, 2) NOT NULL DEFAULT 15000,
  is_free BOOLEAN DEFAULT FALSE,
  estimated_days_min INT DEFAULT 3,
  estimated_days_max INT DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla para ciudades y sus zonas
CREATE TABLE IF NOT EXISTS shipping_cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  city_name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  zone_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES shipping_zones(id) ON DELETE SET NULL,
  UNIQUE KEY unique_city_dept (city_name, department)
);

-- Insertar zonas de envio por defecto
INSERT INTO shipping_zones (zone_name, zone_code, price, is_free) VALUES
('Envio Gratis', 'free', 0, TRUE),
('Zona 1 - Ciudades Principales', 'zone1', 12000, FALSE),
('Zona 2 - Ciudades Intermedias', 'zone2', 15000, FALSE),
('Zona 3 - Resto del Pais', 'zone3', 18000, FALSE)
ON DUPLICATE KEY UPDATE zone_name = VALUES(zone_name);

-- Insertar ciudades con envio gratis
INSERT INTO shipping_cities (city_name, department, zone_id) VALUES
('Acacias', 'Meta', (SELECT id FROM shipping_zones WHERE zone_code = 'free')),
('Acacías', 'Meta', (SELECT id FROM shipping_zones WHERE zone_code = 'free'))
ON DUPLICATE KEY UPDATE zone_id = VALUES(zone_id);

-- Insertar ciudades principales (Zona 1)
INSERT INTO shipping_cities (city_name, department, zone_id) VALUES
('Bogotá', 'Cundinamarca', (SELECT id FROM shipping_zones WHERE zone_code = 'zone1')),
('Bogota', 'Cundinamarca', (SELECT id FROM shipping_zones WHERE zone_code = 'zone1')),
('Medellín', 'Antioquia', (SELECT id FROM shipping_zones WHERE zone_code = 'zone1')),
('Medellin', 'Antioquia', (SELECT id FROM shipping_zones WHERE zone_code = 'zone1')),
('Cali', 'Valle del Cauca', (SELECT id FROM shipping_zones WHERE zone_code = 'zone1')),
('Barranquilla', 'Atlántico', (SELECT id FROM shipping_zones WHERE zone_code = 'zone1')),
('Cartagena', 'Bolívar', (SELECT id FROM shipping_zones WHERE zone_code = 'zone1')),
('Bucaramanga', 'Santander', (SELECT id FROM shipping_zones WHERE zone_code = 'zone1'))
ON DUPLICATE KEY UPDATE zone_id = VALUES(zone_id);

-- Insertar ciudades intermedias (Zona 2)
INSERT INTO shipping_cities (city_name, department, zone_id) VALUES
('Pereira', 'Risaralda', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Manizales', 'Caldas', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Armenia', 'Quindío', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Ibagué', 'Tolima', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Ibague', 'Tolima', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Neiva', 'Huila', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Villavicencio', 'Meta', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Santa Marta', 'Magdalena', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Cúcuta', 'Norte de Santander', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Cucuta', 'Norte de Santander', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Pasto', 'Nariño', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Popayán', 'Cauca', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Popayan', 'Cauca', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Tunja', 'Boyacá', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Montería', 'Córdoba', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Monteria', 'Córdoba', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Valledupar', 'Cesar', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2')),
('Sincelejo', 'Sucre', (SELECT id FROM shipping_zones WHERE zone_code = 'zone2'))
ON DUPLICATE KEY UPDATE zone_id = VALUES(zone_id);

-- Agregar campo de costo de envio real a la tabla de ordenes si no existe
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_zone VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS shipping_is_free BOOLEAN DEFAULT FALSE;

-- Indice para busquedas de ciudades
CREATE INDEX IF NOT EXISTS idx_shipping_cities_lookup ON shipping_cities(city_name, department);
