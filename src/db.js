// Base de datos en memoria con SQLite del propio Node (node:sqlite). Sin dependencias y sin
// archivo en disco: cada arranque parte del mismo estado y `reiniciar()` lo devuelve ahi.
import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync(":memory:");

const ESQUEMA = `
CREATE TABLE libros (
  id       INTEGER PRIMARY KEY,
  titulo   TEXT    NOT NULL,
  autor    TEXT    NOT NULL,
  isbn     TEXT    NOT NULL UNIQUE,
  anio     INTEGER NOT NULL,
  ejemplares INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE socios (
  id     INTEGER PRIMARY KEY,
  nombre TEXT    NOT NULL,
  email  TEXT    NOT NULL UNIQUE,
  estado TEXT    NOT NULL DEFAULT 'activo'
);

CREATE TABLE prestamos (
  id        INTEGER PRIMARY KEY,
  libro_id  INTEGER NOT NULL,
  socio_id  INTEGER NOT NULL,
  prestado  TEXT    NOT NULL,
  devuelto  TEXT
);
`;

// Semilla fija: los mismos datos en cada arranque y despues de cada reset. Sin esto, la
// iteracion 7 prueba sobre lo que dejo la 6 y no se distingue un bug de una contaminacion.
const LIBROS = [
  [1, "Rayuela", "Julio Cortazar", "978-8437604572", 1963, 2],
  [2, "Ficciones", "Jorge Luis Borges", "978-8420633114", 1944, 1],
  [3, "Pedro Paramo", "Juan Rulfo", "978-8437604573", 1955, 3],
  [4, "La casa de los espiritus", "Isabel Allende", "978-8401242144", 1982, 1],
  [5, "Cien anios de soledad", "Gabriel Garcia Marquez", "978-8437604494", 1967, 2],
  [6, "El Aleph", "Jorge Luis Borges", "978-8420633138", 1949, 1],
  [7, "Los detectives salvajes", "Roberto Bolanio", "978-8433920584", 1998, 1],
  [8, "Aura", "Carlos Fuentes", "978-9684111004", 1962, 4],
];

const SOCIOS = [
  [1, "Ana Torres", "ana@barrio.test", "activo"],
  [2, "Bruno Diaz", "bruno@barrio.test", "activo"],
  [3, "Carla Ruiz", "carla@barrio.test", "activo"],
  [4, "Dario Pena", "dario@barrio.test", "baja"],
];

export function reiniciar() {
  db.exec("DROP TABLE IF EXISTS prestamos; DROP TABLE IF EXISTS libros; DROP TABLE IF EXISTS socios;");
  db.exec(ESQUEMA);
  const libro = db.prepare("INSERT INTO libros VALUES (?, ?, ?, ?, ?, ?)");
  for (const l of LIBROS) libro.run(...l);
  const socio = db.prepare("INSERT INTO socios VALUES (?, ?, ?, ?)");
  for (const s of SOCIOS) socio.run(...s);
}

reiniciar();
