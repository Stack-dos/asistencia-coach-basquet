# Proyecto: Plataforma de asistencia para entrenadores de básquet

## Idea

Plataforma web para que entrenadores de básquet tomen asistencia en sus clases y obtengan
estadísticas automáticas de sus planteles, reemplazando planillas de Excel.

## Jerarquía de datos

Entrenador → Clubes (1..N) → Categorías (1..N por club) → Jugadores → Clases por mes → Asistencia

En cada categoría se ve el listado de jugadores por mes. Se agregan las clases del mes y se
registra quién vino, quién faltó y quién empezó nuevo.

## Estadísticas

- Cantidad de jugadores por categoría, mes a mes.
- Cantidad total de jugadores que maneja un entrenador en un club.
- Porcentaje de jugadores nuevos por categoría y en total.
- Cantidad de jugadores que abandonaron.
- Recuento de clases por mes y anual.
- Ranking de asistencia por jugador, con porcentaje.

## Contexto

- El autor es entrenador de básquet formativo y juvenil. Llevaba la asistencia en Excel: una
  hoja por categoría, una columna por clase, recuentos mensuales y anuales, y ranking de
  asistencia. Dirigió 1 club con 4 categorías.
- Hay entrenadores que dirigen varios clubes y escuelitas de minibásquet, con 1 o más
  categorías cada uno.

## Objetivos

- Aprender PostgreSQL y desarrollo frontend.
- Crear una herramienta útil para cualquier entrenador.

## Stack (confirmado, ADR-01)

Next.js 16 (App Router) + TypeScript + Tailwind 4 en Vercel; Supabase (PostgreSQL + Auth) con `@supabase/ssr`.

## Experiencia previa con el stack

Es la **primera vez** que el autor trabaja con Next.js, TypeScript, PostgreSQL/Supabase y Vercel.
Al explicar tareas o guiar paso a paso:

- Explicar también el **lenguaje** (sintaxis y tipos de TypeScript, JSX/TSX), el **framework**
  (convenciones de Next.js, Server vs Client Components, archivos especiales) y el **SQL**
  (cada sentencia, tipo, constraint, índice o política RLS que aparezca).
- No asumir conocimiento de herramientas del ecosistema (npm, Supabase CLI, Vercel, GitHub Actions):
  explicar qué hace cada comando y cada archivo de configuración.

## Convenciones

- Tests en una carpeta aparte (`tests/`), no junto al código.

## Reglas para Claude

- No inventar datos ni decisiones: si algo no está definido acá, preguntar.
- Documentación en español.

@AGENTS.md
