import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const iso = () => new Date().toISOString();
const id = () => randomUUID();

const defaultMenu = [
  ['A01', '宫保鸡丁', 'Poulet Kung Pao', '热菜', 1480, 'dish', 12, '花生', 'gbjd kung pao poulet'],
  ['A02', '麻婆豆腐', 'Tofu Mapo', '热菜', 1250, 'dish', null, '大豆', 'mpdf mapo tofu'],
  ['A03', '脆皮鸭', 'Canard croustillant', '热菜', 1890, 'dish', 8, '芝麻', 'cpy canard'],
  ['A04', '牛肉炒面', 'Nouilles sautées au bœuf', '主食', 1550, 'dish', 9, '小麦、大豆', 'nrclm boeuf nouilles'],
  ['A05', '扬州炒饭', 'Riz sauté de Yangzhou', '主食', 1350, 'dish', 7, '蛋、甲壳类', 'yzcf riz saute'],
  ['A06', '酸辣汤', 'Soupe aigre-piquante', '汤品', 650, 'dish', 10, '蛋、大豆', 'slt soupe'],
  ['A07', '拍黄瓜', 'Concombre écrasé', '凉菜', 750, 'dish', 6, '芝麻', 'phg concombre'],
  ['A08', '茉莉花茶', 'Thé au jasmin', '饮料酒水', 450, 'drink', 14, '', 'mlhc the jasmin'],
  ['A09', '橙汁', "Jus d'orange", '饮料酒水', 480, 'drink', 8, '', 'cz jus orange'],
  ['A10', '法国红酒（杯）', 'Vin rouge français (verre)', '饮料酒水', 750, 'drink', 10, '亚硫酸盐', 'fgjh vin rouge'],
  ['A11', '春卷', 'Nems végétariens', '凉菜', 850, 'dish', 10, '小麦、大豆', 'cj nems'],
  ['A12', '白米饭', 'Riz blanc', '主食', 250, 'dish', null, '', 'bmf riz blanc']
];

const defaultTables = [
  ...['1', '2', '3', '5', '6', '8', '9', '10', '11', '12'].map((tableId, index) => [tableId, '室内', index < 3 ? 4 : 2, index]),
  ['T1', '露台', 4, 10], ['T2', '露台', 4, 11]
];

