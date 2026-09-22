import { db } from "./db.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validarSocio(cuerpo) {
  const errores = [];
  if (typeof cuerpo.nombre !== "string" || cuerpo.nombre.trim().length < 2) {
    errores.push("nombre es obligatorio y debe tener al menos 2 caracteres");
  }
  if (typeof cuerpo.email !== "string" || !EMAIL.test(cuerpo.email)) {
    errores.push("email debe ser una direccion valida");
  }
  if (cuerpo.estado !== undefined && !["activo", "baja"].includes(cuerpo.estado)) {
    errores.push("estado debe ser 'activo' o 'baja'");
  }
  return errores;
}

export function listar(req, res) {
  const estado = req.query.estado;
  if (estado !== undefined && !["activo", "baja"].includes(estado)) {
    return res.status(400).json({ error: "estado debe ser 'activo' o 'baja'" });
  }
  const filas = estado
    ? db.prepare("SELECT * FROM socios WHERE estado = ? ORDER BY id").all(estado)
    : db.prepare("SELECT * FROM socios ORDER BY id").all();
  res.json({ total: filas.length, socios: filas });
}

export function ver(req, res) {
  const socio = db.prepare("SELECT * FROM socios WHERE id = ?").get(Number(req.params.id));
  if (!socio) return res.status(404).json({ error: "socio no encontrado" });

  // Un socio dado de baja existe, pero su ficha no se expone. Es 403 y no 404 a proposito:
  // esta en el README. Ver la seccion "Decisiones que parecen errores".
  if (socio.estado === "baja") {
    return res.status(403).json({ error: "socio dado de baja: la ficha no se expone" });
  }

  const prestamos = db
    .prepare("SELECT COUNT(*) AS n FROM prestamos WHERE socio_id = ? AND devuelto IS NULL")
    .get(socio.id).n;

  res.json({ ...socio, prestamos_activos: prestamos });
}

export function crear(req, res) {
  const errores = validarSocio(req.body ?? {});
  if (errores.length) return res.status(400).json({ error: "datos invalidos", detalles: errores });

  const yaEsta = db.prepare("SELECT id FROM socios WHERE email = ?").get(req.body.email);
  if (yaEsta) return res.status(409).json({ error: "ya existe un socio con ese email" });

  const info = db
    .prepare("INSERT INTO socios (nombre, email, estado) VALUES (?, ?, ?)")
    .run(req.body.nombre.trim(), req.body.email.trim(), req.body.estado ?? "activo");

  res.status(201).json(db.prepare("SELECT * FROM socios WHERE id = ?").get(info.lastInsertRowid));
}
