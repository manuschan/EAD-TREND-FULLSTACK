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




// route vers la table annonces
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

/* =========================
   ADMIN — middleware d'auth
   (Garde-fou temporaire en attendant le JWT :
   vérifie juste que l'id envoyé correspond à un compte role='admin')
========================= */
function checkAdmin(req, res, next) {

  const adminId = req.header("x-admin-id");

  if (!adminId) {
    return res.status(401).json({ message: "Authentification admin requise" });
  }

  db.query(
    "SELECT id, role FROM utilisateurs WHERE id = ?",
    [adminId],
    (err, results) => {

      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur" });
      }

      if (results.length === 0 || results[0].role !== "admin") {
        return res.status(403).json({ message: "Accès refusé" });
      }

      next();
    }
  );

}

/* Ordre des statuts, utilisé pour valider qu'on ne saute pas d'étape
   n'importe comment depuis le serveur (sécurité minimale côté back) */
const ORDRE_STATUTS = [
  "reservee",
  "depot_attendu",
  "objet_recu",
  "objet_verifie",
  "paiement_recu",
  "remise_acheteur",
  "vendeur_paye"
];

// Colonne date à renseigner automatiquement selon le nouveau statut
const DATE_PAR_STATUT = {
  objet_recu: "date_depot",
  paiement_recu: "date_paiement",
  remise_acheteur: "date_remise",
  vendeur_paye: "date_reversement"
};

