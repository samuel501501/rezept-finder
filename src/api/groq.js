const KEY = import.meta.env.VITE_GROQ_KEY;
const URL = 'https://api.groq.com/openai/v1/chat/completions';

// Generates a recipe and returns a structured object:
// { title, intro, time, servings, ingredients[], steps[] }
export async function generateRecipe(ingredients, theme) {
  const prompt = `Du bist ein kreativer Küchenchef. Erstelle ein kreatives, schmackhaftes Rezept auf Deutsch, das zu den Zutaten und zum Thema passt.

Verfügbare Zutaten: ${ingredients.join(', ')}
Thema / Anlass: ${theme}

Antworte ausschliesslich mit einem gültigen JSON-Objekt in genau dieser Struktur (keine Erklärungen, kein Markdown, keine Code-Blöcke):
{
  "title": "Name des Rezepts",
  "intro": "Ein bis zwei Sätze, die das Gericht und den Anlass beschreiben",
  "time": "geschätzte Zubereitungszeit, z.B. 30 Min",
  "servings": "Anzahl Portionen, z.B. 4 Portionen",
  "ingredients": ["Zutat mit Mengenangabe", "..."],
  "steps": ["Erster Schritt", "Zweiter Schritt", "..."]
}`;

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }, // force valid JSON output
      temperature: 0.8,
      max_tokens: 1200
    })
  });

  if (!res.ok) throw new Error('Groq Fehler');
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq leere Antwort');

  // JSON mode returns clean JSON, but strip stray code fences just in case.
  const clean = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error('Groq ungültiges JSON');
  }

  return normalizeRecipe(parsed);
}

// Coerce the model's JSON into a predictable shape with safe defaults.
function normalizeRecipe(d = {}) {
  const list = v => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : [];
  const text = v => (v == null ? '' : String(v).trim());
  return {
    title:       text(d.title) || 'Dein Rezept',
    intro:       text(d.intro),
    time:        text(d.time),
    servings:    text(d.servings),
    ingredients: list(d.ingredients),
    steps:       list(d.steps),
  };
}
