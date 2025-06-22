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
router.get('/user/:uid', async (req, res) => {
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
router.put('/user/:uid', async (req, res) => {
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
router.delete('/deleteuser/:uid', async (req, res) => {
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

// POST /users/addvendeur
router.post("/addvendeur", async (req, res) => {
  const { email, nom, prenom, mail, telephone } = req.body;

  if (!email || !nom || !prenom || !mail || !telephone) {
    return res.status(400).json({ error: "Champs requis manquants." });
  }

  try {
    // Chercher l'utilisateur connecté via son email
    const userSnapshot = await db.collection("users").where("email", "==", email).get();

    if (userSnapshot.empty) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    const userDoc = userSnapshot.docs[0];
    const userRef = db.collection("users").doc(userDoc.id);
    const userData = userDoc.data();

    const newVendeur = {
      nom,
      prenom,
      mail,
      telephone,
      listedepot: [],
      gains: 0,
      a_encaisser: 0,
    };

    // Ajouter le vendeur au tableau vendeurs (création si vide)
    const updatedVendeurs = [...(userData.vendeurs || []), newVendeur];

    await userRef.update({ vendeurs: updatedVendeurs });

    res.status(200).json({ message: "Vendeur ajouté avec succès.", vendeur: newVendeur });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'ajout du vendeur", details: err.message });
  }
});

router.delete('/deletevendeur', async (req, res) => {
  const { email, vendeurEmail } = req.body;

  if (!email || !vendeurEmail) {
    return res.status(400).json({ error: 'Email du gestionnaire ou du vendeur manquant.' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Gestionnaire non trouvé.' });
    }

    const userDoc = snapshot.docs[0];
    const vendeurs = userDoc.data().vendeurs || [];
    console.log(vendeurs)

    // Vérifie si un vendeur avec ce mail existe
    const vendeurExiste = vendeurs.some(v => v.mail === vendeurEmail);
    if (!vendeurExiste) {
      return res.status(404).json({ error: 'Vendeur non trouvé.' });
    }

    const vendeursRestants = vendeurs.filter(v => v.mail !== vendeurEmail);

    await usersRef.doc(userDoc.id).update({ vendeurs: vendeursRestants });

    res.status(200).json({ message: 'Vendeur supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({
      error: 'Erreur lors de la suppression du vendeur.',
      details: error.message
    });
  }
});

router.get('/getvendeurs', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email du gestionnaire manquant.' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Gestionnaire non trouvé.' });
    }

    const userData = snapshot.docs[0].data();
    const vendeurs = userData.vendeurs || [];

    res.status(200).json({ vendeurs });
  } catch (error) {
    res.status(500).json({
      error: 'Erreur lors de la récupération des vendeurs.',
      details: error.message
    });
  }
});

router.get('/all', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({
      error: 'Erreur lors de la récupération des utilisateurs.',
      details: error.message
    });
  }
});

