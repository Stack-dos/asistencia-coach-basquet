# Guía: PostgreSQL y Supabase

## 1. Concepto

**PostgreSQL** (o "Postgres") es una base de datos **relacional**: guarda los datos en tablas
(filas y columnas) y las relaciona entre sí con claves. Se le habla en **SQL** (_Structured Query
Language_), un lenguaje declarativo: decís **qué** querés, no **cómo** buscarlo.

**Supabase** es un servicio que te da un Postgres ya instalado más varias piezas alrededor:

| Pieza         | Qué hace                                                                       |
| ------------- | ------------------------------------------------------------------------------ |
| **Database**  | El Postgres en sí. Ahí viven nuestras tablas (esquema `public`).               |
| **Auth**      | Usuarios, contraseñas, sesiones. Guarda los usuarios en la tabla `auth.users`. |
| **PostgREST** | Una API HTTP generada sola a partir de las tablas. `supabase-js` la usa.       |
| **Studio**    | Panel web para ver tablas y correr SQL (`http://localhost:54323` en local).    |
| **CLI**       | El comando `npx supabase ...`: levanta la base local y aplica migraciones.     |

## 2. Qué problema resuelve

En Excel, nada impide escribir "Juan" dos veces, poner una fecha inválida o borrar una hoja por
error. Una base relacional **garantiza reglas** aunque el código de la app tenga un bug:

- Un club no puede quedar sin entrenador (`not null`, `references`).
- No puede haber dos clubes con el mismo nombre para el mismo entrenador (`unique`).
- Un entrenador no puede leer los datos de otro (RLS).

Regla del proyecto (PRD §5.4): **si la base puede garantizar una regla, la garantiza la base.**
La app valida también (para mostrar errores lindos), pero la base es la última defensa.

## 3. Cómo funciona

### 3.1 Esquemas

Un **esquema** (_schema_) es una "carpeta" de tablas dentro de la base. Los que vas a ver:

- `public`: nuestras tablas (`clubs`, `categories`, ...). Es el esquema por defecto: `clubs` y
  `public.clubs` son lo mismo.
- `auth`: lo maneja Supabase Auth. **No se modifica**, sólo se referencia (`auth.users`).

### 3.2 Crear una tabla

Ejemplo genérico (una tabla de notas, no es del proyecto):

```sql
create table public.notes (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references auth.users (id) on delete cascade,
  title      text        not null,
  created_at timestamptz not null default now(),

  constraint notes_owner_title_key unique (owner_id, title),
  constraint notes_title_check check (btrim(title) <> '')
);
```

| Pieza                               | Qué significa                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `uuid`                              | Identificador de 128 bits (`3f2a9c1e-...`). No se puede adivinar el siguiente, a diferencia de 1, 2, 3. |
| `primary key`                       | Identifica la fila. Implica `not null` + `unique` y crea un índice.                                     |
| `default gen_random_uuid()`         | Si el insert no manda `id`, Postgres genera uno.                                                        |
| `not null`                          | La columna es obligatoria.                                                                              |
| `references auth.users (id)`        | **Clave foránea** (_foreign key_): el valor tiene que existir en `auth.users.id`.                       |
| `on delete cascade`                 | Si se borra el usuario, se borran sus notas. Alternativas: `restrict` (impide borrar), `set null`.      |
| `text`                              | Texto sin largo fijo. En Postgres se prefiere a `varchar(n)`; el largo se limita con un `check`.        |
| `timestamptz`                       | Fecha y hora **con zona horaria**. Usar siempre éste y no `timestamp`.                                  |
| `default now()`                     | Fecha y hora del momento del insert.                                                                    |
| `constraint <nombre> unique (a, b)` | La **combinación** `(a, b)` no se repite. También crea un índice sobre `(a, b)`.                        |
| `constraint <nombre> check (...)`   | Condición que toda fila tiene que cumplir. Si da `false`, el insert/update falla.                       |

Convenciones de nombres (las que usa Postgres por defecto, conviene imitarlas):
`<tabla>_<columnas>_key` para `unique`, `<tabla>_<columna>_check` para `check`,
`<tabla>_<columna>_fkey` para claves foráneas. Así, cuando falla, el mensaje de error dice
exactamente qué regla se rompió.

