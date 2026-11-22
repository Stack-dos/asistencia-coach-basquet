# Guía: TypeScript básico y funciones flecha

## 1. Concepto

**TypeScript** es JavaScript con **tipos**. Todo código JavaScript válido es TypeScript válido; TS
agrega anotaciones como `: number` o `: string` que describen qué valores puede tener cada cosa.

El navegador y Node no entienden TypeScript: antes de ejecutarse, los tipos **se borran** y queda
JavaScript. Los tipos existen sólo mientras escribís y compilás.

## 2. Qué problema resuelve

En JavaScript puro esto se ejecuta sin quejarse y falla en producción:

```js
function porcentaje(presentes, clases) {
  return (presentes / clases) * 100;
}
porcentaje("2", 3); // funciona "de casualidad": JS convierte "2" a número al dividir
// pero con suma no: "2" + 3 → "23" (concatena strings). JS nunca avisa.
```

Con TypeScript el error aparece **en el editor**, antes de ejecutar nada:

```ts
function porcentaje(presentes: number, clases: number): number {
  return (presentes / clases) * 100;
}
porcentaje("2", 3); // ❌ Argument of type 'string' is not assignable to parameter of type 'number'.
```

`npm run typecheck` corre esta verificación en todo el proyecto (y la CI también).

## 3. Tipos básicos

```ts
const nombre: string = "Sub 13";
const cantidad: number = 18; // no hay int/float: todo es number
const activa: boolean = true;
const nada: null = null;
let sinValor: undefined = undefined;

const edades: number[] = [11, 12, 13]; // array de números
const categorias: Array<string> = ["U11", "U13"]; // misma cosa, otra sintaxis
```

### Inferencia

TS **deduce** el tipo cuando lo puede ver, así que casi nunca hace falta anotarlo en variables:

```ts
const cantidad = 18; // TS ya sabe que es number
cantidad.toUpperCase(); // ❌ Property 'toUpperCase' does not exist on type 'number'.
```

Regla práctica: **anotá parámetros de funciones**; dejá que TS infiera el resto.

### `const` vs `let`

- `const`: no se puede reasignar. Usalo por defecto.
- `let`: se puede reasignar. Sólo cuando realmente cambia (contadores, acumuladores).
- `var`: forma vieja, no usar.

## 4. Objetos: `type` e `interface`

Describen la **forma** de un objeto:

```ts
type Jugador = {
  id: string;
  nombre: string;
  fechaNacimiento: Date;
  apodo?: string; // ? = opcional: puede no estar (es string | undefined)
};

const j: Jugador = {
  id: "a1",
  nombre: "Juan",
  fechaNacimiento: new Date(2013, 4, 2),
};
const k: Jugador = { id: "a2", nombre: "Ana" }; // ❌ falta fechaNacimiento
```

`interface Jugador { ... }` hace casi lo mismo. En este proyecto alcanza con `type`; lo importante
es ser consistente.

## 5. Uniones y `null`

Una **unión** (`|`) dice "puede ser uno u otro":

```ts
type Estado = "presente" | "ausente"; // sólo esos dos strings exactos
let e: Estado = "presente";
e = "tarde"; // ❌ Type '"tarde"' is not assignable to type 'Estado'.

function buscarJugador(id: string): Jugador | null { ... }
```

Con `"strict": true` (activado en `tsconfig.json`), TS te **obliga** a manejar el `null` antes de
usar el valor:

```ts
const j = buscarJugador("a1");
j.nombre; // ❌ 'j' is possibly 'null'.

if (j !== null) {
  j.nombre; // ✅ dentro del if, TS sabe que no es null (esto se llama "narrowing")
}
j?.nombre; // ✅ "optional chaining": si j es null, devuelve undefined en vez de romper
```

Este es el error más común al empezar, y el que más bugs evita: las consultas a Supabase
devuelven `{ data, error }` donde `data` puede ser `null`.

## 6. Funciones

### Declaración clásica

```ts
function porcentaje(presentes: number, clases: number): number {
  return Math.round((presentes / clases) * 100);
}
```

- Cada parámetro lleva su tipo.
- `: number` después de los paréntesis es el **tipo de retorno** (opcional; TS lo infiere, pero
  escribirlo documenta la intención).

### Funciones flecha (arrow functions)

Otra forma de escribir funciones, muy usada en JS moderno:

```ts
const porcentaje = (presentes: number, clases: number): number => {
  return Math.round((presentes / clases) * 100);
};
```

