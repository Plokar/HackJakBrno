/**
 * Next.js API proxy pro backend
 * Přesměruje všechny /api/proxy/* requesty na Django backend
 */

export default async function handler(req, res) {
  const { path, ...queryParams } = req.query;
  
  // Sestavit backend URL - v Dockeru používáme název služby 'backend'
  const isDocker = process.env.DOCKER_ENV === 'true';
  const backendHost = isDocker ? 'http://backend:8000' : 'http://localhost:8000';
  
  // Zachovat trailing slash, pokud je v původní URL
  const pathString = path.join('/');
  let backendUrl = `${backendHost}/api/${pathString}/`;
  
  // Přidat query parametry, pokud existují
  const queryString = new URLSearchParams(queryParams).toString();
  if (queryString) {
    backendUrl += `?${queryString}`;
  }

  console.log(`[Proxy] ${req.method} ${backendUrl}`);

  try {
    // Připravit konfiguraci requestu
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Přeposlat X-User-Role header pro mock autentizaci
        ...(req.headers['x-user-role'] && { 'X-User-Role': req.headers['x-user-role'] }),
      },
    };

    // Pro POST/PUT/PATCH přidat tělo requestu
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(backendUrl, fetchOptions);

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
