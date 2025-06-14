const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

// routes/users.js (login)
router.post("/login", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Token manquant" });
  }

  try {
    // Vérifier le token reçu côté serveur
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Récupérer l’utilisateur dans Firestore si besoin
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "Utilisateur non trouvé en base" });
    }

    // Renvoyer les infos utiles
    res.status(200).json({ uid, ...userDoc.data() });
  } catch (error) {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
});



// GET user profile by UID
router.get('/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const data = userDoc.data();
      const profile = {
        nom: data.name || '',
        prenom: data.prenom || '',
        type: data.type || '',
        email: data.email || '',
        tel: data.tel || '',
        adresse: data.adresse || ''
      };
  
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
    }
  });
  
// PUT update user profile
router.put('/:uid', async (req, res) => {
    const { uid } = req.params;
    const { nom, prenom, type, email, tel, adresse } = req.body;

    try {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
        }

        await userRef.update({
        name: nom,
        prenom,
        type,
        email,
        tel,
        adresse
        });

        res.json({ message: 'User profile updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user profile', details: err.message });
    }
});

// routes/users.js
router.post("/signin", async (req, res) => {
  try {
    const { email, password, name, prenom, tel, adresse } = req.body;

    if (!email || !password || !name || !prenom) {
      return res.status(400).json({ error: "Champs requis manquants." });
    }

    // Créer l'utilisateur dans Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${prenom} ${name}`,
    });

    console.log("Utilisateur Firebase créé :", userRecord.uid);

    const uid = userRecord.uid;

    // Stocker les données supplémentaires dans Firestore
    const userData = {
      email,
      name,
      prenom,
      tel: tel || "",
      adresse: adresse || "",
      type: "rien",
      gains: 0,
      a_encaisser: 0,
      commandes: [],
      vendeurs: [],
    };

    await db.collection("users").doc(uid).set(userData);

    res.status(201).json({ uid, ...userData });
  } catch (error) {
    console.error("Erreur /signin :", error.message);
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur", details: error.message });
  }
});


// DELETE /:uid
router.delete('/:uid', async (req, res) => {
  const { uid } = req.params;

  try {
    // Supprimer l'utilisateur de Firebase Authentication
    await admin.auth().deleteUser(uid);

    // Supprimer le document de Firestore
    await db.collection('users').doc(uid).delete();

    res.json({ message: `Utilisateur ${uid} supprimé avec succès.` });
  } catch (error) {
    console.error("Erreur lors de la suppression :", error.message);
    res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur", details: error.message });
  }
});



module.exports = router;
