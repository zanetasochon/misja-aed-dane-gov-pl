// HackNation 2026 – proxy tylko do odczytu dla wdrożenia na Vercel (GPL-3.0), 2026-11-21
//
// Serwery dane.gov.pl odpowiadają 301 na żądania z nagłówkiem X-Forwarded-Host,
// a Vercel dodaje go przy każdym rewrite do zewnętrznego adresu. Ta funkcja
// przekazuje żądanie bez nagłówków X-Forwarded-*.
//
// Ograniczenia: tylko GET i HEAD, tylko cztery stałe cele (to nie jest otwarte proxy),
// przekierowania 3xx są zwracane przeglądarce, a nie wykonywane.

const TARGETS = {
  api: 'https://api.dane.gov.pl/1.4/',
  media: 'https://dane.gov.pl/media/',
  flags: 'https://dane.gov.pl/flags/',
  cms: 'https://cms.dane.gov.pl/',
};

const FORWARDED_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type'];
const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'cache-control',
  'content-disposition',
  'etag',
  'last-modified',
  'location',
];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const incoming = new URL(req.url, 'http://localhost');
  const target = incoming.searchParams.get('__t');
  const path = incoming.searchParams.get('__p') || '';
  const base = TARGETS[target];

  if (!base || path.includes('..') || path.includes('://') || path.startsWith('/') || path.includes('\\')) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  const upstream = new URL(path, base);
  if (!upstream.href.startsWith(base)) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }
  incoming.searchParams.forEach((value, key) => {
    if (key !== '__t' && key !== '__p') upstream.searchParams.append(key, value);
  });

  const headers = {};
  for (const name of FORWARDED_REQUEST_HEADERS) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }

  let response;
  try {
    response = await fetch(upstream, { method: req.method, headers, redirect: 'manual' });
  } catch {
    res.statusCode = 502;
    res.end('Bad Gateway');
    return;
  }

  res.statusCode = response.status;
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) res.setHeader(name, value);
  }
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(Buffer.from(await response.arrayBuffer()));
};
