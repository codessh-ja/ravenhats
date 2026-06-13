# RavenHats

E-commerce de gorras Goorin Bros con asistente de ventas impulsado por inteligencia artificial.

---

## ¿Qué es?

RavenHats es una tienda online completa que incluye catálogo de productos, carrito de compras, pasarela de pagos y un chatbot de IA que actúa como asesor de estilo. Todo dentro de una sola aplicación con panel de administración integrado.

---

## La tienda

El cliente navega el catálogo y puede filtrar por categoría o colección. Cuando encuentra algo que le interesa lo agrega al carrito y pasa al checkout, donde paga con tarjeta, PSE, Nequi o contraentrega a través de Wompi. Al completar la compra recibe un correo de confirmación y puede rastrear su pedido desde su cuenta.

También hay secciones de **Drops** — lanzamientos exclusivos con fecha — y **Descuentos** con productos en oferta.

---

## El chatbot

El chatbot es el núcleo diferencial del proyecto. Aparece como un widget flotante en toda la tienda y reemplaza completamente la sección de preguntas frecuentes tradicional.

Cuando el cliente escribe, el sistema identifica el tipo de intención: si está buscando un producto, rastreando un pedido o preguntando por políticas. Dependiendo de eso responde de forma distinta:

- Si pregunta por un producto, busca en la base de datos en tiempo real y muestra los artículos con foto y precio dentro del chat.
- Si pregunta por un pedido, consulta directamente el estado en la base de datos.
- Si es una pregunta general, responde usando la base de conocimiento de la tienda: políticas, envíos y garantías.

Las respuestas las genera Google Gemini 2.5 Flash. El tono es colombiano, casual y nunca corporativo.

El chatbot también tiene comportamiento proactivo: si el cliente lleva cierto tiempo sin interactuar, lanza mensajes de enganche automáticamente. Y aprende: los productos que más veces terminan en compra después de ser mencionados en el chat se muestran primero en las próximas recomendaciones.

---

## Panel de administración

Accesible solo para el equipo interno. Tiene todo lo necesario para operar la tienda:

- **Productos** — crear, editar, subir imágenes, gestionar stock y categorías
- **Pedidos** — ver estado, actualizar, gestionar abonos y pagos pendientes
- **Clientes** — historial de compras y datos de contacto
- **Contabilidad** — ingresos, pagos recibidos y exportación de reportes
- **Analytics del chatbot** — sesiones activas, productos más mencionados, tasa de conversión desde el chat e intent score promedio

---

## Tecnologías utilizadas

El frontend está construido con Next.js 15 y React 19, usando TailwindCSS para los estilos y componentes de Radix UI. El backend corre en las API Routes del mismo Next.js conectado a una base de datos MySQL 8. Los pagos pasan por Wompi, los correos los envía Resend y la IA es Google Gemini 2.5 Flash. En producción corre con PM2 sobre un VPS Linux con Nginx como proxy reverso.

---

## Requisitos para correr el proyecto

Necesitas Node.js, MySQL 8 y claves de los siguientes servicios:

- **Wompi** — para procesar pagos
- **Google Gemini** — para el chatbot
- **Resend** — para los correos transaccionales

Todas las credenciales van en un archivo `.env` local que nunca debe subirse al repositorio.

---

## Marca

**RavenHats** — gorras Goorin Bros originales. Colombia.

Estética: dark · minimal · premium · urbano
