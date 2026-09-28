import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import {
  AppError, openDatabase, snapshot, getService, createService, discardService,
  createOrder, servePortions, undoServe, cancelPortions, rushService,
  completeService, closeService, saveMenuItem, setStock, setSettings, seedDemo, recordPrint, applyDailyReset
} from './db.js';
import { printOrder, printerConfigured } from './printer.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = join(root, 'web');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8766);
const appPin = process.env.APP_PIN || '';
const adminPin = process.env.ADMIN_PIN || appPin;
const dataFile = resolve(process.env.DB_FILE || join(root, 'data', process.env.DEMO_SEED === '1' ? 'demo.sqlite' : 'restaurant.sqlite'));

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 无效');
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !appPin) {
  throw new Error('开放到局域网或公网前，必须设置 APP_PIN');
}
if (appPin && appPin.length < 6) throw new Error('APP_PIN 至少 6 位');
if (adminPin && adminPin.length < 6) throw new Error('ADMIN_PIN 至少 6 位');

const db = openDatabase(dataFile);
if (process.env.DEMO_SEED === '1') seedDemo(db);
const sessions = new Map();
const attempts = new Map();
const eventClients = new Set();
let revision = 1;

const digest = value => createHash('sha256').update(value).digest();
const sameSecret = (a, b) => timingSafeEqual(digest(a), digest(b));
const pinRequired = !!appPin;
const cookieName = 'lw_session';

function setHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
}

function json(res, status, body, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(body));
}

function userSession(req) {
  if (!pinRequired) return { role: 'admin', actor: '本地操作' };
  const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  const session = token && sessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) { sessions.delete(token); return null; }
  session.expires = Date.now() + 12 * 60 * 60 * 1000;
  return session;
}

function requireSession(req, admin = false) {
  const session = userSession(req);
  if (!session) throw new AppError('请先输入员工 PIN', 401);
  if (admin && session.role !== 'admin') throw new AppError('此操作需要管理员 PIN', 403);
  return session;
}

function checkOrigin(req) {
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) {
    throw new AppError('请求来源不匹配', 403);
  }
}

function readJson(req) {
  return new Promise((resolveBody, rejectBody) => {
    let text = '';
    req.on('data', chunk => {
      text += chunk;
      if (text.length > 65536) { rejectBody(new AppError('请求内容过长', 413)); req.destroy(); }
    });
    req.on('end', () => {
      try { resolveBody(text ? JSON.parse(text) : {}); }
      catch { rejectBody(new AppError('JSON 格式错误')); }
    });
    req.on('error', rejectBody);
  });
}

function notifyChange() {
  revision++;
  for (const client of eventClients) {
    try { client.write(`event: change\ndata: ${revision}\n\n`); }
    catch { eventClients.delete(client); }
  }
}

const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/sw.js', ['sw.js', 'text/javascript; charset=utf-8']]
]);