/* =========================
   ADMIN — liste des commandes
========================= */
app.get("/admin/commandes", checkAdmin, (req, res) => {

  const { statut } = req.query;

  let sql = `
    SELECT
      c.*,
      a.titre AS annonce_titre,
      a.image AS annonce_image,
      ach.nom AS acheteur_nom, ach.prenom AS acheteur_prenom, ach.telephone AS acheteur_tel,
      ven.nom AS vendeur_nom, ven.prenom AS vendeur_prenom, ven.telephone AS vendeur_tel
    FROM commandes c
    LEFT JOIN annonces a ON a.id = c.annonce_id
    JOIN utilisateurs ach ON ach.id = c.acheteur_id
    JOIN utilisateurs ven ON ven.id = c.vendeur_id
  `;

  const params = [];

  if (statut) {
    sql += " WHERE c.statut_transaction = ?";
    params.push(statut);
  }

  sql += " ORDER BY c.date_creation DESC";

  db.query(sql, params, (err, results) => {

    if (err) {
      console.error("Erreur SQL /admin/commandes :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    res.json(results);

  });

});

/* =========================
   ADMIN — faire avancer / modifier le statut d'une commande
========================= */
app.put("/admin/commandes/:id/statut", checkAdmin, (req, res) => {

  const { id } = req.params;
  const { statut, notes_admin } = req.body;

  const statutsValides = [...ORDRE_STATUTS, "litige", "annulee"];

  if (!statutsValides.includes(statut)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  const colonneDate = DATE_PAR_STATUT[statut];

  let sql = "UPDATE commandes SET statut_transaction = ?";
  const params = [statut];

  if (colonneDate) {
    sql += `, ${colonneDate} = NOW()`;
  }

  if (typeof notes_admin === "string") {
    sql += ", notes_admin = ?";
    params.push(notes_admin);
  }

  sql += " WHERE id = ?";
  params.push(id);

  db.query(sql, params, (err, result) => {

    if (err) {
      console.error("Erreur SQL maj statut commande :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    // Répercuter sur l'annonce : vendue si transaction terminée,
    // redevient disponible si annulée ou en litige résolu par annulation
    if (statut === "vendeur_paye") {

      db.query(
        `UPDATE annonces a
         JOIN commandes c ON c.annonce_id = a.id
         SET a.statut = 'vendue', a.date_vente = NOW()
         WHERE c.id = ?`,
        [id],
        (err2) => { if (err2) console.error("Erreur maj annonce (vendue) :", err2); }
      );

    } else if (statut === "annulee") {

      db.query(
        `UPDATE annonces a
         JOIN commandes c ON c.annonce_id = a.id
         SET a.statut = 'disponible'
         WHERE c.id = ?`,
        [id],
        (err2) => { if (err2) console.error("Erreur maj annonce (annulee) :", err2); }
      );

    }

    res.json({ message: "Statut mis à jour" });

  });

});

/* =========================
   ADMIN — création d'une commande (quand l'acheteur réserve)
========================= */
app.post("/commandes", (req, res) => {

  const { annonce_id, acheteur_id, prix_final, commission } = req.body;

  if (!annonce_id || !acheteur_id || !prix_final) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  // db.js exporte un POOL (mysql.createPool) : beginTransaction/commit/rollback
  // n'existent pas sur le pool lui-même. Il faut d'abord réserver une connexion
  // dédiée via db.getConnection(), faire toute la transaction SUR cette connexion,
  // puis impérativement la relâcher (connection.release()) à la fin — sur
  // chaque chemin de sortie (succès, erreur, rollback), sinon les connexions
  // du pool finissent par toutes rester occupées et le serveur se bloque.
  db.getConnection((errConn, connection) => {

    if (errConn) {
      console.error("Erreur récupération connexion pool :", errConn);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    connection.beginTransaction((errTx) => {

      if (errTx) {
        connection.release();
        console.error(errTx);
        return res.status(500).json({ message: "Erreur serveur" });
      }

      connection.query(
        "SELECT utilisateur_id, statut FROM annonces WHERE id = ? FOR UPDATE",
        [annonce_id],
        (err, rows) => {

          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error(err);
              res.status(500).json({ message: "Erreur serveur" });
            });
          }

          if (rows.length === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({ message: "Annonce introuvable" });
            });
          }

          if (rows[0].statut !== "disponible") {
            return connection.rollback(() => {
              connection.release();
              res.status(409).json({ message: "Cet article n'est plus disponible" });
            });
          }

          const vendeur_id = rows[0].utilisateur_id;

          connection.query(
            `INSERT INTO commandes (annonce_id, acheteur_id, vendeur_id, prix_final, commission)
             VALUES (?, ?, ?, ?, ?)`,
            [annonce_id, acheteur_id, vendeur_id, prix_final, commission || 0],
            (err2, result) => {

              if (err2) {
                return connection.rollback(() => {
                  connection.release();
                  console.error(err2);
                  res.status(500).json({ message: "Erreur lors de la réservation" });
                });
              }

              connection.query(
                "UPDATE annonces SET statut = 'reservee' WHERE id = ?",
                [annonce_id],
                (err3) => {

                  if (err3) {
                    return connection.rollback(() => {
                      connection.release();
                      console.error(err3);
                      res.status(500).json({ message: "Erreur lors de la réservation" });
                    });
                  }

                  connection.commit((errCommit) => {

                    if (errCommit) {
                      return connection.rollback(() => {
                        connection.release();
                        console.error(errCommit);
                        res.status(500).json({ message: "Erreur serveur" });
                      });
                    }

                    connection.release();
                    res.json({ message: "Article réservé", id: result.insertId });

                  });

                }
              );

            }
          );

        }
      );

    });

  });

});


/* =========================
   AVIS — retours des utilisateurs sur le site
========================= */
app.get('/avis', (req, res) => {

  const sql = 'SELECT * FROM avis ORDER BY date_creation DESC';

  db.query(sql, (err, avis) => {

    if (err) {
      console.error("Erreur SQL lors de la récupération des avis :", err);
      return res.status(500).json({ erreur: err.message });
    }

    res.json(avis);

  });

});

app.post('/avis', (req, res) => {

  const { nom, prenom, message } = req.body;

  const nomPropre = (nom || '').trim();
  const prenomPropre = (prenom || '').trim();
  const messagePropre = (message || '').trim();

  if (!nomPropre || !prenomPropre || !messagePropre) {
    return res.status(400).json({ message: "Merci de remplir le nom, le prénom et le message" });
  }

  if (messagePropre.length > 500) {
    return res.status(400).json({ message: "Message trop long (500 caractères maximum)" });
  }

  const sql = `
    INSERT INTO avis (nom, prenom, message)
    VALUES (?, ?, ?)
  `;

  db.query(
    sql,
    [nomPropre, prenomPropre, messagePropre],
    (err, result) => {

      if (err) {
        console.error("Erreur SQL lors de l'enregistrement de l'avis :", err);
        return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
      }

      res.json({
        message: "Avis enregistré",
        id: result.insertId
      });

    }
  );

});

const PORT = process.env.PORT || 3000;

/* =========================
   FILET DE SÉCURITÉ GLOBAL
   Si une route plante avec une erreur non gérée, Express renvoie par
   défaut une page HTML d'erreur — ce qui casse "response.json()" côté
   front. Ce middleware doit être déclaré APRÈS toutes les routes : il
   intercepte toute erreur non attrapée et répond toujours en JSON.
========================= */
app.use((err, req, res, next) => {
  console.error("Erreur non gérée :", err);
  res.status(500).json({ message: "Erreur serveur inattendue" });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});