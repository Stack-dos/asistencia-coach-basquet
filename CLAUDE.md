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

## Stack en consideración
Vercel (frontend) + Supabase (PostgreSQL + Auth). Pendiente de confirmar.

## Reglas para Claude
- No inventar datos ni decisiones: si algo no está definido acá, preguntar.
- Documentación en español.