### 3.3 Tipos de datos que vamos a usar

| Tipo          | Para qué                        | Ejemplo en el proyecto   |
| ------------- | ------------------------------- | ------------------------ |
| `uuid`        | Ids                             | `clubs.id`               |
| `text`        | Nombres                         | `clubs.name`             |
| `smallint`    | Enteros chicos (-32768 a 32767) | `categories.season_year` |
| `date`        | Fecha sin hora                  | `sessions.held_on`       |
| `timestamptz` | Momento exacto                  | `created_at`             |
| `boolean`     | Verdadero/falso                 | —                        |

### 3.4 Índices

Un **índice** es como el índice de un libro: permite encontrar filas sin recorrer toda la tabla.
Postgres crea uno solo para cada `primary key` y cada `unique`. Un índice sobre `(a, b)` también
sirve para buscar sólo por `a` (la columna de la izquierda), pero **no** sólo por `b`.

```sql
create index notes_owner_id_idx on public.notes (owner_id);
```

Error común: crear índices "por las dudas". Cada índice hace más lentos los inserts. Se crean
cuando hay una consulta que los necesita.

### 3.5 Migraciones

Una **migración** es un archivo SQL numerado en `supabase/migrations/` que cambia la estructura
de la base. El CLI las ejecuta **en orden** y anota cuáles ya aplicó.

| Comando                        | Qué hace                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `npx supabase start`           | Levanta Postgres, Auth, Studio, etc. en Docker y aplica las migraciones.                                  |
| `npx supabase db reset`        | **Borra** la base local y aplica todas las migraciones de cero. Para probarlas.                           |
| `npx supabase migration new x` | Crea `supabase/migrations/<timestamp>_x.sql` vacío.                                                       |
| `npx supabase db push`         | Aplica las migraciones que falten. **Local por defecto**; con `--remote` va a producción (lo hace el CI). |
| `npx supabase status`          | Muestra URLs y claves de la base local.                                                                   |

Reglas:

- **Nunca** editar una migración que ya se aplicó en producción: se crea una nueva que corrige.
- Toda migración se prueba con `db reset` antes de commitearla. Si `db reset` falla, la migración
  está rota.
- Una migración que crea una tabla habilita RLS **en el mismo archivo** (nunca queda una tabla
  expuesta "por un rato").

### 3.6 Row Level Security (RLS)

**Problema:** la app usa la clave pública (`sb_publishable_...`), que viaja al navegador.
Cualquiera puede copiarla y llamar a la API de Supabase directamente. Sin RLS, podría leer todas
las tablas.

**Cómo funciona:**

```sql
alter table public.notes enable row level security;
```

Desde ese momento, **nadie** (salvo el rol `service_role`) ve ni modifica filas. Para permitir
algo, se agregan **políticas** (_policies_):

```sql
create policy "notes: owner can read"
  on public.notes
  for select                       -- qué operación: select | insert | update | delete | all
  to authenticated                 -- qué rol: sólo usuarios logueados
  using ((select auth.uid()) = owner_id);
```

| Pieza                 | Qué significa                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `auth.uid()`          | Devuelve el `id` del usuario de la sesión actual (lo lee del token JWT). Sin sesión, devuelve `null`.        |
| `(select auth.uid())` | Lo mismo, pero Postgres lo calcula **una vez por consulta** y no una vez por fila. Recomendado por Supabase. |
| `to authenticated`    | Rol de Postgres que usa Supabase para usuarios logueados. El otro es `anon` (sin sesión).                    |
| `using (...)`         | Filtra las filas **existentes** que podés ver, modificar o borrar. Se aplica a select, update, delete.       |
| `with check (...)`    | Valida las filas **nuevas o modificadas**. Se aplica a insert y update.                                      |

Qué cláusula usa cada operación:

| Operación | `using` | `with check` |
| --------- | :-----: | :----------: |
| `select`  |    ✔    |              |
| `insert`  |         |      ✔       |
| `update`  |    ✔    |      ✔       |
| `delete`  |    ✔    |              |

Si en una política `for all` o `for update` ponés `using` pero no `with check`, Postgres usa la
misma condición para ambos. Escribirlos explícitos es más claro.