router.post('/adddepot', async (req, res) => {
  const { email, vendeurEmail, nom_jeu, etat, prix } = req.body;

  if (!email || !vendeurEmail || !nom_jeu || !etat || prix == null) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Gestionnaire non trouvé.' });
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    const vendeurs = userData.vendeurs || [];

    const index = vendeurs.findIndex(v => v.mail === vendeurEmail);
    if (index === -1) {
      return res.status(404).json({ error: 'Vendeur non trouvé.' });
    }

    const nouveauDepot = {
      id: Math.random().toString(36).substring(2, 10), // ✅ ID unique généré ici
      nom_jeu,
      etat,
      prix: Number(prix),
      prix_ttc: null,
      situation: 'stock',
      date_vente: null,
    };

    vendeurs[index].listedepot = vendeurs[index].listedepot || [];
    vendeurs[index].listedepot.push(nouveauDepot);

    // 🔍 Récupérer le frais_depot de la session en cours
    const now = new Date();
    const sessionSnap = await db
      .collection('session')
      .where('debut', '<=', now)
      .where('fin', '>=', now)
      .get();

    if (sessionSnap.empty) {
      return res.status(400).json({ error: 'Aucune session en cours trouvée.' });
    }

    const sessionData = sessionSnap.docs[0].data();
    const fraisDepot = sessionData.frais_depot || 0;

    // 💰 Calculer et mettre à jour les gains
    const depotFee = (Number(prix) * fraisDepot) / 100;
    const nouveauGain = (userData.gains || 0) + depotFee;

    await usersRef.doc(userId).update({
      vendeurs,
      gains: nouveauGain,
    });

    res.status(200).json({
      message: 'Dépôt ajouté avec succès et gains mis à jour.',
      depot: nouveauDepot,
      gain_ajoute: depotFee,
      nouveau_total_gains: nouveauGain
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erreur lors de l’ajout du dépôt.',
      details: error.message,
    });
  }
});
router.delete('/deletedepot', async (req, res) => {
  const { email, vendeurEmail, nom_jeu } = req.body;

  if (!email || !vendeurEmail || !nom_jeu) {
    return res.status(400).json({ error: 'Email du gestionnaire, email du vendeur et nom du jeu requis.' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Gestionnaire non trouvé.' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const vendeurs = userData.vendeurs || [];

    const vendeurIndex = vendeurs.findIndex(v => v.mail === vendeurEmail);
    if (vendeurIndex === -1) {
      return res.status(404).json({ error: 'Vendeur non trouvé.' });
    }

    const listedepot = vendeurs[vendeurIndex].listedepot || [];
    const updatedDepots = listedepot.filter(depot => depot.nom_jeu !== nom_jeu);

    if (updatedDepots.length === listedepot.length) {
      return res.status(404).json({ error: 'Dépôt non trouvé (nom de jeu non correspondant).' });
    }

    vendeurs[vendeurIndex].listedepot = updatedDepots;
    await usersRef.doc(userDoc.id).update({ vendeurs });

    res.status(200).json({ message: 'Dépôt supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du dépôt.', details: error.message });
  }
});

router.post('/miseenvente', async (req, res) => {
  const { email, vendeurEmail, idDepot } = req.body;

  if (!email || !vendeurEmail || !idDepot) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Gestionnaire non trouvé.' });
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    const vendeurs = userData.vendeurs || [];

    const indexVendeur = vendeurs.findIndex(v => v.mail === vendeurEmail);
    if (indexVendeur === -1) {
      return res.status(404).json({ error: 'Vendeur non trouvé.' });
    }

    const listedepot = vendeurs[indexVendeur].listedepot || [];
    const indexDepot = listedepot.findIndex(d => d.id === idDepot);
    if (indexDepot === -1) {
      return res.status(404).json({ error: 'Dépôt non trouvé.' });
    }

    const depot = listedepot[indexDepot];
    if (depot.situation !== 'stock') {
      return res.status(400).json({ error: 'Le dépôt n’est pas en stock. Impossible de le mettre en vente.' });
    }

    // 🔍 Récupérer la session en cours
    const now = new Date();
    const sessionSnap = await db
      .collection('session')
      .where('debut', '<=', now)
      .where('fin', '>=', now)
      .get();

    if (sessionSnap.empty) {
      return res.status(400).json({ error: 'Aucune session en cours trouvée.' });
    }

    const sessionData = sessionSnap.docs[0].data();
    const tCommission = sessionData.t_commission || 0;

    // 💸 Calcul du prix TTC
    const prixBase = depot.prix;
    const prixTTC = prixBase + (prixBase * tCommission) / 100;

    // Mise à jour du dépôt
    listedepot[indexDepot].situation = 'vente';
    listedepot[indexDepot].prix_ttc = Number(prixTTC.toFixed(2));

    // Sauvegarde en base
    vendeurs[indexVendeur].listedepot = listedepot;
    await usersRef.doc(userId).update({ vendeurs });

    res.status(200).json({
      message: 'Jeu mis en vente avec succès.',
      depot: listedepot[indexDepot]
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erreur lors de la mise en vente.',
      details: error.message,
    });
  }
});



module.exports = router;
