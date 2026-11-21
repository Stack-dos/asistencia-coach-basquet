# PRD — Plataforma de asistencia para entrenadores de básquet

> **Cómo leer las notas de decisión.** Cada vez que este documento toma una decisión que no
> estaba definida en `CLAUDE.md`, aparece un bloque así:
>
> > ⚠️ **Esto tiene que controlarse** — **Pregunta:** qué faltaba definir. **Decisión:** qué se
> > eligió. **Por qué:** el motivo.
>
> Todo lo que no tiene esa nota sale directamente de `CLAUDE.md`. Las decisiones están
> numeradas (D-01, D-02, …) para poder revisarlas una por una (índice en la sección 9).

---

## 1. Descripción general del producto

### 1.1 Planteamiento del problema

| # | Problema | Impacto operativo | Línea base actual |
|---|----------|-------------------|-------------------|
| 1 | La asistencia se lleva en Excel: una hoja por categoría y una columna por clase. | Cargar la clase implica abrir la planilla, buscar la hoja y la columna correcta; es incómodo de hacer desde la cancha. | 100% manual en Excel. |
| 2 | Los recuentos mensuales y anuales se arman a mano con fórmulas. | Cada hoja nueva o mes nuevo requiere copiar y ajustar fórmulas; un error de rango falsea los números. | Fórmulas mantenidas a mano por hoja. |
| 3 | El ranking de asistencia se calcula a mano. | Hay que reordenar y recalcular porcentajes cada vez que se quiere consultar. | Manual, sin cálculo automático. |
| 4 | No hay datos de altas ni abandonos en el tiempo. | No se puede responder "¿cuántos chicos nuevos entraron este año?" o "¿cuántos dejaron?" sin revisar hoja por hoja. | No medido. |
| 5 | Entrenadores con varios clubes/escuelitas tienen la información dispersa. | No hay una vista consolidada por club. | Un archivo (o más) por club. |

**Síntesis:** el entrenador ya sabe qué quiere medir (lo hacía en Excel), pero el costo de
mantener la planilla es alto y las métricas de evolución del plantel (nuevos, abandonos) no
salen solas. El producto reemplaza la planilla con una carga rápida de asistencia y
estadísticas calculadas automáticamente.

### 1.2 Visión del producto

Una aplicación web, usable desde el celular en la cancha, donde un entrenador organiza sus
clubes y categorías, toma asistencia clase por clase y obtiene, sin fórmulas, las estadísticas
que antes armaba en Excel.

Es **ambas cosas**: un proyecto de aprendizaje (PostgreSQL y desarrollo frontend son objetivos
explícitos) y una herramienta pensada para ser útil a cualquier entrenador. Por eso el
documento prioriza que el modelo de datos y las estadísticas vivan en PostgreSQL (vistas SQL,
constraints, Row Level Security) en lugar de resolverse todo en el frontend.

Pilares:
1. **Carga rápida:** tomar asistencia de una clase en menos de un minuto desde el celular.
2. **Estadísticas sin fórmulas:** todo lo que el Excel calculaba, calculado por la base.
3. **Multi-club:** un entrenador con N clubes y N categorías por club.

### 1.3 Metas y no metas

**En el alcance (v1.0)**
- Registro e inicio de sesión del entrenador.
- ABM de clubes, categorías y jugadores.
- Alta y baja (abandono) de jugadores con fecha.
- Carga de clases por fecha y toma de asistencia por clase.
- Vista mensual por categoría (jugadores × clases), equivalente a la hoja de Excel.
- Estadísticas: jugadores por categoría mes a mes, total por club, % de nuevos (por categoría
  y total del club), abandonos, clases por mes y por año, ranking de asistencia con %.

**Fuera de alcance (v1.0)**
- Compartir clubes/categorías entre varios entrenadores (ver D-04).
- Importar planillas de Excel existentes (ver D-14).
- Exportar a Excel/PDF (ver D-14).
- Clases recurrentes / calendario automático de clases (ver D-08).
- Estado "ausente justificado" (ver D-09).
- Modo offline (ver D-15).
- App nativa móvil (se cubre con web responsive).
- Datos de jugadores más allá de nombre y fechas (contacto, tutor, fecha de nacimiento).

> ⚠️ **Esto tiene que controlarse** (D-14) — **Pregunta:** ¿se importa/exporta Excel en v1?
> **Decisión:** no, queda en roadmap. **Por qué:** `CLAUDE.md` habla de *reemplazar* Excel,
> no de convivir con él; importar planillas con formatos libres es costoso y no es necesario
> para validar el producto.

> ⚠️ **Esto tiene que controlarse** (D-15) — **Pregunta:** ¿se puede tomar asistencia sin
> conexión? **Decisión:** no en v1. **Por qué:** offline + sincronización agrega mucha
> complejidad; primero hay que validar que el flujo online alcanza en la cancha.

### 1.4 Métricas de éxito

| Métrica | Definición | Objetivo |
|---------|------------|----------|
| **North Star:** clases con asistencia tomada por semana | Cantidad de clases con al menos un presente registradas en la semana, sumando todos los entrenadores. | ≥ 4 por entrenador activo (equivalente al uso real del autor). |
| Tiempo de carga de una clase | Desde abrir la clase hasta guardar, con 20 jugadores. | < 60 s en celular. |
| Paridad con el Excel | Estadísticas del Excel original reproducidas por la app. | 6 de 6 (las de `CLAUDE.md`). |
| Uso propio | El autor deja de usar el Excel para sus categorías. | 1 temporada completa sólo con la app. |

> ⚠️ **Esto tiene que controlarse** (D-01) — **Pregunta:** ¿cómo se mide el éxito?
> **Decisión:** las métricas de arriba. **Por qué:** `CLAUDE.md` no define métricas; se
> eligieron las que se desprenden de los objetivos (reemplazar Excel, ser útil) y que se pueden
> medir con los propios datos de la app. Los números objetivo son estimaciones.

---

## 2. Contexto del dominio

Básquet formativo y juvenil: un club tiene varias **categorías** (por ejemplo, por edad). Un
entrenador puede trabajar en varios clubes y escuelitas de minibásquet. Cada categoría entrena
varias veces por semana; cada entrenamiento es una **clase**. La asistencia por clase es la
unidad de dato; todo lo demás (recuentos, porcentajes, rankings) se deriva.

### 2.1 Definiciones de cálculo

Estas definiciones son la base de todas las estadísticas y se usan igual en todo el sistema.

| Concepto | Definición |
|----------|------------|
| Mes | Mes calendario (1 al último día). |
| Año | Año calendario (1/1 al 31/12). |
| Jugador **activo** en el mes M | `fecha_alta ≤ último día de M` y (`fecha_baja` es nula o `fecha_baja ≥ primer día de M`). |
| Jugador **nuevo** en el mes M | `fecha_alta` cae dentro de M. |
| **% de nuevos** en M | nuevos en M ÷ activos en M × 100. |
| **Abandono** en el mes M | `fecha_baja` cae dentro de M. |
| **Clases** del período | Clases cargadas con fecha dentro del período. |
| **% de asistencia** de un jugador en un período | presentes ÷ clases del período en las que el jugador estaba activo (fecha entre su alta y su baja) × 100. Si el divisor es 0, no se muestra porcentaje. |

> ⚠️ **Esto tiene que controlarse** (D-05) — **Pregunta:** ¿qué significa "jugador nuevo"?
> **Decisión:** el que tiene su `fecha_alta` en ese mes. La fecha de alta la carga el
> entrenador (por defecto, la fecha de la clase en la que aparece por primera vez o la del día).
> **Por qué:** `CLAUDE.md` dice que se registra "quién empezó nuevo" al cargar clases; una fecha
> de alta explícita es simple, editable y permite calcular el % por mes sin ambigüedad.

