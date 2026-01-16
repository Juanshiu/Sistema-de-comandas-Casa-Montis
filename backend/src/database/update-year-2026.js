const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/casa_montis.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("UPDATE configuracion_nomina SET anio = 2026 WHERE vigente = 1", function(err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Rows updated: ${this.changes}`);
  });
});

db.close();
