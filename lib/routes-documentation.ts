/**
 * ============================================================
 * RAVENHATS - API ROUTES & EMAIL TRIGGERS DOCUMENTATION
 * ============================================================
 * 
 * This file documents all API routes, their purposes, and what
 * emails they trigger. Use this as the single source of truth
 * for understanding the system's data flow.
 * 
 * CRITICAL RULES:
 * 1. Webhook is the ONLY source of truth for Wompi payments
 * 2. Frontend NEVER confirms payments directly
 * 3. Admin NEVER forces payment approval
 * 4. All emails go through sendOrderEmail() centralized system
 * 5. Email flags prevent duplicate sends
 * ============================================================
 */

// ============================================================
// ROUTE DOCUMENTATION TYPE
// ============================================================

export interface RouteDocumentation {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  description: string
  triggers: {
    email?: string
    dbUpdate?: string
    stockChange?: boolean
    accounting?: boolean
  }
  requestData?: string
  responseData?: string
  notes?: string
}

// ============================================================
// WEBHOOK ROUTES - Source of Truth for Payments
// ============================================================

export const webhookRoutes: RouteDocumentation[] = [
  {
    path: '/api/webhooks/wompi',
    method: 'POST',
    description: 'Wompi payment webhook - SINGLE source of truth for payment confirmation',
    triggers: {
      email: 'order_confirmed (on APPROVED status)',
      dbUpdate: 'orders.payment_status, payments table, accounting_transactions',
      stockChange: true,
      accounting: true,
    },
    requestData: 'Wompi webhook payload with transaction data',
    responseData: '{ received: true, processed: true }',
    notes: `
      CRITICAL: This is the ONLY authorized endpoint to confirm Wompi payments.
      
      Flow for APPROVED status:
      1. Verify webhook signature
      2. Check idempotency (prevent duplicate processing)
      3. Extract order number from payment reference
      4. Update order payment_status to 'approved'
      5. Update order status to 'confirmed' if was 'pending'
      6. Deduct stock from products
      7. Create payment record
      8. Register in accounting
      9. Send order_confirmed email to customer (with flag check)
      10. Send admin dispatch email
      
      SAFEGUARDS:
      - Rejects COD orders (they have their own flow)
      - Checks confirmation_email_sent flag before sending
      - Updates flag ONLY after successful email send
      - Logs all attempts for audit trail
    `
  }
]

// ============================================================
// ORDER ROUTES
// ============================================================

export const orderRoutes: RouteDocumentation[] = [
  {
    path: '/api/orders',
    method: 'POST',
    description: 'Create new order (customer checkout)',
    triggers: {
      email: 'order_cod_confirmed (for COD orders), admin_new_order',
      dbUpdate: 'orders, order_items tables',
      stockChange: false, // Stock deducted only on payment confirmation
    },
    requestData: 'Order data: customer, shipping, items, totals, paymentMethod',
    responseData: '{ success: true, orderId, orderNumber }',
    notes: `
      Creates order with status:
      - COD: status='confirmed', payment_status='pending'
      - Online: status='pending', payment_status='pending'
      
      COD Flow: Sends confirmation email immediately
      Online Flow: Waits for Wompi webhook to send confirmation
    `
  },
  {
    path: '/api/orders',
    method: 'GET',
    description: 'Get order by orderNumber or list orders',
    triggers: {},
    requestData: 'Query param: ?orderNumber=RH-XXXXXX',
    responseData: 'Order details with items, customer, shipping, payment info',
    notes: 'Returns paid_amount from Wompi if available, prevents showing $0'
  },
  {
    path: '/api/orders/verify-payment',
    method: 'POST',
    description: 'Verify payment status with Wompi API (read-only)',
    triggers: {},
    requestData: '{ orderNumber }',
    responseData: '{ status, transactionId, ... } or { pendingPayment: true }',
    notes: `
      READ-ONLY verification. Does NOT update database.
      Does NOT send emails.
      Frontend uses this to show payment status UI.
      Only webhook can confirm payments.
    `
  }
]

// ============================================================
// ADMIN ORDER ROUTES
// ============================================================

