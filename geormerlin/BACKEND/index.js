const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "geormerlin",
});

db.connect((err) => {
  if (err) {
    console.log("Erreur connexion MySQL");
  } else {
    console.log("MySQL connecté");
  }
});

app.post("/ajouter", (req, res) => {
  const { nom, email, motdepasse } = req.body;

  const sql =
    "INSERT INTO utilisateurs (nom, email, motdepasse) VALUES (?, ?, ?)";

  db.query(sql, [nom, email, motdepasse], (err, result) => {
    if (err) {
      res.send(err);
    } else {
      res.send("Données enregistrées");
    }
  });
});

app.listen(5000, () => {
  console.log(" merlin Serveur démarré sur port 5000");
});