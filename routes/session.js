const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

// Créer une nouvelle session
router.post("/", async (req, res) => {
  try {
    const { debut, fin, frais_depot, t_commission } = req.body;

    if (!debut || !fin || frais_depot == null || t_commission == null) {
      return res.status(400).json({ error: "Champs manquants." });
    }

    const nouvelleSession = {
      debut: new Date(debut),
      fin: new Date(fin),
      frais_depot: Number(frais_depot),
      t_commission: Number(t_commission),
      commission: 0,
    };

    const sessionRef = await db.collection("session").add(nouvelleSession);
    res.status(201).json({ id: sessionRef.id, ...nouvelleSession });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création de la session", details: error.message });
  }
});

// Récupérer toutes les sessions
router.get("/all", async (req, res) => {
  try {
    const snapshot = await db.collection("session").get();
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des sessions", details: error.message });
  }
});

module.exports = router;