export const adminOrderRoutes: RouteDocumentation[] = [
  {
    path: '/api/admin/orders',
    method: 'GET',
    description: 'List all orders with filters (admin)',
    triggers: {},
    requestData: 'Query params: status, paymentStatus, search, id (for details)',
    responseData: 'Orders list with counts, or order items + history if id provided',
  },
  {
    path: '/api/admin/orders',
    method: 'PUT',
    description: 'Update order (multiple actions)',
    triggers: {
      email: 'Depends on action - see notes',
      dbUpdate: 'orders table, order_status_history',
    },
    requestData: '{ id, action, ...actionData }',
    responseData: '{ success: true, message }',
    notes: `
      ACTIONS:
      
      1. verifyWompi - Read-only check with Wompi API
         - Does NOT send emails (webhook handles that)
         - Syncs status if discrepancy found
      
      2. confirmCOD - COD order actions
         - codAction='confirm': Sends order_cod_confirmed + admin_dispatch
         - codAction='markPaid': Sends order_delivered, registers accounting
         - codAction='cancel': Updates status to cancelled
      
      3. updateStatus - Change order status
         - processing: Sends order_preparing (with email_preparing_sent flag check)
         - delivered: Sends order_delivered (with email_delivered_sent flag check)
         - confirmed: Sends admin_dispatch
      
      4. updateTracking - Add/update tracking number
         - Sends order_shipped (with email_shipped_sent flag check)
         - Auto-changes status to 'shipped' if needed
      
      5. resendEmail - Manually resend specific email type
         - confirmed, preparing, shipped, delivered
         - Updates corresponding email flag
         - Safe retry mechanism
      
      6. updateNotes - Update admin notes only
    `
  },
  {
    path: '/api/admin/orders',
    method: 'DELETE',
    description: 'Delete order and all associated records',
    triggers: {
      dbUpdate: 'Cascades: order_items, payments, accounting, status_history',
    },
    requestData: 'Query param: ?id=123',
    responseData: '{ success: true }',
    notes: 'Permanent deletion. Use with caution. Does NOT send emails.'
  }
]

// ============================================================
// AUTH ROUTES
// ============================================================

export const authRoutes: RouteDocumentation[] = [
  {
    path: '/api/auth/register',
    method: 'POST',
    description: 'Register new customer account',
    triggers: {
      email: 'welcome_user',
      dbUpdate: 'customers table',
    },
    requestData: '{ email, password, firstName, lastName, phone }',
    responseData: '{ success: true, customer }',
    notes: 'Links existing orders by email. Auto-login after registration.'
  },
  {
    path: '/api/auth/login',
    method: 'POST',
    description: 'Customer login',
    triggers: {},
    requestData: '{ email, password }',
    responseData: '{ success: true, customer }',
    notes: 'Sets secure HTTP-only session cookie'
  },
  {
    path: '/api/auth/logout',
    method: 'POST',
    description: 'Customer logout',
    triggers: {},
    requestData: 'None',
    responseData: '{ success: true }',
    notes: 'Clears session cookie'
  },
  {
    path: '/api/auth/session',
    method: 'GET',
    description: 'Get current customer session',
    triggers: {},
    requestData: 'None',
    responseData: '{ authenticated: boolean, customer? }',
  },
  {
    path: '/api/auth/reset-password/request',
    method: 'POST',
    description: 'Request password reset code',
    triggers: {
      email: 'password_reset (code email)',
      dbUpdate: 'customers.reset_code, reset_expires',
    },
    requestData: '{ email }',
    responseData: '{ success: true }',
    notes: 'Always returns success (does not reveal if email exists)'
  },
  {
    path: '/api/auth/reset-password/verify',
    method: 'POST',
    description: 'Verify reset code',
    triggers: {},
    requestData: '{ email, code }',
    responseData: '{ valid: boolean }',
  },
  {
    path: '/api/auth/reset-password/confirm',
    method: 'POST',
    description: 'Set new password after reset',
    triggers: {
      email: 'password_changed',
      dbUpdate: 'customers.password_hash, clears reset_code',
    },
    requestData: '{ email, code, newPassword }',
    responseData: '{ success: true }',
  },
  {
    path: '/api/auth/change-password',
    method: 'POST',
    description: 'Change password (logged in user)',
    triggers: {
      email: 'password_changed',
      dbUpdate: 'customers.password_hash',
    },
    requestData: '{ currentPassword, newPassword }',
    responseData: '{ success: true }',
    notes: 'Requires valid session cookie'
  }
]

// ============================================================
// CRON ROUTES
// ============================================================

export const cronRoutes: RouteDocumentation[] = [
  {
    path: '/api/cron/payment-reminders',
    method: 'GET',
    description: 'Send payment reminder emails for pending orders',
    triggers: {
      email: 'payment_reminder (for orders 24-48 hours old)',
      dbUpdate: 'orders.payment_reminder_sent flag',
    },
    requestData: 'Vercel cron secret via Authorization header',
    responseData: '{ sent: number }',
    notes: `
      Conditions:
      - Order created 24+ hours ago
      - payment_status = 'pending'
      - payment_method != 'COD'
      - payment_reminder_sent = false
      
      Sets flag to prevent duplicate reminders.
    `
  }
]

// ============================================================
// EMAIL TRIGGER SUMMARY
// ============================================================