> ⚠️ **Esto tiene que controlarse** (D-06) — **Pregunta:** ¿cómo se detecta que un jugador
> "abandonó"? **Decisión:** el entrenador lo da de baja manualmente con una `fecha_baja`. No hay
> detección automática por inasistencias. **Por qué:** una regla automática ("N clases sin
> venir") genera falsos abandonos (lesiones, vacaciones); la baja manual refleja lo que el
> entrenador sabe. Una sugerencia automática queda en roadmap.

> ⚠️ **Esto tiene que controlarse** (D-07) — **Pregunta:** ¿el "anual" es año calendario o
> temporada? **Decisión:** año calendario. **Por qué:** `CLAUDE.md` habla de recuentos
> "anuales" sin definir temporada; el año calendario es la opción sin configuración. Si la
> temporada real arranca en otro mes, hay que cambiarlo antes del Hito 4.

---

## 3. Perfiles de usuario

| Perfil | Rol y contexto | Objetivo principal | Problema actual |
|--------|----------------|--------------------|-----------------|
| Entrenador de un club | Dirige 1 club con varias categorías (caso del autor: 4 categorías). | Tomar asistencia rápido y tener ranking y recuentos al día. | Mantener una hoja de Excel por categoría con fórmulas. |
| Entrenador multi-club | Dirige varios clubes y/o escuelitas de minibásquet, con 1 o más categorías cada uno. | Ver cada club por separado sin mezclar planteles. | Información dispersa en varios archivos. |

Hay **un solo rol** en el sistema: el entrenador. Cada entrenador ve sólo sus datos.

> ⚠️ **Esto tiene que controlarse** (D-04) — **Pregunta:** ¿un club puede ser compartido por
> varios entrenadores (por ejemplo, dos entrenadores del mismo club)? **Decisión:** no. Cada
> club pertenece a un único entrenador; si dos entrenadores trabajan en el mismo club real,
> cada uno crea su propio "club" en la app. **Por qué:** `CLAUDE.md` plantea la jerarquía
> Entrenador → Clubes; compartir implica roles, invitaciones y permisos, que no son necesarios
> para el caso del autor. Queda en roadmap.

**Perfil ampliado (usuario principal).** El autor entrena básquet formativo y juvenil en un
club con 4 categorías. En cada clase sabe quién vino; después pasaba esa información a una
hoja de Excel por categoría, con una columna por clase, y mantenía recuentos mensuales,
anuales y un ranking de asistencia. Quiere hacer lo mismo desde el celular, al terminar o
durante la clase, sin mantener fórmulas.

---

## 4. Arquitectura de datos

### 4.1 Entidades principales

| Entidad | Campos principales | Notas |
|---------|--------------------|-------|
| `auth.users` (Supabase) | `id`, `email` | El entrenador. No se crea tabla de perfil propia en v1. |
| `clubs` | `id`, `coach_id → auth.users`, `name`, `created_at` | |
| `categories` | `id`, `club_id → clubs`, `name`, `created_at` | |
| `players` | `id`, `category_id → categories`, `first_name`, `last_name`, `joined_on`, `left_on` (nullable), `created_at` | `joined_on` = fecha de alta, `left_on` = fecha de baja. |
| `sessions` | `id`, `category_id → categories`, `held_on` (date), `created_at` | Una clase. |
| `attendances` | `session_id → sessions`, `player_id → players`, PK compuesta | Existe una fila sólo si el jugador estuvo **presente**. |

Relaciones:

```mermaid
erDiagram
    AUTH_USERS ||--o{ CLUBS : dirige
    CLUBS ||--o{ CATEGORIES : tiene
    CATEGORIES ||--o{ PLAYERS : agrupa
    CATEGORIES ||--o{ SESSIONS : programa
    SESSIONS ||--o{ ATTENDANCES : registra
    PLAYERS ||--o{ ATTENDANCES : asiste
```

> ⚠️ **Esto tiene que controlarse** (D-10) — **Pregunta:** ¿un jugador puede estar en más de
> una categoría? **Decisión:** no; cada jugador pertenece a una sola categoría. Si en la
> realidad un chico entrena en dos categorías, se carga dos veces. **Por qué:** `CLAUDE.md`
> muestra la jerarquía Categorías → Jugadores (uno a muchos) y así funcionaba el Excel (una
> hoja por categoría). Consecuencia: el "total de jugadores del club" puede contar dos veces a
> la misma persona.

> ⚠️ **Esto tiene que controlarse** (D-09) — **Pregunta:** ¿cómo se guarda "quién faltó"?
> **Decisión:** sólo se guardan los presentes; ausente = jugador activo sin fila de asistencia
> para esa clase. No existe "ausente justificado" en v1. **Por qué:** es el modelo más simple
> que permite todas las estadísticas pedidas, y es lo que se marca en el Excel (presente o no).

> ⚠️ **Esto tiene que controlarse** (D-11) — **Pregunta:** ¿puede haber dos clases el mismo día
> en la misma categoría? **Decisión:** no (unicidad `category_id + held_on`). **Por qué:** el
> Excel usa una columna por clase identificada por fecha; doble turno el mismo día es raro y
> se puede revisar después.

> ⚠️ **Esto tiene que controlarse** (D-12) — **Pregunta:** nombres de tablas y columnas, ¿en
> inglés o español? **Decisión:** inglés en el código y la base; español en la UI y la
> documentación. **Por qué:** `CLAUDE.md` sólo fija documentación en español; inglés en el
> código es la convención de las librerías que se usan (Supabase, Next.js) y evita mezclar
> idiomas en el SQL.

### 4.2 Reglas de integridad

- `clubs`: `unique(coach_id, name)`; `name` no vacío.
- `categories`: `unique(club_id, name)`; borrado en cascada desde `clubs`.
- `players`: `check (left_on is null or left_on >= joined_on)`; borrado en cascada desde
  `categories`.
- `sessions`: `unique(category_id, held_on)`; borrado en cascada desde `categories`.
- `attendances`: PK `(session_id, player_id)`; borrado en cascada desde `sessions` y `players`.
- Trigger `attendances_validate`: el jugador y la clase deben ser de la **misma categoría**, y
  la fecha de la clase debe estar entre `joined_on` y `left_on` (si existe) del jugador.
- Row Level Security en todas las tablas: un entrenador sólo lee/escribe filas cuyo club tiene
  `coach_id = auth.uid()`. Se implementa con la función SQL `owns_category(category_id)`.

### 4.3 Vistas (agregados)

Todas se crean en el Hito 4 (US-401). Ninguna existe todavía.

| Vista | Granularidad | Contenido |
|-------|--------------|-----------|
| `category_monthly_stats` | categoría × mes | activos, nuevos, % nuevos, abandonos, clases. |
| `club_monthly_stats` | club × mes | lo mismo sumado por club. |
| `player_attendance` | jugador × clase aplicable | 1/0 presente, para calcular % en cualquier período. |

Las vistas se crean con `security_invoker = true` para que respeten RLS.

---

## 5. Arquitectura de software

### 5.1 Stack

> ⚠️ **Esto tiene que controlarse** (D-02) — **Pregunta:** el stack está "pendiente de
> confirmar". **Decisión:** Next.js (App Router) + TypeScript + Tailwind CSS en Vercel;
> Supabase (PostgreSQL + Auth) usando `@supabase/ssr`. **Por qué:** es el stack ya considerado
> en `CLAUDE.md`; Next.js es el framework con despliegue nativo en Vercel; TypeScript ayuda a
> aprender con errores tempranos; Tailwind evita mantener CSS a mano. Si se elige otro
> framework frontend, cambian las secciones 5, 14 y los "archivos a crear", no el modelo.

### 5.2 Capas

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| Base de datos | `supabase/migrations/` | Tablas, constraints, triggers, RLS, vistas de estadísticas. |
| Dominio | `src/domain/` | Tipos y funciones puras (validaciones, cálculos de fechas de mes). Sin dependencias de Supabase ni React. |
| Datos | `src/data/` | Consultas a Supabase (una función por operación) y Server Actions. |
| UI | `src/app/`, `src/components/` | Páginas, formularios, componentes. Sólo llama a `src/data/`. |

```mermaid
flowchart TD
    UI[UI: app / components] --> Data[Datos: data]
    Data --> Domain[Dominio: domain]
    UI --> Domain
    Data --> DB[(Supabase / PostgreSQL)]
    UI -.->|prohibido| DB
```

Regla: la UI nunca llama a Supabase directo; el dominio no importa nada de las otras capas.

### 5.3 Patrones

- **Server Components** para lectura y **Server Actions** para escritura (sin API REST propia).
- **Repository simple:** un archivo por entidad en `src/data/` (`clubs.ts`, `players.ts`, …).
- **Cálculo en la base:** las estadísticas se resuelven en vistas SQL, no en TypeScript.

### 5.4 Qué va en cada capa (guía práctica)

- ¿Es una regla que la base puede garantizar (unicidad, fechas válidas)? → migración SQL.
- ¿Es una validación de formulario o un cálculo con fechas sin acceso a datos? → `src/domain/`.
- ¿Lee o escribe en Supabase? → `src/data/`.
- ¿Se ve en pantalla? → `src/app/` o `src/components/`.

---

## 6. Acuerdo de ingeniería y estándares

> ⚠️ **Esto tiene que controlarse** (D-13) — **Pregunta:** ¿qué prácticas de desarrollo se
> siguen? **Decisión:** las de esta sección. **Por qué:** `CLAUDE.md` no las define; se
> eligieron prácticas livianas acordes a un desarrollador solo que está aprendiendo.

- **Principios:** un desarrollador; ramas cortas por historia de usuario con PR a `main`
  (autorrevisión + CI verde para mergear); migraciones SQL versionadas, nunca cambios a mano en
  la base de producción.
- **Pruebas:** Vitest para dominio (unitarias); Vitest contra Supabase local para RLS, triggers y
  vistas (integración); Playwright sólo para el flujo principal (Hito 5). Sin cobertura mínima
  obligatoria; toda regla de la sección 7 tiene al menos un test.
- **Esfuerzo:** S (1-2 días) · M (3-5 días) · L (6-10 días) · XL (>10, partir).
- **Prioridad:** Urgente (bloqueante) · Alta · Media · Baja.
- **Gestión:** el orden de trabajo es el de la sección 10; dentro de un hito, por dependencias.

---

## 7. Reglas de negocio consolidadas

- **RN-01** Cada entrenador ve y modifica sólo sus clubes y todo lo que cuelga de ellos.
- **RN-02** Un jugador pertenece a una sola categoría (D-10).
- **RN-03** Un jugador puede tener asistencia sólo en clases de su categoría con fecha entre su
  alta y su baja.
- **RN-04** Dar de baja un jugador no borra su historial; sigue contando en los meses en que
  estuvo activo.
- **RN-05** Un jugador con asistencias registradas no se puede eliminar, sólo dar de baja. Uno
  sin asistencias sí se puede eliminar (para corregir errores de carga).
- **RN-06** No puede haber dos clases de la misma categoría en la misma fecha (D-11).
- **RN-07** Eliminar un club o una categoría elimina todo su contenido, previa confirmación
  escribiendo el nombre.
- **RN-08** Todas las estadísticas usan las definiciones de la sección 2.1.

> ⚠️ **Esto tiene que controlarse** (D-16) — **Pregunta:** ¿qué pasa al eliminar clubes,
> categorías y jugadores? **Decisión:** RN-05 y RN-07. **Por qué:** protege el historial de
> asistencia (el dato valioso) sin impedir corregir errores; la confirmación por nombre evita
> borrados accidentales en el celular.

---

## 8. Requisitos No Funcionales

| Categoría | Requisito | Objetivo |
|-----------|-----------|----------|
| Usabilidad | Diseño mobile-first; toda pantalla usable en 360 px de ancho. | 100% de pantallas. |
| Usabilidad | Toma de asistencia con 20 jugadores. | < 60 s. |
| Rendimiento | Carga de pantallas de estadísticas con 1 año de datos de 4 categorías. | < 2 s en 4G. |
| Seguridad | RLS activo en todas las tablas; tests que verifican que un entrenador no lee datos de otro. | 0 tablas sin RLS. |
| Seguridad | La clave `service_role` nunca llega al navegador. | Verificado en revisión. |
| Disponibilidad | La que dan los planes de Vercel y Supabase. | Sin objetivo propio en v1. |
| Accesibilidad | Controles con etiqueta, contraste AA, operables con teclado. | Lighthouse Accesibilidad ≥ 90. |
| Costo | Funcionar dentro de los planes gratuitos de Vercel y Supabase. | USD 0/mes en v1. |

> ⚠️ **Esto tiene que controlarse** (D-03) — **Pregunta:** ¿qué requisitos no funcionales
> aplican? **Decisión:** la tabla de arriba, con mobile-first como principal. **Por qué:** la
> asistencia se toma en la cancha, desde el celular; el costo cero es razonable para un
> proyecto de aprendizaje.

---

## 9. ADRs y registro de decisiones

### 9.1 Decisiones tomadas en este documento (a validar)

| ID | Tema | Decisión | Estado |
|----|------|----------|--------|
| D-01 | Métricas de éxito | Sección 1.4 | A controlar |
| D-02 | Stack | Next.js + TS + Tailwind en Vercel, Supabase | A controlar |
| D-03 | NFR | Mobile-first, costo 0 | A controlar |
| D-04 | Clubes compartidos | No, un club = un entrenador | A controlar |
| D-05 | Jugador nuevo | Por `joined_on` en el mes | A controlar |
| D-06 | Abandono | Baja manual con fecha | A controlar |
| D-07 | Período anual | Año calendario | A controlar |
| D-08 | Clases recurrentes | No, carga manual por fecha | A controlar |
| D-09 | Ausencias | Sólo se guardan presentes; sin justificados | A controlar |
| D-10 | Jugador en varias categorías | No | A controlar |
| D-11 | Dos clases el mismo día | No | A controlar |
| D-12 | Idioma del código | Inglés en código/base, español en UI/docs | A controlar |
| D-13 | Prácticas de ingeniería | Sección 6 | A controlar |
| D-14 | Importar/exportar Excel | Fuera de v1 | A controlar |
| D-15 | Offline | Fuera de v1 | A controlar |
| D-16 | Borrado | RN-05 y RN-07 | A controlar |
| D-17 | Autenticación | Email + contraseña | A controlar |
| D-18 | Ranking: período | Mes, año o rango, por categoría | A controlar |
| D-19 | Versionado y ramas | Sección 13 | A controlar |
| D-20 | "% nuevos en total" | Total del club, no de todos los clubes | A controlar |
| D-21 | Reactivar jugador | Borra la baja, conserva el alta original | A controlar |
| D-22 | Corregir fechas con asistencias cargadas | Se rechaza el cambio | A controlar |

### 9.2 ADRs pendientes

| ADR | Pregunta | Bloquea |
|-----|----------|---------|
| ADR-01 | Confirmar stack (D-02). | Hito 1 |
| ADR-02 | Confirmar definiciones de nuevo/abandono/año (D-05, D-06, D-07). | Hito 2 (US-203, US-204) y Hito 4 |
| ADR-03 | Confirmar modelo de asistencia (D-09, D-11, D-22). | Hito 3 |

---

## 10. Hitos → Épicas → Historias de Usuario

Dependencias entre historias (resumen):

```mermaid
flowchart LR
    US-101 --> US-102 --> US-103 --> US-201 --> US-202 --> US-203 --> US-204
    US-202 --> US-301 --> US-302
    US-203 --> US-302 --> US-303
    US-302 --> US-304
    US-204 --> US-401
    US-302 --> US-401
    US-401 --> US-402
    US-401 --> US-403
    US-401 --> US-404
    US-303 --> US-501
    US-402 --> US-501
    US-403 --> US-501
    US-404 --> US-501
    US-501 --> US-502
```

---

### Hito 1 — Fundaciones (v0.1)

- **Objetivo del hito:** proyecto desplegado en Vercel, conectado a Supabase, con login y la
  estructura de navegación vacía.
- **Épicas:** 2 · **Historias:** 3 · **Esfuerzo total estimado:** ~7 días·persona

#### Épica H1-E1: Infraestructura del proyecto

#### US-101 — Proyecto base desplegado

- **Esfuerzo:** S (2 días) · **Prioridad:** Urgente · **Dependencias:** ninguna
- **Objetivo Funcional:** tener un esqueleto que compila, se testea y se despliega solo.
- **Narrativa:** Como desarrollador, quiero un proyecto base con CI y deploy automático, para
  que cada historia siguiente se pueda probar en producción desde el primer día.
- **Detalle técnico:**
  - Next.js (App Router) + TypeScript estricto + Tailwind + ESLint + Prettier.
  - Vitest configurado con un test trivial.
  - Supabase CLI inicializado (`supabase/`), proyecto Supabase creado, variables
    `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel.
  - `src/lib/supabase/server.ts` y `client.ts` con `@supabase/ssr`.
  - GitHub Actions: lint + typecheck + test en cada PR; el job levanta Supabase local
    (`supabase start`) para que los tests de integración de los hitos siguientes corran en CI.
- **Criterios de Aceptación:**
  - AC1: `npm run lint`, `npm run typecheck` y `npm test` pasan en local y en CI.
  - AC2: un push a `main` despliega en Vercel y la URL muestra una página inicial.
  - AC3: `supabase start` levanta la base local sin errores.
- **Entidades:** ninguna.
- **Testing Mínimo:** test trivial de Vitest que valida la configuración.
- **Archivos a crear:**
  ```
  package.json, tsconfig.json, .eslintrc, .prettierrc, vitest.config.ts
  .github/workflows/ci.yml
  .env.example
  supabase/config.toml
  src/app/layout.tsx, src/app/page.tsx
  src/lib/supabase/server.ts, src/lib/supabase/client.ts
  ```

#### Épica H1-E2: Acceso del entrenador

#### US-102 — Registro, inicio y cierre de sesión

- **Esfuerzo:** M (3 días) · **Prioridad:** Urgente · **Dependencias:** US-101
- **Objetivo Funcional:** que cada entrenador tenga su cuenta y sus datos queden aislados.
- **Narrativa:** Como entrenador, quiero crear una cuenta e ingresar con email y contraseña,
  para que mis planteles sean sólo míos.
- **Detalle técnico:**
  - Supabase Auth con email + contraseña y confirmación por email.
  - Páginas `/login`, `/registro`, `/recuperar` (envío de email de recuperación).
  - `src/middleware.ts`: refresca la sesión y redirige a `/login` las rutas privadas.
  - Server Action `signOut`.
- **Criterios de Aceptación:**
  - AC1: un usuario nuevo se registra, confirma el email e ingresa.
  - AC2: con credenciales incorrectas se muestra un error en español sin revelar si el email
    existe.
  - AC3: sin sesión, cualquier ruta privada redirige a `/login`.
  - AC4: "Cerrar sesión" invalida la sesión y vuelve a `/login`.
  - AC5: se puede pedir el email de recuperación y definir una contraseña nueva.
- **Reglas de Negocio:** RN-01 (base del aislamiento).
- **Entidades:** `auth.users`.
- **Testing Mínimo:** unitario de la lógica de redirección del middleware; prueba manual del
  flujo de registro documentada en el PR.
- **Archivos a crear:**
  ```
  src/middleware.ts
  src/app/(auth)/login/page.tsx
  src/app/(auth)/registro/page.tsx
  src/app/(auth)/recuperar/page.tsx
  src/data/auth.ts
  ```

> ⚠️ **Esto tiene que controlarse** (D-17) — **Pregunta:** ¿cómo se autentica el entrenador?
> **Decisión:** email + contraseña. **Por qué:** es el método base de Supabase Auth, sin
> configurar proveedores externos; login con Google queda en roadmap.

#### US-103 — Estructura de navegación privada

- **Esfuerzo:** S (2 días) · **Prioridad:** Alta · **Dependencias:** US-102
- **Objetivo Funcional:** un marco común para todas las pantallas privadas.
- **Narrativa:** Como entrenador, quiero una navegación clara desde el celular, para moverme
  entre clubes y categorías sin perderme.
- **Detalle técnico:**
  - Layout `src/app/(app)/layout.tsx` con encabezado (nombre de la app, email, cerrar sesión).
  - Componente `Breadcrumbs` (Clubes › Club › Categoría › …) que recibe los tramos por props.
  - Componentes base reutilizables: `Button`, `Input`, `ConfirmDialog`, `EmptyState`.
  - Página `/clubes` con el `EmptyState` "Todavía no tenés clubes" (el listado real llega en
    US-201).
- **Criterios de Aceptación:**
  - AC1: tras iniciar sesión, el entrenador llega a `/clubes`.
  - AC2: el layout se ve correctamente en 360 px de ancho.
  - AC3: `ConfirmDialog` admite modo "escribir el nombre para confirmar" (usado por RN-07).
- **Entidades:** ninguna.
- **Testing Mínimo:** test de componente de `ConfirmDialog` (botón deshabilitado hasta escribir
  el nombre exacto).
- **Archivos a crear:**
  ```
  src/app/(app)/layout.tsx
  src/app/(app)/clubes/page.tsx
  src/components/{Breadcrumbs,Button,Input,ConfirmDialog,EmptyState}.tsx
  ```

---

### Hito 2 — Estructura del entrenador (v0.2)

- **Objetivo del hito:** el entrenador carga sus clubes, categorías y jugadores.
- **Épicas:** 2 · **Historias:** 4 · **Esfuerzo total estimado:** ~10 días·persona

#### Épica H2-E1: Clubes y categorías

#### US-201 — Gestionar clubes

- **Esfuerzo:** S (2 días) · **Prioridad:** Urgente · **Dependencias:** US-103
- **Objetivo Funcional:** representar cada club o escuelita donde trabaja el entrenador.
- **Narrativa:** Como entrenador, quiero crear, renombrar y eliminar mis clubes, para organizar
  mis categorías por institución.
- **Detalle técnico:**
  - Migración: tabla `clubs` con RLS (`coach_id = auth.uid()`), `unique(coach_id, name)`.
  - `src/data/clubs.ts`: `listClubs`, `createClub`, `renameClub`, `deleteClub`.
  - `src/domain/names.ts`: `normalizeName` (trim, espacios simples, no vacío, máx. 80).
  - `/clubes` lista los clubes; cada uno enlaza a `/clubes/[clubId]`.
- **Criterios de Aceptación:**
  - AC1: crear un club lo muestra en el listado.
  - AC2: un nombre repetido (para el mismo entrenador) muestra "Ya tenés un club con ese
    nombre".
  - AC3: eliminar pide escribir el nombre (RN-07) y borra el club.
  - AC4: un entrenador no ve los clubes de otro.
- **Reglas de Negocio:** RN-01, RN-07.
- **Entidades:** `clubs`.
- **Testing Mínimo:** unitario de `normalizeName`; integración RLS: usuario B no puede leer ni
  modificar un club de A.
- **Archivos a crear:**
  ```
  supabase/migrations/0001_clubs.sql
  src/domain/names.ts
  src/data/clubs.ts
  src/app/(app)/clubes/page.tsx (actualizar)
  src/app/(app)/clubes/[clubId]/page.tsx
  tests/integration/clubs.rls.test.ts
  ```

#### US-202 — Gestionar categorías de un club

- **Esfuerzo:** S (2 días) · **Prioridad:** Urgente · **Dependencias:** US-201
- **Objetivo Funcional:** representar cada grupo de entrenamiento dentro de un club.
- **Narrativa:** Como entrenador, quiero crear, renombrar y eliminar categorías dentro de un
  club, para llevar la asistencia de cada grupo por separado.
- **Detalle técnico:**
  - Migración: tabla `categories` (cascada desde `clubs`), función SQL
    `owns_category(category_id)` y políticas RLS que la usan.
  - `src/data/categories.ts`: `listCategories`, `createCategory`, `renameCategory`,
    `deleteCategory`.
  - `/clubes/[clubId]` lista las categorías; cada una enlaza a
    `/clubes/[clubId]/categorias/[categoryId]`.
  - Layout de la categoría con pestañas Grilla · Jugadores · Clases · Estadísticas; cada
    pestaña muestra `EmptyState` hasta que su historia la completa (US-303, US-203, US-301,
    US-402).
- **Criterios de Aceptación:**
  - AC1: crear, renombrar y eliminar (con confirmación por nombre) funcionan.
  - AC2: nombre repetido dentro del mismo club se rechaza; en clubes distintos se permite.
  - AC3: eliminar un club elimina sus categorías.
- **Reglas de Negocio:** RN-01, RN-07.
- **Entidades:** `categories`.
- **Testing Mínimo:** integración: cascada club → categorías; RLS sobre categorías.
- **Archivos a crear:**
  ```
  supabase/migrations/0002_categories.sql
  src/data/categories.ts
  src/app/(app)/clubes/[clubId]/categorias/[categoryId]/layout.tsx
  src/app/(app)/clubes/[clubId]/categorias/[categoryId]/page.tsx
  tests/integration/categories.test.ts
  ```

#### Épica H2-E2: Jugadores

#### US-203 — Alta y edición de jugadores

- **Esfuerzo:** M (4 días) · **Prioridad:** Urgente · **Dependencias:** US-202
- **Objetivo Funcional:** tener el plantel de cada categoría con su fecha de alta.
- **Narrativa:** Como entrenador, quiero agregar jugadores a una categoría con su fecha de
  alta y corregir sus datos, para saber quién forma parte del plantel y desde cuándo.
- **Detalle técnico:**
  - Migración: tabla `players` (cascada desde `categories`, RLS con `owns_category`).
  - `src/data/players.ts`: `listPlayers(categoryId, { includeInactive })`, `createPlayer`,
    `updatePlayer`, `deletePlayer`.
  - Componente `PlayerForm` (nombre, apellido, fecha de alta; por defecto hoy). Se reutiliza en
    US-302.
  - Pestaña "Jugadores" de la categoría: listado ordenado por apellido.
  - Eliminar sólo si no tiene asistencias (RN-05). En esta historia todavía no existe la tabla
    de asistencias, así que la regla se agrega en US-304.
- **Criterios de Aceptación:**
  - AC1: se agrega un jugador con nombre, apellido y fecha de alta.
  - AC2: se edita nombre, apellido y fecha de alta.
  - AC3: el listado muestra sólo activos por defecto, con opción "mostrar dados de baja".
  - AC4: se puede eliminar un jugador (con confirmación simple).
- **Reglas de Negocio:** RN-02.
- **Entidades:** `players`.
- **Testing Mínimo:** unitario de validación del formulario; integración de RLS sobre
  `players`.
- **Archivos a crear:**
  ```
  supabase/migrations/0003_players.sql
  src/domain/players.ts
  src/data/players.ts
  src/components/PlayerForm.tsx
  src/app/(app)/clubes/[clubId]/categorias/[categoryId]/jugadores/page.tsx
  tests/unit/players.test.ts
  ```

#### US-204 — Baja (abandono) y reactivación de jugadores

- **Esfuerzo:** S (2 días) · **Prioridad:** Alta · **Dependencias:** US-203
- **Objetivo Funcional:** registrar abandonos con fecha, que alimentan la estadística de
  abandonos.
- **Narrativa:** Como entrenador, quiero dar de baja a un jugador que dejó, indicando la
  fecha, para que no aparezca en las clases nuevas pero conserve su historial.
- **Detalle técnico:**
  - `src/data/players.ts`: `markLeft(playerId, leftOn)`, `reactivate(playerId)` (pone
    `left_on = null`).
  - Acciones "Dar de baja" (pide fecha, por defecto hoy) y "Reactivar" en el listado.
- **Criterios de Aceptación:**
  - AC1: dar de baja con fecha anterior a la de alta se rechaza (constraint de la base).
  - AC2: el jugador dado de baja deja de aparecer en el listado por defecto.
  - AC3: reactivar lo vuelve a mostrar como activo.
- **Reglas de Negocio:** RN-04; D-06, D-21.
- **Entidades:** `players`.
- **Testing Mínimo:** integración: el check `left_on >= joined_on` rechaza fechas inválidas.
- **Archivos a crear:** sin archivos nuevos (amplía `src/data/players.ts` y la página de
  jugadores).

> ⚠️ **Esto tiene que controlarse** (D-21) — **Pregunta:** si un jugador vuelve
> después de una baja, ¿es "nuevo" de nuevo? **Decisión:** no; "Reactivar" borra la baja y
> conserva la fecha de alta original. **Por qué:** mantiene un solo período de actividad por
> jugador, que es lo que soporta el modelo de datos. Si se quieren contar los regresos, hace
> falta un historial de períodos (roadmap).

---

### Hito 3 — Clases y asistencia (v0.3)

- **Objetivo del hito:** reemplazar la hoja de Excel: cargar clases, tomar asistencia y ver
  la grilla mensual.
- **Épicas:** 2 · **Historias:** 4 · **Esfuerzo total estimado:** ~13 días·persona

#### Épica H3-E1: Clases

#### US-301 — Gestionar clases del mes

- **Esfuerzo:** M (3 días) · **Prioridad:** Urgente · **Dependencias:** US-202
- **Objetivo Funcional:** registrar qué días hubo clase en cada categoría.
- **Narrativa:** Como entrenador, quiero agregar, cambiar la fecha y eliminar las clases de un
  mes, para tener el calendario real de entrenamientos.
- **Detalle técnico:**
  - Migración: tabla `sessions` (cascada desde `categories`, `unique(category_id, held_on)`,
    RLS).
  - `src/data/sessions.ts`: `listSessions(categoryId, month)`, `createSession`,
    `updateSessionDate`, `deleteSession`.
  - `src/domain/months.ts`: `monthRange(yyyyMm)`, `previousMonth`, `nextMonth`.
  - Componente `MonthPicker` (mes anterior / siguiente). Se reutiliza en US-303 y Hito 4.
  - Pestaña "Clases" de la categoría: lista de fechas del mes seleccionado.
- **Criterios de Aceptación:**
  - AC1: se agrega una clase eligiendo la fecha (por defecto hoy).
  - AC2: una fecha repetida en la misma categoría muestra "Ya hay una clase ese día".
  - AC3: se puede cambiar la fecha y eliminar (con confirmación simple).
  - AC4: el listado se filtra por mes con `MonthPicker`.
- **Reglas de Negocio:** RN-06; D-08.
- **Entidades:** `sessions`.
- **Testing Mínimo:** unitario de `monthRange` (incluye febrero bisiesto y diciembre);
  integración del `unique`.
- **Archivos a crear:**
  ```
  supabase/migrations/0004_sessions.sql
  src/domain/months.ts
  src/data/sessions.ts
  src/components/MonthPicker.tsx
  src/app/(app)/clubes/[clubId]/categorias/[categoryId]/clases/page.tsx
  tests/unit/months.test.ts
  ```

> ⚠️ **Esto tiene que controlarse** (D-08) — **Pregunta:** ¿las clases se generan solas según
> los días de entrenamiento? **Decisión:** no; se cargan una por una. **Por qué:** `CLAUDE.md`
> dice "se agregan las clases del mes"; generar calendarios requiere manejar feriados y
> suspensiones. Queda en roadmap.

#### Épica H3-E2: Asistencia

#### US-302 — Tomar asistencia de una clase

- **Esfuerzo:** M (4 días) · **Prioridad:** Urgente · **Dependencias:** US-301, US-203
- **Objetivo Funcional:** registrar quién vino, quién faltó y quién empezó nuevo en una clase.
- **Narrativa:** Como entrenador, quiero marcar en el celular quién vino a la clase y agregar
  ahí mismo a un chico nuevo, para cargar la asistencia en la cancha.
- **Detalle técnico:**
  - Migración: tabla `attendances` (PK compuesta, cascadas, RLS) y trigger
    `attendances_validate` (misma categoría y fecha dentro del período del jugador).
  - `src/data/attendances.ts`: `getSessionAttendance(sessionId)` (jugadores activos en la
    fecha + presente sí/no), `saveSessionAttendance(sessionId, presentPlayerIds[])`
    (reemplaza el conjunto en una transacción vía función SQL `set_session_attendance`).
  - Página `/clases/[sessionId]`: lista de jugadores activos en la fecha con un toggle
    grande por jugador, contador "X de Y presentes", botón Guardar.
  - Botón "Agregar jugador nuevo" que abre `PlayerForm` (US-203) con fecha de alta = fecha de
    la clase; al guardarse aparece marcado presente.
- **Criterios de Aceptación:**
  - AC1: la lista muestra sólo jugadores activos en la fecha de la clase.
  - AC2: guardar registra presentes; los no marcados quedan como ausentes (D-09).
  - AC3: reabrir la clase muestra lo guardado y permite corregirlo.
  - AC4: un jugador nuevo agregado desde la clase queda con alta en esa fecha y presente.
  - AC5: con 20 jugadores, la carga completa lleva menos de 60 s en un celular (NFR).
- **Reglas de Negocio:** RN-03; D-05, D-09.
- **Entidades:** `attendances`, `players`, `sessions`.
- **Testing Mínimo:** integración: trigger rechaza jugador de otra categoría y fecha fuera de
  período; `set_session_attendance` reemplaza el conjunto.
- **Archivos a crear:**
  ```
  supabase/migrations/0005_attendances.sql
  src/data/attendances.ts
  src/app/(app)/clubes/[clubId]/categorias/[categoryId]/clases/[sessionId]/page.tsx
  src/components/AttendanceToggle.tsx
  tests/integration/attendances.test.ts
  ```

#### US-303 — Grilla mensual de la categoría

- **Esfuerzo:** M (4 días) · **Prioridad:** Alta · **Dependencias:** US-302
- **Objetivo Funcional:** ver el mes completo como en la hoja de Excel.
- **Narrativa:** Como entrenador, quiero ver el listado de jugadores del mes con una columna
  por clase, para revisar de un vistazo quién vino a qué.
- **Detalle técnico:**
  - `src/data/attendances.ts`: `getMonthGrid(categoryId, month)` → jugadores activos en el
    mes, clases del mes, presentes.
  - Página principal de la categoría (`/categorias/[categoryId]`): tabla jugadores × clases
    con ✓/–, columna de presentes del mes, marca "Nuevo" para quien tiene alta en el mes y
    "Baja" para quien tiene baja en el mes. Celdas fuera del período del jugador se muestran
    vacías (no aplica).
  - Encabezado de cada clase enlaza a su toma de asistencia (US-302). La grilla es de sólo
    lectura.
  - Primera columna fija y scroll horizontal en celular. Usa `MonthPicker`.
- **Criterios de Aceptación:**
  - AC1: la grilla coincide con lo cargado en cada clase del mes.
  - AC2: los jugadores nuevos y dados de baja del mes tienen su marca.
  - AC3: tocar el encabezado de una clase abre su toma de asistencia.
  - AC4: es usable en 360 px (primera columna fija).
- **Reglas de Negocio:** RN-08 (definición de activo, nuevo y abandono).
- **Entidades:** `players`, `sessions`, `attendances`.
- **Testing Mínimo:** unitario de la función que arma la matriz a partir de las tres listas
  (`src/domain/grid.ts`).
- **Archivos a crear:**
  ```
  src/domain/grid.ts
  src/components/MonthGrid.tsx
  src/app/(app)/clubes/[clubId]/categorias/[categoryId]/page.tsx (actualizar)
  tests/unit/grid.test.ts
  ```

#### US-304 — Proteger la asistencia ante cambios de jugadores y clases

- **Esfuerzo:** S (2 días) · **Prioridad:** Alta · **Dependencias:** US-302
- **Objetivo Funcional:** que editar o borrar jugadores y clases no deje asistencias
  inconsistentes ni pierda historial.
- **Narrativa:** Como entrenador, quiero que la app me avise si una corrección rompería la
  asistencia ya cargada, para no perder ni falsear datos.
- **Detalle técnico:**
  - Migración: trigger en `players` que impide borrar un jugador con asistencias (RN-05) y que
    rechaza cambiar `joined_on`/`left_on` si deja asistencias fuera del período (RN-03).
  - Trigger en `sessions` al cambiar `held_on`: rechaza si algún presente queda fuera de su
    período.
  - `deletePlayer`, `updatePlayer`, `markLeft` y `updateSessionDate` traducen el error a
    mensajes en español ("Tiene asistencias: dalo de baja", "Hay asistencias fuera de esas
    fechas").
- **Criterios de Aceptación:**
  - AC1: borrar un jugador con asistencias se rechaza con el mensaje indicado; sin asistencias
    se borra.
  - AC2: dar de baja con fecha anterior a su última asistencia se rechaza.
  - AC3: mover una clase a una fecha en la que algún presente no estaba activo se rechaza.
- **Reglas de Negocio:** RN-03, RN-05.
- **Entidades:** `players`, `sessions`, `attendances`.
- **Testing Mínimo:** integración: un test por cada AC.
- **Archivos a crear:**
  ```
  supabase/migrations/0006_attendance_integrity.sql
  tests/integration/attendance-integrity.test.ts
  ```

> ⚠️ **Esto tiene que controlarse** (D-22) — **Pregunta:** ¿qué pasa con las asistencias si se
> corrigen fechas de un jugador o de una clase? **Decisión:** se rechaza el cambio y se avisa;
> no se borran asistencias automáticamente. **Por qué:** el historial de asistencia es el dato
> más valioso (nivel Crítico en sección 12); borrarlo en silencio sería peor que pedir una
> corrección manual.

---

### Hito 4 — Estadísticas (v0.4)

- **Objetivo del hito:** todas las estadísticas de `CLAUDE.md` calculadas por la base.
- **Épicas:** 2 · **Historias:** 4 · **Esfuerzo total estimado:** ~12 días·persona

#### Épica H4-E1: Cálculo en PostgreSQL

#### US-401 — Vistas SQL de estadísticas

- **Esfuerzo:** M (4 días) · **Prioridad:** Urgente · **Dependencias:** US-204, US-302
- **Objetivo Funcional:** una única fuente de verdad para todos los números.
- **Narrativa:** Como entrenador, quiero que los números se calculen siempre igual, para
  confiar en ellos como confiaba en mis fórmulas.
- **Detalle técnico:**
  - Migración con las vistas `category_monthly_stats`, `club_monthly_stats` y
    `player_attendance` (sección 4.3), con `security_invoker = true`. Meses generados con
    `generate_series` desde el primer mes con datos de la categoría hasta el mayor entre el mes
    actual y el de la última clase cargada.
  - Seed de datos de prueba (`supabase/seed.sql`) con casos borde: alta y baja en el mismo
    mes, jugador sin clases aplicables, mes sin clases.
- **Criterios de Aceptación:**
  - AC1: las vistas cumplen exactamente las definiciones de la sección 2.1.
  - AC2: un mes sin clases aparece con 0 clases (no desaparece).
  - AC3: un entrenador no ve filas de otro a través de las vistas.
- **Reglas de Negocio:** RN-08.
- **Entidades:** vistas nuevas sobre todas las tablas.
- **Testing Mínimo:** integración contra el seed: un test por definición de la sección 2.1 y
  uno de RLS a través de las vistas.
- **Archivos a crear:**
  ```
  supabase/migrations/0007_stats_views.sql
  supabase/seed.sql
  src/data/stats.ts
  tests/integration/stats.test.ts
  ```

#### Épica H4-E2: Pantallas de estadísticas

#### US-402 — Estadísticas de la categoría

- **Esfuerzo:** M (3 días) · **Prioridad:** Alta · **Dependencias:** US-401
- **Objetivo Funcional:** ver la evolución del plantel de una categoría.
- **Narrativa:** Como entrenador, quiero ver mes a mes cuántos jugadores tuvo una categoría,
  cuántos fueron nuevos y cuántos dejaron, y cuántas clases hubo, para seguir su evolución.
- **Detalle técnico:**
  - Pestaña "Estadísticas" de la categoría, año seleccionable.
  - Tabla mes a mes: activos, nuevos, % nuevos, abandonos, clases; fila de totales del año
    (clases del año, nuevos del año, abandonos del año).
  - Gráfico de barras simple de activos por mes (SVG propio, sin librería).
- **Criterios de Aceptación:**
  - AC1: los valores coinciden con `category_monthly_stats`.
  - AC2: la fila anual muestra el recuento de clases del año.
  - AC3: un año sin datos muestra `EmptyState`.
- **Reglas de Negocio:** RN-08; D-07.
- **Entidades:** `category_monthly_stats`.
- **Testing Mínimo:** unitario del cálculo de la fila de totales.
- **Archivos a crear:**
  ```
  src/app/(app)/clubes/[clubId]/categorias/[categoryId]/estadisticas/page.tsx
  src/components/BarChart.tsx
  src/domain/totals.ts
  tests/unit/totals.test.ts
  ```

#### US-403 — Ranking de asistencia

- **Esfuerzo:** S (2 días) · **Prioridad:** Alta · **Dependencias:** US-401
- **Objetivo Funcional:** saber quién asiste más y quién menos.
- **Narrativa:** Como entrenador, quiero un ranking de asistencia con porcentaje por jugador,
  para reconocer a los más constantes y detectar a los que vienen poco.
- **Detalle técnico:**
  - `src/data/stats.ts`: `getAttendanceRanking(categoryId, from, to)` sobre
    `player_attendance`.
  - Sección "Ranking" en la pestaña de estadísticas: selector Mes / Año / Rango; tabla con
    posición, jugador, presentes, clases aplicables y %. Orden: % desc, presentes desc,
    apellido.
- **Criterios de Aceptación:**
  - AC1: el % usa sólo las clases en que el jugador estaba activo (sección 2.1).
  - AC2: jugadores sin clases aplicables aparecen al final con "–".
  - AC3: los dados de baja aparecen si estuvieron activos en el período, con su marca.
- **Reglas de Negocio:** RN-08; D-18.
- **Entidades:** `player_attendance`.
- **Testing Mínimo:** integración: ranking del seed con empate resuelto por la regla de orden.
- **Archivos a crear:**
  ```
  src/components/RankingTable.tsx
  src/app/(app)/clubes/[clubId]/categorias/[categoryId]/estadisticas/page.tsx (actualizar)
  ```

> ⚠️ **Esto tiene que controlarse** (D-18) — **Pregunta:** ¿el ranking es por categoría o por
> club, y de qué período? **Decisión:** por categoría, con período mes, año o rango libre.
> **Por qué:** en el Excel el ranking estaba en cada hoja (categoría); comparar porcentajes
> entre categorías con distinta cantidad de clases no es justo.

#### US-404 — Resumen del club

- **Esfuerzo:** M (3 días) · **Prioridad:** Alta · **Dependencias:** US-401
- **Objetivo Funcional:** ver el total de jugadores que maneja el entrenador en un club.
- **Narrativa:** Como entrenador, quiero ver cuántos jugadores tengo en total en un club, el %
  de nuevos y los abandonos, comparando sus categorías, para tener la foto completa del club.
- **Detalle técnico:**
  - Página del club (`/clubes/[clubId]`): encima del listado de categorías, tarjetas del mes
    seleccionado (activos totales, % nuevos total, abandonos, clases del mes y del año) desde
    `club_monthly_stats`.
  - Tabla por categoría del mes (activos, nuevos, abandonos, clases) desde
    `category_monthly_stats`.
- **Criterios de Aceptación:**
  - AC1: los totales del club son la suma de sus categorías.
  - AC2: el % de nuevos total es nuevos del club ÷ activos del club.
  - AC3: las clases del club son la suma de las clases de sus categorías.
  - AC4: el selector de mes usa `MonthPicker`.
- **Reglas de Negocio:** RN-08; D-10 (posibles personas duplicadas entre categorías), D-20.
- **Entidades:** `club_monthly_stats`, `category_monthly_stats`.
- **Testing Mínimo:** integración: suma de categorías = total del club en el seed.
- **Archivos a crear:**
  ```
  src/components/StatCard.tsx
  src/app/(app)/clubes/[clubId]/page.tsx (actualizar)
  ```

> ⚠️ **Esto tiene que controlarse** (D-20) — **Pregunta:** "porcentaje de nuevos en
> total", ¿total del club o de todos los clubes del entrenador? **Decisión:** total del club.
> **Por qué:** `CLAUDE.md` pide el total de jugadores "en un club"; una vista que sume todos
> los clubes queda en roadmap.

---

### Hito 5 — Lanzamiento (v1.0)

- **Objetivo del hito:** dejar la app lista para uso real del autor y de otros entrenadores.
- **Épicas:** 1 · **Historias:** 2 · **Esfuerzo total estimado:** ~6 días·persona

#### Épica H5-E1: Calidad y release

#### US-501 — Pulido mobile y accesibilidad

- **Esfuerzo:** M (3 días) · **Prioridad:** Alta · **Dependencias:** US-303, US-402, US-403,
  US-404
- **Objetivo Funcional:** que todas las pantallas cumplan los NFR de usabilidad y accesibilidad.
- **Narrativa:** Como entrenador, quiero que la app sea cómoda en mi celular, para usarla
  durante el entrenamiento.
- **Detalle técnico:** revisión de todas las pantallas en 360 px; estados de carga y error
  (`loading.tsx`, `error.tsx` por segmento); `EmptyState` en todos los listados; corrección de
  hallazgos de Lighthouse.
- **Criterios de Aceptación:**
  - AC1: Lighthouse Accesibilidad ≥ 90 en clubes, categoría, clase y estadísticas.
  - AC2: ninguna pantalla tiene scroll horizontal salvo la grilla mensual.
  - AC3: todo listado vacío muestra un `EmptyState` con la acción siguiente.
- **Entidades:** ninguna.
- **Testing Mínimo:** reporte de Lighthouse adjunto al PR.
- **Archivos a crear:**
  ```
  src/app/(app)/loading.tsx, src/app/(app)/error.tsx
  ```

#### US-502 — Test end-to-end del flujo principal y release 1.0

- **Esfuerzo:** M (3 días) · **Prioridad:** Alta · **Dependencias:** US-501
- **Objetivo Funcional:** asegurar el flujo completo antes de publicar v1.0.
- **Narrativa:** Como desarrollador, quiero un test automático del recorrido principal, para
  publicar v1.0 sin romper lo esencial.
- **Detalle técnico:**
  - Playwright contra Supabase local: registro → club → categoría → jugadores → clase →
    asistencia → grilla → estadísticas → ranking.
  - Job de CI que corre el E2E.
  - Release `v1.0.0` siguiendo la sección 13.
- **Criterios de Aceptación:**
  - AC1: el E2E pasa en CI.
  - AC2: el tag `v1.0.0` existe y el CHANGELOG lo documenta.
  - AC3: producción tiene todas las migraciones aplicadas.
- **Entidades:** todas.
- **Testing Mínimo:** el propio E2E.
- **Archivos a crear:**
  ```
  playwright.config.ts
  tests/e2e/flujo-principal.spec.ts
  CHANGELOG.md
  ```

---

## 11. Definición de "Hecho" (DoD)

- [ ] Criterios de aceptación de la historia verificados.
- [ ] Lint, typecheck y tests pasando en CI.
- [ ] Toda regla de negocio nueva tiene al menos un test.
- [ ] Toda tabla nueva tiene RLS y un test de aislamiento entre entrenadores.
- [ ] Migraciones aplicadas en producción y deploy en Vercel funcionando.
- [ ] Pantallas nuevas revisadas en 360 px.
- [ ] PR mergeado a `main` con descripción de qué se hizo.

---

## 12. Catálogo técnico de criticidad

| Nivel | Definición | Tiempo de respuesta |
|-------|------------|---------------------|
| Crítico | Pérdida de datos de asistencia o un entrenador ve datos de otro. | Inmediato; se frena todo lo demás. |
| Alto | No se puede tomar asistencia o iniciar sesión. | Dentro de 24 h. |
| Medio | Una estadística muestra un valor incorrecto. | Dentro de la semana. |
| Bajo | Problema visual o de texto sin impacto en los datos. | Próximo release. |

Los tiempos asumen un único desarrollador sin guardia.

---

## 13. Proceso de liberación de versiones

> ⚠️ **Esto tiene que controlarse** (D-19) — **Pregunta:** ¿cómo se versiona y se libera?
> **Decisión:** lo de esta sección. **Por qué:** `CLAUDE.md` no lo define; es el esquema más
> simple compatible con el deploy automático de Vercel. Nota: el repositorio hoy está en la
> rama `master`; hay que renombrarla a `main` o adaptar esta sección.

- **Semver:** `MAJOR.MINOR.PATCH`. Antes de 1.0, cada hito sube `MINOR` (v0.1 … v0.4); `PATCH`
  para correcciones. Después de 1.0: `MAJOR` si cambia el modelo de datos de forma
  incompatible, `MINOR` por funcionalidad nueva, `PATCH` por correcciones.
- **Ramas:** `main` siempre desplegable; una rama por historia (`us-302-tomar-asistencia`);
  PR a `main`. Vercel genera preview por PR.
- **Pasos de un release:** 1) todas las historias del hito mergeadas; 2) `supabase db push`
  contra producción; 3) actualizar `CHANGELOG.md`; 4) tag `vX.Y.Z`; 5) verificar producción.
- **CHANGELOG:** formato *Keep a Changelog* (Agregado / Cambiado / Corregido) en español.
- **Hotfix:** rama `hotfix/descripcion` desde `main`, PR, release `PATCH`.

---

## 14. Estructura de repositorio final

```
asistencia-coach/
├── .github/workflows/ci.yml      # lint, typecheck, unit, integración, e2e
├── docs/PRD.md                   # este documento
├── supabase/
│   ├── config.toml
│   ├── migrations/               # 0001_clubs … 0007_stats_views
│   └── seed.sql                  # datos de prueba con casos borde
├── src/
│   ├── app/
│   │   ├── (auth)/               # login, registro, recuperar
│   │   └── (app)/clubes/         # clubes → categorías → jugadores / clases / estadísticas
│   ├── components/               # componentes de UI reutilizables
│   ├── data/                     # acceso a Supabase y Server Actions (uno por entidad)
│   ├── domain/                   # funciones puras: nombres, meses, grilla, totales
│   ├── lib/supabase/             # clientes server/browser
│   └── middleware.ts             # sesión y rutas privadas
├── tests/
│   ├── unit/
│   ├── integration/              # contra Supabase local (RLS, triggers, vistas)
│   └── e2e/
├── CHANGELOG.md
└── CLAUDE.md
```

---

## 15. Convenciones rápidas

- Código, tablas y columnas en inglés; UI y documentación en español (D-12).
- Fechas de negocio como `date` (sin hora); timestamps técnicos en UTC.
- Rutas de la UI en español (`/clubes`, `/categorias`, `/clases`).
- Un archivo de `src/data/` por entidad; un archivo de migración por historia que cambia la
  base.
- Ninguna estadística se calcula en el frontend: se lee de las vistas (excepto totales de
  presentación, como la fila anual).
- Nada de `service_role` en el código de la app.

---

## 16. Roadmap futuro (fuera de alcance v1.0)

**No es compromiso de entrega.** Ideas ordenadas por valor estimado:

1. Importar planillas de Excel existentes y exportar estadísticas (D-14).
2. Sugerencia de baja por inasistencias consecutivas (D-06).
3. Clases recurrentes según días de entrenamiento (D-08).
4. Ausente justificado (D-09).
5. Vista consolidada de todos los clubes del entrenador (D-20).
6. Clubes compartidos entre entrenadores con roles (D-04).
7. Historial de períodos de actividad para contar regresos (D-21).
8. Modo offline (D-15).
9. Login con Google (D-17).
10. Datos ampliados del jugador (contacto, tutor, fecha de nacimiento).

---

## Anexo — Iteraciones de revisión

El documento se revisó tres veces después del primer borrador. Correcciones aplicadas:

**Iteración 1 — dependencias y módulos inexistentes**
- US-302 concentraba la toma de asistencia y además las reglas de borrado/edición: se separó
  en US-304 (US-302 bajó de 5 a 4 días).
- Faltaba proteger RN-03 cuando se editan fechas de jugadores o clases después de cargar
  asistencia: cubierto en US-304 (D-22).
- US-303 y US-402 actualizaban la página de categoría sin que nadie creara las pestañas: US-202
  ahora crea el layout con pestañas vacías.
- Los tests de integración (desde US-201) necesitaban Supabase en CI: agregado en US-101.

**Iteración 2 — superposiciones y coherencia de reglas**
- US-203 decía que RN-05 se agregaba en US-302; ahora apunta a US-304, que la implementa.
- Decisiones marcadas como "D-06 aplicada" / "D-10 aplicada" eran decisiones nuevas: pasaron a
  D-21 y D-20 y se agregaron al índice 9.1 y al roadmap.
- US-404 no definía las clases del club: se agregó AC3 (suma de categorías).
- La vista de estadísticas cortaba en el mes actual y perdía clases cargadas a futuro: rango
  extendido hasta la última clase.

**Iteración 3 — carga y numeración**
- Carga por hito: H1 ~7, H2 ~10, H3 ~13, H4 ~12, H5 ~6 días·persona; ninguna historia supera
  M (5 días).
- Migraciones renumeradas (0006 integridad, 0007 vistas) y árbol de la sección 14 actualizado.
- Diagrama de dependencias actualizado con US-304.
- Verificado que cada historia usa sólo tablas, componentes o funciones creadas en una
  historia de la que depende (ej.: `PlayerForm` de US-203 en US-302, `MonthPicker` de US-301
  en US-303/US-404, `ConfirmDialog` de US-103 en US-201/US-202).
