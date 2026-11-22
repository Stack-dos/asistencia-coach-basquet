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

El **Site URL** es la base de los links de los emails (`{{ .SiteURL }}`). Si queda en
`localhost`, los links de producción apuntan a la PC de cada usuario.

### Authentication → Sign In / Providers → Email

| Opción                  | Valor    | Equivalente local                          |
| ----------------------- | -------- | ------------------------------------------ |
| Confirm email           | Activado | `[auth.email] enable_confirmations = true` |
| Minimum password length | 8        | `[auth] minimum_password_length = 8`       |

### Authentication → Emails → Templates

Copiar el HTML de cada plantilla local y su asunto:

| Plantilla      | Asunto                 | Contenido                              |
| -------------- | ---------------------- | -------------------------------------- |
| Confirm signup | Confirmá tu cuenta     | `supabase/templates/confirmation.html` |
| Reset password | Recuperá tu contraseña | `supabase/templates/recovery.html`     |

Lo importante es el link: tiene que apuntar a `/auth/confirm` con `token_hash` (el formato SSR),
no al link por defecto de Supabase.

## Vercel

No requiere cambios para US-102: las variables `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ya están cargadas (tipo **Config**, entornos Production y
Preview).

## Límite de emails

El servidor de email incluido en Supabase tiene un límite muy bajo por hora y es sólo para pruebas.
Antes de tener usuarios reales, configurar un SMTP propio (Authentication → Emails → SMTP
Settings), por ejemplo Resend o Brevo.

## Verificación en producción

1. Registrarse en `https://<proyecto>.vercel.app/registro` con un email real.
2. El email llega en español y el link apunta al dominio de Vercel (no a `localhost`).
3. Al hacer clic, se llega a `/clubes` con "Hola, <email>".
4. Recuperar contraseña: el link lleva a `/nueva-contrasena`.