export const emailTriggerSummary = {
  // Order lifecycle emails
  order_confirmed: {
    description: 'Payment confirmed (Wompi approved)',
    triggers: ['/api/webhooks/wompi (APPROVED)', '/api/admin/orders (resendEmail)'],
    flagColumn: 'confirmation_email_sent / email_confirmed_sent',
    template: 'Premium design with product images, order details, next steps'
  },
  order_cod_confirmed: {
    description: 'COD order confirmed for dispatch',
    triggers: ['/api/orders (COD payment)', '/api/admin/orders (confirmCOD)'],
    flagColumn: 'confirmation_email_sent / email_confirmed_sent',
    template: 'Blue COD banner, shipping address, pay-on-delivery reminder'
  },
  order_preparing: {
    description: 'Order being prepared',
    triggers: ['/api/admin/orders (updateStatus to processing)'],
    flagColumn: 'email_preparing_sent',
    template: 'Blue preparation banner, progress steps'
  },
  order_shipped: {
    description: 'Order shipped with tracking',
    triggers: ['/api/admin/orders (updateTracking)'],
    flagColumn: 'email_shipped_sent',
    template: 'Tracking number, estimated delivery, tracking CTA'
  },
  order_delivered: {
    description: 'Order delivered successfully',
    triggers: ['/api/admin/orders (updateStatus to delivered, COD markPaid)'],
    flagColumn: 'email_delivered_sent',
    template: 'Thank you message, feedback request'
  },
  order_cancelled: {
    description: 'Order was cancelled',
    triggers: ['/api/admin/orders (updateStatus to cancelled)', '/api/admin/orders (confirmCOD action=cancel)'],
    flagColumn: 'email_cancelled_sent',
    template: 'Red cancelled banner, cancellation reason, refund info for paid orders, WhatsApp CTA'
  },
  
  // Auth emails
  welcome_user: {
    description: 'Welcome email after registration',
    triggers: ['/api/auth/register'],
    flagColumn: null,
    template: 'Welcome banner, account benefits, shop CTA'
  },
  password_reset: {
    description: '6-digit reset code',
    triggers: ['/api/auth/reset-password/request'],
    flagColumn: null,
    template: 'Large code display, 15min expiry warning'
  },
  password_changed: {
    description: 'Password change confirmation',
    triggers: ['/api/auth/reset-password/confirm', '/api/auth/change-password'],
    flagColumn: null,
    template: 'Success message, security warning'
  },
  
  // Reminders
  payment_reminder: {
    description: 'Abandoned checkout reminder',
    triggers: ['/api/cron/payment-reminders'],
    flagColumn: 'payment_reminder_sent',
    template: 'Order summary, pay CTA, 48hr warning'
  },
  
  // Admin notifications
  admin_new_order: {
    description: 'New order notification to admin',
    triggers: ['/api/orders'],
    flagColumn: null,
    template: 'Order details, customer info, COD/Online indicator'
  },
  admin_dispatch: {
    description: 'Order ready to dispatch notification',
    triggers: ['/api/webhooks/wompi', '/api/admin/orders (confirmCOD, status=confirmed)'],
    flagColumn: null,
    template: 'Shipping details, product list, dispatch reminder'
  }
}

// ============================================================
// DATA FLOW DIAGRAMS (text representation)
// ============================================================

export const dataFlows = {
  wompiPaymentFlow: `
    Customer pays via Wompi widget
            ↓
    Wompi processes payment
            ↓
    Wompi sends webhook to /api/webhooks/wompi
            ↓
    Webhook verifies signature
            ↓
    Webhook checks idempotency (prevents duplicates)
            ↓
    If APPROVED:
      → Update order.payment_status = 'approved'
      → Update order.status = 'confirmed'
      → Deduct stock from products
      → Create payment record
      → Register in accounting
      → Check confirmation_email_sent flag
      → If not sent: Send order_confirmed email
      → Update confirmation_email_sent = true
      → Send admin dispatch email
  `,
  
  codOrderFlow: `
    Customer selects COD at checkout
            ↓
    /api/orders creates order
      → status = 'confirmed' (ready for review)
      → payment_status = 'pending' (pay on delivery)
            ↓
    Send order_cod_confirmed email
    Send admin_new_order email
            ↓
    Admin reviews in panel
            ↓
    Admin uses COD actions:
      → confirm: Notify customer & admin for dispatch
      → markPaid: Mark delivered + paid, send delivered email
      → cancel: Cancel order
  `,
  
  statusChangeFlow: `
    Admin changes order status
            ↓
    /api/admin/orders (updateStatus action)
            ↓
    Validate transition is allowed
            ↓
    Update order.status
    Record in order_status_history
            ↓
    Trigger appropriate email:
      → processing: order_preparing
      → shipped: (use updateTracking instead)
      → delivered: order_delivered
      → cancelled: order_cancelled
            ↓
    Update email flag (prevents duplicates)
  `
}

// Export all documentation
export const fullDocumentation = {
  webhookRoutes,
  orderRoutes,
  adminOrderRoutes,
  authRoutes,
  cronRoutes,
  emailTriggerSummary,
  dataFlows
}
