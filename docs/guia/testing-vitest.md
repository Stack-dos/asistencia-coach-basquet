# Guía: testing con Vitest

## 1. Concepto

Un **test** es código que ejecuta otro código y verifica que el resultado sea el esperado. Un
**test runner** es el programa que encuentra los tests, los ejecuta y reporta cuáles pasaron y
cuáles fallaron. En este proyecto el test runner es **Vitest** (equivalente a JUnit en Java o
pytest en Python).

## 2. Qué problema resuelve

Sin tests, la única forma de saber si algo funciona es probarlo a mano en el navegador, cada vez,
después de cada cambio. Con tests:

- Un cambio que rompe algo que ya andaba se detecta **en segundos**, no cuando lo usa un entrenador.
- La CI (GitHub Actions) los corre en cada PR: si fallan, el PR no se mergea.
- Sirven de documentación: un test llamado `"una clase del 31/03 pertenece a marzo"` explica una
  regla del sistema mejor que un comentario.

## 3. Tipos de test en este proyecto (PRD §6)

| Tipo            | Qué prueba                                           | Herramienta             | Ejemplo                                                  |
| --------------- | ---------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| **Unitario**    | Una función aislada, sin base ni red.                | Vitest                  | Calcular a qué mes pertenece una clase.                  |
| **Integración** | Varias piezas juntas, incluida la base de datos.     | Vitest + Supabase local | Insertar asistencias y verificar el ranking de la vista. |
| **E2E**         | La app completa desde el navegador, como un usuario. | Playwright (Hito 5)     | Registrarse → crear club → tomar asistencia.             |

## 4. Cómo funciona

### Anatomía de un test

```ts
import { describe, test, expect } from "vitest";

describe("cálculo de mes de una clase", () => {
  test("una clase del 31/03 pertenece a marzo", () => {
    const mes = mesDeClase(new Date(2026, 2, 31));
    expect(mes).toBe(3);
  });
});
```

| Pieza                  | Qué es                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `import { ... }`       | Trae las funciones de Vitest. Las importamos explícitamente (no usamos `globals: true`). |
| `describe(nombre, fn)` | Agrupa tests relacionados. Opcional; sirve para ordenar la salida.                       |
| `test(nombre, fn)`     | Un caso de prueba. `fn` es una **función flecha** que Vitest ejecuta cuando le toca.     |
| `expect(valor)`        | Envuelve el valor real para poder compararlo.                                            |
| `.toBe(esperado)`      | **Matcher**: compara con `===`. Si no coincide, el test falla.                           |

Ver `docs/guia/typescript.md` para la sintaxis de las funciones flecha.

### El patrón AAA

Casi todo test sigue tres pasos:

1. **Arrange** (preparar): armar los datos de entrada.
2. **Act** (actuar): llamar a la función que se prueba.
3. **Assert** (afirmar): verificar el resultado con `expect`.

```ts
test("el porcentaje de asistencia redondea a entero", () => {
  const clases = 3; // Arrange
  const presentes = 2;
  const porcentaje = porcentajeAsistencia(presentes, clases); // Act
  expect(porcentaje).toBe(67); // Assert
});
```

### Matchers más usados

| Matcher           | Cuándo usarlo                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `toBe(x)`         | Primitivos: números, strings, booleanos (compara con `===`).                                   |
| `toEqual(obj)`    | Objetos y arrays: compara el **contenido**, no la identidad.                                   |
| `toBeNull()`      | El valor es exactamente `null`.                                                                |
| `toHaveLength(n)` | Arrays o strings de largo `n`.                                                                 |
| `toContain(x)`    | Un array contiene `x`.                                                                         |
| `toThrow()`       | La función lanza un error. Se pasa la función, no el resultado: `expect(() => f()).toThrow()`. |
| `.not.toBe(x)`    | Cualquier matcher negado con `.not`.                                                           |

### Tests asíncronos

Las consultas a Supabase devuelven **promesas** (resultados que llegan más tarde). El test se
declara `async` y se usa `await`:

```ts
test("lista los clubes del entrenador", async () => {
  const clubes = await listarClubes();
  expect(clubes).toHaveLength(1);
});
```

