# 🧢 RavenHats

> E-commerce premium de gorras Goorin Bros con asistente de ventas impulsado por inteligencia artificial.

![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)

---

## ✨ ¿Qué es RavenHats?

RavenHats es una tienda online completa construida con Next.js que combina una experiencia de compra fluida con un chatbot de IA que actúa como asesor de estilo personal. Todo en una sola aplicación — tienda, pagos, panel admin y chatbot inteligente.

---

## 🛍️ La tienda

El cliente navega el catálogo, filtra por categoría o colección y agrega productos al carrito. Al hacer checkout paga con su método favorito y recibe confirmación por correo inmediatamente.

| Funcionalidad | Detalle |
|---|---|
| Catálogo | Filtros por categoría, colección y precio |
| Drops | Lanzamientos exclusivos con fecha de salida |
| Carrito | Persistente entre sesiones |
| Pagos | Tarjeta, PSE, Nequi y contraentrega vía Wompi |
| Cuenta | Historial de pedidos y rastreo en tiempo real |
| Descuentos | Sección dedicada con productos en oferta |

---

## 🤖 El chatbot IA

El chatbot es el diferencial del proyecto. Vive como un widget flotante en toda la tienda y reemplaza por completo la sección de preguntas frecuentes tradicional.

**¿Cómo responde?**

Cuando el cliente escribe, el sistema detecta la intención automáticamente y actúa diferente según el caso:

- 🔍 **Busca un producto** → consulta la base de datos en tiempo real y muestra artículos con foto y precio dentro del chat
- 📦 **Rastrea un pedido** → consulta el estado directamente en la base de datos
- ❓ **Pregunta general** → responde con la base de conocimiento de la tienda: políticas, envíos y garantías

**Comportamiento inteligente**

- Lanza mensajes proactivos si el cliente lleva tiempo sin interactuar
- Detecta hesitación y adapta el tono de respuesta
- Aprende: los productos que más veces terminan en compra se priorizan en futuras recomendaciones
- Rate limiting por IP para evitar abuso

---

## 🖥️ Panel de administración

Panel interno con todo lo necesario para operar la tienda día a día:

| Módulo | Descripción |
|---|---|
| Productos | Crear, editar, imágenes, stock y categorías |
| Pedidos | Estado, abonos y pagos pendientes |
| Clientes | Historial de compras y datos de contacto |
| Contabilidad | Ingresos, pagos y reportes exportables |
| Chatbot Analytics | Sesiones, conversiones, intent score y productos más efectivos |

---

## 🛠️ Stack tecnológico

**Frontend**

![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radix-ui)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer)

**Backend & Base de datos**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=flat-square&logo=mysql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

**Servicios externos**

![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=flat-square&logo=google&logoColor=white)
![Wompi](https://img.shields.io/badge/Wompi-00C08B?style=flat-square)
![Resend](https://img.shields.io/badge/Resend-000000?style=flat-square)

**Infraestructura**

![PM2](https://img.shields.io/badge/PM2-2B037A?style=flat-square&logo=pm2)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white)
![Linux](https://img.shields.io/badge/VPS_Linux-FCC624?style=flat-square&logo=linux&logoColor=black)

---

## ⚙️ Requisitos

Para correr el proyecto necesitas Node.js, MySQL 8 y credenciales de:

- **Wompi** — pasarela de pagos colombiana
- **Google Gemini** — modelo de IA para el chatbot
- **Resend** — envío de correos transaccionales

Todas las credenciales van en un archivo `.env` local que **nunca debe subirse al repositorio**.

---

## 🎨 Marca

**RavenHats** — gorras Goorin Bros originales. Colombia.

`dark` · `minimal` · `premium` · `urbano`