Partes: `(parámetros) => { cuerpo }`. La flecha `=>` separa los parámetros del cuerpo.

**Retorno implícito:** si el cuerpo es una sola expresión, se pueden sacar las llaves y el `return`:

```ts
const porcentaje = (presentes: number, clases: number) =>
  Math.round((presentes / clases) * 100);
const doble = (n: number) => n * 2;
const saludar = () => "hola"; // sin parámetros: paréntesis vacíos
```

⚠️ Para devolver un **objeto** con retorno implícito hay que envolverlo en paréntesis, si no las
llaves se interpretan como el cuerpo:

```ts
const crear = (nombre: string) => ({ nombre, activo: true }); // ✅
const mal = (nombre: string) => { nombre, activo: true };     // ❌ es un cuerpo, no un objeto
```

### ¿Para qué sirven? Funciones como argumento

En JS las funciones son **valores**: se pueden pasar a otras funciones. Ese es el uso principal
de las flechas. Ya lo usaste en los tests:

```ts
test("nombre", () => {
  expect(1).toBe(1);
});
//             ^^^^^^^^ función flecha sin parámetros que se le pasa a test.
//                      Vitest la guarda y la ejecuta después.
```

Y vas a verlo todo el tiempo con arrays:

```ts
const asistencias = [
  { jugador: "Juan", presente: true },
  { jugador: "Ana", presente: false },
  { jugador: "Leo", presente: true },
];

const presentes = asistencias.filter((a) => a.presente); // se queda con los que cumplen
const nombres = presentes.map((a) => a.jugador); // transforma cada elemento
// nombres → ["Juan", "Leo"]

const total = asistencias.reduce((acum, a) => acum + (a.presente ? 1 : 0), 0); // acumula → 2
```

Notá que en `(a) => a.presente` no hace falta tipar `a`: TS lo infiere del array.

En React (componentes) también aparecen en eventos: `onClick={() => guardar()}`.

### Flecha vs `function`: diferencias que importan

| Aspecto    | `function`                                                                       | Flecha `=>`                               |
| ---------- | -------------------------------------------------------------------------------- | ----------------------------------------- |
| `this`     | Depende de cómo se llame la función.                                             | Toma el `this` de donde fue escrita.      |
| Hoisting   | Se puede usar antes de la línea donde se declara.                                | No: la constante tiene que existir antes. |
| Uso típico | Funciones con nombre, componentes de Next.js (`export default function Page()`). | Callbacks y funciones cortas.             |

En la práctica moderna casi no usás `this`, así que la elección es mayormente de estilo.

## 7. Módulos: `import` / `export`

Cada archivo es un **módulo**. Lo que no se exporta es privado del archivo.

```ts
// src/domain/asistencia.ts
export const porcentaje = (p: number, c: number) => Math.round((p / c) * 100);
export type Estado = "presente" | "ausente";

// otro archivo
import { porcentaje, type Estado } from "@/domain/asistencia";
```

- **Export con nombre** (`export const x`) → se importa con llaves: `import { x }`.
- **Export por defecto** (`export default`) → se importa sin llaves y con cualquier nombre. Next.js
  lo exige en `page.tsx` y `layout.tsx`.
- `import type` / `type` dentro de las llaves: importa sólo el tipo; se borra al compilar.
- `@/` es el alias de `src/` (definido en `tsconfig.json`).

## 8. `async` / `await` (adelanto)

Las operaciones que tardan (consultas a la base, red) devuelven una **Promise**: un valor que
llega después. `await` espera ese valor; sólo se puede usar dentro de funciones `async`.

```ts
const cargarClubes = async (): Promise<Club[]> => {
  const { data, error } = await supabase.from("clubes").select("*");
  if (error) throw error;
  return data;
};
```

`Promise<Club[]>` es un **genérico**: el tipo entre `<>` dice qué contiene la promesa (como
`Array<string>` o `LayoutProps<"/">` en `layout.tsx`).

## 9. Más sintaxis que usamos en US-101 y US-102

### Desestructuración de objetos y arrays

Sacar partes de un objeto o array a variables, en una línea:

```ts
const { error } = await supabase.auth.signUp(credentials); // objeto: por nombre
const [state, formAction, pending] = useActionState(signUp, {}); // array: por posición
cookiesToSet.forEach(({ name, value, options }) => ...); // también en parámetros
```

### Propiedades abreviadas (_shorthand_)

Si la variable se llama igual que la propiedad, se escribe una vez:

```ts
const email = "a@b.com";
const password = "12345678";
signInWithPassword({ email, password }); // = { email: email, password: password }
```

