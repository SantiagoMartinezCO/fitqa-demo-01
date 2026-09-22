// Biblioteca de barrio. Las rutas se declaran una por una a proposito: registrarlas en un
// bucle sobre una lista de entidades las vuelve invisibles para cualquier medidor estatico.
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { reiniciar } from "./db.js";
import * as libros from "./libros.js";
import * as socios from "./socios.js";
import * as prestamos from "./prestamos.js";

const app = express();
app.use(express.json());

const aqui = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(aqui, "..", "public")));

app.get("/health", (req, res) => res.json({ estado: "ok", version: "1.0.0" }));

// Devuelve la base a la semilla. Existe para que cada prueba parta del mismo estado.
app.post("/admin/reset", (req, res) => {
  reiniciar();
  res.json({ reiniciado: true });
});

app.get("/libros", libros.listar);
app.post("/libros", libros.crear);
app.get("/libros/:id", libros.ver);
app.put("/libros/:id", libros.actualizar);
app.delete("/libros/:id", libros.borrar);

app.get("/socios", socios.listar);
app.post("/socios", socios.crear);
app.get("/socios/:id", socios.ver);

app.get("/prestamos", prestamos.listar);
app.post("/prestamos", prestamos.crear);
app.post("/prestamos/:id/devolucion", prestamos.devolver);

app.use((req, res) => res.status(404).json({ error: "ruta no encontrada" }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: "json invalido" });
  }
  console.error(err);
  res.status(500).json({ error: "error interno" });
});

const puerto = Number(process.env.PORT ?? 3000);
app.listen(puerto, () => console.log(`biblioteca escuchando en http://localhost:${puerto}`));
