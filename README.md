# RavenHats

E-commerce de gorras Goorin Bros con asistente de ventas impulsado por IA conversacional.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15, React 19, TailwindCSS |
| Componentes | Radix UI, Framer Motion, Lucide Icons |
| Backend | Next.js API Routes (Node.js) |
| Base de datos | MySQL 8 |
| IA / Chatbot | Google Gemini 2.5 Flash |
| Pagos | Wompi (Bancolombia) |
| Email | Resend |
| Deploy | PM2 + Nginx + VPS Linux |

---

## Funcionalidades

### Tienda
- Catálogo con filtros por categoría y colección
- Drops exclusivos con fecha de lanzamiento
- Carrito persistente con Context API
- Checkout completo con validación
- Integración Wompi (tarjeta, PSE, Nequi, contraentrega)
- Webhook de pagos con idempotencia
- Rastreo de pedidos por número de orden
- Cuenta de cliente con historial de compras

### Chatbot IA
- Asistente conversacional con Google Gemini 2.5 Flash
- Búsqueda semántica de productos en tiempo real (RAG-lite)
- Base de conocimiento con políticas, precios y FAQs
- Flujos estructurados: vibes, carrito, rastreo de pedidos
- Scoring de intención de compra
- Detección de hesitación con respuesta adaptativa
- Triggers automáticos de venta por tiempo de sesión
- Sistema de aprendizaje: productos con más conversiones priorizados
- Memoria de sesión con localStorage
- Rate limiting por IP

### Panel Admin
- Dashboard con métricas en tiempo real
- Gestión de productos, pedidos y clientes
- Contabilidad y reportes exportables
- Analytics del chatbot: sesiones, embudo de conversión, intent score
- Configuración del sistema

---

## Arquitectura del chatbot

```
Usuario escribe → Widget detecta intención
       │
       ├── Flujo estructurado (carrito, vibe, rastreo) → Respuesta inmediata
       │
       └── Texto libre → /api/chat/message
                              │
                              ├── Clasifica intención (product/support/order/general)
                              ├── Busca productos en MySQL por keywords
                              ├── Inyecta: STORE_KNOWLEDGE + productos + perfil usuario
                              ├── Llama a Gemini 2.5 Flash (max 200 tokens)
                              └── Retorna respuesta + product IDs sugeridos
```

---

## Estructura del proyecto

```
ravenhats/
├── app/
│   ├── (tienda)/           # Páginas públicas
│   ├── admin/              # Panel administrativo
│   │   └── chatbot/        # Analytics del chatbot IA
│   └── api/
│       ├── chat/message/   # Motor IA — endpoint principal
│       ├── chat/events/    # Tracking de sesiones
│       ├── chatbot/        # Recomendaciones inteligentes
│       ├── admin/          # APIs del panel admin
│       ├── auth/           # Autenticación clientes
│       ├── orders/         # Gestión de órdenes
│       ├── products/       # Catálogo
│       └── webhooks/wompi/ # Webhook de pagos
├── components/
│   ├── chatbot/            # Widget flotante completo
│   ├── admin/              # Componentes del panel admin
│   ├── layout/             # Header, Footer
│   └── ui/                 # Componentes Radix UI
├── lib/
│   ├── chatbot-context.tsx   # Estado global del chatbot
│   ├── chatbot-knowledge.ts  # Base de conocimiento
│   ├── chatbot-scoring.ts    # Scoring de intención de compra
│   ├── chatbot-human-copy.ts # Copy conversacional
│   ├── product-learning.ts   # Sistema de aprendizaje
│   ├── db.ts                 # Pool de conexiones MySQL
│   └── types.ts              # Tipos globales
├── scripts/
│   ├── mysql-schema.sql      # Schema completo de la BD
│   └── *.sql                 # Migraciones
├── ecosystem.config.js       # Configuración PM2
└── nginx.conf                # Reverse proxy Nginx
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# App
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NODE_ENV=production

# MySQL
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=tu_usuario_db
MYSQL_PASSWORD=tu_password_db
MYSQL_DATABASE=tu_nombre_db

# Wompi (pagos)
WOMPI_SANDBOX=false
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_...
WOMPI_PRIVATE_KEY=prv_prod_...
WOMPI_INTEGRITY_KEY=prod_integrity_...
WOMPI_EVENTS_SECRET=prod_events_...

# Gemini IA
GEMINI_API_KEY=...

# Email
RESEND_API_KEY=re_...
```

> Nunca subas el archivo `.env` al repositorio.

---

## Instalación local

```bash
# 1. Clonar
git clone https://github.com/codessh-ja/ravenhats.git
cd ravenhats

# 2. Instalar dependencias
npm install

# 3. Crear .env
cp .env.example .env
# Completar con tus credenciales

# 4. Crear la base de datos
mysql -u root -e "CREATE DATABASE tu_nombre_db CHARACTER SET utf8mb4;"
mysql -u root tu_nombre_db < scripts/mysql-schema.sql

# 5. Correr en desarrollo
npm run dev
```

---

## Despliegue en VPS (Ubuntu)

```bash
# Dependencias
apt update && apt install -y nodejs npm nginx mysql-server git
npm install -g pm2

# Clonar y configurar
cd /var/www && git clone https://github.com/codessh-ja/ravenhats.git
cd ravenhats && cp .env.example .env
# Editar .env con las credenciales reales

# Build
npm install && npm run build

# Nginx
cp nginx.conf /etc/nginx/sites-available/ravenhats
ln -s /etc/nginx/sites-available/ravenhats /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# PM2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

---

## Scripts de base de datos

```bash
# Backup completo
mysqldump -u TU_USUARIO -p --no-tablespaces \
  --routines --triggers --single-transaction \
  TU_BASE_DE_DATOS > backup.sql

# Restaurar
mysql -u TU_USUARIO -p TU_BASE_DE_DATOS < backup.sql
```

---

## Marca

**RavenHats** — gorras Goorin Bros originales. Colombia.

Estética: dark · minimal · premium · urbano
