const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');
const printRoot = document.getElementById('print-root');
const parisClockRoot = document.getElementById('paris-clock-root');

let state = null;
let auth = null;
let connected = true;
let stream = null;
let view = ['kitchen', 'expo', 'admin'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'tables';
let activeId = null;
let adminTab = 'overview';
let lang = localStorage.getItem('lw_order_language') || 'zh';
let query = '';
let category = '全部';
let basket = [];
let draftKey = crypto.randomUUID();
let sortMode = 'time';
let undo = null;
let lastReceipt = null;
let kitchenWakeLock = null;

const words = {
  '点单': 'Commande', '后厨': 'Cuisine', '出菜口': 'Passe', '后台': 'Gestion',
  '桌位点单': 'Commande par table', '选择桌位': 'Choisir une table',
  '选择桌位开始点单，也可从单独入口创建打包单。': 'Choisissez une table ou créez une commande à emporter.',
  '室内': 'Salle', '露台': 'Terrasse', '空桌': 'Libre', '点单中': 'En cours',
  '待上桌': 'À servir', '已上桌': 'Servi', '已退菜': 'Annulé',
  '桌号': 'Table', '人数': 'Couverts', '人': 'pers.', '份': 'portion(s)',
  '单独打包入口': 'Nouvelle commande à emporter', '打包单': 'Commandes à emporter',
  '暂无打包单': 'Aucune commande à emporter', '返回桌位': 'Retour aux tables',
  '正在点单': 'Commande en cours', '已完单': 'Commande terminée',
  '本桌全部点单': 'Toute la commande', '未上桌': 'À servir',
  '全部': 'Tout', '热菜': 'Plats chauds', '凉菜': 'Entrées froides',
  '主食': 'Riz et nouilles', '汤品': 'Soupes', '饮料酒水': 'Boissons',
  '菜品': 'Plats', '沽清': 'Épuisé', '剩余': 'Reste',
  '搜索中文、法文、编号或拼音': 'Rechercher nom, code ou initiales',
  '点单篮': 'Commande', '暂无菜品': 'Aucun plat', '备注': 'Remarque',
  '例如：少辣、过敏原': 'Ex. : peu épicé, allergie', '清空': 'Vider',
  '确认下单': 'Confirmer', '合计': 'Total', '催菜': 'Relancer',
  '退菜': 'Annuler un plat', '取消开单': 'Annuler l’ouverture',
  '小票': 'Ticket', '查看历史': 'Voir l’historique', '加菜': 'Ajouter des plats',
  '新单': 'Nouvelle commande', '订单已锁定': 'Commande verrouillée',
  '库存由服务器核对，多台设备会同步。': 'Le stock est vérifié sur le serveur et synchronisé entre appareils.',
  '后台管理': 'Gestion', '菜单、库存、历史记录和系统提醒。': 'Menu, stock, historique et alertes.',
  '营业概览': 'Vue du service', '菜单': 'Menu', '库存 / 沽清': 'Stock / Rupture',
  '历史服务单': 'Historique', '操作日志': 'Journal', '设置': 'Réglages',
  '进行中服务单': 'Services en cours', '含打包单': 'Emporté inclus',
  '待上桌份数': 'Portions à servir', '菜品及饮品': 'Plats et boissons',
  '沽清菜品': 'Plats épuisés', '库存为 0': 'Stock à zéro',
  '当前服务单': 'Services ouverts', '打包': 'À emporter', '堂食': 'Sur place',
  '查看': 'Voir', '菜单管理': 'Gestion du menu', '新增菜品': 'Ajouter un plat',
  '已下架': 'Retiré', '编辑': 'Modifier', '库存与沽清': 'Stocks et ruptures',
  '留空代表不限量；0 为沽清': 'Vide = illimité ; 0 = épuisé',
  '不限量': 'Illimité', '已沽清': 'Épuisé', '保存': 'Enregistrer',
  '恢复': 'Remettre en vente', '最近 40 张已结束服务单': '40 derniers services clos',
  '查看菜品': 'Voir les plats', '最近 80 条操作': '80 dernières actions',
  '后厨与出菜口提醒': 'Alertes cuisine et passe', '预警（分钟）': 'Préalerte (min)',
  '超时（分钟）': 'Retard (min)', '上道出菜后断档（分钟）': 'Depuis le dernier plat (min)',
  '常用备注标签（用逗号分开）': 'Remarques rapides (séparées par virgules)',
  '次日营业自动恢复手动设定的库存': 'Réinitialiser le stock chaque jour',
  '保存设置': 'Enregistrer', '已配置自动打印': 'Impression automatique configurée',
  '未配置；点单后可使用浏览器打印': 'Non configurée ; utiliser l’impression du navigateur',
  '编辑菜品': 'Modifier un plat', '名称、价格、分类与库存': 'Noms, prix, catégorie et stock',
  '编号': 'Code', '分类': 'Catégorie', '中文名': 'Nom chinois',
  '法语名': 'Nom français', '价格 (€)': 'Prix (€)', '类型': 'Type',
  '菜品 · 后厨和出菜口': 'Plat · Cuisine et passe',
  '饮品 · 只到出菜口': 'Boisson · Passe uniquement',
  '库存（留空为不限量）': 'Stock (vide = illimité)',
  '过敏原': 'Allergènes', '搜索别名 / 拼音': 'Alias / pinyin',
  '上架': 'En vente', '保存菜品': 'Enregistrer le plat'
};
const t = text => lang === 'fr' ? words[text] || text : text;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const euro = cents => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100);
const clock = value => value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
const dateTime = value => value ? new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const parisTimeFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const parisClockWidget = () => `<div id="paris-clock" class="paris-clock" role="group" tabindex="0" aria-label="巴黎当前时间，可拖动移动" title="拖动调整时钟位置"><span class="paris-clock-grip" aria-hidden="true"><i></i><i></i><i></i></span><span class="paris-clock-indicator" aria-hidden="true"></span><span class="paris-clock-label"><b>PARIS</b><small>FRANCE</small></span><time class="paris-clock-time" data-paris-time>${parisTimeFormatter.format(new Date())}</time></div>`;

parisClockRoot.innerHTML = parisClockWidget();
const parisClockElement = parisClockRoot.querySelector('.paris-clock');
const parisClockPositionKey = 'lw-paris-clock-position';
let parisClockDrag = null;

function placeParisClock(left, top, persist = false) {
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - parisClockRoot.offsetWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - parisClockRoot.offsetHeight - margin);
  const position = {
    left: Math.min(maxLeft, Math.max(margin, left)),
    top: Math.min(maxTop, Math.max(margin, top))
  };
  parisClockRoot.style.left = `${position.left}px`;
  parisClockRoot.style.top = `${position.top}px`;
  parisClockRoot.style.right = 'auto';
  if (persist) {
    try { localStorage.setItem(parisClockPositionKey, JSON.stringify(position)); } catch {}
  }
}

try {
  const savedPosition = JSON.parse(localStorage.getItem(parisClockPositionKey));
  if (Number.isFinite(savedPosition?.left) && Number.isFinite(savedPosition?.top)) {
    placeParisClock(savedPosition.left, savedPosition.top);
  }
} catch {}

