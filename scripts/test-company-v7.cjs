/* Independent V7 content/public-route regression checks.
 * The fixture records the supplied, approved HTML and original image hashes.
 * No Downloads folder, Python, database, account creation or SMS is needed.
 * node scripts/test-company-v7.cjs
 * node scripts/test-company-v7.cjs --base-url http://127.0.0.1:3000
 * The optional HTTP checks make public GET requests only, without cookies.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const reference = require('./data/company-v7-reference.json');
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
const normalizedImage = value => value.replace(/^\/company-v7\//, '/');
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
      if (name === 'react' || name === 'react/jsx-runtime' || name === 'next/link') return require(name);
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
const { COMPANY_PUBLIC_ROUTES, isCompanyPublicRoute } = load(path.join(sourceRoot, 'lib/company-public-routes.ts'));
test('Public bypass contains exactly the ten published V7 routes', () => {
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
const content = React.createElement('div', null, 'Public server content');
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

function verifyContent(html, expected) {
  const visible = stripScripts(html);
  const headings = ['h1', 'h2', 'h3'].flatMap(tag => elements(visible, tag).map(node => ({ tag, text: node.text })));
  assert.deepEqual(sorted(headings), sorted(expected.headings), `${expected.route}: approved headings`);
  assert.equal(elements(visible, 'h1').length, 1, 'One page heading');
  assert.equal(elements(visible, 'main').length, 1, 'One main landmark, no nested portal main');
  const paragraphs = elements(visible, 'p').map(node => node.text);
  assert.deepEqual(sorted(paragraphs), sorted(expected.paragraphs), `${expected.route}: approved paragraph copy`);
  const links = elements(visible, 'a').map(node => ({ href: normalizedHref(node.attributes.href), text: node.text }));
  assert.deepEqual(sorted(links), sorted(expected.links.map(link => ({ ...link, href: normalizedHref(link.href) }))), `${expected.route}: approved links`);
  const images = voidElements(visible, 'img').map(node => ({ src: normalizedImage(node.src), alt: node.alt, width: node.width, height: node.height }));
  assert.deepEqual(sorted(images), sorted(expected.images), `${expected.route}: approved image source, dimensions and alternative text`);
  assert.ok(new RegExp(`class="[^"]*company-v7[^\"]*"[^>]*lang="${expected.locale}"|lang="${expected.locale}"[^>]*class="[^\"]*company-v7`).test(visible), 'Localized public wrapper');
  assert.doesNotMatch(visible, /authentic-company-preview|chatgpt\.site|Opening technician workspace|Session expired|Loading terms/i);
}

test('Original photography and logo remain byte-for-byte unchanged', () => {
  for (const asset of reference.assets) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(publicRoot, 'company-v7', asset.name))).digest('hex');
    assert.equal(actual, asset.sha256, asset.name);
  }
});

const { CompanyV7Page } = load(path.join(sourceRoot, 'components/company-v7/company-v7-page.tsx'));
for (const page of reference.pages) {
  test(`${page.route}: approved content is fully present in server-rendered HTML`, () => {
    const type = page.route.split('/').at(-1);
    const html = renderToStaticMarkup(React.createElement(CompanyV7Page, { page: type, locale: page.locale }));
    verifyContent(html, page);
  });
}

const baseIndex = process.argv.indexOf('--base-url');
if (baseIndex !== -1) {
  const base = new URL(process.argv[baseIndex + 1]);
  assert.ok(['http:', 'https:'].includes(base.protocol), 'HTTP(S) base URL');
  const get = async route => {
    const response = await fetch(new URL(route, base), { redirect: 'follow', signal: AbortSignal.timeout(45000) });
    assert.equal(response.status, 200, `${route}: public HTTP 200`);
    return response;
  };
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
  test('Public V7 assets are reachable with their original contents', async () => {
    for (const asset of reference.assets) {
      const response = await get(`/company-v7/${asset.name}`);
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
  console.log(`${tests.length - failures}/${tests.length} company V7 checks passed.`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
