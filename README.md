 assistente-api

## Descrizione
Questo progetto è un semplice server Express che utilizza l'API OpenAI per rispondere a domande.

## Installazione
1. Clona il repository
2. Esegui `npm install` per installare le dipendenze
3. Crea un file `.env` con la tua chiave API:
OPENAI_API_KEY=sk-la-tua-chiave

markdown
Copia
Modifica
4. Avvia il server con:
node index.js

bash
Copia
Modifica

## Uso
- Invia una richiesta POST a `/chat` con un JSON come:
```json
{
 "domanda": "Ciao, come stai?"
}
Riceverai una risposta JSON con la risposta generata da OpenAI.

Tecnologie usate
Node.js

Express

OpenAI SDK

dotenv

Licenza
Questo progetto è distribuito sotto la licenza MIT. Vedi il file LICENSE per i dettagli.