parisClockElement.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const rect = parisClockRoot.getBoundingClientRect();
  parisClockDrag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
  parisClockElement.classList.add('dragging');
  parisClockElement.setPointerCapture(event.pointerId);
  event.preventDefault();
});
parisClockElement.addEventListener('pointermove', event => {
  if (!parisClockDrag || parisClockDrag.pointerId !== event.pointerId) return;
  placeParisClock(event.clientX - parisClockDrag.offsetX, event.clientY - parisClockDrag.offsetY);
});
function finishParisClockDrag(event) {
  if (!parisClockDrag || (event && parisClockDrag.pointerId !== event.pointerId)) return;
  parisClockDrag = null;
  parisClockElement.classList.remove('dragging');
  const rect = parisClockRoot.getBoundingClientRect();
  placeParisClock(rect.left, rect.top, true);
}
parisClockElement.addEventListener('pointerup', finishParisClockDrag);
parisClockElement.addEventListener('pointercancel', finishParisClockDrag);
parisClockElement.addEventListener('keydown', event => {
  const step = event.shiftKey ? 24 : 8;
  const movement = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
  if (!movement) return;
  event.preventDefault();
  const rect = parisClockRoot.getBoundingClientRect();
  placeParisClock(rect.left + movement[0], rect.top + movement[1], true);
});
window.addEventListener('resize', () => {
  if (parisClockRoot.style.left) {
    const rect = parisClockRoot.getBoundingClientRect();
    placeParisClock(rect.left, rect.top, true);
  }
});
const minutes = value => Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60000));
const allItems = service => service.orders.flatMap(order => order.items);
const pendingItems = service => allItems(service).filter(item => item.pendingQty > 0);
const serviceForTable = tableId => state.services.find(service => service.tableId === tableId);
const activeService = () => state?.services.find(service => service.id === activeId);
const menuItem = menuId => state.menu.find(item => item.id === menuId);
const count = items => items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
const displayName = item => lang === 'fr' ? item.nameFr : item.nameZh;
const serviceKind = service => service.kind === 'takeaway' ? t('打包单') : `${t('桌号')} ${service.displayCode}`;
const serviceRows = service => service.orders.flatMap(order => order.items.map(item => ({ ...item, orderId: order.id })));

