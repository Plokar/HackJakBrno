/**
 * Next.js API proxy pro backend
 * Přesměruje všechny /api/proxy/* requesty na Django backend
 */

export default async function handler(req, res) {
  const { path } = req.query;
  
  // Sestavit backend URL - v Dockeru používáme název služby 'backend'
  const isDocker = process.env.DOCKER_ENV === 'true';
  const backendHost = isDocker ? 'http://backend:8000' : 'http://localhost:8000';
  const backendUrl = `${backendHost}/api/${path.join('/')}`;

  console.log(`[Proxy] ${req.method} ${backendUrl}`);

  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json().catch(() => null);

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message,
      backendUrl 
    });
  }
}
