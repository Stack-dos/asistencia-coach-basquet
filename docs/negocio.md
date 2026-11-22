# Modelo de negocio: opciones para monetizar la plataforma

> Investigación del 2026-11-22. Los precios cambian seguido: **verificarlos en las páginas oficiales**
> antes de decidir (links al final). Este documento no es asesoramiento legal ni contable.

## 1. Respuesta corta

- **Sí, se puede cobrar una suscripción mensual a los entrenadores.** Vercel y Supabase no
  intervienen en eso: ellos te cobran a vos por la infraestructura. Para cobrarles a los usuarios
  se integra un procesador de pagos (en Argentina, Mercado Pago).
- **No te podés quedar en el plan gratis de Vercel si cobrás.** El plan Hobby es sólo para uso
  personal **no comercial**; cualquier uso comercial requiere Pro (≈ USD 20/mes). Mientras la app
  sea gratuita, Hobby alcanza.
- **Supabase Free no prohíbe el uso comercial**, pero pausa el proyecto tras 7 días sin actividad
  y tiene límites bajos. Para usuarios que pagan, lo razonable es Pro (USD 25/mes + uso).
- **Dominio propio:** Vercel vende dominios a precio de costo (un `.com` ronda los USD 10–20/año);
  con el plan Pro, el primer año de un dominio es gratis. Un `.com.ar` se registra en NIC Argentina
  (en pesos) y se conecta a Vercel apuntando los DNS.

## 2. Costos fijos estimados

| Concepto     | Etapa gratis (validación)            | Etapa paga (cobrando)                                   |
| ------------ | ------------------------------------ | ------------------------------------------------------- |
| Vercel       | Hobby: USD 0                         | Pro: ≈ USD 20/mes (incluye USD 20 de crédito de uso)    |
| Supabase     | Free: USD 0                          | Pro: USD 25/mes base + cómputo/uso                      |
| Dominio      | Opcional (subdominio `*.vercel.app`) | ≈ USD 10–20/año `.com` (1.er año gratis con Vercel Pro) |
| Email (SMTP) | El de Supabase (límite muy bajo)     | Resend/Brevo: hay planes gratis con límite diario       |
| **Total**    | **USD 0**                            | **≈ USD 45–50/mes**                                     |

### Punto de equilibrio

Con ≈ USD 50/mes de costo fijo y una comisión de cobro de ≈ 6–7 % + IVA (Mercado Pago con
acreditación inmediata; menos si se acepta acreditación a 18–30 días):

| Precio por entrenador | Entrenadores pagos para cubrir costos |
| --------------------- | ------------------------------------- |
| USD 3/mes             | ≈ 19                                  |
| USD 5/mes             | ≈ 11                                  |
| USD 8/mes             | ≈ 7                                   |

Recién por encima de eso hay ganancia (antes de impuestos).

## 3. Formas de cobrar a los usuarios

| Opción                                  | Cómo funciona                                                                              | Pros                                                                                                                                   | Contras                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Mercado Pago Suscripciones**          | API `preapproval`: débito automático mensual con tarjeta.                                  | Lo que usa todo entrenador argentino. Cobro en pesos. Reintenta pagos rechazados (hasta 4 intentos; cancela tras 3 cuotas rechazadas). | Comisiones altas con acreditación inmediata. Sólo mercado local/LatAm.                                                                 |
| **Stripe**                              | Suscripciones con _webhooks_, el estándar internacional.                                   | La mejor experiencia de desarrollo y documentación.                                                                                    | **No acepta empresas registradas en Argentina** (sólo Brasil y México en LatAm). Habría que tener una entidad o cuenta en el exterior. |
| **Merchant of Record** (Paddle, etc.)   | Un intermediario vende en tu nombre y se encarga de impuestos y facturación internacional. | Simplifica impuestos para clientes de otros países.                                                                                    | Comisión mayor (Paddle ≈ 5 % + USD 0,50). Hay que confirmar que pague a cuentas argentinas.                                            |
| **Transferencia / link de pago manual** | El entrenador paga por transferencia o link y vos habilitás la cuenta a mano.              | Cero integración. Ideal para los primeros 5–10 clientes.                                                                               | No escala; depende de que te acuerdes de cobrar y de dar de baja.                                                                      |

**Recomendación:** arrancar con pagos manuales para validar que alguien paga, y recién integrar
Mercado Pago Suscripciones cuando el proceso manual se vuelva molesto.

## 4. Modelos de negocio posibles

