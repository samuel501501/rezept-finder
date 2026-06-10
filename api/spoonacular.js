export default async function handler(req, res) {
  const path = req.query.path || '';
  const params = { ...req.query };
  delete params.path;
 
  params.apiKey = process.env.SPOONACULAR_KEY;
 
  const query = new URLSearchParams(params).toString();
  const url = `https://api.spoonacular.com/${path}?${query}`;
 
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
