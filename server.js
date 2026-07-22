// Démarrage local : npm run dev  →  http://localhost:3000
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Tweadup démarré sur http://localhost:${PORT}`);
});