**Comportamiento importante:** RLS **no da error** cuando una fila no te pertenece; la hace
**invisible**. Un `select` devuelve 0 filas y un `update`/`delete` afecta 0 filas, sin error. Un
`insert` que no pasa el `with check` sí da error (`42501`, _new row violates row-level security
policy_). Por eso los tests de RLS verifican cantidades de filas, no sólo errores.

**Privilegios (`grant`) antes que RLS.** Postgres controla el acceso en dos capas: primero
mira si el rol tiene **privilegio** sobre la tabla (si no, `42501` _permission denied for
table_) y recién después aplica RLS a las filas. Supabase local le da todos los privilegios a
`anon` y `authenticated` por defecto; un proyecto nuevo en producción, no (pasó con `clubs` en
US-201). Por eso cada tabla nueva lleva los suyos explícitos y un test `table_privs_are`:

```sql
revoke all on table public.notes from anon, authenticated;
grant select, insert, update, delete on table public.notes to authenticated;
```

**RLS a través de otra tabla.** Si la tabla no tiene `coach_id` (ej. `categories` cuelga de
`clubs`), la política llama a una función que busca al dueño:

```sql
create function public.owns_club(p_club_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select exists (select 1 from public.clubs
                     where id = p_club_id and coach_id = (select auth.uid())); $$;

create policy "..." on public.categories for all to authenticated
  using (public.owns_club(club_id)) with check (public.owns_club(club_id));
```

Toda función nueva es ejecutable por `public` (todos los roles): revocar `execute` a `public` y
`anon`, y dárselo a `authenticated`; si falta ese `grant`, la política falla para todos.

### 3.7 Códigos de error de Postgres

Cuando una regla falla, Postgres devuelve un **código de 5 caracteres** (SQLSTATE). `supabase-js`
lo pone en `error.code`. Los que vamos a manejar:

| Código  | Nombre                        | Cuándo pasa                                          |
| ------- | ----------------------------- | ---------------------------------------------------- |
| `23505` | `unique_violation`            | Insert/update repite un valor `unique`.              |
| `23503` | `foreign_key_violation`       | La clave foránea apunta a algo que no existe.        |
| `23514` | `check_violation`             | No se cumple un `check`.                             |
| `23502` | `not_null_violation`          | Falta un valor obligatorio.                          |
| `22P02` | `invalid_text_representation` | Ej.: buscar por `id = 'hola'` en una columna `uuid`. |
| `42501` | `insufficient_privilege`      | RLS rechazó un insert/update.                        |
| `42883` | `undefined_function`          | Se llamó a una función que no existe (typo).         |
| `42P01` | `undefined_table`             | Se usó una tabla que no existe (typo).               |

La traducción de estos códigos a mensajes en español va en `src/domain/` (igual que
`authErrorMessage`): es una función pura.

### 3.8 Tests en SQL con pgTAP

**pgTAP** es una extensión de Postgres para escribir tests **en SQL**. Sirve para probar lo que
vive en la base (constraints, RLS, triggers, vistas) sin pasar por TypeScript. Los tests están en
`tests/db/*.test.sql` y se corren con `npx supabase test db tests/db` (también en el CI).

```sql
begin;                      -- todo en una transacción...
select plan(2);             -- cuántos asserts hay (si no coincide, falla)

select has_table('public', 'notes', 'existe notes');
select throws_ok(
  $$ insert into public.notes (title) values ('') $$,  -- $$...$$ = string sin escapar comillas
  '23514',                                              -- SQLSTATE esperado
  null,                                                 -- mensaje esperado (null = cualquiera)
  'título vacío viola el check'
);

select * from finish();     -- reporta el resultado
rollback;                   -- ...que se deshace: no deja datos
```

Para probar RLS, el test "se hace pasar" por un usuario como lo hace Supabase con el JWT:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub": "<uuid del usuario>"}';
```

Funciones más usadas: `has_table`, `is(real, esperado)`, `lives_ok(sql)` (no falla),
`throws_ok(sql, código, mensaje, descripción)`, `is_empty(select)`, `results_eq(select, select)`.

Error común: `throws_ok(sql, '23514', 'descripción')` con 3 argumentos toma el tercero como el
**mensaje de error esperado**, no como la descripción, y el test falla aunque el código coincida.
Pasá `null` como mensaje y la descripción en cuarto lugar.

¿pgTAP o test de integración con Vitest? pgTAP prueba **la base sola**, rápido y sin red.
Vitest prueba **la app hablando con la base** (supabase-js, sesión real, PostgREST). Se
complementan.

## 4. Supabase desde TypeScript

`supabase-js` arma la consulta como una cadena de métodos y la manda a PostgREST:

```ts
const supabase = await createClient(); // src/lib/supabase/server.ts: usa la sesión de las cookies

