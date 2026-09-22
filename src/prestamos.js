import { db } from "./db.js";

function ahora() {
  return new Date().toISOString();
}

function disponibles(libro) {
  const prestados = db
    .prepare("SELECT COUNT(*) AS n FROM prestamos WHERE libro_id = ? AND devuelto IS NULL")
    .get(libro.id).n;
  return libro.ejemplares - prestados;
}

export function listar(req, res) {
  const activos = req.query.activos;
  if (activos !== undefined && !["true", "false"].includes(activos)) {
    return res.status(400).json({ error: "activos debe ser 'true' o 'false'" });
  }

  let sql = `SELECT p.id, p.prestado, p.devuelto,
                    l.id AS libro_id, l.titulo,
                    s.id AS socio_id, s.nombre
             FROM prestamos p
             JOIN libros l ON l.id = p.libro_id
             JOIN socios s ON s.id = p.socio_id`;
  if (activos === "true") sql += " WHERE p.devuelto IS NULL";
  if (activos === "false") sql += " WHERE p.devuelto IS NOT NULL";
  sql += " ORDER BY p.id";

  const filas = db.prepare(sql).all();
  res.json({ total: filas.length, prestamos: filas });
}

export function crear(req, res) {
  const cuerpo = req.body ?? {};
  const libroId = Number(cuerpo.libro_id);
  const socioId = Number(cuerpo.socio_id);
  if (!Number.isInteger(libroId) || !Number.isInteger(socioId)) {
    return res.status(400).json({ error: "libro_id y socio_id son obligatorios y deben ser enteros" });
  }

  const libro = db.prepare("SELECT * FROM libros WHERE id = ?").get(libroId);
  if (!libro) return res.status(404).json({ error: "libro no encontrado" });

  const socio = db.prepare("SELECT * FROM socios WHERE id = ?").get(socioId);
  if (!socio) return res.status(404).json({ error: "socio no encontrado" });
  if (socio.estado !== "activo") {
    return res.status(409).json({ error: "el socio esta dado de baja y no puede pedir prestados" });
  }

  if (disponibles(libro) < 0) {
    return res.status(409).json({ error: "no quedan ejemplares disponibles" });
  }

  const info = db
    .prepare("INSERT INTO prestamos (libro_id, socio_id, prestado, devuelto) VALUES (?, ?, ?, NULL)")
    .run(libroId, socioId, ahora());

  res.status(201).json(db.prepare("SELECT * FROM prestamos WHERE id = ?").get(info.lastInsertRowid));
}

export function devolver(req, res) {
  const id = Number(req.params.id);
  const prestamo = db.prepare("SELECT * FROM prestamos WHERE id = ?").get(id);
  if (!prestamo) return res.status(404).json({ error: "prestamo no encontrado" });
  if (prestamo.devuelto !== null) {
    return res.status(409).json({ error: "el prestamo ya fue devuelto" });
  }

  db.prepare("UPDATE prestamos SET devuelto = ? WHERE id = ?").run(ahora(), id);
  res.json(db.prepare("SELECT * FROM prestamos WHERE id = ?").get(id));
}
