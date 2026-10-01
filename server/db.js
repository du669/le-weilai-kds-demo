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
      opened_at TEXT NOT NULL, completed_at TEXT, closed_at TEXT, last_served_at TEXT,
      merged_into TEXT REFERENCES services(id)
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
      undone_at TEXT, batch_id TEXT
    );
    CREATE TABLE IF NOT EXISTS item_change_requests (
      id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES services(id),
      item_id TEXT NOT NULL REFERENCES order_items(id),
      kind TEXT NOT NULL CHECK(kind IN ('cancel','change')),
      qty INTEGER NOT NULL CHECK(qty > 0),
      new_menu_id TEXT REFERENCES menu_items(id), new_qty INTEGER,
      note TEXT NOT NULL DEFAULT '', old_name TEXT NOT NULL, new_name TEXT NOT NULL DEFAULT '',
      actor TEXT NOT NULL, created_at TEXT NOT NULL, apply_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied','cancelled')),
      completed_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_pending_change_per_item
      ON item_change_requests(item_id) WHERE status='pending';
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
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
  const serviceColumns = new Set(db.prepare('PRAGMA table_info(services)').all().map(row => row.name));
  if (!serviceColumns.has('merged_into')) db.exec('ALTER TABLE services ADD COLUMN merged_into TEXT REFERENCES services(id)');
  const serveActionColumns = new Set(db.prepare('PRAGMA table_info(serve_actions)').all().map(row => row.name));
  if (!serveActionColumns.has('batch_id')) db.exec('ALTER TABLE serve_actions ADD COLUMN batch_id TEXT');
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
  db.prepare("UPDATE services SET closed_at=COALESCE(completed_at,opened_at) WHERE status='complete' AND closed_at IS NULL").run();
  if (!db.prepare("SELECT 1 FROM pragma_table_info('services') WHERE name='cashed_at'").get()) {
    db.exec('ALTER TABLE services ADD COLUMN cashed_at TEXT');
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
    last_served_at AS lastServedAt,merged_into AS mergedInto FROM services WHERE id=?`).get(serviceId);
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
  service.pendingChanges = db.prepare(`SELECT id,item_id AS itemId,kind,qty,new_qty AS newQty,
    old_name AS oldName,new_name AS newName,actor,created_at AS createdAt,apply_at AS applyAt
    FROM item_change_requests WHERE service_id=? AND status='pending' ORDER BY created_at`).all(serviceId);
  return service;
}

const employeeRows = db => db.prepare(`SELECT id,name,code,active,created_at AS createdAt,updated_at AS updatedAt
  FROM employees ORDER BY active DESC,name COLLATE NOCASE`).all().map(row => ({ ...row, active: !!row.active }));

export function saveEmployee(db, input, pinHash, actor = '管理员') {
  return transaction(db, () => {
    const employeeId = input.id ? String(input.id) : id();
    const name = String(input.name || '').trim();
    const code = String(input.code || '').trim();
    if (!name || name.length > 40) throw new AppError('员工姓名须为 1–40 个字符');
    if (!/^[\p{L}\p{N}_-]{1,20}$/u.test(code)) throw new AppError('员工代号须为 1–20 位字母、数字或短横线');
    const existing = db.prepare('SELECT id FROM employees WHERE id=?').get(employeeId);
    if (!existing && !pinHash) throw new AppError('新员工必须设置 PIN');
    const stamp = iso();
    if (existing) {
      const active = input.active === false || input.active === 'false' || input.active === 0 ? 0 : 1;
      db.prepare(`UPDATE employees SET name=?,code=?,pin_hash=COALESCE(?,pin_hash),active=?,updated_at=? WHERE id=?`)
        .run(name, code, pinHash, active, stamp, employeeId);
    } else {
      db.prepare(`INSERT INTO employees (id,name,code,pin_hash,active,created_at,updated_at)
        VALUES (?,?,?,?,1,?,?)`).run(employeeId, name, code, pinHash, stamp, stamp);
    }
    log(db, actor, existing ? '更新员工' : '新增员工', { employeeId, name, code, active: input.active !== false && input.active !== 'false' && input.active !== 0 });
    return employeeRows(db);
  });
}

export function setEmployeeActive(db, employeeId, active, actor = '管理员') {
  return transaction(db, () => {
    const employee = db.prepare('SELECT id,name,code FROM employees WHERE id=?').get(employeeId);
    if (!employee) throw new AppError('员工不存在', 404);
    db.prepare('UPDATE employees SET active=?,updated_at=? WHERE id=?').run(active ? 1 : 0, iso(), employeeId);
    log(db, actor, active ? '启用员工' : '停用员工', employee);
    return employeeRows(db);
  });
}

export function snapshot(db, includeAdmin = false) {
  const serviceIds = db.prepare(`SELECT id FROM services WHERE closed_at IS NULL ORDER BY opened_at`).all();
  return {
    serverTime: iso(),
    tables: db.prepare('SELECT id,zone,seats,sort_order AS sortOrder FROM dining_tables WHERE active=1 ORDER BY sort_order').all(),
    menu: db.prepare(`SELECT id,code,name_zh AS nameZh,name_fr AS nameFr,category,
      price_cents AS priceCents,type,stock,allergens,aliases,active FROM menu_items ORDER BY code`).all().map(menuRow),
    services: serviceIds.map(row => getService(db, row.id)),
    history: includeAdmin ? db.prepare(`SELECT id,display_code AS displayCode,table_id AS tableId,kind,covers,
      opened_at AS openedAt,completed_at AS completedAt,closed_at AS closedAt,cashed_at AS cashedAt
      FROM services WHERE closed_at IS NOT NULL AND merged_into IS NULL ORDER BY closed_at DESC LIMIT 40`).all() : [],
    events: includeAdmin ? db.prepare('SELECT id,at,actor,action,detail FROM events ORDER BY id DESC LIMIT 80').all()
      .map(row => ({ ...row, detail: JSON.parse(row.detail) })) : [],
    settings: Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(row => [row.key, JSON.parse(row.value)])),
    ...(includeAdmin ? { employees: employeeRows(db) } : {})
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
    if (db.prepare("SELECT id FROM item_change_requests WHERE item_id=? AND status='pending'").get(itemId)) {
      throw new AppError('此菜正在处理改菜或退菜请求，暂不能上桌', 409);
    }
    const pending = item.qty - item.served_qty - item.cancelled_qty;
    const qty = Number(input.qty ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > pending) throw new AppError('上桌数量超过待出份数', 409);
    const stamp = iso();
    const actionId = id();
    db.prepare(`INSERT INTO serve_actions (id,service_id,item_id,qty,at,prev_item_served_at,prev_service_last_served_at)
      VALUES (?,?,?,?,?,?,?)`).run(actionId, item.serviceId, itemId, qty, stamp, item.served_at, item.serviceLastServedAt);
    db.prepare(`UPDATE order_items SET served_qty=served_qty+?,served_at=?,
      rush=CASE WHEN served_qty+?+cancelled_qty>=qty THEN 0 ELSE rush END WHERE id=?`)
      .run(qty, stamp, qty, itemId);
    db.prepare('UPDATE services SET last_served_at=? WHERE id=?').run(stamp, item.serviceId);
    log(db, actor, '上桌', { serviceId: item.serviceId, displayCode: item.displayCode, itemId, name: item.name_zh, qty });
    return { actionId, at: stamp, service: getService(db, item.serviceId) };
  });
}

export function serveAll(db, serviceId, actor = '出菜口') {
  return transaction(db, () => {
    const service = getService(db, serviceId);
    if (service.status !== 'open') throw new AppError('此单已完单', 409);
    if (service.pendingChanges.length) throw new AppError('此单有改菜或退菜请求正在处理，暂不能一键上桌', 409);
    const pending = service.orders.flatMap(order => order.items).filter(item => item.pendingQty > 0);
    if (!pending.length) throw new AppError('没有待上桌菜品');
    const batchId = id();
    const stamp = iso();
    const insert = db.prepare(`INSERT INTO serve_actions
      (id,service_id,item_id,qty,at,prev_item_served_at,prev_service_last_served_at,batch_id)
      VALUES (?,?,?,?,?,?,?,?)`);
    let lastActionId;
    for (const item of pending) {
      lastActionId = id();
      insert.run(lastActionId, serviceId, item.id, item.pendingQty, stamp, item.servedAt, service.lastServedAt, batchId);
      db.prepare('UPDATE order_items SET served_qty=served_qty+?,served_at=?,rush=0 WHERE id=?')
        .run(item.pendingQty, stamp, item.id);
    }
    db.prepare('UPDATE services SET last_served_at=? WHERE id=?').run(stamp, serviceId);
    log(db, actor, '一键上桌', { serviceId, displayCode: service.displayCode,
      items: pending.map(item => ({ name: item.nameZh, qty: item.pendingQty })) });
    return { actionId: lastActionId, batchId, at: stamp, service: getService(db, serviceId) };
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
    const actions = action.batch_id
      ? db.prepare('SELECT * FROM serve_actions WHERE batch_id=? AND undone_at IS NULL ORDER BY rowid DESC').all(action.batch_id)
      : [action];
    for (const served of actions) {
      db.prepare('UPDATE order_items SET served_qty=served_qty-?,served_at=? WHERE id=?')
        .run(served.qty, served.prev_item_served_at, served.item_id);
    }
    db.prepare('UPDATE services SET last_served_at=? WHERE id=?')
      .run(actions.at(-1)?.prev_service_last_served_at ?? action.prev_service_last_served_at, action.service_id);
    const stamp = iso();
    if (action.batch_id) db.prepare('UPDATE serve_actions SET undone_at=? WHERE batch_id=? AND undone_at IS NULL').run(stamp, action.batch_id);
    else db.prepare('UPDATE serve_actions SET undone_at=? WHERE id=?').run(stamp, actionId);
    log(db, actor, action.batch_id ? '撤销一键上桌' : '撤销划单', { serviceId: action.service_id, actionId, batchId: action.batch_id });
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
    if (db.prepare("SELECT id FROM item_change_requests WHERE item_id=? AND status='pending'").get(itemId)) {
      throw new AppError('该菜已有改菜或退菜请求在处理中', 409);
    }
    const requestId = id();
    const createdAt = iso();
    const applyAt = new Date(Date.now() + 10000).toISOString();
    db.prepare(`INSERT INTO item_change_requests
      (id,service_id,item_id,kind,qty,old_name,actor,created_at,apply_at)
      VALUES (?,?,?,'cancel',?,?,?,?,?)`)
      .run(requestId, item.serviceId, itemId, qty, item.name_zh, actor, createdAt, applyAt);
    log(db, actor, '退菜', { requestId, serviceId: item.serviceId, displayCode: item.displayCode, itemId, name: item.name_zh, qty });
    return { ...getService(db, item.serviceId), changeRequestId: requestId, applyAt };
  });
}

export function changeItem(db, itemId, input, actor = '服务员') {
  return transaction(db, () => {
    const item = itemContext(db, itemId);
    if (item.serviceStatus !== 'open') throw new AppError('此单已完单', 409);
    const pending = item.qty - item.served_qty - item.cancelled_qty;
    if (!pending) throw new AppError('没有待出的份数可以修改', 409);
    if (db.prepare("SELECT id FROM item_change_requests WHERE item_id=? AND status='pending'").get(itemId)) {
      throw new AppError('该菜已有改菜或退菜请求在处理中', 409);
    }
    const menu = db.prepare('SELECT * FROM menu_items WHERE id=? AND active=1').get(String(input.menuId || ''));
    if (!menu) throw new AppError('替换菜品已下架，请刷新菜单', 409);
    const qty = Number(input.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 30) throw new AppError('修改后的份数须为 1–30');
    const note = String(input.note || '').trim();
    if (note.length > 300) throw new AppError('备注不能超过 300 字');
    const sameMenu = menu.id === item.menu_id;
    if (sameMenu && qty === pending && note === item.note) throw new AppError('菜品内容没有变化');
    const reserveQty = sameMenu ? Math.max(0, qty - pending) : qty;
    if (menu.stock !== null && reserveQty > menu.stock) throw new AppError(`${menu.name_zh} 库存不足`, 409);
    if (menu.stock !== null && reserveQty > 0) {
      const reserved = db.prepare('UPDATE menu_items SET stock=stock-?,updated_at=? WHERE id=? AND stock>=?')
        .run(reserveQty, iso(), menu.id, reserveQty);
      if (!reserved.changes) throw new AppError(`${menu.name_zh} 库存不足`, 409);
    }
    const requestId = id();
    const createdAt = iso();
    const applyAt = new Date(Date.now() + 10000).toISOString();
    db.prepare(`INSERT INTO item_change_requests
      (id,service_id,item_id,kind,qty,new_menu_id,new_qty,note,old_name,new_name,actor,created_at,apply_at)
      VALUES (?,?,?,'change',?,?,?,?,?,?,?,?,?)`)
      .run(requestId, item.serviceId, itemId, pending, menu.id, qty, note, item.name_zh, menu.name_zh, actor, createdAt, applyAt);
    log(db, actor, '改菜', { requestId, serviceId: item.serviceId, displayCode: item.displayCode,
      itemId, name: item.name_zh, newName: menu.name_zh, qty });
    return { ...getService(db, item.serviceId), changeRequestId: requestId, applyAt };
  });
}

export function applyDueItemChanges(db) {
  const due = db.prepare("SELECT id FROM item_change_requests WHERE status='pending' AND apply_at<=? ORDER BY apply_at")
    .all(iso());
  let applied = 0;
  for (const { id: requestId } of due) {
    transaction(db, () => {
      const request = db.prepare(`SELECT * FROM item_change_requests WHERE id=? AND status='pending'`).get(requestId);
      if (!request) return;
      const item = itemContext(db, request.item_id);
      const pending = item.qty - item.served_qty - item.cancelled_qty;
      if (item.serviceStatus !== 'open' || pending < request.qty) {
        if (request.kind === 'change') {
          const reservedQty = request.new_menu_id === item.menu_id ? Math.max(0, request.new_qty - request.qty) : request.new_qty;
          db.prepare('UPDATE menu_items SET stock=stock+?,updated_at=? WHERE id=? AND stock IS NOT NULL')
            .run(reservedQty, iso(), request.new_menu_id);
        }
        db.prepare("UPDATE item_change_requests SET status='cancelled',completed_at=? WHERE id=?").run(iso(), requestId);
        return;
      }
      const stamp = iso();
      if (request.kind === 'cancel') {
        db.prepare(`UPDATE order_items SET cancelled_qty=cancelled_qty+?,cancelled_at=?,cancel_reason='',
          rush=CASE WHEN served_qty+cancelled_qty+? >= qty THEN 0 ELSE rush END WHERE id=?`)
          .run(request.qty, stamp, request.qty, request.item_id);
        db.prepare('UPDATE menu_items SET stock=stock+?,updated_at=? WHERE id=? AND stock IS NOT NULL')
          .run(request.qty, stamp, item.menu_id);
      } else if (request.new_menu_id === item.menu_id) {
        const refundQty = Math.max(0, pending - request.new_qty);
        db.prepare('UPDATE order_items SET qty=served_qty+cancelled_qty+?,note=?,created_at=?,rush=0 WHERE id=?')
          .run(request.new_qty, request.note, stamp, request.item_id);
        db.prepare('UPDATE menu_items SET stock=stock+?,updated_at=? WHERE id=? AND stock IS NOT NULL')
          .run(refundQty, stamp, item.menu_id);
      } else {
        const replacement = db.prepare('SELECT * FROM menu_items WHERE id=?').get(request.new_menu_id);
        db.prepare("UPDATE order_items SET cancelled_qty=cancelled_qty+?,cancelled_at=?,cancel_reason='',rush=0 WHERE id=?")
          .run(pending, stamp, request.item_id);
        db.prepare('UPDATE menu_items SET stock=stock+?,updated_at=? WHERE id=? AND stock IS NOT NULL')
          .run(pending, stamp, item.menu_id);
        db.prepare(`INSERT INTO order_items
          (id,order_id,menu_id,code,name_zh,name_fr,price_cents,type,allergens,qty,note,added,rush,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,1,0,?)`)
          .run(id(), item.order_id, replacement.id, replacement.code, replacement.name_zh,
            replacement.name_fr, replacement.price_cents, replacement.type, replacement.allergens,
            request.new_qty, request.note, stamp);
      }
      db.prepare("UPDATE item_change_requests SET status='applied',completed_at=? WHERE id=?").run(stamp, requestId);
      log(db, request.actor, request.kind === 'cancel' ? '退菜完成' : '改菜完成', {
        requestId, serviceId: request.service_id, displayCode: item.displayCode,
        itemId: request.item_id, name: request.old_name, newName: request.new_name || undefined,
        qty: request.kind === 'cancel' ? request.qty : request.new_qty
      });
      applied++;
    });
  }
  return applied;
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
    db.prepare("UPDATE services SET status='complete',completed_at=?,closed_at=? WHERE id=?").run(stamp, stamp, serviceId);
    log(db, actor, '完单', { serviceId, displayCode: service.displayCode });
    return getService(db, serviceId);
  });
}

export function moveOrMergeService(db, serviceId, input, actor = '服务员') {
  return transaction(db, () => {
    const source = getService(db, serviceId);
    if (source.kind !== 'dine-in' || source.status !== 'open' || source.closedAt) {
      throw new AppError('只有进行中的堂食桌单可以转桌或并台', 409);
    }
    if (source.pendingChanges.length) throw new AppError('此桌有改菜或退菜请求正在处理，请稍后再转桌或并台', 409);
    const targetTableId = String(input.targetTableId || '');
    if (!targetTableId || targetTableId === source.tableId) throw new AppError('请选择另一张桌');
    const table = db.prepare('SELECT id FROM dining_tables WHERE id=? AND active=1').get(targetTableId);
    if (!table) throw new AppError('目标桌号不存在');
    const target = db.prepare(`SELECT id,display_code AS displayCode,table_id AS tableId,kind,covers,status,
      opened_at AS openedAt,completed_at AS completedAt,closed_at AS closedAt,last_served_at AS lastServedAt
      FROM services WHERE table_id=? AND closed_at IS NULL`).get(targetTableId);
    if (!target) {
      db.prepare('UPDATE services SET table_id=?,display_code=? WHERE id=?').run(targetTableId, targetTableId, serviceId);
      log(db, actor, '转桌', { serviceId, fromDisplayCode: source.displayCode, displayCode: targetTableId });
      return { ...getService(db, serviceId), operation: 'move' };
    }
    if (target.status !== 'open') throw new AppError('目标桌已完单，请选择空桌');
    if (target.id === serviceId) throw new AppError('不能与当前桌并台');
    const destination = getService(db, target.id);
    if (destination.pendingChanges.length) throw new AppError('目标桌有改菜或退菜请求正在处理，请稍后再并台', 409);
    if (source.covers + destination.covers > 30) throw new AppError('并台后人数不能超过 30 人');
    const stamp = iso();
    db.prepare('UPDATE orders SET service_id=? WHERE service_id=?').run(destination.id, source.id);
    db.prepare('UPDATE serve_actions SET service_id=? WHERE service_id=?').run(destination.id, source.id);
    const lastServedAt = [source.lastServedAt, destination.lastServedAt].filter(Boolean)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
    db.prepare('UPDATE services SET covers=?,last_served_at=? WHERE id=?')
      .run(source.covers + destination.covers, lastServedAt, destination.id);
    db.prepare("UPDATE services SET status='closed',closed_at=?,merged_into=? WHERE id=?")
      .run(stamp, destination.id, source.id);
    log(db, actor, '并台', { serviceId: destination.id, sourceServiceId: source.id,
      fromDisplayCode: source.displayCode, displayCode: destination.displayCode });
    return { ...getService(db, destination.id), operation: 'merge' };
  });
}

export function reopenService(db, serviceId, actor = '出菜口') {
  return transaction(db, () => {
    const row = db.prepare(`SELECT id,display_code AS displayCode,table_id AS tableId,status,
      merged_into AS mergedInto FROM services WHERE id=?`).get(String(serviceId));
    if (!row) throw new AppError('服务单不存在', 404);
    if (row.mergedInto) throw new AppError('此单已并台，不能撤销', 409);
    if (row.status !== 'complete') throw new AppError('只有已完单的服务单可以撤销', 409);
    if (row.tableId) {
      const busy = db.prepare('SELECT id FROM services WHERE table_id=? AND closed_at IS NULL').get(row.tableId);
      if (busy) throw new AppError('该桌已经重新开台，请在新的服务单上加菜', 409);
    }
    db.prepare("UPDATE services SET status='open',completed_at=NULL,closed_at=NULL,cashed_at=NULL WHERE id=?").run(row.id);
    log(db, actor, '撤销完单', { serviceId: row.id, displayCode: row.displayCode });
    return getService(db, row.id);
  });
}

export function markCashed(db, serviceId, cashed, actor = '员工') {
  return transaction(db, () => {
    const row = db.prepare('SELECT id,display_code AS displayCode,closed_at AS closedAt FROM services WHERE id=?').get(String(serviceId));
    if (!row) throw new AppError('服务单不存在', 404);
    if (!row.closedAt) throw new AppError('服务单还没完单', 400);
    const stamp = cashed ? iso() : null;
    db.prepare('UPDATE services SET cashed_at=? WHERE id=?').run(stamp, row.id);
    log(db, actor, cashed ? '标记已结账' : '取消已结账', { serviceId: row.id, displayCode: row.displayCode });
    return { id: row.id, cashedAt: stamp };
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
