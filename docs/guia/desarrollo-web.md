# Guía: desarrollo web, seguridad y herramientas

Conceptos generales (no específicos de un framework) que aparecieron en US-101 y US-102.

## 1. HTTP: requests, métodos y redirecciones

- El navegador manda un **request** (método + URL + headers + cuerpo) y el servidor devuelve una
  **response** (código de estado + headers + cuerpo).
- **Métodos:** `GET` para pedir (un clic en un link siempre es GET), `POST` para enviar (formularios,
  Server Actions).
- **Códigos que vimos:** `200` OK, `307` redirección temporal (con header `Location`), `404` no
  existe.
- **Query params:** lo que va después del `?` en una URL: `/auth/confirm?code=abc&type=recovery`.

## 2. Cookies

Datos chicos que el servidor le pide guardar al navegador (`Set-Cookie`) y que el navegador
reenvía **automáticamente** en cada request al mismo sitio (`Cookie`).

- **Son por host:** `localhost` y `127.0.0.1` son sitios distintos para el navegador.
- Opciones importantes: `HttpOnly` (JS no puede leerla), `Secure` (sólo HTTPS), `SameSite` (no se
  manda en requests desde otros sitios), `Max-Age`/`Expires` (vencimiento).

## 3. Autenticación vs autorización

|               | Pregunta              | En el proyecto                             |
| ------------- | --------------------- | ------------------------------------------ |
| Autenticación | ¿Quién sos?           | Email + contraseña → sesión (US-102)       |
| Autorización  | ¿Qué podés hacer/ver? | Políticas RLS en PostgreSQL (desde US-201) |

Redirigir a `/login` protege **pantallas**, no **datos**. Las dos capas son necesarias.

## 4. Sesiones con JWT

Al iniciar sesión, Supabase entrega dos tokens que `@supabase/ssr` guarda en cookies:

- **Access token (JWT):** texto firmado con datos del usuario (_claims_: `sub` = id, `email`,
  vencimiento). Vence rápido (1 hora por defecto).
- **Refresh token:** sirve para pedir un access token nuevo; es de **un solo uso**.

Un **JWT** tiene tres partes (`header.payload.firma`). Cualquiera puede **leer** el payload, pero
nadie puede **modificarlo** sin invalidar la firma. Por eso:

- `getClaims()` **verifica la firma** → se puede confiar.
- `getSession()` en el servidor sólo lee la cookie → una cookie falsificada pasaría. Nunca usarlo
  para decidir permisos.

### Limitación: el logout no invalida el JWT ya emitido

Un JWT es _stateless_: el servidor lo valida con la firma, sin consultar ninguna lista. Al cerrar
sesión se borra la cookie y se revoca el refresh token, pero si alguien **copió** el access token
antes, le sirve hasta que vence (lo comprobamos en US-102). Mitigaciones posibles: vencimiento más
corto (`jwt_expiry`), o consultar al servidor de Auth (`getUser()`) en operaciones sensibles, a
costa de una llamada de red extra.

## 5. Seguridad en el login

- **Enumeración de usuarios:** si el sistema dice "ese email no existe", un atacante puede averiguar
  quién tiene cuenta. Por eso: mismo mensaje para contraseña mala y email inexistente; registro y
  recuperación responden igual exista o no la cuenta.
- **Contraseñas hasheadas** (bcrypt): nunca se guardan en texto plano.
- **Validación en la frontera de confianza:** todo lo que llega del navegador (formularios, URLs,
  cookies) puede ser cualquier cosa. Se valida en el servidor; la validación del navegador
  (`required`, `minLength`) es sólo comodidad.
- **Links de un solo uso y PKCE:** el link del email se invalida al usarse. Con **PKCE** (_Proof
  Key for Code Exchange_), al pedir el email el navegador guarda un secreto ("code verifier") en una
  cookie; el link trae un `code` que sólo se puede canjear por la sesión junto con ese secreto. Así,
  quien intercepte el link no puede usarlo. Contra: funciona sólo en el mismo navegador y con el
  último pedido.
