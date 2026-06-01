const BASE = '/spoonacular';
const KEY = import.meta.env.VITE_SPOONACULAR_KEY;

async function translateToEnglish(ingredients) {
  const KEY = import.meta.env.VITE_GROQ_KEY;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{
        role: 'user',
        content: `Übersetze diese Zutaten auf Englisch. Gib nur die englischen Wörter zurück, kommagetrennt, ohne Erklärung: ${ingredients.join(', ')}`
      }],
      max_tokens: 100
    })
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const translated = data.choices?.[0]?.message?.content;
  if (!translated) throw new Error('Groq leere Antwort');
  return translated.split(',').map(s => s.trim()).filter(Boolean);
}

export async function searchByIngredients(ingredients) {
  const englishIngredients = await translateToEnglish(ingredients);
  const query = encodeURIComponent(englishIngredients.join(','));
  const res = await fetch(`${BASE}/recipes/findByIngredients?ingredients=${query}&number=5&apiKey=${KEY}`);
  if (!res.ok) throw new Error(`Spoonacular ${res.status}`);
  return res.json();
}

export async function getRecipeDetail(id) {
  const res = await fetch(`${BASE}/recipes/${id}/information?includeNutrition=true&apiKey=${KEY}`);
  if (!res.ok) throw new Error('Rezept nicht gefunden');
  return res.json();
}

export async function getRandomRecipes() {
  const res = await fetch(`${BASE}/recipes/random?number=11&apiKey=${KEY}`);
  if (!res.ok) throw new Error('Spoonacular Fehler');
  const data = await res.json();
  return data.recipes;
}