async function api(path, options = {}) {
  const response = await fetch(new URL(path.replace(/^\/+/, ''), document.baseURI), {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || `请求失败 (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return result;
}

async function mutate(path, body = {}, method = 'POST') {
  try {
    const result = await api(path, { method, body });
    await loadState();
    return result;
  } catch (error) {
    if (error.status === 401) { auth = { pinRequired: true, authorized: false }; render(); }
    if (!error.status) { connected = false; syncIndicator(); }
    toast(error.status ? error.message : '服务器连接中断，订单未确认。请保持当前页面并重试。', true);
    return null;
  }
}

async function loadState() {
  try {
    const next = await api('/api/state');
    const unchanged = state?.revision === next.revision;
    if (!unchanged && state) alertForChanges(state, next);
    state = next;
    connected = true;
    if (unchanged) syncIndicator(); else render();
  } catch (error) {
    connected = false;
    if (error.status === 401) auth = { pinRequired: true, authorized: false };
    render();
  }
}

function beep(frequency = 760, duration = .15, gainValue = .04) {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.value = gainValue;
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + duration);
    oscillator.onended = () => context.close();
  } catch { /* The device may block audio before user interaction. */ }
}

function alertForChanges(previous, next) {
  if (!['kitchen', 'expo'].includes(view)) return;
  const oldItems = new Map(previous.services.flatMap(service => allItems(service).map(item => [item.id, item])));
  const incoming = next.services.flatMap(service => allItems(service))
    .filter(item => item.pendingQty > 0 && (view === 'expo' || item.type === 'dish') && !oldItems.has(item.id));
  const cancellations = next.services.flatMap(service => allItems(service))
    .filter(item => item.cancelledAt && item.cancelledAt !== oldItems.get(item.id)?.cancelledAt);
  if (cancellations.length) { beep(410, .23, .08); setTimeout(() => beep(330, .28, .08), 270); }
  else if (incoming.length) { beep(760, .14); setTimeout(() => beep(960, .14), 180); }
}

function connectEvents() {
  stream?.close();
  stream = new EventSource(new URL('api/events', document.baseURI));
  stream.addEventListener('change', event => {
    if (!state || Number(event.data) !== state.revision) loadState();
  });
  stream.onerror = () => { connected = false; syncIndicator(); };
  stream.onopen = () => { connected = true; syncIndicator(); };
}

function toast(message, error = false) {
  const div = document.createElement('div');
  div.className = `toast${error ? ' error' : ''}`;
  div.textContent = message;
  toastRoot.append(div);
  setTimeout(() => div.remove(), 3500);
}

function syncIndicator() {
  const indicator = document.getElementById('sync-indicator');
  if (!indicator) return;
  indicator.classList.toggle('offline', !connected);
  indicator.querySelector('span').textContent = connected ? '服务器已连接' : '连接中断';
  document.getElementById('connection-banner')?.classList.toggle('visible', !connected);
}

function showModal(title, subtitle, body, actions = '') {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><button class="modal-close" data-action="close-modal" aria-label="关闭">✕</button></div>${body}${actions}</section></div>`;
  modalRoot.querySelector('input:not([type="hidden"]),textarea,button')?.focus();
}
function closeModal() { modalRoot.innerHTML = ''; }
const modalActions = (confirmLabel, cancelLabel = '取消') => `<div class="modal-actions"><button class="btn" type="button" data-action="close-modal">${cancelLabel}</button><button class="btn primary" type="submit">${confirmLabel}</button></div>`;

function render() {
  if (document.fullscreenElement?.id === 'kitchen-screen' && state && view === 'kitchen') {
    document.querySelector('#kitchen-screen .kitchen-list').innerHTML = renderKitchenCards();
    return;
  }
  if (!auth) { app.innerHTML = '<div class="loading">正在连接餐厅服务…</div>'; return; }
  if (!auth.authorized) { app.innerHTML = renderLogin(); return; }
  if (!state) { app.innerHTML = '<div class="loading">正在读取订单…</div>'; return; }
  const y = window.scrollY;
  const tabs = [['tables', '点单'], ['kitchen', '后厨'], ['expo', '出菜口'], ['admin', '后台']];
  const navText = (key, label) => view === 'kitchen' ? label
    : view === 'expo' ? ({ tables: '点单 / Commandes', kitchen: '后厨 / Cuisine', expo: '出菜口 / Passe', admin: '后台 / Gestion' })[key]
    : t(label);
  const connectionText = view === 'expo' ? (connected ? '服务器已连接 / Connecté' : '连接中断 / Déconnecté') : (connected ? '服务器已连接' : '连接中断');
  const brandCaption = view === 'kitchen' ? '后厨看单' : view === 'expo' ? '餐厅服务 / Service' : 'SERVICE SYSTEM';
  app.innerHTML = `<div class="app-shell"><div id="connection-banner" class="connection-banner ${connected ? '' : 'visible'}">${view === 'kitchen' ? '与服务器断开连接，请检查网络。' : '与服务器断开连接。订单未确认发送时，请保持当前页面并重试。 / Connexion interrompue.'}</div><header class="topbar"><div class="brand"><div class="brand-mark">LW</div><div><b>Le Weilai</b><small>${brandCaption}</small></div></div><nav class="nav" aria-label="主导航">${tabs.map(([key, label]) => `<button class="${view === key || (view === 'order' && key === 'tables') ? 'active' : ''}" data-action="nav" data-view="${key}">${navText(key, label)}</button>`).join('')}</nav><div class="top-actions"><div id="sync-indicator" class="sync-state ${connected ? '' : 'offline'}"><i></i><span>${connectionText}</span></div>${['tables', 'order', 'admin'].includes(view) ? `<button class="btn small" data-action="language">${lang === 'zh' ? '中文 / FR' : 'FR / 中文'}</button>` : ''}${auth.pinRequired ? `<button class="btn small ghost" data-action="logout">${view === 'expo' ? '退出 / Quitter' : '退出'}</button>` : ''}</div></header><main class="container">${view === 'tables' ? renderTables() : view === 'order' ? renderOrder() : view === 'kitchen' ? renderKitchen() : view === 'expo' ? renderExpo() : renderAdmin()}</main></div>`;
  window.scrollTo(0, y);
  updateClocks();
}

function renderLogin() {
  return `<div class="login-shell"><form class="login-card" data-form="login"><div class="brand-mark">LW</div><h1>Le Weilai</h1><p>请输入员工或管理员 PIN，连接餐厅服务。</p><div class="field"><label for="pin">PIN</label><input class="field-input" id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required autofocus></div><button class="btn primary big" style="width:100%;margin-top:12px">进入系统</button></form></div>`;
}

function pageHead(title, description, actions = '', eyebrow = 'LE WEILAI / SERVICE') {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>`;
}

function tableTone(service) {
  if (!service) return '';
  if (service.status === 'complete') return 'complete';
  const rows = pendingItems(service);
  if (!rows.length) return 'open';
  const max = Math.max(...rows.map(item => minutes(item.createdAt)));
  return max >= state.settings.lateMinutes ? 'late' : max >= state.settings.warnMinutes ? 'overdue' : 'open';
}

function renderTables() {
  const occupied = state.services.filter(s => s.kind === 'dine-in');
  const waiting = state.services.reduce((sum, service) => sum + pendingItems(service).reduce((n, item) => n + item.pendingQty, 0), 0);
  const tableTile = table => {
    const service = serviceForTable(table.id);
    const pending = service ? pendingItems(service).reduce((sum, item) => sum + item.pendingQty, 0) : 0;
    const status = service ? t('点单中') : t('空桌');
    return `<button class="table-card ${tableTone(service)}" data-action="table" data-id="${esc(table.id)}"><div class="table-top"><div><span class="minor">${t('桌号')}</span><div class="table-num">${esc(table.id)}</div></div><span class="badge ${service ? 'amber' : ''}">${status}</span></div><div class="table-bottom"><strong>${service ? service.covers : 0} ${t('人')}</strong><span>${service ? `${pending} ${t('待上桌')}` : t(table.zone)}</span></div></button>`;
  };
  const groups = ['室内', '露台'].map(zone => `<div class="zone-label">${t(zone)}</div><div class="table-grid">${state.tables.filter(table => table.zone === zone).map(tableTile).join('')}</div>`).join('');
  const takeaways = state.services.filter(s => s.kind === 'takeaway').reverse();
  return `${pageHead(t('选择桌位'), t('选择桌位开始点单，也可从单独入口创建打包单。'))}<div class="split-layout"><section class="panel pad">${groups}</section><aside class="panel pad sticky"><button class="takeaway-entry" data-action="new-takeaway">＋ ${t('单独打包入口')}</button><div class="panel-head"><h2>${t('打包单')}</h2><span class="badge blue">${takeaways.length}</span></div>${takeaways.length ? takeaways.map(service => `<div class="list-row"><div><b>${esc(service.displayCode)}</b><small>${clock(service.openedAt)} · ${service.status === 'complete' ? t('已完单') : pendingItems(service).length + ' ' + t('待上桌')}</small></div><button class="btn small" data-action="open-service" data-id="${service.id}">打开</button></div>`).join('') : `<div class="empty">${t('暂无打包单')}</div>`}<div class="list-row"><span>${t('点单中')}</span><strong>${occupied.filter(s => s.status === 'open').length}</strong></div><div class="list-row"><span>${t('待上桌')}</span><strong>${waiting} ${t('份')}</strong></div><p class="hint">${t('库存由服务器核对，多台设备会同步。')}</p></aside></div>`;
}

function orderLine(item, service) {
  const pending = item.pendingQty;
  const status = pending ? `<span class="badge amber">${t('待上桌')} ${pending}</span>` : item.servedQty ? `<span class="badge green">${t('已上桌')} ${item.servedQty}</span>` : `<span class="badge red">${t('已退菜')}</span>`;
  return `<div class="ordered-line"><div><div class="line-main">${esc(displayName(item))} × ${item.qty} ${status}</div><div class="line-sub">${esc(item.note || '')}${item.cancelledQty ? ` · ${t('已退菜')} ${item.cancelledQty}` : ''} · ${clock(item.createdAt)}</div></div>${pending && service.status === 'open' ? `<button class="btn small danger" data-action="cancel-item" data-id="${item.id}">${t('退菜')}</button>` : ''}</div>`;
}

function renderOrder() {
  const service = activeService();
  if (!service) { view = 'tables'; return renderTables(); }
  const rows = serviceRows(service);
  const latestOrder = service.orders.at(-1);
  const pending = pendingItems(service);
  const isOpen = service.status === 'open';
  const total = basket.reduce((sum, line) => sum + (menuItem(line.menuId)?.priceCents || 0) * line.qty, 0);
  const ordered = rows.length ? `<div class="order-items">${rows.map(item => orderLine(item, service)).join('')}</div>` : `<div class="empty">${t('暂无菜品')}</div>`;
  const headline = `<div class="service-headline"><strong>${esc(serviceKind(service))}</strong><span class="badge ${isOpen ? 'amber' : 'green'}">${isOpen ? t('正在点单') : t('已完单')}</span><small>${service.covers} ${t('人')} · ${clock(service.openedAt)}</small></div>`;
  const statusPanel = `<section class="panel order-status">${headline}<div class="panel-head" style="margin:16px 0 0"><h2>${t('本桌全部点单')}</h2><div class="row-actions">${pending.length && isOpen ? `<button class="btn small warn" data-action="rush">${t('催菜')}</button>` : ''}${!rows.length && isOpen ? `<button class="btn small danger" data-action="discard">${t('取消开单')}</button>` : ''}${rows.length ? `<button class="btn small" data-action="receipt-latest">${t('小票')}</button>` : ''}${state.printer?.configured && latestOrder ? `<button class="btn small" data-action="epson-reprint" data-id="${latestOrder.id}">Epson 重打</button>` : ''}</div></div>${ordered}${service.status === 'complete' ? '<p class="hint">服务单已结束，桌位已自动释放。</p>' : ''}</section>`;
  const actions = `<button class="btn" data-action="nav" data-view="tables">← ${t('返回桌位')}</button>`;
  if (!isOpen) return `${pageHead(t('桌位点单'), '', actions)}${statusPanel}`;
  const categories = ['全部', ...new Set(state.menu.filter(m => m.active).map(m => m.category))];
  const basketHtml = basket.length ? basket.map(line => {
    const item = menuItem(line.menuId); if (!item) return '';
    return `<div class="basket-row"><div class="basket-row-top"><span>${esc(displayName(item))}</span><span>${euro(item.priceCents * line.qty)}</span></div><div class="quantity"><button data-action="quantity" data-id="${item.id}" data-delta="-1">−</button><strong>${line.qty}</strong><button data-action="quantity" data-id="${item.id}" data-delta="1">＋</button><span class="minor">${esc(item.code)}</span></div><div class="quick-tags">${(state.settings.noteTags || []).map(tag => `<button class="quick-tag ${(line.tags || []).includes(tag) ? 'active' : ''}" data-action="quick-tag" data-id="${item.id}" data-tag="${esc(tag)}">${esc(tag)}</button>`).join('')}</div><input class="field-input" data-note="${item.id}" value="${esc(line.note)}" placeholder="${t('例如：少辣、过敏原')}" aria-label="${t('备注')} ${esc(item.nameZh)}"></div>`;
  }).join('') : `<div class="empty">${t('暂无菜品')}</div>`;
  return `${pageHead(t('桌位点单'), `${service.kind === 'takeaway' ? t('打包单') : t('桌号')} · ${esc(service.displayCode)}`, actions)}${statusPanel}<div class="order-columns"><section class="panel pad"><div class="toolbar"><input class="search" id="menu-query" placeholder="${t('搜索中文、法文、编号或拼音')}" value="${esc(query)}"></div><div class="categories">${categories.map(c => `<button class="category ${category === c ? 'active' : ''}" data-action="category" data-value="${esc(c)}">${t(c)}</button>`).join('')}</div><div class="menu-grid" id="menu-grid">${renderMenu()}</div></section><aside class="panel basket sticky"><div class="panel-head"><h2>${t('点单篮')}</h2><span class="badge green">${count(basket)} ${t('份')}</span></div>${basketHtml}<div class="total"><span>${t('合计')}</span><b>${euro(total)}</b></div><div class="basket-actions"><button class="btn primary big" data-action="review-order" ${basket.length ? '' : 'disabled'}>${t('确认下单')} →</button><button class="btn" data-action="clear-basket" ${basket.length ? '' : 'disabled'}>${t('清空')}</button></div><p class="hint">${rows.length ? t('加菜') : t('新单')} · ${t('库存由服务器核对，多台设备会同步。')}</p></aside></div>`;
}

function renderMenu() {
  const term = query.trim().toLocaleLowerCase();
  const items = state.menu.filter(item => item.active && (category === '全部' || item.category === category))
    .filter(item => !term || `${item.nameZh} ${item.nameFr} ${item.code} ${item.aliases}`.toLocaleLowerCase().includes(term));
  if (!items.length) return '<div class="empty" style="grid-column:1/-1">未找到菜品 / Aucun plat</div>';
  return items.map(item => {
    const sold = item.stock === 0;
    const inBasket = basket.find(line => line.menuId === item.id)?.qty || 0;
    return `<article class="menu-card ${sold ? 'soldout' : ''}"><div><div class="menu-name">${esc(displayName(item))}</div><div class="menu-fr">${esc(lang === 'fr' ? item.nameZh : item.nameFr)}</div></div><div class="menu-card-bottom"><div><div class="price">${euro(item.priceCents)}</div><div class="menu-fr">${esc(item.code)} · ${t(item.category)}${item.allergens ? ` · ${esc(item.allergens)}` : ''}</div>${item.stock !== null ? `<div class="menu-fr">${sold ? t('沽清') : `${t('剩余')} ${item.stock}`}</div>` : ''}</div><button class="add-button" data-action="add-item" data-id="${item.id}" ${sold ? 'disabled' : ''} aria-label="添加 ${esc(item.nameZh)}">${sold ? '×' : inBasket ? `+${inBasket}` : '+'}</button></div></article>`;
  }).join('');
}

function kitchenServices() {
  const services = state.services.filter(service => {
    return allItems(service).some(item => item.type === 'dish' && (item.pendingQty > 0 || item.servedQty > 0 || item.cancelledQty > 0));
  });
  return services.sort((a, b) => sortMode === 'table'
    ? a.displayCode.localeCompare(b.displayCode, undefined, { numeric: true })
    : Date.parse(a.openedAt) - Date.parse(b.openedAt));
}

function renderKitchenCards() {
  const services = kitchenServices();
  if (!services.length) return '<div class="empty" style="grid-column:1/-1;padding:65px 20px"><strong>暂无待做菜品</strong><br>新订单会自动出现在这里</div>';
  return services.map(service => {
    const items = allItems(service).filter(item => item.type === 'dish');
    const pending = items.filter(item => item.pendingQty > 0);
    const oldestPending = pending.length ? Math.max(...pending.map(item => minutes(item.createdAt))) : null;
    const tone = oldestPending === null ? '' : oldestPending >= state.settings.lateMinutes ? 'late' : oldestPending >= state.settings.warnMinutes ? 'overdue' : '';
    const heading = service.kind === 'takeaway' ? service.displayCode : `桌号：${service.displayCode}`;
    const gap = service.lastServedAt ? minutes(service.lastServedAt) : null;
    const lines = items.flatMap(item => {
      const itemLines = [];
      if (item.pendingQty > 0) {
        const allergy = item.allergens && /过敏|allerg/i.test(item.note);
        const age = minutes(item.createdAt);
        const ageBadge = age >= state.settings.lateMinutes ? 'red' : age >= state.settings.warnMinutes ? 'amber' : '';
        itemLines.push(`<div class="kitchen-line"><div class="kitchen-dish"><span>${esc(item.nameZh)}</span><span>×${item.pendingQty}</span></div><div class="kitchen-line-meta">${item.added ? '<span class="badge green">加菜</span>' : ''}${item.rush ? '<span class="badge red">催菜</span>' : ''}${allergy ? '<span class="badge red">⚠ 过敏提醒</span>' : ''}<span class="badge ${ageBadge}" data-minutes="${esc(item.createdAt)}">${age} 分钟</span></div>${item.note ? `<div class="kitchen-note">${allergy ? '⚠ ' : ''}${esc(item.note)}</div>` : ''}</div>`);
      }
      if (item.servedQty > 0) itemLines.push(`<div class="kitchen-line"><div class="kitchen-dish"><span>${esc(item.nameZh)}</span><span class="kitchen-dish-status">×${item.servedQty}<span class="badge green">已上桌</span></span></div></div>`);
      if (item.cancelledQty > 0) itemLines.push(`<div class="kitchen-line"><div class="kitchen-dish"><span>${esc(item.nameZh)}</span><span class="kitchen-dish-status">×${item.cancelledQty}<span class="badge red">退</span></span></div></div>`);
      return itemLines;
    }).join('');
    const cardState = oldestPending !== null ? `<b>${oldestPending} 分钟</b>` : items.some(item => item.servedQty > 0) ? '<b>已上齐</b>' : '<b>退菜记录</b>';
    return `<article class="kitchen-card ${tone}"><div class="kitchen-card-head"><div><div class="kitchen-code">${esc(heading)}</div><span class="minor">${service.covers} 人 · 下单 ${clock(service.openedAt)}</span>${gap !== null && gap >= state.settings.gapMinutes && oldestPending !== null ? '<br><span class="badge amber">出菜断档</span>' : ''}</div><div class="kitchen-meta">${cardState}${gap !== null && oldestPending !== null ? `<br>上道出菜后 ${gap} 分钟` : ''}</div></div><div class="kitchen-lines">${lines}</div></article>`;
  }).join('');
}

function renderKitchen() {
  const totals = new Map();
  for (const service of state.services.filter(s => s.status === 'open')) {
    for (const item of allItems(service).filter(i => i.type === 'dish' && i.pendingQty > 0)) {
      const row = totals.get(item.menuId) || { name: item.nameZh, qty: 0, places: [] };
      row.qty += item.pendingQty; row.places.push(`${service.displayCode} ×${item.pendingQty}`);
      totals.set(item.menuId, row);
    }
  }
  const aggregate = [...totals.values()].sort((a, b) => b.qty - a.qty).map(row => `<div class="aggregate-row"><b><span>${esc(row.name)}</span><span>×${row.qty}</span></b><small>${esc(row.places.join(' · '))}</small></div>`).join('');
  return `${pageHead('后厨看单', '出菜口标记后显示已上桌状态；退菜标记为退，完单后自动移除。', `<div class="kitchen-tools"><select class="field-input" data-change="sort"><option value="time" ${sortMode === 'time' ? 'selected' : ''}>按下单时间</option><option value="table" ${sortMode === 'table' ? 'selected' : ''}>按桌号</option></select><button class="btn primary" data-action="fullscreen">⛶ 全屏显示</button></div>`, '后厨')}<div class="kitchen-layout"><div id="kitchen-screen"><div class="kitchen-list">${renderKitchenCards()}</div></div><aside class="panel kitchen-aggregate sticky"><div class="panel-head"><h2>同菜汇总</h2><span class="badge green">${[...totals.values()].reduce((sum, row) => sum + row.qty, 0)} 份</span></div>${aggregate || '<div class="minor">暂无待做菜品</div>'}</aside></div>`;
}

function expoServiceCard(service) {
  const rows = serviceRows(service);
  const pending = pendingItems(service).reduce((sum, item) => sum + item.pendingQty, 0);
  const served = rows.reduce((sum, item) => sum + item.servedQty, 0);
  const age = pending ? Math.max(...rows.filter(item => item.pendingQty).map(item => minutes(item.createdAt))) : 0;
  const tone = age >= state.settings.lateMinutes ? 'late' : age >= state.settings.warnMinutes ? 'overdue' : '';
  const tableZh = service.kind === 'takeaway' ? service.displayCode : `桌号：${service.displayCode}`;
  const tableFr = service.kind === 'takeaway' ? `À emporter ${service.displayCode.replace(/\D/g, '')}` : `Table ${service.displayCode}`;
  const renderRow = item => `<div class="expo-line ${item.type === 'drink' ? 'drink' : ''}"><div><div class="expo-name">${esc(item.nameZh)} ×${item.qty}</div><div class="expo-fr">${esc(item.nameFr)}</div><div class="expo-qty">${item.type === 'drink' ? '饮品 / Boisson · ' : ''}已上桌 / Servi ${item.servedQty} · 待出 / À servir ${item.pendingQty}${item.cancelledQty ? ` · 退菜 / Annulé ${item.cancelledQty}` : ''}</div>${item.pendingQty ? `<div class="expo-qty" data-expo-minutes="${esc(item.createdAt)}">等待 / Attente ${minutes(item.createdAt)} min</div>` : ''}${item.note ? `<div class="expo-note">${esc(item.note)}</div>` : ''}${item.added ? '<span class="badge green">加菜 / Ajout</span>' : ''}${item.rush ? '<span class="badge red">催菜 / Urgent</span>' : ''}</div>${item.pendingQty && service.status === 'open' ? `<div class="row-actions"><button class="btn small primary" data-action="serve" data-id="${item.id}" data-qty="1">上桌 1 份<br>Servir 1</button>${item.pendingQty > 1 ? `<button class="btn small" data-action="serve" data-id="${item.id}" data-qty="${item.pendingQty}">全部<br>Tout</button>` : ''}</div>` : `<span class="badge ${item.servedQty ? 'green' : 'red'}">${item.servedQty ? '✓' : '退 / Annulé'}</span>`}</div>`;
  return `<article class="expo-card ${tone}"><div class="expo-head"><div><div class="expo-code">${esc(tableZh)}</div><div class="expo-code-fr">${esc(tableFr)}</div><div class="expo-meta">${service.covers} 人 / couverts · ${clock(service.openedAt)}${service.lastServedAt ? ` · 上道出菜后 / Depuis dernier service ${minutes(service.lastServedAt)} min` : ''}</div></div><div style="text-align:right"><span class="badge ${pending ? 'amber' : 'blue'}">${pending} 待出 / À servir</span><div class="minor" style="margin-top:6px">${served} 已上桌 / Servi</div></div></div><div class="expo-content">${rows.length ? rows.map(renderRow).join('') : '<div class="empty">尚未下单 / Aucune commande</div>'}</div><div class="expo-foot"><button class="btn primary big" data-action="complete" data-id="${service.id}" ${pending || !rows.length ? 'disabled' : ''}>✓ 完单 / Terminer</button>${pending ? `<div class="hint">${pending} 份未上桌，全部上齐后可点完单。<br>${pending} portion(s) à servir avant de terminer.</div>` : ''}</div></article>`;
}

function renderExpo() {
  const services = state.services.filter(s => s.orders.length).sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
  const canUndo = undo && Date.now() - Date.parse(undo.at) < 10000;
  const actions = '<button class="btn" data-action="go-stock">沽清 / Rupture</button><button class="btn" data-action="go-overview">今日概览 / Aujourd’hui</button><button class="btn" data-action="nav" data-view="admin">后台 / Gestion</button>';
  return `${pageHead('出菜口 / Passe', '逐份上桌 / Servir par portion · 全部上齐后点完单 / Terminer après le dernier plat', actions, 'LE WEILAI / PASS')}${canUndo ? `<div class="undo"><span>刚才划单可撤销 / Annuler le dernier service · <b id="undo-seconds">${Math.ceil((10000 - (Date.now() - Date.parse(undo.at))) / 1000)}</b>s</span><button class="btn small" data-action="undo">撤销 / Annuler</button></div>` : ''}${services.length ? `<div class="expo-grid">${services.map(expoServiceCard).join('')}</div>` : '<div class="empty">没有待出菜的服务单 / Aucune commande en cours</div>'}`;
}

function renderAdmin() {
  const tabs = [['overview', '营业概览'], ['menu', '菜单'], ['stock', '库存 / 沽清'], ['history', '历史服务单'], ['logs', '操作日志'], ['settings', '设置']];
  const staffNote = auth.role !== 'admin' ? `<div class="undo">${lang === 'fr' ? 'Accès employé. Utilisez le PIN administrateur pour modifier le menu, le stock et les réglages.' : '当前为员工权限。修改菜单、库存和设置需要管理员 PIN。请退出后使用管理员 PIN 登录。'}</div>` : '';
  return `${pageHead(t('后台管理'), t('菜单、库存、历史记录和系统提醒。'), '', 'LE WEILAI / MANAGEMENT')}${staffNote}<div class="admin-tabs">${tabs.map(([key, text]) => `<button class="${adminTab === key ? 'active' : ''}" data-action="admin-tab" data-tab="${key}">${t(text)}</button>`).join('')}</div>${adminTab === 'overview' ? renderOverview() : adminTab === 'menu' ? renderAdminMenu() : adminTab === 'stock' ? renderStock() : adminTab === 'history' ? renderHistory() : adminTab === 'logs' ? renderLogs() : renderSettings()}`;
}

function renderOverview() {
  const active = state.services.filter(s => s.status === 'open');
  const portions = active.reduce((sum, service) => sum + pendingItems(service).reduce((n, item) => n + item.pendingQty, 0), 0);
  const soldOut = state.menu.filter(item => item.active && item.stock === 0).length;
  const stat = (label, number, sub) => `<div class="panel stat"><small>${label}</small><strong>${number}</strong><small>${sub}</small></div>`;
  return `<div class="stats-grid">${stat(t('进行中服务单'), active.length, t('含打包单'))}${stat(t('待上桌份数'), portions, t('菜品及饮品'))}${stat(t('沽清菜品'), soldOut, t('库存为 0'))}</div><div class="panel pad"><div class="panel-head"><h2>${t('当前服务单')}</h2></div>${state.services.length ? state.services.map(s => `<div class="list-row"><div><b>${esc(s.displayCode)} · ${t(s.kind === 'takeaway' ? '打包' : '堂食')}</b><small>${dateTime(s.openedAt)} · ${s.status === 'complete' ? t('已完单') : pendingItems(s).length + ' ' + t('待上桌')}</small></div><button class="btn small" data-action="open-service" data-id="${s.id}">${t('查看')}</button></div>`).join('') : `<div class="empty">${lang === 'fr' ? 'Aucun service ouvert' : '当前没有服务单'}</div>`}</div>`;
}

function renderAdminMenu() {
  return `<div class="panel pad"><div class="panel-head"><h2>${t('菜单管理')}</h2><button class="btn primary" data-action="new-menu">＋ ${t('新增菜品')}</button></div><div class="manage-grid">${state.menu.map(item => `<div class="manage-card"><div><b>${esc(item.code)} · ${esc(lang === 'fr' ? item.nameFr : item.nameZh)} ${!item.active ? `<span class="badge red">${t('已下架')}</span>` : ''}</b><small>${esc(lang === 'fr' ? item.nameZh : item.nameFr)} · ${euro(item.priceCents)} · ${esc(t(item.category))}</small></div><button class="btn small" data-action="edit-menu" data-id="${item.id}">${t('编辑')}</button></div>`).join('')}</div></div>`;
}

function renderStock() {
  return `<div class="panel pad"><div class="panel-head"><h2>${t('库存与沽清')}</h2><span class="minor">${t('留空代表不限量；0 为沽清')}</span></div><div class="manage-grid">${state.menu.map(item => `<div class="manage-card"><div><b>${esc(item.code)} · ${esc(lang === 'fr' ? item.nameFr : item.nameZh)}</b><small>${item.stock === null ? t('不限量') : item.stock === 0 ? t('已沽清') : `${t('剩余')} ${item.stock}`}</small></div><div class="row-actions"><input class="field-input stock-input" type="number" min="0" max="100000" placeholder="∞" data-stock="${item.id}" value="${item.stock ?? ''}"><button class="btn small" data-action="save-stock" data-id="${item.id}">${t('保存')}</button><button class="btn small ${item.stock === 0 ? '' : 'danger'}" data-action="toggle-soldout" data-id="${item.id}" data-stock-value="${item.stock === 0 ? '' : '0'}">${item.stock === 0 ? t('恢复') : t('沽清')}</button></div></div>`).join('')}</div></div>`;
}

function renderHistory() {
  return `<div class="panel pad"><div class="panel-head"><h2>${t('最近 40 张已结束服务单')}</h2></div>${state.history.length ? state.history.map(service => `<div class="history-row"><b>${esc(service.displayCode)}</b><span>${t(service.kind === 'takeaway' ? '打包' : '堂食')}</span><span>${dateTime(service.openedAt)} → ${dateTime(service.closedAt)}</span><button class="btn small" data-action="history-detail" data-id="${service.id}">${t('查看菜品')}</button></div>`).join('') : `<div class="empty">${lang === 'fr' ? 'Aucun service clos' : '还没有已结束服务单'}</div>`}</div>`;
}

function renderLogs() {
  return `<div class="panel pad"><div class="panel-head"><h2>${t('最近 80 条操作')}</h2></div>${state.events.length ? state.events.map(event => `<div class="log-row"><span>${dateTime(event.at)}</span><b>${esc(event.actor)}</b><strong>${esc(event.action)}</strong><span>${esc(event.detail.displayCode || event.detail.nameZh || event.detail.name || '')} ${event.detail.qty ? `×${event.detail.qty}` : ''} ${esc(event.detail.reason || '')}</span></div>`).join('') : `<div class="empty">${lang === 'fr' ? 'Aucune opération' : '暂无操作'}</div>`}</div>`;
}

function renderSettings() {
  return `<div class="panel pad" style="max-width:580px"><div class="panel-head"><h2>${t('后厨与出菜口提醒')}</h2></div><form data-form="settings"><div class="field"><label>${t('预警（分钟）')}</label><input class="field-input" name="warnMinutes" type="number" min="1" max="240" value="${state.settings.warnMinutes}" required></div><div class="field"><label>${t('超时（分钟）')}</label><input class="field-input" name="lateMinutes" type="number" min="1" max="240" value="${state.settings.lateMinutes}" required></div><div class="field"><label>${t('上道出菜后断档（分钟）')}</label><input class="field-input" name="gapMinutes" type="number" min="1" max="240" value="${state.settings.gapMinutes}" required></div><div class="field"><label>${t('常用备注标签（用逗号分开）')}</label><input class="field-input" name="noteTags" value="${esc((state.settings.noteTags || []).join('，'))}"></div><div class="field"><label><input type="checkbox" name="autoResetStock" ${state.settings.autoResetStock ? 'checked' : ''}> ${t('次日营业自动恢复手动设定的库存')}</label></div><button class="btn primary">${t('保存设置')}</button></form><p class="hint">Epson: ${t(state.printer?.configured ? '已配置自动打印' : '未配置；点单后可使用浏览器打印')}</p></div>`;
}

function openStart(tableId = null) {
  const kind = tableId ? 'dine-in' : 'takeaway';
  const label = tableId ? `桌号 ${tableId}` : '新建打包单';
  showModal(label, tableId ? '请输入本桌人数后开台。' : '打包单有独立编号，不占桌位。', `<form data-form="start-service"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="tableId" value="${esc(tableId || '')}"><div class="field"><label>人数 / Couverts</label><input class="field-input" type="number" name="covers" min="1" max="30" value="${tableId ? 0 : 1}" required></div>${modalActions(tableId ? '开台点单' : '创建打包单')}</form>`);
}

function reviewOrder() {
  if (!basket.length) return;
  const service = activeService();
  if (!service || service.status !== 'open') return;
  const total = basket.reduce((sum, line) => sum + (menuItem(line.menuId)?.priceCents || 0) * line.qty, 0);
  showModal('确认下单', `${service.displayCode} · ${service.covers} 人`, `<div class="receipt"><h2>Le Weilai</h2>${basket.map(line => { const item = menuItem(line.menuId); const note = [...(line.tags || []), line.note].filter(Boolean).join('；'); return `<div class="receipt-line"><span>${esc(item.nameZh)} ×${line.qty}</span><b>${euro(item.priceCents * line.qty)}</b></div>${note ? `<div class="receipt-note">${esc(note)}</div>` : ''}`; }).join('')}<div class="receipt-rule"></div><div class="receipt-line"><b>合计</b><b>${euro(total)}</b></div></div><p class="hint">发送后菜品将实时显示在后厨和出菜口。</p><div class="modal-actions"><button class="btn" data-action="close-modal">继续选菜</button><button class="btn primary" data-action="confirm-order">确认并发送</button></div>`);
}

function showReceipt(service, order = null) {
  order ||= service.orders.at(-1);
  if (!order) return;
  lastReceipt = { service, order };
  const total = order.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  const printMessage = order.printStatus === 'printed' ? 'Epson 已确认接收小票'
    : order.printStatus === 'failed' ? `Epson 打印失败：${order.printError || '请检查打印机'}`
    : '未配置 Epson 打印机，请使用浏览器打印。';
  const body = `<div class="receipt"><h2>Le Weilai</h2><div style="text-align:center">${esc(service.displayCode)} · ${service.covers} 人<br>${dateTime(order.createdAt)}</div><div class="receipt-rule"></div>${order.items.map(item => `<div class="receipt-line"><span>${esc(item.nameZh)} ×${item.qty}</span><b>${euro(item.priceCents * item.qty)}</b></div><div class="receipt-note">${esc(item.nameFr)}${item.note ? ` · ${esc(item.note)}` : ''}</div>`).join('')}<div class="receipt-rule"></div><div class="receipt-line"><b>合计 / Total</b><b>${euro(total)}</b></div><div style="text-align:center;margin-top:10px">仅供录单 / Bon de commande</div></div>`;
  printRoot.innerHTML = body;
  showModal('小票预览', `${service.displayCode} · ${clock(order.createdAt)}`, `${body}<p class="hint" style="color:${order.printStatus === 'failed' ? 'var(--red)' : 'var(--muted)'}">${esc(printMessage)}</p><div class="modal-actions"><button class="btn" data-action="close-modal">关闭</button>${state.printer?.configured ? `<button class="btn" data-action="epson-reprint" data-id="${order.id}">Epson 重打</button>` : ''}<button class="btn primary" data-action="print">浏览器打印</button></div>`);
}

function openCancel(itemId) {
  const item = allItems(activeService()).find(row => row.id === itemId);
  if (!item || !item.pendingQty) return;
  showModal('退菜', `${item.nameZh} · 最多 ${item.pendingQty} 份`, `<form data-form="cancel-item"><input type="hidden" name="itemId" value="${itemId}"><div class="field"><label>退菜份数</label><input class="field-input" name="qty" type="number" min="1" max="${item.pendingQty}" value="${item.pendingQty}" required></div><p class="hint">后厨会保留退菜记录并标注“退”。已上桌的份数不能退；如需改单，请重新点单。</p>${modalActions('确认退菜并通知后厨')}</form>`);
}

function openMenuEditor(menuId = null) {
  const item = menuId ? menuItem(menuId) : null;
  const options = ['热菜', '凉菜', '主食', '汤品', '饮料酒水'].map(value => `<option value="${value}" label="${t(value)}"></option>`).join('');
  showModal(t(item ? '编辑菜品' : '新增菜品'), t('名称、价格、分类与库存'), `<form data-form="menu"><input type="hidden" name="id" value="${esc(item?.id || '')}"><div class="form-grid"><div class="field"><label>${t('编号')}</label><input class="field-input" name="code" required maxlength="20" value="${esc(item?.code || '')}"></div><div class="field"><label>${t('分类')}</label><input class="field-input" name="category" list="categories" required value="${esc(item?.category || '热菜')}"><datalist id="categories">${options}</datalist></div><div class="field"><label>${t('中文名')}</label><input class="field-input" name="nameZh" required value="${esc(item?.nameZh || '')}"></div><div class="field"><label>${t('法语名')}</label><input class="field-input" name="nameFr" required value="${esc(item?.nameFr || '')}"></div><div class="field"><label>${t('价格 (€)')}</label><input class="field-input" name="price" type="number" min="0" max="10000" step="0.01" required value="${item ? (item.priceCents / 100).toFixed(2) : ''}"></div><div class="field"><label>${t('类型')}</label><select name="type"><option value="dish" ${item?.type === 'drink' ? '' : 'selected'}>${t('菜品 · 后厨和出菜口')}</option><option value="drink" ${item?.type === 'drink' ? 'selected' : ''}>${t('饮品 · 只到出菜口')}</option></select></div><div class="field"><label>${t('库存（留空为不限量）')}</label><input class="field-input" name="stock" type="number" min="0" value="${item?.stock ?? ''}"></div><div class="field"><label>${t('过敏原')}</label><input class="field-input" name="allergens" value="${esc(item?.allergens || '')}"></div></div><div class="field"><label>${t('搜索别名 / 拼音')}</label><input class="field-input" name="aliases" value="${esc(item?.aliases || '')}"></div><div class="field"><label><input name="active" type="checkbox" ${item?.active === false ? '' : 'checked'}> ${t('上架')}</label></div>${modalActions(t('保存菜品'))}</form>`);
}

async function openHistory(serviceId) {
  try {
    const service = await api(`/api/services/${serviceId}`);
    const total = allItems(service).reduce((sum, item) => sum + item.priceCents * (item.qty - item.cancelledQty), 0);
    showModal(`${service.displayCode} · 历史服务单`, `${dateTime(service.openedAt)} → ${dateTime(service.closedAt)}`, `<div class="order-items">${allItems(service).map(item => `<div class="ordered-line"><div><div class="line-main">${esc(item.nameZh)} / ${esc(item.nameFr)} ×${item.qty}</div><div class="line-sub">上桌 ${item.servedQty} · 退菜 ${item.cancelledQty} ${item.note ? ` · ${esc(item.note)}` : ''}</div></div><b>${euro(item.priceCents * (item.qty - item.cancelledQty))}</b></div>`).join('')}</div><div class="total"><span>服务单金额</span><b>${euro(total)}</b></div><div class="modal-actions"><button class="btn" data-action="close-modal">关闭</button></div>`);
  } catch (error) { toast(error.message, true); }
}

function clearBasket() { basket = []; draftKey = crypto.randomUUID(); query = ''; category = '全部'; }
function navigate(to) { view = to; location.hash = to === 'tables' ? '' : to; window.scrollTo(0, 0); render(); }

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const key = button.dataset.id;
  if (action === 'backdrop') { if (event.target === button) closeModal(); return; }
  if (action === 'close-modal') { closeModal(); return; }
  if (action === 'nav') { navigate(button.dataset.view); return; }
  if (action === 'language') { lang = lang === 'zh' ? 'fr' : 'zh'; localStorage.setItem('lw_order_language', lang); render(); return; }
  if (action === 'table') { const service = serviceForTable(key); if (service) { activeId = service.id; clearBasket(); navigate('order'); } else openStart(key); return; }
  if (action === 'new-takeaway') { openStart(); return; }
  if (action === 'open-service') { activeId = key; clearBasket(); navigate('order'); return; }
  if (action === 'category') { category = button.dataset.value; render(); return; }
  if (action === 'add-item') {
    const item = menuItem(key); if (!item || item.stock === 0) return;
    const row = basket.find(line => line.menuId === key);
    if (item.stock !== null && (row?.qty || 0) >= item.stock) { toast('库存不足', true); return; }
    if (row) row.qty++; else basket.push({ menuId: key, qty: 1, note: '', tags: [] });
    render(); return;
  }
  if (action === 'quantity') {
    const row = basket.find(line => line.menuId === key); if (!row) return;
    const next = row.qty + Number(button.dataset.delta);
    const item = menuItem(key);
    if (item.stock !== null && next > item.stock) { toast('库存不足', true); return; }
    if (next < 1) basket = basket.filter(line => line !== row); else row.qty = next;
    render(); return;
  }
  if (action === 'quick-tag') {
    const row = basket.find(line => line.menuId === key); if (!row) return;
    row.tags ||= [];
    row.tags = row.tags.includes(button.dataset.tag)
      ? row.tags.filter(tag => tag !== button.dataset.tag)
      : [...row.tags, button.dataset.tag];
    render(); return;
  }
  if (action === 'clear-basket') { clearBasket(); render(); return; }
  if (action === 'review-order') { reviewOrder(); return; }
  if (action === 'confirm-order') {
    button.disabled = true;
    const service = activeService();
    const items = basket.map(line => ({ menuId: line.menuId, qty: line.qty,
      note: [...(line.tags || []), line.note].filter(Boolean).join('；') }));
    const result = await mutate(`/api/services/${service.id}/orders`, { clientKey: draftKey, items });
    if (result) {
      clearBasket(); closeModal();
      toast(result.printResult?.status === 'failed' ? `订单已保存，但${result.printResult.message}` : '订单已发送');
      showReceipt(result);
    }
    else button.disabled = false;
    return;
  }
  if (action === 'receipt-latest') { showReceipt(activeService()); return; }
  if (action === 'epson-reprint') {
    const result = await mutate(`/api/orders/${key}/reprint`);
    if (result) { showReceipt(result, result.orders.find(order => order.id === key)); toast(result.printResult.message, result.printResult.status === 'failed'); }
    return;
  }
  if (action === 'print') { window.print(); return; }
  if (action === 'cancel-item') { openCancel(key); return; }
  if (action === 'rush') { if (await mutate(`/api/services/${activeId}/rush`)) toast('已通知后厨催菜'); return; }
  if (action === 'discard') {
    if (!confirm('取消这个尚未下单的服务单？')) return;
    if (await mutate(`/api/services/${activeId}/discard`)) { activeId = null; clearBasket(); navigate('tables'); }
    return;
  }
  if (action === 'serve') {
    const result = await mutate(`/api/items/${key}/serve`, { qty: Number(button.dataset.qty) });
    if (result) { undo = { id: result.actionId, at: result.at }; toast('已上桌 / Servi'); render(); }
    return;
  }
  if (action === 'undo') {
    if (undo && await mutate(`/api/serve-actions/${undo.id}/undo`)) { undo = null; toast('已撤销划单 / Service annulé'); render(); }
    return;
  }
  if (action === 'complete') {
    if (!confirm('确认所有菜已经上齐，并将此单标为完单？\nTous les plats ont-ils été servis ?')) return;
    if (await mutate(`/api/services/${key}/complete`)) toast('已完单 / Commande terminée');
    return;
  }
  if (action === 'fullscreen') {
    document.getElementById('kitchen-screen')?.requestFullscreen().catch(error => toast(error.message, true));
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(lock => { kitchenWakeLock = lock; }).catch(() => {});
    return;
  }
  if (action === 'go-stock') { adminTab = 'stock'; navigate('admin'); return; }
  if (action === 'go-overview') { adminTab = 'overview'; navigate('admin'); return; }
  if (action === 'admin-tab') { adminTab = button.dataset.tab; render(); return; }
  if (action === 'new-menu') { openMenuEditor(); return; }
  if (action === 'edit-menu') { openMenuEditor(key); return; }
  if (action === 'history-detail') { openHistory(key); return; }
  if (action === 'save-stock' || action === 'toggle-soldout') {
    const value = action === 'save-stock' ? document.querySelector(`[data-stock="${CSS.escape(key)}"]`).value : button.dataset.stockValue;
    const body = action === 'toggle-soldout' && value === '' ? { restore: true } : { stock: value === '' ? null : Number(value) };
    if (await mutate(`/api/menu/${key}/stock`, body, 'PATCH')) toast('库存已更新');
    return;
  }
  if (action === 'logout') { await api('/api/logout', { method: 'POST', body: {} }); stream?.close(); auth.authorized = false; state = null; render(); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'menu-query') {
    query = event.target.value;
    const grid = document.getElementById('menu-grid');
    if (grid) grid.innerHTML = renderMenu();
  }
  if (event.target.matches('[data-note]')) {
    const line = basket.find(row => row.menuId === event.target.dataset.note);
    if (line) line.note = event.target.value;
  }
});

document.addEventListener('change', event => {
  if (event.target.matches('[data-change="sort"]')) { sortMode = event.target.value; render(); }
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.form === 'login') {
    try { const result = await api('/api/login', { method: 'POST', body: { pin: values.pin } }); auth = { pinRequired: true, authorized: true, role: result.role }; await loadState(); connectEvents(); }
    catch (error) { toast(error.message, true); }
    return;
  }
  if (form.dataset.form === 'start-service') {
    const result = await mutate('/api/services', { kind: values.kind, tableId: values.tableId || null, covers: Number(values.covers) });
    if (result) { activeId = result.id; clearBasket(); closeModal(); navigate('order'); }
    return;
  }
  if (form.dataset.form === 'cancel-item') {
    if (await mutate(`/api/items/${values.itemId}/cancel`, { qty: Number(values.qty) })) { closeModal(); toast('退菜已通知后厨'); }
    return;
  }
  if (form.dataset.form === 'menu') {
    const body = { code: values.code, category: values.category, nameZh: values.nameZh,
      nameFr: values.nameFr, priceCents: Math.round(Number(values.price) * 100),
      type: values.type, stock: values.stock === '' ? null : Number(values.stock),
      allergens: values.allergens, aliases: values.aliases, active: !!form.querySelector('[name="active"]').checked };
    const result = await mutate(values.id ? `/api/menu/${values.id}` : '/api/menu', body, values.id ? 'PUT' : 'POST');
    if (result) { closeModal(); toast('菜品已保存'); }
    return;
  }
  if (form.dataset.form === 'settings') {
    const noteTags = String(values.noteTags || '').split(/[,，]/).map(tag => tag.trim()).filter(Boolean);
    if (await mutate('/api/settings', { warnMinutes: Number(values.warnMinutes), lateMinutes: Number(values.lateMinutes), gapMinutes: Number(values.gapMinutes), noteTags, autoResetStock: !!form.querySelector('[name="autoResetStock"]').checked }, 'PATCH')) toast('设置已保存');
  }
});

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement?.id === 'kitchen-screen') document.fullscreenElement.append(parisClockRoot);
  else document.body.append(parisClockRoot);
  if (!document.fullscreenElement && kitchenWakeLock) { kitchenWakeLock.release().catch(() => {}); kitchenWakeLock = null; }
});
window.addEventListener('hashchange', () => {
  const next = location.hash.slice(1);
  if (['tables', 'kitchen', 'expo', 'admin'].includes(next) && next !== view) { view = next; render(); }
});

function updateClocks() {
  const parisNow = parisTimeFormatter.format(new Date());
  document.querySelectorAll('[data-paris-time]').forEach(node => { node.textContent = parisNow; });
  document.querySelectorAll('[data-minutes]').forEach(node => { node.textContent = `${minutes(node.dataset.minutes)} 分钟`; });
  document.querySelectorAll('[data-expo-minutes]').forEach(node => { node.textContent = `等待 / Attente ${minutes(node.dataset.expoMinutes)} min`; });
  if (undo) {
    const left = Math.ceil((10000 - (Date.now() - Date.parse(undo.at))) / 1000);
    const clockNode = document.getElementById('undo-seconds');
    if (clockNode) clockNode.textContent = Math.max(0, left);
    if (left <= 0) { undo = null; document.querySelector('.undo')?.remove(); }
  }
}

async function boot() {
  try {
    auth = await api('/api/session');
    if (auth.authorized) { await loadState(); connectEvents(); }
    else render();
  } catch { app.innerHTML = '<div class="loading">无法连接餐厅服务。请确认本地服务器正在运行。</div>'; }
}

setInterval(() => { updateClocks(); if (auth?.authorized && document.visibilityState === 'visible') loadState(); }, 15000);
setInterval(updateClocks, 1000);
boot();