### Operador ternario

`condición ? valorSiSí : valorSiNo`. Es un `if/else` que **devuelve un valor**:

```ts
redirect(type === "recovery" ? "/nueva-contrasena" : "/clubes");
```

### `?.` y `??`

```ts
data?.claims.email; // optional chaining: si data es null/undefined, devuelve undefined sin romper
data?.claims.email ?? null; // nullish coalescing: si lo de la izquierda es null/undefined, usa lo de la derecha
```

`??` no es lo mismo que `||`: `0 || 5` da `5`, pero `0 ?? 5` da `0` (sólo reemplaza `null` y
`undefined`).

### `Boolean(x)` y valores _truthy_ / _falsy_

En JS, `null`, `undefined`, `0`, `""` y `false` son **falsy** (cuentan como falso en un `if`); todo
lo demás es **truthy**. `Boolean(x)` convierte cualquier valor a `true`/`false` explícito:

```ts
getAuthRedirect(pathname, Boolean(data?.claims)); // la función pide un boolean, no un objeto
```

### `typeof` como validación y _narrowing_

```ts
const email = formData.get("email"); // tipo: FormDataEntryValue | null  (string | File | null)
if (typeof email !== "string") return { error: "..." };
email.toLowerCase(); // ✅ acá TS ya sabe que es string
```

Después de un `if` que corta, TS **estrecha** (_narrows_) el tipo. Es la forma correcta de validar
datos que vienen de afuera (formularios, URLs).

### Aserción de tipo `as`

```ts
const type = searchParams.get("type") as EmailOtpType | null;
```

`as` le dice a TS "confiá en mí". **No verifica nada en ejecución**: si mentís, el error aparece
después. Usarlo sólo cuando otra cosa valida el dato (acá, `verifyOtp` rechaza un `type` inválido).
Lo mismo vale para el `!` (_non-null assertion_) en `process.env.X!`.

### Genéricos y tipos derivados

```ts
Promise<AuthState>; // una promesa que va a contener un AuthState
Record<string, string>; // objeto con claves y valores string
PageProps<"/login">; // tipo generado por Next para la ruta /login
(PageProps < "/login") > ["searchParams"]; // "indexed access": el tipo de UNA propiedad de otro tipo
```

### Tipos que existen sólo en TS

`export type AuthState = { error?: string; success?: string };` — el `?` hace la propiedad
opcional. `import type { X }` importa sólo el tipo; ambos se borran al compilar (por eso se pueden
exportar desde un archivo `"use server"`).

### Parámetros que no se usan: `_prevState`

El guion bajo inicial es una convención: "este parámetro está por la firma, no lo uso".

### Closures

Una función "recuerda" las variables del lugar donde fue creada:

```ts
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll(); // usa cookieStore aunque se ejecute mucho después
      },
    },
  });
}
```

Por eso `getAll` tiene que crearse **dentro** de `createClient`: cada request tiene su propio
`cookieStore`.

### Expresiones regulares (regex)

Patrones para buscar texto: `/no existe|no está registrad/i` busca "no existe" **o** "no está
registrad", sin distinguir mayúsculas (`i`). En el `matcher` del proxy, `(?!...)` es un _negative
lookahead_: "que NO empiece con...".

## 10. Errores comunes

| Error                                      | Ejemplo                                           | Solución                                             |
| ------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------- |
| `'x' is possibly 'null'`                   | `data.length` con `data: T[] \| null`.            | Chequear `if (data)` o usar `data?.length`.          |
| Usar `any` para "callar" al compilador     | `const x: any = ...`                              | Escribir el tipo real; `any` desactiva toda ayuda.   |
| Objeto en retorno implícito sin paréntesis | `() => { a: 1 }`                                  | `() => ({ a: 1 })`.                                  |
| Olvidar `await`                            | `const d = supabase.from(...)` → es una Promise.  | `await` dentro de una función `async`.               |
| Confundir `==` con `===`                   | `0 == ""` es `true`.                              | Usar siempre `===` y `!==`.                          |
| Mutar con `const`                          | `const a = []; a = [1]` ❌ (pero `a.push(1)` ✅). | `const` impide reasignar, no modificar el contenido. |

## 11. Para seguir estudiando

- Handbook oficial: https://www.typescriptlang.org/docs/handbook/intro.html (capítulos "Everyday
  Types" y "Narrowing").
- Métodos de array (`map`, `filter`, `reduce`, `find`, `some`): MDN, sección `Array`.
