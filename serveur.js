const db = require("./db");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
// const fs = require("fs");
// const path = require("path");

const app = express();

// const DATA_FILE = path.join(__dirname, "data", "annonces.json");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* =========================
   CONFIG UPLOAD  
========================= */    
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });



/* =========================
   ROUTE UPLOAD
========================= */
app.post("/upload", upload.array("images", 10), (req, res) => {
  const files = req.files;

  const urls = files.map(file =>
  `/uploads/${file.filename}`
);

  res.json({ images: urls });
});

app.get("/test", (req, res) => {
  res.send("ROUTE TEST OK");
});





// route pour les données d'inscription vers la base de données

app.post("/inscription", (req, res) => {

    const {
        nom,
        prenom,
        email,
        telephone,
        password
    } = req.body;

    const sql = `
        INSERT INTO utilisateurs
        (nom, prenom, email, telephone, mot_de_passe)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [nom, prenom, email, telephone, password],
        (err, result) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Erreur lors de l'inscription"
                });
            }

            res.json({
                message: "Utilisateur enregistré avec succès",
                id: result.insertId,
                utilisateur: {
                    id: result.insertId,
                    nom,
                    prenom,
                    email,
                    telephone
                }
            });

        }
    );

});

app.get("/test-db", (req, res) => {

  db.query(
    "SELECT * FROM utilisateurs",
    (err, results) => {

      if (err) {
        return res.status(500).json(err);
      }

      res.json(results);

    }
  );

});



// Route pour les données de connexion
app.post("/connexion", (req, res) => {

    const { email, password } = req.body;

    const sql = `
        SELECT *
        FROM utilisateurs
        WHERE email = ? AND mot_de_passe = ?
    `;

    db.query(
        sql,
        [email, password],
        (err, results) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Erreur serveur"
                });
            }

            if (results.length === 0) {

                return res.status(401).json({
                    message: "Email ou mot de passe incorrect"
                });

            }

            res.json({
                message: "Connexion réussie",
                utilisateur: results[0]
            });

        }
    );

});




// route vers le dossiers annonces
app.get('/annonces', (req, res) => {
    // On trie par date_creation décroissante pour avoir les plus récentes en premier
    const sql = 'SELECT * FROM annonces ORDER BY date_creation DESC';

    db.query(sql, (err, annonces) => {

        if (err) {
            console.error("Erreur SQL lors de la récupération :", err);
            return res.status(500).json({ erreur: err.message });
        }

        res.json(annonces); // Renvoie le tableau d'annonces de MySQL au Front

    });

});




// routes vers la base de donnée
app.post("/annonces", (req, res) => {

  console.log("DONNEES RECUES :", req.body);

  const {
    id,
    utilisateur_id,
    titre,
    vendeur,
    description,
    categorie,
    etat,
    faculte,
    mode_remise,
    prix,
    image
  } = req.body;

  const sql = `
    INSERT INTO annonces
    (
      id,
      utilisateur_id,
      titre,
      vendeur,
      description,
      categorie,
      etat,
      faculte,
      mode_remise,
      prix,
      image
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      id,
      utilisateur_id,
      titre || '',
      vendeur || '',
      description || '',
      categorie || '',
      etat || '',
      faculte || '',
      mode_remise || '',
      prix || 0,
      image || null // Conserve l'image si elle existe, sinon NULL
    ],
    (err, result) => {

      if (err) {
        console.error("Erreur SQL lors de l'insertion :", err);
        return res.status(500).json({
          message: "Erreur lors de l'enregistrement"
        });
      }

      console.log("Annonce enregistrée, ID :", result.insertId);

      res.json({
        message: "Annonce enregistrée",
        id: result.insertId
      }); 
    } 
  );

});



app.listen(3000, () => {
  console.log("Serveur OK : http://localhost:3000");
});



