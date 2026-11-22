# Configuración de producción

`supabase/config.toml` sólo configura el Supabase **local**. El proyecto de la nube se configura a
mano en el dashboard. Cada vez que cambie algo de Auth en `config.toml`, hay que replicarlo acá.

> No usar `supabase config push` para esto: subiría el `site_url` local (`http://localhost:3000`)
> a producción y los links de los emails dejarían de funcionar.

## Supabase (dashboard del proyecto)

### Authentication → URL Configuration

| Campo         | Valor                                                             |
| ------------- | ----------------------------------------------------------------- |
| Site URL      | URL de producción de Vercel (ej. `https://<proyecto>.vercel.app`) |
| Redirect URLs | `https://<proyecto>.vercel.app/**`                                |

**Redirect URLs es obligatorio:** después de verificar el link del email, Supabase redirige a
`/auth/confirm` de la app; si esa URL no está en la lista, redirige al Site URL y el login o la
recuperación fallan. El Site URL es el destino por defecto: si queda en `localhost`, los links de
producción apuntan a la PC de cada usuario.

### Authentication → Sign In / Providers → Email

| Opción                  | Valor    | Equivalente local                          |
| ----------------------- | -------- | ------------------------------------------ |
| Confirm email           | Activado | `[auth.email] enable_confirmations = true` |
| Minimum password length | 8        | `[auth] minimum_password_length = 8`       |

### Emails

Se usan las **plantillas y el servidor de email por defecto** de Supabase (en inglés; para
personalizarlas hace falta un SMTP propio). El servidor por defecto tiene un límite muy bajo de
emails por hora y es para pruebas: antes de tener usuarios reales, configurar un SMTP propio.

## Vercel

No requiere cambios para US-102: las variables `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ya están cargadas (tipo **Config**, entornos Production y
Preview).

## Verificación en producción

1. Registrarse en `https://<proyecto>.vercel.app/registro` con un email real.
2. Llega el email (en inglés) y, al hacer clic, se vuelve al dominio de Vercel (no a `localhost`).
3. Al hacer clic, se llega a `/clubes` con "Hola, <email>".
4. Recuperar contraseña: el link lleva a `/nueva-contrasena`.
