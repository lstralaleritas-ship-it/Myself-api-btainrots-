const express = require("express");
const axios = require("axios");
const Redis = require("ioredis");
const app = express();
app.use(express.json());

// Conexión a Redis (Railway te da la URL en REDIS_URL)
const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

const MAX_SIZE = 1000;
const CLEANUP_COUNT = 5;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

// Lista especial de brainrots
const specialBrainrots = {
  "Strawberry Elephant": true,
  "Meowl": true,
  "Headless Horseman": true,
  "Skibidi Toilet": true,
  "Dragon Cannelloni": true,
  "Dragon Gingerini": true,
  "Hydra Dragon Cannelloni": true,
  "La Supreme Combinasion": true,
  "Ketupak Bros": true,
  "Ginger Gerat": true,
  "Capitano Moby": true,
  "La Casa Boo": true,
  "Cerberus": true,
  "Fragrama and Chocrama": true,
  "Cooki and Milki": true,
  "Burguro and Fryuro": true,
  "Garama and Madundung": true,
  "Spooky and Pumpky": true,
  "Reinito Sleighito": true,
  "Gingerat Gerat": true,
  "Lavadorito Spinito": true,
  "La Secret Combinasion": true,
  "Chillin Chili": true,
  "Ketchuru and Musturu": true,
  "Tictac Sahur": true,
  "La Taco Combinasion": true,
  "Tang Tang Keletang": true,
  "Ketupat Kepat": true,
  "Festive 67": true,
  "W or L": true,
  "Spaghetti Tualetti": true,
  "Nuclearo Dinossauro": true
};

// Guardar JobId en Redis
async function addJobId(jobId, botId) {
  await redis.rpush("blacklist", JSON.stringify({ jobId, botId, timestamp: Date.now() }));
  const size = await redis.llen("blacklist");
  if (size > MAX_SIZE) {
    for (let i = 0; i < CLEANUP_COUNT; i++) {
      await redis.lpop("blacklist");
    }
  }
}

// Verificar si un JobId está en blacklist
async function isBlacklisted(jobId) {
  const list = await redis.lrange("blacklist", 0, -1);
  return list.some(entry => JSON.parse(entry).jobId === jobId);
}

// Enviar embed a Discord
async function sendDiscordEmbed(brainrot, dinero, otros, players, jobId, botUsername) {
  const isSpecial = specialBrainrots[brainrot];
  const color = isSpecial ? 3066993 : 3447003;
  const footer = isSpecial ? "☘️ Mylef Highlights ☘️" : "Mylef Highlights";
  const content = isSpecial ? `@everyone ${brainrot} detectado` : null;

  const embed = {
    title: isSpecial ? "Brainrot" : `Nombre de ${brainrot}`,
    description: `## ${dinero}/s\n\n**Otros brainrots**\n\`\`\`${otros}\`\`\`\n**Players: ${players}/8 👤**\n**Ejecutado por: ${botUsername}**\n[Unirse al servidor](https://roblox.com/games/PLACEID?jobId=${jobId})\nJobId:\n\`\`\`${jobId}\`\`\``,
    color: color,
    footer: { text: footer }
  };

  await axios.post(WEBHOOK_URL, { content, embeds: [embed] });
}

// Endpoint: agregar a blacklist y enviar embed si aplica
app.post("/servers/blacklist", async (req, res) => {
  const { jobId, botId, brainrot, dinero, otros, players, botUsername } = req.body;
  if (!jobId) return res.status(400).json({ error: "jobId requerido" });

  await addJobId(jobId, botId);

  const dineroNum = parseFloat(dinero.replace(/[^0-9.]/g, "")) *
    (dinero.includes("B") ? 1e9 : dinero.includes("M") ? 1e6 : dinero.includes("K") ? 1e3 : 1);

  // Mínimo 1 millón
  if (dineroNum >= 1e6) {
    await sendDiscordEmbed(brainrot, dinero, otros, players, jobId, botUsername || `Bot${botId}`);
  }

  res.json({ status: "blacklisted" });
});

// Endpoint: verificar blacklist
app.get("/servers/blacklist/:jobId", async (req, res) => {
  const jobId = req.params.jobId;
  const exists = await isBlacklisted(jobId);
  res.json({ blacklisted: exists });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API corriendo en puerto ${PORT}`));