| Modelo                                | Ejemplo para esta app                                                                                                | Pros                                                                           | Contras                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Freemium**                          | Gratis: 1 club y hasta 2 categorías. Pago: ilimitado.                                                                | El entrenador prueba sin riesgo; el que dirige varios clubes es el que paga.   | La mayoría nunca paga; los gratuitos igual consumen infraestructura.                                                              |
| **Suscripción por entrenador**        | Precio mensual fijo por cuenta, con prueba gratis de 30 días.                                                        | Ingreso predecible y simple de explicar.                                       | Un entrenador formativo suele tener poco presupuesto; es sensible al precio.                                                      |
| **Licencia por club o escuelita**     | El club paga y todos sus entrenadores usan la app.                                                                   | Un cliente = muchos usuarios; el club tiene más presupuesto que el entrenador. | Requiere varios entrenadores por club (hoy D-04 dice "un club = un entrenador"): cambio de modelo de datos. Venta más lenta.      |
| **Funciones premium**                 | Exportar a Excel/PDF, informes para padres o para la comisión directiva, estadísticas comparativas entre temporadas. | Se cobra lo que aporta valor extra; lo básico sigue gratis.                    | Hay que construir esas funciones (hoy fuera de v1, D-14).                                                                         |
| **Pago único / licencia de por vida** | Un pago por temporada o "para siempre".                                                                              | Fácil de vender.                                                               | Los costos de infraestructura son mensuales: un pago único no los cubre a largo plazo.                                            |
| **Donaciones**                        | Botón tipo "invitame un café" (Cafecito en Argentina).                                                               | Cero fricción; la app sigue gratis para todos.                                 | Ingreso bajo e impredecible; rara vez cubre costos.                                                                               |
| **Publicidad / sponsors**             | Marcas deportivas.                                                                                                   | Los usuarios no pagan.                                                         | **No recomendable:** la app guarda datos de menores; publicidad + menores es riesgo legal y de confianza. Necesita mucho tráfico. |
| **Venta a ligas o federaciones**      | Una asociación regional la ofrece a todos sus clubes (marca blanca).                                                 | Contratos grandes; alcance inmediato.                                          | Ciclos de venta largos; piden personalización y soporte.                                                                          |

## 5. Lo que hay que tener en cuenta antes de cobrar

- **Datos de menores:** los jugadores son chicos. La Ley 25.326 de Protección de Datos Personales
  aplica; al cobrar y tener usuarios reales hacen falta términos y condiciones y política de
  privacidad. Consultar con un abogado.
- **Facturación e impuestos:** cobrar en Argentina implica estar inscripto (por ejemplo,
  monotributo) y emitir factura electrónica. Consultar con un contador.
- **Backups:** con usuarios que pagan, perder datos es inaceptable. El plan Pro de Supabase
  incluye backups diarios; el Free no ofrece las mismas garantías.
- **Soporte:** alguien que paga espera respuesta. Definir un canal (email, WhatsApp) y un tiempo de
  respuesta razonable.

## 6. Impacto técnico en este proyecto (cuando se decida cobrar)

- Una tabla de suscripciones/planes y una función que diga qué puede usar cada entrenador
  (límites del freemium). Los límites se validan en la base (RLS o triggers), no sólo en la UI.
- Un Route Handler para los **webhooks** de Mercado Pago (avisos de pago aprobado, rechazado o
  cancelado), verificando la firma de cada aviso.
- Pasar Vercel a Pro **antes** del primer cobro, y Supabase a Pro antes de tener datos que no se
  puedan perder.

## 7. Camino sugerido

1. **Lanzar gratis** (Hobby + Free) y conseguir 5–10 entrenadores reales.
2. **Medir** con Vercel Analytics: ¿vuelven cada semana? ¿cargan asistencia de verdad?
3. **Preguntarles** cuánto pagarían y por qué función.
4. **Primeros cobros manuales** a quienes digan que sí, con Vercel y Supabase ya en Pro.
5. **Automatizar** con Mercado Pago Suscripciones cuando haya suficientes clientes.

## Fuentes

- Vercel — Fair use (Hobby sólo no comercial): https://vercel.com/docs/platform/fair-use-policy
- Vercel — Planes: https://vercel.com/docs/plans · Hobby: https://vercel.com/docs/plans/hobby
- Vercel — Dominio gratis con Pro: https://vercel.com/docs/domains/free-domain-with-pro.md
- Vercel — Dominios a precio de costo: https://vercel.com/changelog/vercel-domains-at-cost-pricing-and-the-fastest-on-the-web
- Precio Pro de Vercel (fuente secundaria): https://schematichq.com/blog/vercel-pricing
- Supabase — Precios: https://supabase.com/pricing.md
- Supabase — Límites del plan Free (fuente secundaria): https://www.activepieces.com/blog/supabase-pricing-free-tier-limits-pro-costs-egress
- Mercado Pago — API de suscripciones: https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/overview
- Mercado Pago — Comisiones (fuente secundaria, verificar vigencia): https://www.iprofesional.com/tecnologia/386153-mercado-pago-que-debes-saber-sobre-comisiones-plazos-y-montos
- Stripe en Argentina: https://www.global66.com/blog/?p=18565 · https://wpforms.com/mercado-pago-vs-stripe/
- Alternativas a Stripe (Paddle): https://resources.rework.com/es/tools/erp-finance/best-stripe-alternatives
