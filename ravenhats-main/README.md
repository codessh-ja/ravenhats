# RavenHats 🧢

E-commerce premium de gorras Goorin Bros con asistente de ventas impulsado por IA conversacional.

Proyecto real de tienda + trabajo universitario de Aplicación de Inteligencia Artificial.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16, React 19, TailwindCSS v4 |
| Componentes | Radix UI, Framer Motion, Lucide Icons |
| Backend | Next.js API Routes (Node.js) |
| Base de datos | MySQL 8 (mysql2) |
| IA / Chatbot | Google Gemini 2.5 Flash |
| Pagos | Wompi (Bancolombia) |
| Email | Resend |
| Deploy | PM2 + Nginx + VPS Linux |

---

## Funcionalidades

### Tienda
- Catálogo de productos con filtros por categoría y colección
- Drops exclusivos con fecha de lanzamiento
- Carrito persistente con context API
- Checkout completo con validación
- Integración Wompi (tarjeta, PSE, Nequi, contraentrega)
- Webhook de pagos con idempotencia
- Rastreo de pedidos
- Cuenta de cliente con historial

### Chatbot IA
- Asistente conversacional con Google Gemini 2.5 Flash
- Sistema RAG: búsqueda semántica de productos en tiempo real
- Base de conocimiento con políticas, precios y FAQs
- Flujos estructurados: vibes, carrito, rastreo de pedidos
- Sistema de intención de compra con scoring
- Detección de hesitación + respuesta adaptativa
- Triggers automáticos de venta (20s / 40s / 70s)
- Sistema de aprendizaje: productos con más conversiones se muestran primero
- Memoria de sesión con localStorage
- Rate limiting por IP
- Reemplaza completamente la sección FAQ tradicional

### Panel Admin
- Dashboard con métricas en tiempo real
- Gestión de productos, pedidos y clientes
- Contabilidad y reportes exportables
- **Analytics del chatbot**: sesiones, embudo de conversión, productos más efectivos, intent score
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
                              ├── Busca productos en MySQL por keywords (RAG-lite)
                              ├── Inyecta: STORE_KNOWLEDGE + productos + perfil usuario
                              ├── Llama a Gemini 2.5 Flash (max 200 tokens)
                              └── Retorna respuesta + product IDs sugeridos
```

**Ruta de evolución RAG:** reemplazar `searchRelevantProducts()` con búsqueda vectorial en Pinecone/ChromaDB usando OpenAI Embeddings.

---

## Estructura del proyecto

```
ravenhats/
├── app/
│   ├── (tienda)/           # Páginas públicas
│   ├── admin/              # Panel administrativo
│   │   └── chatbot/        # Analytics del chatbot IA
│   └── api/
│       ├── chat/message/   # Motor GPT/Gemini — endpoint principal
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
│   └── ui/                 # Radix UI components
├── lib/
│   ├── chatbot-context.tsx # Estado global del chatbot
│   ├── chatbot-knowledge.ts# Base de conocimiento RAG
│   ├── chatbot-scoring.ts  # Scoring de intención de compra
│   ├── chatbot-human-copy.ts# Copy conversacional
│   ├── product-learning.ts # Sistema de aprendizaje
│   ├── db.ts               # Pool MySQL + tipos
│   └── types.ts            # Tipos globales
├── scripts/
│   ├── mysql-schema.sql    # Schema completo
│   └── *.sql               # Migraciones
├── ecosystem.config.js     # PM2 config
└── nginx.conf              # Nginx reverse proxy
```

---

## Variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# App
NEXT_PUBLIC_APP_URL=https://ravenhats.store
NODE_ENV=production

# MySQL
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=ravenhats_user
MYSQL_PASSWORD=...
MYSQL_DATABASE=ravenhats_db

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
# → completar con las keys reales

# 4. Iniciar MySQL y crear la DB
mysql -u root -e "CREATE DATABASE ravenhats_db CHARACTER SET utf8mb4;"
mysql -u root ravenhats_db < scripts/mysql-schema.sql

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
cd ravenhats && nano .env

# Build
npm install && npm run build

# Nginx
cp nginx.conf /etc/nginx/sites-available/ravenhats
ln -s /etc/nginx/sites-available/ravenhats /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d ravenhats.store -d www.ravenhats.store

# PM2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

---

## Scripts de base de datos

```bash
# Backup completo
mysqldump -u ravenhats_user -p --no-tablespaces \
  --routines --triggers --single-transaction \
  ravenhats_db > backup.sql

# Restaurar
mysql -u ravenhats_user -p ravenhats_db < backup.sql
```

---

## Marca

**RavenHats** — gorras Goorin Bros originales. Colombia.

Estética: dark · minimal · premium · urbano

Bot: asesor de estilo conversacional, tono colombiano casual, respuestas cortas, nunca corporativo.
