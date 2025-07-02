// server.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

const app = express();
app.use(cors());
app.use(express.json());

const usersRoutes = require("./routes/users");
const sessionRoutes = require("./routes/session");

app.use("/users", usersRoutes);
app.use("/session", sessionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