Si te olvidás el `await`, el test termina antes de que llegue el resultado y **puede pasar aunque
el código esté roto**.

## 5. Configuración en este proyecto

### `vitest.config.mts`

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- **`.mts`**: archivo TypeScript con módulos ESM (`import`/`export`).
- **`defineConfig`**: no hace nada en ejecución; sólo le da tipos al objeto para que el editor
  autocomplete y marque errores.
- **`tsconfigPaths()`**: hace que Vitest entienda el alias `@/` definido en `tsconfig.json`
  (`@/domain/x` → `src/domain/x`). Sin el plugin, los imports con `@/` fallan sólo en los tests.
- **`environment: "node"`**: los tests corren en Node, sin navegador simulado. Alcanza para
  dominio e integración. Testear componentes de React requeriría `jsdom` + Testing Library (no
  planificado).
- **`include`**: patrón _glob_. `**` = cualquier cantidad de subcarpetas, `*` = cualquier nombre.
  Sólo se ejecutan archivos `*.test.ts` dentro de `tests/`.

### Scripts

| Comando                 | Qué hace                                                                         |
| ----------------------- | -------------------------------------------------------------------------------- |
| `npm test`              | `vitest run --reporter=verbose`: corre todo **una vez** y termina. Lo usa la CI. |
| `npx vitest`            | Modo _watch_: queda escuchando y re-corre al guardar. Para desarrollar.          |
| `npx vitest run nombre` | Corre sólo los archivos cuyo nombre contiene `nombre`.                           |

### Código de salida

Al terminar, `vitest run` devuelve `0` si todo pasó y `1` si algo falló. GitHub Actions mira
**sólo ese número** para poner el check en verde o rojo. Para verlo en PowerShell:
`npm test; echo $LASTEXITCODE`.

### Dónde van los tests

En `tests/`, separados del código, replicando la estructura de `src/`:

```txt
src/domain/fechas.ts      →  tests/domain/fechas.test.ts
src/data/clubes.ts        →  tests/data/clubes.test.ts   (integración)
```

## 6. Buenas prácticas

- **El nombre dice qué se verifica**, como una frase: `"rechaza una categoría sin nombre"`, no
  `"test 1"`. Cuando falla en la CI, el nombre es lo primero que leés.
- **Un comportamiento por test.** Si un test verifica cinco cosas y falla, no sabés cuál se rompió.
- **Probá que el test puede fallar.** Cambiá el valor esperado y confirmá que se pone en rojo. Un
  test que nunca falla no protege nada.
- **Tests independientes.** Ninguno debe depender del orden o de datos que dejó otro.
- **Casos borde**: listas vacías, ceros (¿porcentaje con 0 clases?), fin de mes, años bisiestos.

## 7. Errores comunes

| Error                                                          | Síntoma                                                      | Solución                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `"test": "vitest"` en vez de `vitest run`                      | La CI queda colgada hasta el _timeout_.                      | Usar `vitest run` en el script de CI.            |
| Archivo que no matchea el glob (`.spec.ts`, fuera de `tests/`) | `No test files found`.                                       | Respetar `tests/**/*.test.ts`.                   |
| Olvidar `await` en un test asíncrono                           | El test pasa aunque el código esté roto.                     | `async () => { ... await ... }`.                 |
| `toBe` con objetos                                             | `expect({a: 1}).toBe({a: 1})` falla (son objetos distintos). | Usar `toEqual`.                                  |
| `expect(f()).toThrow()`                                        | El error se lanza antes de que `expect` lo capture.          | Pasar la función: `expect(() => f()).toThrow()`. |
| `-v` creyendo que es _verbose_                                 | En Vitest `-v` es `--version`.                               | `--reporter=verbose`.                            |

## 8. Mocks: testear código que depende de otros sistemas

**Concepto:** un _mock_ (doble) reemplaza una dependencia real (Supabase, `redirect`) por una
función falsa que **vos controlás**: decidís qué responde y después verificás cómo la llamaron.

**Problema que resuelve:** las Server Actions de `src/data/auth.ts` llaman a Supabase y a
`redirect()`. Sin mocks habría que levantar Supabase y simular un request de Next.

**Cómo funciona** (`tests/data/auth.test.ts`):

