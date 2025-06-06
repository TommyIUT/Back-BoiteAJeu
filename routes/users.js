const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// Route POST /users/login
router.post("/login", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Token manquant" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userRecord = await admin.auth().getUser(uid);
    const email = userRecord.email;

    return res.status(200).json({ uid, email });
  } catch (error) {
    return res.status(401).json({ error: "Token invalide ou expiré" });
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

module.exports = router;
