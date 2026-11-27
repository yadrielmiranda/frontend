/* Independent company content/public-route regression checks.
 * The fixture records the supplied, approved HTML and original image hashes.
 * No Downloads folder, Python, database, account creation or SMS is needed.
 * node scripts/test-company.cjs
 * node scripts/test-company.cjs --base-url http://127.0.0.1:3000
 * The optional HTTP checks use public GET requests and a test language cookie.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const reference = require('./data/company-reference.json');
const sourceRoot = path.resolve(__dirname, '../src');
const publicRoot = path.resolve(__dirname, '../public');
const officialOrigin = 'https://www.authenticevolutionco.com';
const tests = [];
const test = (name, run) => tests.push({ name, run });

const decode = value => value
  .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10)))
  .replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, entity) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' })[entity]);
const text = value => decode(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
  .map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3])]));
const elements = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>(.*?)<\\/${tag}>`, 'gs'))]
  .map(match => ({ attributes: attributes(match[1]), text: text(match[2]), html: match[2] }));
const voidElements = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gs'))].map(match => attributes(match[1]));
const stripScripts = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const normalizedHref = value => {
  if (!value) return value;
  const relative = value.replace(/^https:\/\/(?:www\.)?authenticevolutionco\.com(?=\/)/, '');
  if (!relative.startsWith('/')) return relative;
  return relative.replace(/\/(?=[#?]|$)/, '');
};
const normalizedImage = value => value.replace(/^\/company\//, '/');
const sorted = values => values.map(value => JSON.stringify(value)).sort();

function loader(mocks = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exported = {};
    cache.set(filename, exported);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true },
    }).outputText;
    new Function('require', 'exports', 'module', compiled)(name => {
      if (name in mocks) return mocks[name];
      if (/\.css$/.test(name)) return {};
      if (['react', 'react/jsx-runtime', 'next/link', 'next/image', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot',
        'lucide-react', 'clsx', 'tailwind-merge'].includes(name)) return require(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(sourceRoot, name.slice(2)) : path.resolve(path.dirname(filename), name);
        const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}.json`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        assert.ok(resolved, `Resolve ${name} from ${filename}`);
        return resolved.endsWith('.json') ? JSON.parse(fs.readFileSync(resolved, 'utf8')) : load(resolved);
      }
      throw new Error(`Unexpected module in isolated public-page check: ${name}`);
    }, exported, { exports: exported });
    return exported;
  }
  return load;
}

const load = loader();
const { COMPANY_LANGUAGE_COOKIE, COMPANY_PUBLIC_ROUTES, isCompanyPublicRoute, preferredCompanyLanguage } =
  load(path.join(sourceRoot, 'lib/company-public-routes.ts'));
test('A manual company language wins over the supported browser languages', () => {
  assert.equal(preferredCompanyLanguage('en', 'es-MX'), 'en');
  assert.equal(preferredCompanyLanguage('es', 'en-US'), 'es');
  assert.equal(preferredCompanyLanguage('invalid', 'es-MX'), 'es');
});
test('Language detection matches regional variants, quality and preference order', () => {
  const cases = [
    ['fr-CA, ES-us;q=0.9, en;q=0.8', 'es'],
    ['es-419;q=0.2, en-GB;q=0.9', 'en'],
    ['es-CO;q=0.8, en-US;q=0.8', 'es'],
    ['en-US, es', 'en'],
    ['es;q=0, fr-FR', 'en'],
    ['fr-FR, de, *;q=0.2', 'en'],
    [null, 'en'],
  ];
  for (const [header, expected] of cases) {
    assert.equal(preferredCompanyLanguage(undefined, header), expected, String(header));
  }
});
test('Public bypass contains exactly the ten published company routes', () => {
  assert.deepEqual([...COMPANY_PUBLIC_ROUTES].sort(), reference.pages.map(page => page.route).sort());
  for (const page of reference.pages) {
    assert.equal(isCompanyPublicRoute(page.route), true);
    assert.equal(isCompanyPublicRoute(`${page.route}/`), true);
  }
});

const portalPaths = ['/', '/login', '/login/register', '/reset-password', '/estimates', '/estimates/245/edit',
  '/orders', '/settings/company-branding', '/warehouse', '/technician', '/sms/privacy', '/sms/terms',
  '/terms', '/public/test', '/company/private', '/company-secret', '/es', '/resources/private', '/es/resources/private'];
test('Public route matching does not accidentally bypass unrelated portal routes', () => {
  for (const pathname of portalPaths) assert.equal(isCompanyPublicRoute(pathname), false, pathname);
});

let pathname = '/company';
const shellMocks = {
  'next/navigation': { usePathname: () => pathname },
  '@/app/providers': { Providers: 'Providers' },
  '@/components/app-shell': { AppShell: 'AppShell' },
  '@/components/auth/global-login-dialog': { GlobalLoginDialog: 'GlobalLoginDialog' },
  '@/components/auth/login-dialog-bridge': { LoginDialogBridge: 'LoginDialogBridge' },
  '@/components/pwa/portal-install-provider': { PortalInstallProvider: 'PortalInstallProvider' },
};
const { SiteShell } = loader(shellMocks)(path.join(sourceRoot, 'components/site-shell.tsx'));
const { SiteDocument } = loader(shellMocks)(path.join(sourceRoot, 'components/site-document.tsx'));
const content = React.createElement('div', null, 'Public server content');
test('Turbopack and production have a single middleware entry point', () => {
  const rootEntries = fs.readdirSync(path.dirname(sourceRoot)).filter(name => /^middleware\.(js|jsx|ts|tsx)$/.test(name));
  assert.deepEqual(rootEntries, [], 'A root middleware shadows src/middleware.ts in development');
});
test('Document and portal agree on the negotiated locale before hydration', async () => {
  const { middleware } = loader({ 'next/server': { NextResponse: { next: options => options?.request.headers } } })
    (path.join(sourceRoot, 'middleware.ts'));
  const { PORTAL_LANGUAGE_HINT_HEADER } = load(path.join(sourceRoot, 'lib/portal-language-routes.ts'));
  for (const [url, accepted, saved, expectedPortal, expectedDocument] of [
    ['/login?lang=es', 'en-US', undefined, 'es', 'es'],
    ['/estimates/new?lang=es', 'es-US', 'en', 'en', 'en'],
    ['/login?lang=en&lang=es', 'es-US', undefined, 'es', 'es'],
    ['/es/resources', 'en-US', undefined, 'en', 'es'],
    ['/resources', 'es-US', undefined, 'es', 'en'],
    ['/orders', 'es-US', undefined, 'es', 'es'],
    ['/technician', 'es-US', undefined, 'es', 'en'],
  ]) {
    const nextUrl = new URL(url, 'http://localhost');
    pathname = nextUrl.pathname;
    const originalHeaders = new Headers({ 'accept-language': accepted });
    const requestHeaders = middleware({ nextUrl, headers: originalHeaders, cookies: { get: () => undefined } }) ?? originalHeaders;
    const { requestPortalLanguage } = loader({ 'next/headers': {
      cookies: async () => ({ get: () => saved ? { value: saved } : undefined }),
      headers: async () => requestHeaders,
    } })(path.join(sourceRoot, 'lib/public-language-server.ts'));
    const locale = await requestPortalLanguage(requestHeaders.get(PORTAL_LANGUAGE_HINT_HEADER) ?? undefined);
    assert.equal(locale, expectedPortal, url);
    const document = SiteDocument({ initialLocale: locale, children: React.createElement('body') });
    assert.equal(document.props.lang, expectedDocument, url);
  }
});
test('Canonical public pages honor a saved selection and keep shared link parameters', () => {
  const next = require('next/server');
  const { middleware } = loader({ 'next/server': next })(path.join(sourceRoot, 'middleware.ts'));
  for (const page of reference.pages) {
    const alternate = page.locale === 'es' ? 'en' : 'es';
    const target = alternate === 'en' ? page.route.slice(3) : '/es' + page.route;
    const original = new URL(page.route + '?utm_content=A&utm_content=B&lang=' + page.locale, 'https://example.test');
    const request = new next.NextRequest(original, { headers: { cookie: COMPANY_LANGUAGE_COOKIE + '=' + alternate } });
    const response = middleware(request);
    assert.equal(response.status, 307, page.route);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(response.headers.get('vary'), /\bcookie\b/i);
    const location = new URL(response.headers.get('location'));
    assert.equal(location.pathname, target);
    assert.deepEqual(location.searchParams.getAll('utm_content'), ['A', 'B']);
    assert.equal(location.searchParams.get('lang'), alternate);
    assert.equal(middleware(new next.NextRequest(location, { headers: request.headers })).status, 200);
  }
});
test('Company pages render directly without session, branding, login, terms or portal providers', () => {
  for (const page of reference.pages) {
    for (const candidate of [page.route, `${page.route}/`]) {
      pathname = candidate;
      assert.equal(SiteShell({ children: content }), content, candidate);
    }
  }
});
test('Portal and registration retain the existing provider and navigation stack', () => {
  for (pathname of portalPaths) {
    const tree = SiteShell({ children: content });
    assert.equal(tree.type, 'Providers', pathname);
    const install = tree.props.children;
    assert.equal(install.type, 'PortalInstallProvider', pathname);
    assert.deepEqual(install.props.children.map(child => child.type), ['LoginDialogBridge', 'GlobalLoginDialog', 'AppShell'], pathname);
    assert.equal(install.props.children[2].props.children, content, pathname);
  }
});

function verifyContent(html, expected, registrationAttribution = '') {
  const visible = stripScripts(html);
  const headings = ['h1', 'h2', 'h3'].flatMap(tag => elements(visible, tag).map(node => ({ tag, text: node.text })));
  assert.deepEqual(sorted(headings), sorted(expected.headings), `${expected.route}: approved headings`);
  assert.equal(elements(visible, 'h1').length, 1, 'One page heading');
  assert.equal(elements(visible, 'main').length, 1, 'One main landmark, no nested portal main');
  const paragraphs = elements(visible, 'p').map(node => node.text);
  assert.deepEqual(sorted(paragraphs), sorted(expected.paragraphs), `${expected.route}: approved paragraph copy`);
  const links = elements(visible, 'a').map(node => ({ href: normalizedHref(node.attributes.href), text: node.text }));
  const approvedLinks = expected.links.map(link => {
    const href = normalizedHref(link.href);
    if (href === '/login/register') {
      const attribution = registrationAttribution ? `&${registrationAttribution}` : '';
      return { ...link, href: `/login/register?lang=${expected.locale}${attribution}` };
    }
    return { ...link, href: ['English', 'Español'].includes(link.text) ? `/company/language${href}` : href };
  });
  assert.deepEqual(sorted(links), sorted(approvedLinks), `${expected.route}: approved links`);
  const triggers = elements(visible, 'button').filter(node => node.attributes['aria-haspopup'] === 'menu');
  assert.equal(triggers.length, 1, `${expected.route}: one compact language menu`);
  const trigger = triggers[0];
  assert.equal(trigger.text, expected.locale.toUpperCase());
  assert.ok(trigger.attributes['aria-label']);
  const flag = voidElements(trigger.html, 'img');
  assert.equal(flag.length, 1);
  assert.equal(flag[0].src, `/country-flags/${expected.locale === 'es' ? 'ES' : 'US'}.svg`);
  assert.equal(flag[0].alt, '');
  const alternative = elements(visible, 'noscript').flatMap(node => elements(node.html, 'a'));
  const otherLanguage = expected.locale === 'es' ? 'en' : 'es';
  assert.equal(alternative.length, 1, 'The language switch also works before JavaScript starts');
  assert.equal(alternative[0].attributes.hreflang, otherLanguage);
  assert.equal(alternative[0].attributes.rel, 'nofollow');
  const images = voidElements(visible, 'img').filter(node => node.src !== flag[0].src)
    .map(node => ({ src: normalizedImage(node.src), alt: node.alt, width: node.width, height: node.height }));
  assert.deepEqual(sorted(images), sorted(expected.images), `${expected.route}: approved image source, dimensions and alternative text`);
  assert.ok(new RegExp(`class="[^"]*company[^\"]*"[^>]*lang="${expected.locale}"|lang="${expected.locale}"[^>]*class="[^\"]*company`).test(visible), 'Localized public wrapper');
  assert.doesNotMatch(visible, /authentic-company-preview|chatgpt\.site|Opening technician workspace|Session expired|Loading terms/i);
}

test('Original photography and logo remain byte-for-byte unchanged', () => {
  for (const asset of reference.assets) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(publicRoot, 'company', asset.name))).digest('hex');
    assert.equal(actual, asset.sha256, asset.name);
  }
});

const { CompanyPage } = load(path.join(sourceRoot, 'components/company/company-page.tsx'));
test('Each public language menu links to its translated page and leaves the active choice in place', () => {
  // Expose the menu contents that Radix normally mounts through a browser portal.
  const childrenOnly = ({ children }) => children;
  const { CompanyLanguageLink } = loader({
    '@/components/ui/dropdown-menu': {
      DropdownMenu: childrenOnly, DropdownMenuTrigger: childrenOnly, DropdownMenuRadioGroup: childrenOnly,
      DropdownMenuContent: ({ children }) => React.createElement('nav', null, children),
      DropdownMenuRadioItem: childrenOnly,
    },
  })(path.join(sourceRoot, 'components/company/company-language-link.tsx'));
  for (const page of reference.pages) {
    const menu = renderToStaticMarkup(React.createElement(CompanyLanguageLink, {
      page: page.route.split('/').at(-1), locale: page.locale,
    }));
    const links = elements(elements(menu, 'nav')[0].html, 'a');
    const alternate = page.links.find(link => ['English', 'Español'].includes(link.text));
    assert.equal(links.length, 1, `${page.route}: only the other language navigates`);
    assert.equal(links[0].attributes.href, `/company/language${normalizedHref(alternate.href)}`);
    assert.equal(links[0].attributes.hreflang, page.locale === 'es' ? 'en' : 'es');
    assert.equal(links[0].attributes.rel, 'nofollow');
  }
});
const referral = 'aB3_01234567890123456789';
const registrationAttribution = `ref=${referral}&utm_source=facebook&utm_medium=paid&utm_campaign=registros_web&utm_content=eva_es&fbclid=abc-1`;
test('Both landing pages render attributed signup links before hydration and discard unrelated query parameters', () => {
  for (const locale of ['en', 'es']) {
    const searchParams = Object.fromEntries(new URLSearchParams(registrationAttribution));
    Object.assign(searchParams, { token: 'private', next: '/settings', lang: locale === 'es' ? 'en' : 'es' });
    const html = renderToStaticMarkup(React.createElement(CompanyPage, { page: 'company', locale, searchParams }));
    verifyContent(html, reference.pages.find(page => page.route === (locale === 'en' ? '/company' : '/es/company')), registrationAttribution);
  }
});
for (const page of reference.pages) {
  test(`${page.route}: approved content is fully present in server-rendered HTML`, () => {
    const type = page.route.split('/').at(-1);
    const html = renderToStaticMarkup(React.createElement(CompanyPage, { page: type, locale: page.locale }));
    verifyContent(html, page);
  });
}

const baseIndex = process.argv.indexOf('--base-url');
if (baseIndex !== -1) {
  const base = new URL(process.argv[baseIndex + 1]);
  assert.ok(['http:', 'https:'].includes(base.protocol), 'HTTP(S) base URL');
  const request = (route, options = {}) => fetch(new URL(route, base), { signal: AbortSignal.timeout(45000), ...options });
  const get = async (route, headers = {}) => {
    const response = await request(route, { headers });
    assert.equal(response.status, 200, `${route}: public HTTP 200`);
    return response;
  };
  const campaign = 'utm_source=facebook&utm_content=A&utm_content=B';
  const spanishBrowser = { 'accept-language': 'es-US, en;q=0.5' };
  const englishBrowser = { 'accept-language': 'en-US, es;q=0.5' };
  test('Initial HTML declares the language of the requested page', async () => {
    for (const [route, headers, language] of [
      ['/es/resources', englishBrowser, 'es'],
      ['/resources', spanishBrowser, 'en'],
      ['/login', spanishBrowser, 'es'],
      ['/?lang=es', englishBrowser, 'es'],
      ['/login/register?lang=es', englishBrowser, 'es'],
      ['/login?lang=es', { ...spanishBrowser, cookie: `${COMPANY_LANGUAGE_COOKIE}=en` }, 'en'],
    ]) {
      const html = await (await get(route, headers)).text();
      assert.equal(voidElements(html, 'html')[0]?.lang, language, route);
    }
  });
  test('The portal reads the registration language preference before the browser default', async () => {
    for (const [headers, expected, query = ''] of [[spanishBrowser, 'es'], [englishBrowser, 'en'],
      [{ ...englishBrowser, cookie: `${COMPANY_LANGUAGE_COOKIE}=es` }, 'es'],
      [{ ...spanishBrowser, cookie: `${COMPANY_LANGUAGE_COOKIE}=en` }, 'en'],
      [englishBrowser, 'es', '?lang=es'],
      [{ ...englishBrowser, cookie: `${COMPANY_LANGUAGE_COOKIE}=en` }, 'en', '?lang=es']]) {
      const response = await get(`/company/language${query}`, headers);
      assert.deepEqual(await response.json(), { locale: expected, hasPreference: Boolean(headers.cookie) });
      assert.match(response.headers.get('cache-control') ?? '', /private, no-store/);
      assert.equal(response.headers.get('set-cookie'), null);
    }
  });
  test('Spanish browser language opens the Spanish landing with all campaign parameters', async () => {
    const response = await get(`/company?${campaign}`, spanishBrowser);
    const landed = new URL(response.url);
    assert.equal(landed.pathname, '/es/company');
    assert.equal(landed.searchParams.toString(), campaign);
    verifyContent(await response.text(), reference.pages.find(page => page.route === '/es/company'), campaign);
  });
  test('Each manual selection is remembered when reopening the company landing', async () => {
    for (const [locale, target, browser] of [['en', '/company', spanishBrowser], ['es', '/es/company', englishBrowser]]) {
      const choice = await request(`/company/language${target}?${campaign}`, { redirect: 'manual', headers: browser });
      assert.equal(choice.status, 303);
      const location = new URL(choice.headers.get('location'), base);
      assert.equal(location.pathname, target);
      assert.deepEqual(location.searchParams.getAll('utm_content'), ['A', 'B']);
      assert.equal(location.searchParams.get('utm_source'), 'facebook');
      const cookie = `${COMPANY_LANGUAGE_COOKIE}=${locale}`;
      const setCookie = choice.headers.getSetCookie().find(header => header.startsWith(`${cookie};`));
      assert.ok(setCookie);
      assert.match(setCookie, /;\s*path=\/(?:;|$)/i);
      if (locale === 'en') {
        assert.equal(location.searchParams.get('lang'), 'en');
        const explicit = await get(location, spanishBrowser);
        assert.equal(new URL(explicit.url).pathname, '/company');
        await explicit.body.cancel();
      }
      const saved = await get('/company', { ...browser, cookie });
      assert.equal(new URL(saved.url).pathname, target);
      verifyContent(await saved.text(), reference.pages.find(page => page.route === target));
    }
  });
  test('A saved public selection overrides opposite-language routes and stale URL hints', async () => {
    for (const [from, target, saved, browser] of [
      ['/es/company?lang=es', '/company', 'en', spanishBrowser],
      ['/resources?lang=en', '/es/resources', 'es', englishBrowser],
    ]) {
      const source = from + '&' + campaign;
      const headers = { ...browser, cookie: `${COMPANY_LANGUAGE_COOKIE}=${saved}` };
      const redirect = await request(source, { headers, redirect: 'manual' });
      assert.equal(redirect.status, 307);
      assert.equal(redirect.headers.get('cache-control'), 'private, no-store');
      assert.match(redirect.headers.get('vary') ?? '', /\bcookie\b/i);
      const response = await get(redirect.headers.get('location'), headers);
      const landed = new URL(response.url);
      assert.equal(landed.pathname, target);
      assert.equal(landed.searchParams.get('lang'), saved);
      assert.deepEqual(landed.searchParams.getAll('utm_content'), ['A', 'B']);
      verifyContent(await response.text(), reference.pages.find(page => page.route === target), target === '/company' ? campaign : '');
    }
  });
  test('Language selection cannot redirect to a portal page', async () => {
    const response = await request('/company/language/estimates', { redirect: 'manual' });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('set-cookie'), null);
    await response.body?.cancel();
  });
  for (const page of reference.pages) {
    test(`${page.route}: public HTTP response, metadata and bilingual discovery`, async () => {
      const response = await get(page.route);
      const html = await response.text();
      assert.match(response.headers.get('content-type'), /text\/html/i);
      verifyContent(html, page);
      assert.equal(elements(html, 'title').length, 1);
      assert.equal(elements(html, 'title')[0].text, page.title);
      const metas = voidElements(html, 'meta');
      assert.equal(metas.filter(meta => meta.name === 'description').length, 1);
      assert.equal(metas.find(meta => meta.name === 'description').content, page.description);
      assert.ok(!metas.some(meta => meta.name === 'robots' && /noindex/i.test(meta.content)));
      assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/i);
      const links = voidElements(html, 'link');
      assert.equal(links.filter(link => link.rel === 'canonical').length, 1);
      assert.equal(links.find(link => link.rel === 'canonical').href, page.canonical);
      const enPath = page.route.replace(/^\/es\//, '/');
      const languages = Object.fromEntries(links.filter(link => link.rel === 'alternate' && link.hreflang).map(link => [link.hreflang, link.href]));
      assert.deepEqual(languages, { en: `${officialOrigin}${enPath}`, es: `${officialOrigin}/es${enPath}`, 'x-default': `${officialOrigin}${enPath}` });
      const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
      assert.deepEqual(schemas, page.schemas, 'Approved structured data without duplicated Organization records');
      const trailing = await get(`${page.route}/`);
      assert.equal(new URL(trailing.url).pathname.replace(/\/$/, ''), page.route, 'Trailing slash resolves to same page');
    });
  }
  test('Public llms.txt uses official URLs and preserves the bilingual reference', async () => {
    const response = await get('/llms.txt');
    assert.match(response.headers.get('content-type'), /text\/plain/i);
    const body = await response.text();
    assert.equal(body.replace(/\r\n/g, '\n').trim(), reference.llms.replace(/\r\n/g, '\n').trim());
    assert.doesNotMatch(body, /chatgpt\.site|noindex/);
  });
  test('Sitemap contains every bilingual public page on the official origin', async () => {
    const response = await get('/sitemap.xml');
    const body = await response.text();
    for (const page of reference.pages) assert.ok(body.includes(`<loc>${officialOrigin}${page.route}</loc>`), page.route);
    assert.doesNotMatch(body, /chatgpt\.site/);
  });
  test('Public company assets are reachable with their original contents', async () => {
    for (const asset of reference.assets) {
      const response = await get(`/company/${asset.name}`);
      const actual = crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
      assert.equal(actual, asset.sha256, asset.name);
    }
  });
}

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  console.log(`${tests.length - failures}/${tests.length} company checks passed.`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