export function openDatabase(file) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file, { timeout: 5000 });
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name_zh TEXT NOT NULL,
      name_fr TEXT NOT NULL, category TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
      type TEXT NOT NULL CHECK(type IN ('dish','drink')),
      stock INTEGER CHECK(stock IS NULL OR stock >= 0),
      daily_stock INTEGER CHECK(daily_stock IS NULL OR daily_stock >= 0),
      stock_before_soldout INTEGER CHECK(stock_before_soldout IS NULL OR stock_before_soldout >= 0),
      allergens TEXT NOT NULL DEFAULT '',
      aliases TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dining_tables (
      id TEXT PRIMARY KEY, zone TEXT NOT NULL, seats INTEGER NOT NULL CHECK(seats > 0),
      sort_order INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY, display_code TEXT NOT NULL, table_id TEXT REFERENCES dining_tables(id),
      kind TEXT NOT NULL CHECK(kind IN ('dine-in','takeaway')),
      covers INTEGER NOT NULL CHECK(covers > 0),
      status TEXT NOT NULL CHECK(status IN ('open','complete','closed')),
      opened_at TEXT NOT NULL, completed_at TEXT, closed_at TEXT, last_served_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_live_service_per_table
      ON services(table_id) WHERE table_id IS NOT NULL AND closed_at IS NULL;
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES services(id),
      client_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
      print_status TEXT NOT NULL DEFAULT 'unconfigured',
      print_error TEXT, printed_at TEXT, print_attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id),
      menu_id TEXT NOT NULL REFERENCES menu_items(id), code TEXT NOT NULL,
      name_zh TEXT NOT NULL, name_fr TEXT NOT NULL, price_cents INTEGER NOT NULL,
      type TEXT NOT NULL, allergens TEXT NOT NULL, qty INTEGER NOT NULL CHECK(qty > 0),
      served_qty INTEGER NOT NULL DEFAULT 0 CHECK(served_qty >= 0),
      cancelled_qty INTEGER NOT NULL DEFAULT 0 CHECK(cancelled_qty >= 0),
      note TEXT NOT NULL DEFAULT '', added INTEGER NOT NULL DEFAULT 0,
      rush INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      served_at TEXT, cancelled_at TEXT, cancel_reason TEXT,
      CHECK(served_qty + cancelled_qty <= qty)
    );
    CREATE TABLE IF NOT EXISTS serve_actions (
      id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES services(id),
      item_id TEXT NOT NULL REFERENCES order_items(id), qty INTEGER NOT NULL,
      at TEXT NOT NULL, prev_item_served_at TEXT, prev_service_last_served_at TEXT,
      undone_at TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL,
      actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  if (!db.prepare('PRAGMA table_info(menu_items)').all().some(row => row.name === 'stock_before_soldout')) {
    db.exec('ALTER TABLE menu_items ADD COLUMN stock_before_soldout INTEGER');
  }
  if (!db.prepare('PRAGMA table_info(menu_items)').all().some(row => row.name === 'daily_stock')) {
    db.exec('ALTER TABLE menu_items ADD COLUMN daily_stock INTEGER');
    db.exec('UPDATE menu_items SET daily_stock=stock');
  }
  const orderColumns = new Set(db.prepare('PRAGMA table_info(orders)').all().map(row => row.name));
  if (!orderColumns.has('print_status')) db.exec("ALTER TABLE orders ADD COLUMN print_status TEXT NOT NULL DEFAULT 'unconfigured'");
  if (!orderColumns.has('print_error')) db.exec('ALTER TABLE orders ADD COLUMN print_error TEXT');
  if (!orderColumns.has('printed_at')) db.exec('ALTER TABLE orders ADD COLUMN printed_at TEXT');
  if (!orderColumns.has('print_attempts')) db.exec('ALTER TABLE orders ADD COLUMN print_attempts INTEGER NOT NULL DEFAULT 0');
  if (db.prepare('SELECT count(*) AS n FROM menu_items').get().n === 0) {
    transaction(db, () => {
      const insert = db.prepare(`INSERT INTO menu_items
        (id,code,name_zh,name_fr,category,price_cents,type,stock,daily_stock,allergens,aliases,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      for (const row of defaultMenu) insert.run(id(), ...row.slice(0, 7), row[6], ...row.slice(7), iso(), iso());
    });
  }
  if (db.prepare('SELECT count(*) AS n FROM dining_tables').get().n === 0) {
    transaction(db, () => {
      const insert = db.prepare('INSERT INTO dining_tables (id,zone,seats,sort_order) VALUES (?,?,?,?)');
      for (const row of defaultTables) insert.run(...row);
    });
  }
  for (const [key, value] of Object.entries({ warnMinutes: 20, lateMinutes: 35, gapMinutes: 10,
    autoResetStock: false, stockDay: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }),
    noteTags: ['不辣', '微辣', '特辣', '不要葱', '打包', '过敏'] })) {
    db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run(key, JSON.stringify(value));
  }
  applyDailyReset(db);
  return db;
}

export function applyDailyReset(db) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const old = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='stockDay'").get()?.value || 'null');
  if (old === today) return false;
  transaction(db, () => {
    const enabled = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='autoResetStock'").get()?.value || 'false');
    if (enabled) {
      db.exec('UPDATE menu_items SET stock=daily_stock,updated_at=CURRENT_TIMESTAMP');
      log(db, '系统', '每日库存重置', { day: today });
    }
    db.prepare("INSERT INTO settings (key,value) VALUES ('stockDay',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(JSON.stringify(today));
  });
  return true;
}

function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

function log(db, actor, action, detail) {
  db.prepare('INSERT INTO events (at,actor,action,detail) VALUES (?,?,?,?)')
    .run(iso(), actor, action, JSON.stringify(detail));
}

const menuRow = row => ({ ...row, active: !!row.active });
const itemRow = row => ({
  ...row, added: !!row.added, rush: !!row.rush,
  pendingQty: row.qty - row.servedQty - row.cancelledQty
});

export function getService(db, serviceId) {
  const service = db.prepare(`SELECT id,display_code AS displayCode,table_id AS tableId,kind,covers,status,
    opened_at AS openedAt,completed_at AS completedAt,closed_at AS closedAt,
    last_served_at AS lastServedAt FROM services WHERE id=?`).get(serviceId);
  if (!service) throw new AppError('服务单不存在', 404);
  const orders = db.prepare(`SELECT id,service_id AS serviceId,created_at AS createdAt,
    print_status AS printStatus,print_error AS printError,printed_at AS printedAt,
    print_attempts AS printAttempts FROM orders WHERE service_id=? ORDER BY created_at,id`).all(serviceId);
  const fetchItems = db.prepare(`SELECT id,order_id AS orderId,menu_id AS menuId,code,
    name_zh AS nameZh,name_fr AS nameFr,price_cents AS priceCents,type,allergens,
    qty,served_qty AS servedQty,cancelled_qty AS cancelledQty,note,added,rush,
    created_at AS createdAt,served_at AS servedAt,cancelled_at AS cancelledAt,
    cancel_reason AS cancelReason FROM order_items WHERE order_id=? ORDER BY rowid`);
  service.orders = orders.map(order => ({ ...order, items: fetchItems.all(order.id).map(itemRow) }));
  return service;
}

export function snapshot(db) {
  const serviceIds = db.prepare(`SELECT id FROM services WHERE closed_at IS NULL ORDER BY opened_at`).all();
  return {
    serverTime: iso(),
    tables: db.prepare('SELECT id,zone,seats,sort_order AS sortOrder FROM dining_tables WHERE active=1 ORDER BY sort_order').all(),
    menu: db.prepare(`SELECT id,code,name_zh AS nameZh,name_fr AS nameFr,category,
      price_cents AS priceCents,type,stock,allergens,aliases,active FROM menu_items ORDER BY code`).all().map(menuRow),
    services: serviceIds.map(row => getService(db, row.id)),
    history: db.prepare(`SELECT id,display_code AS displayCode,table_id AS tableId,kind,covers,
      opened_at AS openedAt,completed_at AS completedAt,closed_at AS closedAt
      FROM services WHERE closed_at IS NOT NULL ORDER BY closed_at DESC LIMIT 40`).all(),
    events: db.prepare('SELECT id,at,actor,action,detail FROM events ORDER BY id DESC LIMIT 80').all()
      .map(row => ({ ...row, detail: JSON.parse(row.detail) })),
    settings: Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(row => [row.key, JSON.parse(row.value)]))
  };
}

export function createService(db, input, actor = '服务员') {
  return transaction(db, () => {
    const kind = input.kind === 'takeaway' ? 'takeaway' : 'dine-in';
    const covers = Number(input.covers);
    if (!Number.isInteger(covers) || covers < 1 || covers > 30) throw new AppError('人数须为 1–30 人');
    let tableId = null;
    let displayCode;
    if (kind === 'dine-in') {
      tableId = String(input.tableId || '');
      if (!db.prepare('SELECT id FROM dining_tables WHERE id=? AND active=1').get(tableId)) throw new AppError('桌号不存在');
      if (db.prepare('SELECT id FROM services WHERE table_id=? AND closed_at IS NULL').get(tableId)) throw new AppError('该桌已开台，请打开当前服务单', 409);
      displayCode = tableId;
    } else {
      const next = db.prepare("SELECT count(*) AS n FROM services WHERE kind='takeaway'").get().n + 1;
      displayCode = `打包 ${String(next).padStart(3, '0')}`;
    }
    const serviceId = id();
    db.prepare(`INSERT INTO services (id,display_code,table_id,kind,covers,status,opened_at)
      VALUES (?,?,?,?,?,'open',?)`).run(serviceId, displayCode, tableId, kind, covers, iso());
    log(db, actor, '开单', { serviceId, displayCode, kind, covers });
    return getService(db, serviceId);
  });
}

export function discardService(db, serviceId, actor = '服务员') {
  return transaction(db, () => {
    const service = getService(db, serviceId);
    if (service.status !== 'open' || service.orders.length) throw new AppError('已有订单，不能取消开台', 409);
    db.prepare("UPDATE services SET status='closed',closed_at=? WHERE id=?").run(iso(), serviceId);
    log(db, actor, '取消开台', { serviceId, displayCode: service.displayCode });
    return { id: serviceId };
  });
}

export function createOrder(db, serviceId, input, actor = '服务员') {
  return transaction(db, () => {
    const existing = input.clientKey && db.prepare('SELECT id,service_id AS serviceId FROM orders WHERE client_key=?').get(input.clientKey);
    if (existing) {
      if (existing.serviceId !== serviceId) throw new AppError('重复请求编号冲突', 409);
      return getService(db, serviceId);
    }
    const service = getService(db, serviceId);
    if (service.status !== 'open') throw new AppError('此单已完单，不能再加菜', 409);
    if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 60) throw new AppError('请至少选择一道菜');
    if (typeof input.clientKey !== 'string' || input.clientKey.length < 16 || input.clientKey.length > 100) throw new AppError('请求编号无效');
    const previous = service.orders.length > 0;
    const stamp = iso();
    const orderId = id();
    const normalized = input.items.map(line => {
      const menu = db.prepare('SELECT * FROM menu_items WHERE id=? AND active=1').get(String(line.menuId || ''));
      if (!menu) throw new AppError('菜品已下架，请刷新菜单', 409);
      const qty = Number(line.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 30) throw new AppError('每道菜数量须为 1–30');
      const note = String(line.note || '').trim();
      if (note.length > 300) throw new AppError('备注不能超过 300 字');
      return { menu, qty, note };
    });
    const demand = new Map();
    for (const line of normalized) demand.set(line.menu.id, (demand.get(line.menu.id) || 0) + line.qty);
    for (const [menuId, qty] of demand) {
      const stock = db.prepare('SELECT stock,name_zh AS nameZh FROM menu_items WHERE id=?').get(menuId);
      if (stock.stock !== null && stock.stock < qty) throw new AppError(`${stock.nameZh} 库存不足`, 409);
    }
    db.prepare('INSERT INTO orders (id,service_id,client_key,created_at) VALUES (?,?,?,?)')
      .run(orderId, serviceId, input.clientKey, stamp);
    const insert = db.prepare(`INSERT INTO order_items (id,order_id,menu_id,code,name_zh,name_fr,price_cents,
      type,allergens,qty,note,added,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const line of normalized) {
      const m = line.menu;
      insert.run(id(), orderId, m.id, m.code, m.name_zh, m.name_fr, m.price_cents,
        m.type, m.allergens, line.qty, line.note, previous ? 1 : 0, stamp);
      if (m.stock !== null) db.prepare('UPDATE menu_items SET stock=stock-?,updated_at=? WHERE id=?').run(line.qty, stamp, m.id);
    }
    log(db, actor, previous ? '加菜' : '下单', { serviceId, displayCode: service.displayCode, orderId,
      items: normalized.map(line => ({ code: line.menu.code, qty: line.qty })) });
    return getService(db, serviceId);
  });
}

export function recordPrint(db, orderId, result, actor = '打印服务') {
  return transaction(db, () => {
    const order = db.prepare(`SELECT o.id,s.id AS serviceId,s.display_code AS displayCode
      FROM orders o JOIN services s ON s.id=o.service_id WHERE o.id=?`).get(orderId);
    if (!order) throw new AppError('订单不存在', 404);
    db.prepare(`UPDATE orders SET print_status=?,print_error=?,printed_at=?,
      print_attempts=print_attempts+? WHERE id=?`)
      .run(result.status, result.status === 'printed' ? null : result.message,
        result.status === 'printed' ? iso() : null, result.status === 'unconfigured' ? 0 : 1, orderId);
    log(db, actor, result.status === 'printed' ? '打印成功' : '打印未完成',
      { orderId, serviceId: order.serviceId, displayCode: order.displayCode, message: result.message });
    return getService(db, order.serviceId);
  });
}

function itemContext(db, itemId) {
  const row = db.prepare(`SELECT oi.*,o.service_id AS serviceId,s.status AS serviceStatus,
    s.display_code AS displayCode,s.last_served_at AS serviceLastServedAt
    FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN services s ON s.id=o.service_id WHERE oi.id=?`).get(itemId);
  if (!row) throw new AppError('菜品不存在', 404);
  return row;
}

export function servePortions(db, itemId, input, actor = '出菜口') {
  return transaction(db, () => {
    const item = itemContext(db, itemId);
    if (item.serviceStatus !== 'open') throw new AppError('此单已完单', 409);
    const pending = item.qty - item.served_qty - item.cancelled_qty;
    const qty = Number(input.qty ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > pending) throw new AppError('上桌数量超过待出份数', 409);
    const stamp = iso();
    const actionId = id();
    db.prepare(`INSERT INTO serve_actions (id,service_id,item_id,qty,at,prev_item_served_at,prev_service_last_served_at)
      VALUES (?,?,?,?,?,?,?)`).run(actionId, item.serviceId, itemId, qty, stamp, item.served_at, item.serviceLastServedAt);
    db.prepare('UPDATE order_items SET served_qty=served_qty+?,served_at=?,rush=0 WHERE id=?').run(qty, stamp, itemId);
    db.prepare('UPDATE services SET last_served_at=? WHERE id=?').run(stamp, item.serviceId);
    log(db, actor, '上桌', { serviceId: item.serviceId, displayCode: item.displayCode, itemId, name: item.name_zh, qty });
    return { actionId, at: stamp, service: getService(db, item.serviceId) };
  });
}

export function undoServe(db, actionId, actor = '出菜口') {
  return transaction(db, () => {
    const action = db.prepare('SELECT * FROM serve_actions WHERE id=?').get(actionId);
    if (!action || action.undone_at) throw new AppError('划单记录不存在', 404);
    if (Date.now() - Date.parse(action.at) > 10000) throw new AppError('已超过 10 秒撤销时限', 409);
    const latest = db.prepare('SELECT id FROM serve_actions WHERE service_id=? AND undone_at IS NULL ORDER BY at DESC,rowid DESC LIMIT 1').get(action.service_id);
    if (latest?.id !== actionId) throw new AppError('只能撤销该单最近一次划单', 409);
    const service = getService(db, action.service_id);
    if (service.status !== 'open') throw new AppError('此单已完单', 409);
    db.prepare('UPDATE order_items SET served_qty=served_qty-?,served_at=? WHERE id=?')
      .run(action.qty, action.prev_item_served_at, action.item_id);
    db.prepare('UPDATE services SET last_served_at=? WHERE id=?')
      .run(action.prev_service_last_served_at, action.service_id);
    db.prepare('UPDATE serve_actions SET undone_at=? WHERE id=?').run(iso(), actionId);
    log(db, actor, '撤销划单', { serviceId: action.service_id, actionId });
    return getService(db, action.service_id);
  });
}

export function cancelPortions(db, itemId, input, actor = '服务员') {
  return transaction(db, () => {
    const item = itemContext(db, itemId);
    if (item.serviceStatus !== 'open') throw new AppError('此单已完单', 409);
    const pending = item.qty - item.served_qty - item.cancelled_qty;
    const qty = Number(input.qty ?? pending);
    if (!Number.isInteger(qty) || qty < 1 || qty > pending) throw new AppError('退菜数量超过待出份数', 409);
    db.prepare("UPDATE order_items SET cancelled_qty=cancelled_qty+?,cancelled_at=?,cancel_reason='',rush=0 WHERE id=?")
      .run(qty, iso(), itemId);
    db.prepare('UPDATE menu_items SET stock=stock+?,updated_at=? WHERE id=? AND stock IS NOT NULL')
      .run(qty, iso(), item.menu_id);
    log(db, actor, '退菜', { serviceId: item.serviceId, displayCode: item.displayCode, itemId, name: item.name_zh, qty });
    return getService(db, item.serviceId);
  });
}

export function rushService(db, serviceId, actor = '服务员') {
  return transaction(db, () => {
    const service = getService(db, serviceId);
    if (service.status !== 'open') throw new AppError('此单已完单', 409);
    const pending = service.orders.flatMap(order => order.items).filter(item => item.pendingQty > 0);
    if (!pending.length) throw new AppError('没有待出的菜');
    for (const item of pending) db.prepare('UPDATE order_items SET rush=1 WHERE id=?').run(item.id);
    log(db, actor, '催菜', { serviceId, displayCode: service.displayCode });
    return getService(db, serviceId);
  });
}

export function completeService(db, serviceId, actor = '出菜口') {
  return transaction(db, () => {
    const service = getService(db, serviceId);
    if (service.status !== 'open') throw new AppError('此单已完单', 409);
    const items = service.orders.flatMap(order => order.items);
    if (!items.length) throw new AppError('没有已下单菜品', 409);
    if (items.some(item => item.pendingQty > 0)) throw new AppError('还有菜未上桌，暂不能完单', 409);
    const stamp = iso();
    db.prepare("UPDATE services SET status='complete',completed_at=? WHERE id=?").run(stamp, serviceId);
    log(db, actor, '完单', { serviceId, displayCode: service.displayCode });
    return getService(db, serviceId);
  });
}

export function closeService(db, serviceId, actor = '服务员') {
  return transaction(db, () => {
    const service = getService(db, serviceId);
    if (service.status !== 'complete') throw new AppError('请先在出菜口完单', 409);
    db.prepare("UPDATE services SET status='closed',closed_at=? WHERE id=?").run(iso(), serviceId);
    log(db, actor, service.kind === 'takeaway' ? '交付打包' : '翻台', { serviceId, displayCode: service.displayCode });
    return getService(db, serviceId);
  });
}

export function saveMenuItem(db, input, actor = '管理员') {
  return transaction(db, () => {
    const menuId = input.id ? String(input.id) : id();
    const code = String(input.code || '').trim().toUpperCase();
    const nameZh = String(input.nameZh || '').trim();
    const nameFr = String(input.nameFr || '').trim();
    const category = String(input.category || '').trim();
    const priceCents = Number(input.priceCents);
    const stock = input.stock === null || input.stock === '' ? null : Number(input.stock);
    const type = input.type;
    const allergens = String(input.allergens || '').trim();
    const aliases = String(input.aliases || '').trim();
    if (!code || code.length > 20 || !nameZh || nameZh.length > 80 || !nameFr || nameFr.length > 120 || !category || category.length > 40) throw new AppError('请完整填写菜品名称、分类和编号');
    if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 1000000) throw new AppError('价格无效');
    if (!['dish', 'drink'].includes(type)) throw new AppError('菜品类型无效');
    if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 100000)) throw new AppError('库存无效');
    if (allergens.length > 200 || aliases.length > 300) throw new AppError('过敏原或搜索词过长');
    const exists = db.prepare('SELECT id FROM menu_items WHERE id=?').get(menuId);
    const duplicate = db.prepare('SELECT id FROM menu_items WHERE code=? AND id<>?').get(code, menuId);
    if (duplicate) throw new AppError('菜品编号已存在', 409);
    if (exists) {
      db.prepare(`UPDATE menu_items SET code=?,name_zh=?,name_fr=?,category=?,price_cents=?,type=?,stock=?,daily_stock=?,
        allergens=?,aliases=?,active=?,updated_at=? WHERE id=?`)
        .run(code, nameZh, nameFr, category, priceCents, type, stock, stock, allergens, aliases, input.active === false ? 0 : 1, iso(), menuId);
    } else {
      db.prepare(`INSERT INTO menu_items (id,code,name_zh,name_fr,category,price_cents,type,stock,daily_stock,
        allergens,aliases,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(menuId, code, nameZh, nameFr, category, priceCents, type, stock, stock, allergens, aliases, input.active === false ? 0 : 1, iso(), iso());
    }
    log(db, actor, exists ? '编辑菜品' : '新增菜品', { menuId, code, nameZh });
    return { id: menuId };
  });
}

export function setStock(db, menuId, input, actor = '管理员') {
  return transaction(db, () => {
    const item = db.prepare('SELECT id,name_zh AS nameZh,stock,stock_before_soldout AS stockBeforeSoldout FROM menu_items WHERE id=?').get(menuId);
    if (!item) throw new AppError('菜品不存在', 404);
    const stock = input.restore === true ? item.stockBeforeSoldout : input.stock === null || input.stock === '' ? null : Number(input.stock);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 100000)) throw new AppError('库存无效');
    const previous = stock === 0 && item.stock !== 0 ? item.stock : item.stockBeforeSoldout;
    db.prepare(`UPDATE menu_items SET stock=?,stock_before_soldout=?,
      daily_stock=CASE WHEN ?=0 THEN daily_stock ELSE ? END,updated_at=? WHERE id=?`)
      .run(stock, previous, stock, stock, iso(), menuId);
    log(db, actor, '更新库存', { menuId, nameZh: item.nameZh, stock });
    return { id: menuId, stock };
  });
}

export function setSettings(db, input, actor = '管理员') {
  return transaction(db, () => {
    for (const key of ['warnMinutes', 'lateMinutes', 'gapMinutes']) {
      if (!(key in input)) continue;
      const value = Number(input[key]);
      if (!Number.isInteger(value) || value < 1 || value > 240) throw new AppError('提醒时间须为 1–240 分钟');
      db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run(key, JSON.stringify(value));
    }
    if ('autoResetStock' in input) {
      if (typeof input.autoResetStock !== 'boolean') throw new AppError('次日重置设置无效');
      db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run('autoResetStock', JSON.stringify(input.autoResetStock));
    }
    if ('noteTags' in input) {
      if (!Array.isArray(input.noteTags) || input.noteTags.length > 12 || input.noteTags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 30)) throw new AppError('快捷备注最多 12 个，每个最多 30 字');
      db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run('noteTags', JSON.stringify(input.noteTags.map(tag => tag.trim())));
    }
    const settings = Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(row => [row.key, JSON.parse(row.value)]));
    if (settings.warnMinutes >= settings.lateMinutes) throw new AppError('超时提醒须晚于预警时间');
    log(db, actor, '修改提醒设置', settings);
    return settings;
  });
}

export function seedDemo(db) {
  if (db.prepare('SELECT count(*) AS n FROM services').get().n > 0) return;
  const byCode = code => db.prepare('SELECT id FROM menu_items WHERE code=?').get(code).id;
  const table1 = createService(db, { kind: 'dine-in', tableId: '1', covers: 3 }, '演示数据');
  const service1 = createOrder(db, table1.id, { clientKey: id(), items: [
    { menuId: byCode('A01'), qty: 2, note: '微辣' },
    { menuId: byCode('A03'), qty: 1, note: '' },
    { menuId: byCode('A08'), qty: 1, note: '' }
  ] }, '演示数据');
  servePortions(db, service1.orders[0].items[2].id, { qty: 1 }, '演示数据');
  const table5 = createService(db, { kind: 'dine-in', tableId: '5', covers: 2 }, '演示数据');
  const service5 = createOrder(db, table5.id, { clientKey: id(), items: [
    { menuId: byCode('A02'), qty: 1, note: '不要葱' }, { menuId: byCode('A12'), qty: 2, note: '' }
  ] }, '演示数据');
  for (const item of service5.orders[0].items) servePortions(db, item.id, { qty: item.qty }, '演示数据');
  completeService(db, service5.id, '演示数据');
  const takeaway = createService(db, { kind: 'takeaway', covers: 1 }, '演示数据');
  createOrder(db, takeaway.id, { clientKey: id(), items: [
    { menuId: byCode('A04'), qty: 1, note: '打包，少油' }, { menuId: byCode('A09'), qty: 1, note: '' }
  ] }, '演示数据');
}
