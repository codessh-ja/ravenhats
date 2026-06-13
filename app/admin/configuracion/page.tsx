'use client'

import { useState, useEffect } from 'react'
import { Save, Store, Truck, CreditCard, Bell, CheckCircle, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ConfigPage() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Store settings
  const [storeName, setStoreName] = useState('RavenHats')
  const [storePhone, setStorePhone] = useState('+1 341 213 3624')
  const [instagram, setInstagram] = useState('@ravenhats.store')
  const [tiktok, setTiktok] = useState('@ravenhats.co')
  
  // Shipping settings
  const [shippingCost, setShippingCost] = useState('15000')
  const [codEnabled, setCodEnabled] = useState(true)
  const [codFee, setCodFee] = useState('5000')
  const [showBanner, setShowBanner] = useState(true)
  
  // Payment settings - Wompi (solo switches, llaves en .env)
  const [wompiEnabled, setWompiEnabled] = useState(true)
  const [wompiConfigured, setWompiConfigured] = useState(false)
  const [wompiSandbox, setWompiSandbox] = useState(true)
  
  // Notifications
  const [orderNotifications, setOrderNotifications] = useState(true)
  const [lowStockAlerts, setLowStockAlerts] = useState(true)
  const [lowStockThreshold, setLowStockThreshold] = useState('5')

  // Load saved config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/admin/config')
        if (res.ok) {
          const data = await res.json()
          if (data.store) {
            setStoreName(data.store.name || 'RavenHats')
            setStorePhone(data.store.phone || '+1 341 213 3624')
            setInstagram(data.store.instagram || '')
            setTiktok(data.store.tiktok || '')
          }
          if (data.shipping) {
            setShippingCost(data.shipping.cost || '15000')
            setCodEnabled(data.shipping.codEnabled ?? true)
            setCodFee(data.shipping.codFee || '5000')
            setShowBanner(data.shipping.showBanner ?? true)
          }
          if (data.wompi) {
            setWompiEnabled(data.wompi.enabled ?? true)
            setWompiConfigured(data.wompi.configured ?? false)
            setWompiSandbox(data.wompi.sandbox ?? true)
          }
          if (data.notifications) {
            setOrderNotifications(data.notifications.orders ?? true)
            setLowStockAlerts(data.notifications.lowStock ?? true)
            setLowStockThreshold(data.notifications.lowStockThreshold || '5')
          }
        }
      } catch (error) {
        console.error('Error loading config:', error)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: {
            name: storeName,
            phone: storePhone,
            instagram,
            tiktok,
          },
          shipping: {
            cost: shippingCost,
            codEnabled,
            codFee,
            showBanner,
          },
          wompi: {
            enabled: wompiEnabled,
          },
          notifications: {
            orders: orderNotifications,
            lowStock: lowStockAlerts,
            lowStockThreshold,
          },
        }),
      })
      
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving config:', error)
    }
    
    setSaving(false)
  }

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuracion</h1>
          <p className="text-muted-foreground">Administra tu tienda</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Guardado
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="store" className="gap-2">
            <Store className="h-4 w-4 hidden sm:block" />
            Tienda
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="h-4 w-4 hidden sm:block" />
            Envios
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4 hidden sm:block" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4 hidden sm:block" />
            Alertas
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Informacion de la tienda</CardTitle>
              <CardDescription>Datos de contacto y redes sociales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Nombre</Label>
                  <Input
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storePhone">WhatsApp</Label>
                  <Input
                    id="storePhone"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="+1 341 213 3624"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Redes sociales</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@ravenhats.store"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input
                      id="tiktok"
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      placeholder="@ravenhats.co"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Envios</CardTitle>
              <CardDescription>Costos y opciones de entrega</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shippingCost">Costo de envio (COP)</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Pago contraentrega</h4>
                    <p className="text-sm text-muted-foreground">
                      El cliente paga al recibir su pedido
                    </p>
                  </div>
                  <Switch
                    checked={codEnabled}
                    onCheckedChange={setCodEnabled}
                  />
                </div>
                
                {codEnabled && (
                  <div className="space-y-2 pl-0">
                    <Label htmlFor="codFee">Costo adicional (COP)</Label>
                    <Input
                      id="codFee"
                      type="number"
                      value={codFee}
                      onChange={(e) => setCodFee(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Banner de contraentrega</h4>
                    <p className="text-sm text-muted-foreground">
                      Mostrar banner en la parte superior de la web
                    </p>
                  </div>
                  <Switch
                    checked={showBanner}
                    onCheckedChange={setShowBanner}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings - Wompi */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Wompi</CardTitle>
              <CardDescription>
                Pasarela de pagos (PSE, tarjetas, Nequi, Bancolombia)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Estado de configuracion */}
              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                wompiConfigured 
                  ? 'border-green-800/30 bg-green-950/10' 
                  : 'border-red-800/30 bg-red-950/10'
              }`}>
                <div className="flex items-center gap-3">
                  {wompiConfigured ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <h4 className="font-medium">
                      {wompiConfigured ? 'Wompi configurado' : 'Wompi no configurado'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {wompiConfigured 
                        ? `Modo: ${wompiSandbox ? 'Sandbox (pruebas)' : 'Produccion'}` 
                        : 'Configura las llaves en el archivo .env del servidor'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Activar/Desactivar pagos */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border">
                <div>
                  <h4 className="font-medium">Pagos en linea</h4>
                  <p className="text-sm text-muted-foreground">
                    {wompiEnabled ? 'Los clientes pueden pagar con Wompi' : 'Pagos con Wompi desactivados'}
                  </p>
                </div>
                <Switch
                  checked={wompiEnabled}
                  onCheckedChange={setWompiEnabled}
                  disabled={!wompiConfigured}
                />
              </div>

              {/* Instrucciones */}
              <div className="p-4 rounded-lg border border-dashed">
                <h4 className="font-medium mb-2">Configuracion de llaves</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Las llaves de Wompi se configuran en el archivo <code className="bg-secondary px-1 rounded">.env</code> del servidor:
                </p>
                <pre className="text-xs bg-secondary/50 p-3 rounded overflow-x-auto">
{`# Modo sandbox (true) o produccion (false)
WOMPI_SANDBOX=true

# Llaves de Wompi
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_stagtest_xxx
WOMPI_PRIVATE_KEY=prv_stagtest_xxx
WOMPI_INTEGRITY_KEY=stagtest_integrity_xxx
WOMPI_EVENTS_SECRET=stagtest_events_xxx`}
                </pre>
                <p className="text-xs text-muted-foreground mt-3">
                  Obtener credenciales en{' '}
                  <a 
                    href="https://comercios.wompi.co" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-foreground underline"
                  >
                    comercios.wompi.co
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>Notificaciones de la tienda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Nuevos pedidos</h4>
                  <p className="text-sm text-muted-foreground">
                    Alerta cuando haya un nuevo pedido
                  </p>
                </div>
                <Switch
                  checked={orderNotifications}
                  onCheckedChange={setOrderNotifications}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Stock bajo</h4>
                  <p className="text-sm text-muted-foreground">
                    Alerta cuando un producto tenga poco inventario
                  </p>
                </div>
                <Switch
                  checked={lowStockAlerts}
                  onCheckedChange={setLowStockAlerts}
                />
              </div>

              {lowStockAlerts && (
                <div className="space-y-2 ml-4 pl-4 border-l-2 border-amber-500/30">
                  <Label htmlFor="lowStock">Umbral de stock bajo (unidades)</Label>
                  <p className="text-xs text-muted-foreground">
                    Los productos con stock igual o menor a este numero se marcaran como stock bajo
                  </p>
                  <Input
                    id="lowStock"
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="max-w-[120px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