// select: devuelve { data, error }
const { data, error } = await supabase
  .from("notes")
  .select("id, title")
  .order("title");

// insert + devolver la fila creada
await supabase.from("notes").insert({ title: "Hola" }).select().single();

// update / delete: SIEMPRE con filtro
await supabase.from("notes").update({ title: "Chau" }).eq("id", noteId);
await supabase.from("notes").delete().eq("id", noteId);
```

Puntos clave:

- **Nunca tira excepción** por errores de la base: hay que revisar `error` en cada llamada.
- Como el cliente usa la sesión del usuario, **RLS se aplica sola**: no hace falta filtrar por
  `owner_id` en el código para la seguridad (se puede filtrar igual por claridad).
- `.single()` falla si no hay exactamente 1 fila; `.maybeSingle()` devuelve `null` si no hay.
- Un `update`/`delete` sin `.eq(...)` afecta **todas** las filas que RLS te deja ver.

## 5. Claves de Supabase

| Clave                                    | Dónde puede vivir         | Qué puede hacer                                              |
| ---------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| Publishable (`sb_publishable_`)          | Navegador y servidor      | Lo que RLS permita al usuario de la sesión.                  |
| Secret (`sb_secret_`, ex `service_role`) | **Sólo** servidor o tests | Todo. **Saltea RLS.** Nunca en `NEXT_PUBLIC_*` ni en `src/`. |

En los tests de integración se usa la secret **local** (la de `npx supabase status`) para crear
usuarios de prueba con `auth.admin.createUser`. Esa clave no sirve para producción.

## 6. Ejemplo concreto: verificar RLS a mano

1. `npx supabase db reset`.
2. En Studio → Authentication, crear dos usuarios A y B.
3. En Studio → SQL Editor, simular ser A:

   ```sql
   set local role authenticated;
   set local request.jwt.claims = '{"sub": "<id de A>"}';
   select * from public.notes;   -- sólo las de A
   ```

   (`set local` dura hasta el fin de la transacción; el editor corre cada ejecución en una.)

Los tests de integración automatizan exactamente esto, pero iniciando sesión con cada usuario.

## 7. Errores comunes

- **Typos en funciones o tablas** (`get_random_uuid`, `auth.user`): la migración falla en
  `db reset` con `42883` o `42P01`. Por eso se prueba siempre con `db reset`.
- **`check (char_length(x) <> 0)`** deja pasar `"   "`. Para "no vacío" usar `btrim(x) <> ''`.
- **Olvidar `enable row level security`**: la tabla queda leíble para cualquiera con la clave
  pública. Supabase Studio la marca como "UNRESTRICTED".
- **Política sin `with check` explícito en update**: confuso de leer; ser explícito.
- **`auth.uid()` sin `(select ...)`**: funciona, pero en tablas grandes se evalúa por cada fila.
- **Esperar error de RLS en select/update/delete**: no lo hay, devuelve 0 filas.
- **Editar una migración ya aplicada en producción**: el CLI no la vuelve a ejecutar y las bases
  quedan distintas. Se corrige con una migración nueva.
- **Usar la secret key en el código de la app**: saltea RLS para todos los usuarios.
- **Tabla nueva sin `grant` explícito**: anda en local y en producción da `42501` _permission
  denied for table_.
- **FK sin `on delete cascade`** cuando el hijo no tiene sentido sin el padre: borrar el padre
  falla con `23503`.
- **Formatear al guardar una migración ya aplicada**: el contenido "cambia" sin cambiar nada;
  desactivar el formateador para `.sql`.

## 8. Para profundizar

- Documentación de Postgres: `CREATE TABLE`, `CREATE POLICY`, "Constraints".
- Supabase: "Row Level Security", "Database Migrations", "Local Development".
- Ver también `docs/guia/testing-vitest.md` (tests de integración).
