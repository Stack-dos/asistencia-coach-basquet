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
