require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// -- Rotte base che hai già modificato commento--

app.get('/test', (req, res) => {
  res.json({ message: 'Server OK' });
});

app.post('/chat', async (req, res) => {
  const domanda = req.body.domanda;

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: domanda }],
      model: "gpt-3.5-turbo"
    });

    const risposta = chatCompletion.choices[0].message.content;
    res.json({ risposta });
  } catch (error) {
    console.error("Errore OpenAI:", error);
    res.status(500).json({ risposta: "Errore nella risposta del server." });
  }
});

app.get('/check-db', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [rows] = await connection.query('SELECT NOW() AS now');
    await connection.end();

    res.json({ success: true, serverTime: rows[0].now });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/check-table', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [rows] = await connection.query('SELECT * FROM conversazioni ORDER BY id DESC LIMIT 5');
    await connection.end();

    res.json({ success: true, conversazioni: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/add-conversation', async (req, res) => {
  const { domanda, risposta } = req.body;

  if (!domanda || !risposta) {
    return res.status(400).json({ success: false, message: 'Domanda e risposta sono obbligatorie.' });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const query = 'INSERT INTO conversazioni (domanda, risposta) VALUES (?, ?)';
    const [result] = await connection.execute(query, [domanda, risposta]);

    await connection.end();

    res.json({ success: true, message: 'Conversazione inserita.', insertId: result.insertId });
  } catch (error) {
    console.error('Errore DB:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================
// POLLING CON STREAMING PARZIALE
// ============================

const responseSessions = new Map();  
// responseSessions = {
//   [id]: {
//     fullText: string accumulato finora,
//     finished: boolean,
//     error: string|null
//   }
// };

app.post('/chat-polling', async (req, res) => {
  const domanda = req.body.domanda;
  if (!domanda) return res.status(400).json({ error: 'Domanda mancante' });

  const sessionId = Date.now().toString(); // semplice ID univoco (puoi migliorare)

  // inizializza sessione
  responseSessions.set(sessionId, {
    fullText: '',
    finished: false,
    error: null,
  });

  // rispondi subito con ID
  res.json({ sessionId });

  try {
    // Chiamata OpenAI in streaming
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: domanda }],
      stream: true,
    });

    for await (const part of completion) {
      // part è un oggetto contenente i token in arrivo
      const chunk = part.choices[0].delta?.content;
      if (chunk) {
        const session = responseSessions.get(sessionId);
        if (!session.finished && !session.error) {
          session.fullText += chunk;
          responseSessions.set(sessionId, session);
        }
      }
    }

    // Fine stream
    const session = responseSessions.get(sessionId);
    if (session) {
      session.finished = true;
      responseSessions.set(sessionId, session);
    }

  } catch (error) {
    console.error("Errore OpenAI streaming:", error);
    const session = responseSessions.get(sessionId);
    if (session) {
      session.error = "Errore durante la generazione della risposta.";
      responseSessions.set(sessionId, session);
    }
  }
});

// Endpoint di polling per ottenere risposta parziale o finale
app.get('/get-response/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = responseSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ ready: false, message: 'Sessione non trovata' });
  }

  if (session.error) {
    // Errore nella generazione
    responseSessions.delete(sessionId);
    return res.status(500).json({ ready: true, error: session.error });
  }

  if (session.finished) {
    // Risposta completa
    responseSessions.delete(sessionId);
    return res.json({ ready: true, risposta: session.fullText });
  }

  // Risposta ancora in generazione: manda la parte parziale
  return res.json({ ready: false, rispostaParziale: session.fullText });
});

// Avvia il server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});