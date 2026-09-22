import { db } from "./db.js";

const CAMPOS_ORDEN = new Set(["id", "titulo", "autor", "anio"]);

function normalizarEntero(valor, porDefecto, minimo, maximo) {
  if (valor === undefined || valor === "") return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < minimo || n > maximo) return null;
  return n;
}

function validarLibro(cuerpo, { parcial = false } = {}) {
  const errores = [];
  const requerido = (campo) => {
    if (parcial && cuerpo[campo] === undefined) return false;
    if (typeof cuerpo[campo] !== "string" || cuerpo[campo].trim() === "") {
      errores.push(`${campo} es obligatorio y debe ser texto`);
      return false;
    }
    return true;
  };
  requerido("titulo");
  requerido("autor");
  requerido("isbn");
  if (!parcial || cuerpo.anio !== undefined) {
    const anio = Number(cuerpo.anio);
    if (!Number.isInteger(anio) || anio < 1450 || anio > 2100) {
      errores.push("anio debe ser un entero entre 1450 y 2100");
    }
  }
  if (cuerpo.ejemplares !== undefined) {
    const e = Number(cuerpo.ejemplares);
    if (!Number.isInteger(e) || e < 0) errores.push("ejemplares debe ser un entero >= 0");
  }
  return errores;
}

export function listar(req, res) {
  const limite = normalizarEntero(req.query.limite, 20, 1, 100);
  const desde = normalizarEntero(req.query.desde, 0, 0, 1e6);
  if (limite === null || desde === null) {
    return res.status(400).json({ error: "limite u desde fuera de rango" });
  }

  const orden = req.query.orden ?? "id";
  if (!CAMPOS_ORDEN.has(orden)) {
    return res.status(400).json({ error: `orden debe ser uno de: ${[...CAMPOS_ORDEN].join(", ")}` });
  }

  const { total } = db.prepare("SELECT COUNT(*) AS total FROM libros").get();
  const filas = db
    .prepare(`SELECT * FROM libros ORDER BY ${orden} LIMIT ? OFFSET ?`)
    .all(limite, desde + 1);

  res.json({ total, limite, desde, libros: filas });
}

export function ver(req, res) {
  const libro = db.prepare("SELECT * FROM libros WHERE id = ?").get(Number(req.params.id));
  if (!libro) return res.status(404).json({ error: "libro no encontrado" });

  const prestados = db
    .prepare("SELECT COUNT(*) AS n FROM prestamos WHERE libro_id = ? AND devuelto IS NULL")
    .get(libro.id).n;

  res.json({ ...libro, disponibles: libro.ejemplares - prestados });
}

export function crear(req, res) {
  const errores = validarLibro(req.body ?? {});
  if (errores.length) return res.status(400).json({ error: "datos invalidos", detalles: errores });

  const yaEsta = db.prepare("SELECT id FROM libros WHERE isbn = ?").get(req.body.isbn);
  if (yaEsta) return res.status(409).json({ error: "ya existe un libro con ese isbn" });

  const info = db
    .prepare("INSERT INTO libros (titulo, autor, isbn, anio, ejemplares) VALUES (?, ?, ?, ?, ?)")
    .run(
      req.body.titulo.trim(),
      req.body.autor.trim(),
      req.body.isbn.trim(),
      Number(req.body.anio),
      req.body.ejemplares === undefined ? 1 : Number(req.body.ejemplares),
    );

  const creado = db.prepare("SELECT * FROM libros WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(creado);
}

export function actualizar(req, res) {
  const id = Number(req.params.id);
  const libro = db.prepare("SELECT * FROM libros WHERE id = ?").get(id);
  if (!libro) return res.status(404).json({ error: "libro no encontrado" });

  const errores = validarLibro(req.body ?? {}, { parcial: true });
  if (errores.length) return res.status(400).json({ error: "datos invalidos", detalles: errores });

  const nuevo = { ...libro, ...req.body };
  db.prepare("UPDATE libros SET titulo = ?, autor = ?, isbn = ?, anio = ?, ejemplares = ? WHERE id = ?")
    .run(nuevo.titulo, nuevo.autor, nuevo.isbn, Number(nuevo.anio), Number(nuevo.ejemplares), id);

  res.json(db.prepare("SELECT * FROM libros WHERE id = ?").get(id));
}

export function borrar(req, res) {
  const id = Number(req.params.id);
  const libro = db.prepare("SELECT * FROM libros WHERE id = ?").get(id);
  if (!libro) return res.status(404).json({ error: "libro no encontrado" });

  db.prepare("DELETE FROM libros WHERE id = ?").run(id);
  res.status(204).end();
}