```ts
const mocks = vi.hoisted(() => ({ signUp: vi.fn(), redirect: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signUp: mocks.signUp } }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

beforeEach(() => vi.clearAllMocks());

test("con contraseña débil devuelve el error traducido", async () => {
  mocks.signUp.mockResolvedValue({ error: { code: "weak_password" } }); // qué responde
  const state = await signUp({}, validForm());
  expect(state).toEqual({ error: authErrorMessage("weak_password") });
  expect(mocks.redirect).not.toHaveBeenCalled(); // cómo se usó
});
```

| Pieza                                  | Qué hace                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `vi.fn()`                              | Función falsa que registra cada llamada (argumentos, cantidad).             |
| `vi.mock(ruta, fábrica)`               | Cuando el código importa `ruta`, recibe lo que devuelve la fábrica.         |
| `vi.hoisted(...)`                      | Vitest sube los `vi.mock` arriba de los imports; esto crea los mocks antes. |
| `.mockResolvedValue(x)`                | "Cuando te llamen, devolvé una promesa con `x`".                            |
| `toHaveBeenCalledWith(...)`            | Verifica los argumentos de la llamada.                                      |
| `beforeEach(() => vi.clearAllMocks())` | Limpia el registro antes de cada test: tests independientes.                |

**Límite:** los mocks prueban **tu lógica**, no que el sistema real responda así. Se complementan
con pruebas contra Supabase local. Ejemplo concreto: el `redirect` real lanza una excepción y el
mock no; un `redirect()` dentro de `try/catch` pasaría estos tests y fallaría en la app.

## 9. `test.each`: una tabla de casos

```ts
test.each([
  // [pathname, isLoggedIn, esperado]
  ["/", false, "/login"],
  ["/login", true, "/clubes"],
])("%s con sesión=%s → %s", (pathname, isLoggedIn, expected) => {
  expect(getAuthRedirect(pathname, isLoggedIn)).toBe(expected);
});
```

Genera **un test por fila**; los `%s` del nombre se reemplazan por los valores. Ideal cuando la
especificación ya es una tabla (como las reglas de redirección).

## 10. Tests frágiles vs tests de comportamiento

Un test que compara con el texto exacto (`toBe("Credenciales Invalidas")`) falla cada vez que
mejorás un mensaje, sin que haya un bug: es **frágil**, y la gente termina ignorándolo. Es mejor
verificar el **comportamiento** que importa: que cada código tenga un mensaje propio, que no se
repitan (`new Set(messages).size`), que el genérico cubra lo desconocido, que el mensaje de login
no revele si el email existe.

## 11. Casos borde y mutation testing

**Casos borde:** entradas "raras" que separan una implementación correcta de una que parece andar.
Para la redirección: `/loginx`, `/authentication`, `/auth`, `/LOGIN`, rutas anidadas.

**Mutation testing (prueba de mutación):** romper el código a propósito y comprobar que algún test
falla. Si nada falla, falta un test. En US-102 cambiamos `===` por `startsWith` en
`getAuthRedirect`: las 14 filas "normales" siguieron pasando y sólo los casos borde detectaron el
bug. **Un test que sólo cubre el camino feliz no protege.**

## 12. TDD (Test-Driven Development)

1. Escribir el test a partir de la especificación (falla: la función no existe).
2. Escribir el mínimo código que lo haga pasar.
3. Mejorar el código con los tests como red de seguridad.

Sirve especialmente cuando la especificación es clara (una tabla de reglas).

## 13. Qué se testea dónde (capas)

| Capa                    | Ejemplo                               | Cómo se testea                            |
| ----------------------- | ------------------------------------- | ----------------------------------------- |
| Dominio (`src/domain/`) | `getAuthRedirect`, `authErrorMessage` | Unitario puro, sin mocks.                 |
| Datos (`src/data/`)     | Server Actions                        | Unitario con mocks de Supabase/Next.      |
| Páginas, proxy, flujos  | Registro → email → confirmar          | Prueba manual / E2E (Playwright, Hito 5). |

Separar la lógica en funciones puras es lo que permite testearla barato: por eso
`getAuthRedirect` vive en el dominio y no dentro de `proxy.ts`.
