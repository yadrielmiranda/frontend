/* Real React/RHF, customer fields and estimate save callbacks in an offline browser.
 * Requires the backend's Puppeteer installation (or Puppeteer in this repo).
 * Run: node scripts/test-estimate-customer-autosave.cjs
 * Optional: PUPPETEER_EXECUTABLE_PATH points to an installed Chrome executable. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'estimate-customer-autosave-'));
const sourceText = fs.readFileSync(path.join(root, 'src/components/estimates/estimate-form.tsx'), 'utf8');
const source = ts.createSourceFile('estimate-form.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'EstimateForm');
function declaration(name, statements = component.body.statements) {
  const node = statements.find(statement => ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration =>
    declaration.name.text === name || ts.isArrayBindingPattern(declaration.name) && declaration.name.elements.some(element => element.name?.text === name)));
  assert.ok(node, `Production declaration ${name} exists`);
  return node.getText(source);
}
function findNode(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => findNode(child, predicate));
}
const autosaveEffect = component.body.statements.find(node => ts.isExpressionStatement(node)
  && node.getText(source).startsWith('useEffect(') && node.getText(source).includes('headerAutosaveReadyRef'));
const customerFieldset = findNode(component, node => ts.isJsxElement(node)
  && node.openingElement.tagName.getText(source) === 'fieldset' && node.getText(source).includes('<CustomerDetailsCard'));
assert.ok(autosaveEffect && customerFieldset);

const entry = `import React, {useState,useCallback,useMemo,useRef,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {useForm,useWatch} from 'react-hook-form';
import {CustomerDetailsCard} from '@/components/estimates/customer-details-card';
${declaration('ESTIMATE_HEADER_FIELDS', source.statements)}
window.saves=[];window.errors=[];window.requests=[];window.pending=[];window.mockMode='ok';
window.fetch=()=>{throw new Error('Network access is forbidden in this test')};
function Editor(){
 const {register,control,setValue,getValues,trigger,formState:{errors}}=useForm({defaultValues:{name:'Test',customerFirstName:'Before',customerLastName:'User',customerEmail:'',customerPhone:'',customerStreet:'',customerAddressLine2:'',customerCity:'',customerState:'',customerPostalCode:'',customerTaxRate:0}});
 const estimate={id:95};const readOnly=false,needsRecalculation=false,canUseCustomerPricing=true,isRefreshingEnergy=false;
 const headerAutosaveReadyRef=useRef(false),headerAutosaveTimeoutRef=useRef(null),lastSavedHeaderRef=useRef(''),headerSaveQueueRef=useRef(Promise.resolve());
 ${declaration('headerSaveState')}
 const setPromotionEstimate=()=>{};const toast={error:message=>window.errors.push(message)};
 const updateEstimateHeader=async(id,payload)=>{window.requests.push(payload);if(window.mockMode==='fail')throw new Error('Simulated network failure');if(window.mockMode==='hold')await new Promise(resolve=>window.pending.push(resolve));window.saves.push(payload);return {id,...payload}};
 ${declaration('watchedHeaderValues')}
 ${declaration('headerSnapshot')}
 ${declaration('buildEstimateHeaderPayload')}
 ${declaration('saveEstimateHeader')}
 ${declaration('flushEstimateHeaderAutosave')}
 ${autosaveEffect.getText(source)}
 window.saveState=headerSaveState;
 return <><input id="estimateName" {...register('name',{required:'Name required'})}/>${customerFieldset.getText(source)}<button id="outside" type="button">Outside</button></>;
}
function App(){const [visible,setVisible]=useState(true);window.unmountEditor=()=>setVisible(false);return visible?<Editor/>:<p>Left editor</p>}
createRoot(document.getElementById('app')).render(<App/>);`;
fs.writeFileSync(path.join(temporary, 'entry.tsx'), entry);
fs.writeFileSync(path.join(temporary, 'loader.cjs'), `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{fileName:this.resourcePath,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;}`);
fs.writeFileSync(path.join(temporary, 'api-stub.js'), 'export const isApiError=()=>false;export const autocompleteAddress=async()=>({suggestions:[]});export const getPlaceAddress=async()=>({});');

async function main() {
  const embedded = require('next/dist/compiled/webpack/webpack');
  embedded.init();
  await new Promise((resolve, reject) => embedded.webpack({
    mode: 'development', context: root, entry: path.join(temporary, 'entry.tsx'), devtool: false,
    output: { path: temporary, filename: 'bundle.js' },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'], modules: [path.join(root, 'node_modules'), 'node_modules'],
      alias: { '@/app/api/_base': path.join(temporary, 'api-stub.js'), '@/app/api/geo.api': path.join(temporary, 'api-stub.js'), '@': path.join(root, 'src') },
    },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(temporary, 'loader.cjs')] }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || stats.toString({ all: false, errors: true })) : resolve()));

  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch { puppeteer = require(path.join(root, '../backend/node_modules/puppeteer')); }
  const browser = await puppeteer.launch({ headless: true,
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}) });
  try {
    const page = await browser.newPage();
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => request.abort());
    async function fresh() {
      await page.setContent('<html><body><div id="app"></div></body></html>');
      await page.addScriptTag({ path: path.join(temporary, 'bundle.js') });
      await page.waitForSelector('#customerPhone');
    }

    await fresh();
    await page.type('#customerPhone', '7864536053');
    await page.waitForFunction(() => window.saveState === 'saved');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'customerPhone');
    assert.equal(await page.evaluate(() => window.saves.at(-1).customerPhone), '+17864536053');
    console.log('PASS focused phone saves without Exit or blur');

    await fresh();
    await page.type('#customerPhone', '7864536053');
    await page.evaluate(() => { document.getElementById('outside').focus(); window.unmountEditor(); });
    await page.waitForFunction(() => window.saves.length === 1);
    assert.equal(await page.evaluate(() => window.saves[0].customerPhone), '+17864536053');
    console.log('PASS blur followed by immediate unmount retains the phone');

    await fresh();
    await page.type('#customerEmail', 'invalid');
    await page.type('#customerPhone', '7864536053');
    await page.waitForFunction(() => window.saveState === 'invalid');
    assert.equal(await page.evaluate(() => window.saves.length), 0);
    assert.ok(await page.evaluate(() => document.body.innerText.includes('Not saved. Check the highlighted fields.')));
    console.log('PASS invalid customer fields show that changes were not saved');

    await fresh();
    await page.evaluate(() => { window.mockMode = 'fail'; });
    await page.type('#customerPhone', '7864536053');
    await page.waitForFunction(() => window.saveState === 'error');
    assert.equal(await page.evaluate(() => window.saves.length), 0);
    assert.ok(await page.evaluate(() => document.body.innerText.includes('Could not save these changes.')));
    await page.evaluate(() => { window.mockMode = 'ok'; [...document.querySelectorAll('button')].find(button => button.textContent === 'Try again').click(); });
    await page.waitForFunction(() => window.saveState === 'saved');
    assert.equal(await page.evaluate(() => window.saves.at(-1).customerPhone), '+17864536053');
    console.log('PASS a failed save is visible and Retry persists the data');

    await fresh();
    await page.evaluate(() => { window.mockMode = 'hold'; });
    await page.type('#customerPhone', '7864536053');
    await page.waitForFunction(() => window.pending.length === 1);
    await page.$eval('#customerPhone', element => element.select());
    await page.keyboard.type('3055551234');
    await page.evaluate(() => window.pending.shift()());
    await page.waitForFunction(() => window.saves.length === 1);
    assert.equal(await page.evaluate(() => window.saveState), 'pending');
    await page.waitForFunction(() => window.pending.length === 1);
    await page.evaluate(() => window.pending.shift()());
    await page.waitForFunction(() => window.saveState === 'saved');
    assert.equal(await page.evaluate(() => window.saves.at(-1).customerPhone), '+13055551234');
    console.log('PASS an older response cannot mark newer edits as saved');
    assert.deepEqual(browserErrors, []);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
