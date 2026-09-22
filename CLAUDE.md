# Biblioteca de barrio — contexto para agentes

API de préstamos. Node + Express + `node:sqlite`. El README tiene la spec completa: los
endpoints, las reglas que la API promete cumplir, y una sección de decisiones que parecen
errores y no lo son. Leelo antes de probar nada.

## Levantar el sistema

```bash
npm install
PORT=3210 npm start     # o npm start para el 3000 por defecto
```

Queda escuchando hasta que lo maten. `GET /health` responde `{"estado":"ok"}` cuando está listo.
Si el arranque falla con `EADDRINUSE`, el puerto está tomado por otro proceso: usá otro `PORT`.

## Estado y aislamiento entre pruebas

La base es SQLite **en memoria**: vive en el proceso, no hay archivo. Todo el estado es
compartido por todas las peticiones, así que:

- **Llamá `POST /admin/reset` antes de cada caso que escriba.** Devuelve la base a la semilla
  documentada en el README.
- Un caso que no resetea ve lo que dejó el anterior. No es un bug del sistema, es cómo funciona
  una base en memoria.
- Reiniciar el proceso equivale a un reset.

## Convenciones del código

- ES modules (`"type": "module"`), Node 24, sin transpilación ni build.
- Las rutas se declaran una por una en `src/server.js`. Es a propósito: registrarlas en un bucle
  las vuelve invisibles para cualquier herramienta de análisis estático.
- Un módulo por recurso (`libros`, `socios`, `prestamos`), cada handler exportado por nombre.
- Los errores se responden como `{ "error": "..." }`, y los de validación agregan
  `{ "detalles": [...] }`.
- Sin logger ni telemetría: `console.error` en el handler de error y nada más.
- Español sin tildes en identificadores y comentarios del código; con tildes en el texto que ve
  el usuario y en la documentación.

## Qué hace falta para probar

Nada más que el proceso levantado y un cliente HTTP. No hay auth, ni tokens, ni servicios
externos, ni base que provisionar. La página de `public/index.html` se sirve desde la raíz y
consume la propia API.