- **Mínimo privilegio:** dar sólo los permisos necesarios (la CI con `contents: read`, Vercel con
  acceso a un solo repo).
- **Caché y sesiones:** una respuesta que escribe una cookie de sesión no debe cachearse en un CDN
  (`Cache-Control: private, no-store`), o un usuario podría recibir la sesión de otro.

## 6. Claves y variables de entorno

| ¿El navegador necesita el valor? | Nombre             | Tipo en Vercel | Ejemplos                               |
| -------------------------------- | ------------------ | -------------- | -------------------------------------- |
| Sí                               | Con `NEXT_PUBLIC_` | Config         | URL de Supabase, publishable key       |
| No                               | Sin prefijo        | Secret         | `sb_secret_...`, contraseña de la base |

La publishable key es pública por diseño; lo que protege los datos es RLS. La secret key saltea RLS:
nunca al navegador ni al repo.

## 7. Rendimiento: Core Web Vitals

Las mide Vercel Speed Insights en el navegador de cada usuario:

- **LCP** (Largest Contentful Paint): cuánto tarda en aparecer el contenido principal.
- **INP** (Interaction to Next Paint): cuánto tarda en reaccionar a un toque o clic (clave para
  tomar asistencia desde el celular).
- **CLS** (Cumulative Layout Shift): cuánto "salta" el contenido mientras carga.

**Latencia:** cada consulta del servidor a la base viaja ida y vuelta; conviene que Vercel
(funciones) y Supabase estén en regiones cercanas.

## 8. Herramientas y entorno

### npm

- `package.json`: `dependencies` (producción), `devDependencies` (sólo desarrollo), `scripts`.
- `package-lock.json`: versiones exactas; se commitea.
- `npm install` es tolerante; **`npm ci`** instala exactamente el lock y falla ante inconsistencias
  (por eso se usa en la CI).
- **Peer dependency:** un paquete exige que vos tengas otro en cierta versión (Vitest 5 exige
  `@types/node` 22+). "En mi máquina anda" no alcanza: la CI parte de cero.
- `npx`: ejecuta el binario de un paquete (`npx supabase start`).

### Git y saltos de línea

Windows usa CRLF (`\r\n`), Linux/macOS LF (`\n`). Con `core.autocrlf=true`, los archivos quedan en
CRLF en el disco y Prettier falla. `.gitattributes` con `* text=auto eol=lf` fuerza LF en el repo.

### CI con GitHub Actions

- **Workflow** (`.github/workflows/ci.yml`) → **jobs** → **steps** (`uses:` una action, `run:` un
  comando), en un **runner** nuevo en cada corrida.
- El check queda rojo si algún paso termina con código de salida ≠ 0.
- **Tests intermitentes (_flaky_):** pasan o fallan sin cambios en el código. Destruyen la
  confianza en la CI; hay que encontrar la causa raíz, no reintentar hasta que pase.

### Docker y Supabase local

- **Imagen** = plantilla; **contenedor** = imagen corriendo, aislada. `supabase start` levanta
  ~10 contenedores (PostgreSQL, Auth, API REST, Studio, Mailpit...).
- **Puerto:** "dirección" de un servicio en una máquina (54322 = PostgreSQL local). Un puerto tiene
  un solo dueño (`address already in use`). `0.0.0.0` = accesible desde la red; `127.0.0.1` = sólo
  esta PC.
- **Mailpit:** bandeja falsa que atrapa los emails en desarrollo.

### Deploy en Vercel

- Push a `main` → **Production deployment**; push a otra rama/PR → **Preview** con URL propia.
- Cada deploy es inmutable. Cambiar una variable `NEXT_PUBLIC_` exige **redeploy**.
- El plan Hobby es sólo para uso no comercial (ver `docs/negocio.md`).