async function handle(req, res) {
  setHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  if (req.method === 'GET' && staticFiles.has(path)) {
    const [file, type] = staticFiles.get(path);
    const content = await readFile(join(webRoot, file));
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(content);
    return;
  }
  if (path === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, revision });
  if (path === '/api/session' && req.method === 'GET') {
    const session = userSession(req);
    return json(res, 200, { pinRequired, authorized: !!session, role: session?.role || null });
  }
  if (path === '/api/login' && req.method === 'POST') {
    checkOrigin(req);
    const address = req.socket.remoteAddress || 'unknown';
    const recent = (attempts.get(address) || []).filter(at => Date.now() - at < 10 * 60 * 1000);
    if (recent.length >= 10) throw new AppError('尝试次数过多，请 10 分钟后重试', 429);
    const { pin } = await readJson(req);
    const value = String(pin || '');
    const role = adminPin && sameSecret(value, adminPin) ? 'admin' : appPin && sameSecret(value, appPin) ? 'staff' : null;
    if (!role) { recent.push(Date.now()); attempts.set(address, recent); throw new AppError('PIN 错误', 401); }
    attempts.delete(address);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { role, actor: role === 'admin' ? '管理员' : '员工', expires: Date.now() + 12 * 60 * 60 * 1000 });
    const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
    return json(res, 200, { role }, { 'Set-Cookie': `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}` });
  }
  if (path === '/api/logout' && req.method === 'POST') {
    checkOrigin(req);
    const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
    if (cookie) sessions.delete(cookie.slice(cookieName.length + 1));
    return json(res, 200, { ok: true }, { 'Set-Cookie': `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
  }
  if (path === '/api/events' && req.method === 'GET') {
    requireSession(req);
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`event: change\ndata: ${revision}\n\n`);
    eventClients.add(res);
    req.on('close', () => eventClients.delete(res));
    return;
  }
  if (path === '/api/state' && req.method === 'GET') {
    requireSession(req);
    return json(res, 200, { ...snapshot(db), printer: { configured: printerConfigured }, revision });
  }
  const detail = path.match(/^\/api\/services\/([^/]+)$/);
  if (detail && req.method === 'GET') {
    requireSession(req);
    return json(res, 200, getService(db, detail[1]));
  }
  if (!path.startsWith('/api/') || !['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return json(res, 404, { error: '页面或接口不存在' });
  }
  checkOrigin(req);
  const menuMatch = path.match(/^\/api\/menu\/([^/]+)$/);
  const stockMatch = path.match(/^\/api\/menu\/([^/]+)\/stock$/);
  const serviceAction = path.match(/^\/api\/services\/([^/]+)\/(orders|rush|complete|close|discard)$/);
  const itemAction = path.match(/^\/api\/items\/([^/]+)\/(serve|cancel)$/);
  const undoAction = path.match(/^\/api\/serve-actions\/([^/]+)\/undo$/);
  const reprintAction = path.match(/^\/api\/orders\/([^/]+)\/reprint$/);
  const admin = path === '/api/menu' || path === '/api/settings' || !!menuMatch || !!stockMatch;
  const session = requireSession(req, admin);
  const body = await readJson(req);
  let result;
  if (path === '/api/services' && req.method === 'POST') result = createService(db, body, session.actor);
  else if (serviceAction && req.method === 'POST') {
    const [, serviceId, action] = serviceAction;
    if (action === 'orders') {
      const prior = body.clientKey && db.prepare('SELECT id FROM orders WHERE client_key=?').get(body.clientKey);
      result = createOrder(db, serviceId, body, session.actor);
      notifyChange();
      if (!prior) {
        const order = result.orders.at(-1);
        const printResult = await printOrder(result, order);
        result = recordPrint(db, order.id, printResult, '打印服务');
        result.printResult = printResult;
        notifyChange();
      } else {
        const order = result.orders.find(row => row.id === prior.id);
        result.printResult = { status: order.printStatus, message: order.printError || '' };
      }
      return json(res, 200, result);
    }
    result = action === 'rush' ? rushService(db, serviceId, session.actor)
      : action === 'complete' ? completeService(db, serviceId, session.actor)
      : action === 'close' ? closeService(db, serviceId, session.actor)
      : discardService(db, serviceId, session.actor);
  } else if (itemAction && req.method === 'POST') {
    result = itemAction[2] === 'serve' ? servePortions(db, itemAction[1], body, session.actor)
      : cancelPortions(db, itemAction[1], body, session.actor);
  } else if (undoAction && req.method === 'POST') result = undoServe(db, undoAction[1], session.actor);
  else if (reprintAction && req.method === 'POST') {
    const order = db.prepare('SELECT service_id AS serviceId FROM orders WHERE id=?').get(reprintAction[1]);
    if (!order) throw new AppError('订单不存在', 404);
    const service = getService(db, order.serviceId);
    const ticket = service.orders.find(row => row.id === reprintAction[1]);
    const printResult = await printOrder(service, ticket);
    result = recordPrint(db, ticket.id, printResult, session.actor);
    result.printResult = printResult;
  }
  else if (path === '/api/menu' && req.method === 'POST') result = saveMenuItem(db, body, session.actor);
  else if (menuMatch && req.method === 'PUT') result = saveMenuItem(db, { ...body, id: menuMatch[1] }, session.actor);
  else if (stockMatch && req.method === 'PATCH') result = setStock(db, stockMatch[1], body, session.actor);
  else if (path === '/api/settings' && req.method === 'PATCH') result = setSettings(db, body, session.actor);
  else return json(res, 404, { error: '接口不存在' });
  notifyChange();
  return json(res, 200, result);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(error => {
    if (res.headersSent) { res.end(); return; }
    const status = error.status || (String(error.message).includes('UNIQUE constraint failed') ? 409 : 500);
    if (status >= 500) console.error(error);
    json(res, status, { error: status >= 500 ? '服务器处理失败，请查看日志' : error.message });
  });
});

const heartbeat = setInterval(() => {
  if (applyDailyReset(db)) notifyChange();
  for (const client of eventClients) {
    try { client.write(': ping\n\n'); } catch { eventClients.delete(client); }
  }
  for (const [token, session] of sessions) if (session.expires < Date.now()) sessions.delete(token);
}, 20000);

server.listen(port, host, () => {
  console.log(`Le Weilai 服务已启动：http://${host}:${port}/`);
  console.log(`数据库：${dataFile}`);
  if (!pinRequired) console.log('本地模式：未启用 PIN，服务仅监听本机。');
});

function shutdown() {
  clearInterval(heartbeat);
  for (const client of eventClients) client.end();
  server.close(() => db.close());
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
