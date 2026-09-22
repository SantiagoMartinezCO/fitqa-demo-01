# Biblioteca de barrio

API de préstamos de una biblioteca chica: catálogo, socios y préstamos. Node + Express con
SQLite embebido (`node:sqlite`), sin build y sin base en disco.

Es un sistema deliberadamente pequeño: sirve como sujeto de prueba para dimensionar y ejercitar
una campaña de QA de punta a punta sin depender de infraestructura.

## Cómo correrlo

Requiere **Node ≥ 22.5** (por `node:sqlite`; probado en 24.x). Única dependencia de ejecución:
Express.

```bash
npm install
npm start                 # http://localhost:3000
PORT=3210 npm start       # si el 3000 está ocupado
```

No hay migraciones ni archivo de base: los datos viven en memoria y arrancan desde una semilla
fija en cada inicio.

## Semilla

8 libros y 4 socios. `POST /admin/reset` devuelve la base a ese estado; conviene llamarlo antes
de cada prueba que escriba, porque los datos son compartidos por todo el proceso.

Socios: 1 Ana Torres (activo), 2 Bruno Díaz (activo), 3 Carla Ruiz (activo),
4 Darío Peña (**baja**).

Ejemplares por libro: 1→2, 2→1, 3→3, 4→1, 5→2, 6→1, 7→1, 8→4.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | estado y versión |
| POST | `/admin/reset` | vuelve a la semilla |
| GET | `/libros` | listado paginado (`limite`, `desde`, `orden`) |
| POST | `/libros` | alta |
| GET | `/libros/:id` | ficha, con `disponibles` |
| PUT | `/libros/:id` | modificación parcial |
| DELETE | `/libros/:id` | baja |
| GET | `/socios` | listado, filtrable por `estado` |
| POST | `/socios` | alta |
| GET | `/socios/:id` | ficha, con `prestamos_activos` |
| GET | `/prestamos` | listado, filtrable por `activos` |
| POST | `/prestamos` | prestar un libro a un socio |
| POST | `/prestamos/:id/devolucion` | devolver |

No hay contrato OpenAPI: lo que la API promete está en la sección siguiente.

## Reglas que la API promete cumplir

**Paginación de `/libros`.** Acepta `limite` (1–100, por defecto 20) y `desde` (offset, por
defecto 0). `desde=0` devuelve desde el **primer** libro. Recorrer el listado avanzando `desde`
de a `limite` tiene que devolver cada libro exactamente una vez, y la suma de todas las páginas
tiene que dar `total`. Fuera de rango es 400.

**Orden de `/libros`.** `orden` acepta `id`, `titulo`, `autor`, `anio`. Cualquier otro valor es
400.

**Disponibilidad.** `disponibles = ejemplares − préstamos sin devolver`. **Nunca puede ser
negativo**: cuando llega a cero, prestar otra vez es 409 `no quedan ejemplares disponibles`.

**Devolución.** Devolver un préstamo ya devuelto es 409, y no cambia nada la segunda vez.

**Socios de baja.** No pueden pedir prestado: `POST /prestamos` con un socio de baja es 409.

**Integridad de los préstamos.** Un préstamo sin devolver es un hecho registrado: nada de lo que
se haga con el catálogo puede hacerlo desaparecer ni dejarlo sin libro asociado.
`GET /prestamos` tiene que seguir mostrando todos los préstamos vigentes.

**Unicidad.** `isbn` de libro y `email` de socio son únicos; repetirlos es 409.

**Validación.** Cuerpo inválido es 400 con `{error, detalles[]}`. JSON mal formado es 400.
Recurso inexistente es 404. Ruta inexistente es 404.

## Decisiones que parecen errores y no lo son

**`GET /socios/:id` de un socio dado de baja devuelve 403, no 404.** Es deliberado: el socio
existe, y un 404 permitiría averiguar qué emails están registrados y cuáles no probando ids. El
recurso existe, el acceso está denegado. `GET /socios?estado=baja` sí lo lista, porque ahí no se
expone la ficha.

## Estructura

```
src/server.js      rutas, declaradas una por una
src/db.js          esquema y semilla
src/libros.js      catálogo
src/socios.js      socios
src/prestamos.js   préstamos y devoluciones
public/index.html  página del catálogo
```
