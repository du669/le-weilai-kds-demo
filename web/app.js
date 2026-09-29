const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');
const printRoot = document.getElementById('print-root');

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
const announcedChangeIds = new Set();

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
  '菜品': 'Plats', '沽清': 'Épuisé', '剩余': 'En stock',
  '搜索中文、法文、编号或拼音': 'Rechercher nom, code ou initiales',
  '点单篮': 'Panier', '暂无菜品': 'Aucun plat', '备注': 'Remarque',
  '例如：少辣、过敏原': 'Ex. : peu épicé, allergie', '清空': 'Vider',
  '确认下单': 'Confirmer la commande', '合计': 'Total', '催菜': 'Relancer',
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
  '上架': 'En vente', '保存菜品': 'Enregistrer le plat',
  '打开': 'Ouvrir', '改菜': 'Modifier le plat', '后厨处理中': 'En cours en cuisine',
  '转桌 / 并台': 'Changer de table / Regrouper',
  '服务单已结束，桌位已自动释放。': 'Service terminé, la table est libérée.',
  '未找到菜品': 'Aucun plat trouvé', '新建打包单': 'Nouvelle commande à emporter',
  '请输入本桌人数后开台。': 'Indiquez le nombre de couverts pour ouvrir la table.',
  '打包单有独立编号，不占桌位。': 'La commande à emporter a son propre numéro et n’occupe pas de table.',
  '开台点单': 'Ouvrir la table et commander', '创建打包单': 'Créer la commande à emporter',
  '发送后菜品将实时显示在后厨和出菜口。': 'Après l’envoi, les plats apparaîtront en temps réel en cuisine et au passe.',
  '继续选菜': 'Continuer à choisir', '确认并发送': 'Confirmer et envoyer',
  'Epson 重打': 'Réimprimer Epson', '浏览器打印': 'Imprimer depuis le navigateur',
  '关闭': 'Fermer', '取消': 'Annuler', '退菜份数': 'Quantité à annuler',
  '后厨会立即语音提示并闪烁显示，10 秒后自动退菜。已上桌的份数不能退。': 'La cuisine sera avertie par une annonce et un clignotement. L’annulation sera appliquée après 10 secondes. Les portions déjà servies ne peuvent pas être annulées.',
  '确认退菜并通知后厨': 'Confirmer et avertir la cuisine',
  '改为菜品': 'Remplacer par', '改后待出份数': 'Quantité à préparer', '新菜备注': 'Remarque pour le nouveau plat',
  '后厨会立即语音提示并闪烁显示，10 秒后自动改菜。': 'La cuisine sera avertie par une annonce et un clignotement. La modification sera appliquée après 10 secondes.',
  '确认改菜并通知后厨': 'Confirmer et avertir la cuisine', '没有可选的目标桌': 'Aucune autre table disponible',
  '当前桌号：': 'Table actuelle : ',
  '目标桌': 'Table de destination', '确认转桌或并台': 'Confirmer le changement ou le regroupement',
  '最多': 'Maximum', '当前': 'Actuel', '合并到此桌': 'regroupement ici', '转到空桌': 'transfert vers cette table libre',
  '仅供录单': 'Bon de commande',
  '空桌会转移本桌服务单；已有服务单的桌会合并两桌菜品和人数。': 'La commande sera déplacée vers une table libre ; si la table est occupée, les plats et les couverts seront regroupés.',
  '没有待做菜品': 'Aucun plat à préparer', '新订单会自动出现在这里': 'Les nouvelles commandes apparaîtront ici',
  '服务器已连接': 'Serveur connecté', '连接中断': 'Connexion interrompue',
  '与服务器断开连接，请检查网络。': 'Connexion au serveur interrompue. Vérifiez le réseau.',
  '与服务器断开连接。订单未确认发送时，请保持当前页面并重试。': 'Connexion au serveur interrompue. Gardez cette page ouverte et réessayez si la commande n’a pas été confirmée.',
  '订单已发送': 'Commande envoyée', '已通知后厨催菜': 'La cuisine a été avertie de l’urgence',
  '本单菜品已全部上桌': 'Tous les plats de cette commande ont été servis',
  '后厨已收到退菜提醒，10 秒后自动处理': 'La cuisine a reçu la demande d’annulation ; elle sera appliquée dans 10 secondes',
  '后厨已收到改菜提醒，10 秒后自动处理': 'La cuisine a reçu la demande de modification ; elle sera appliquée dans 10 secondes',
  '已上桌 / Servi': 'Servi', '撤销划单 / Service annulé': 'Service annulé',
  '已完单，桌位已自动释放 / Commande terminée': 'Commande terminée ; la table est libérée',
  '库存不足': 'Stock insuffisant', '订单不存在': 'Commande introuvable', '菜品不存在': 'Plat introuvable',
  '服务单不存在': 'Service introuvable', '人数须为 1–30 人': 'Le nombre de couverts doit être compris entre 1 et 30',
  '桌号不存在': 'Table introuvable', '该桌已开台，请打开当前服务单': 'Cette table est déjà ouverte. Ouvrez la commande en cours.',
  '已有订单，不能取消开台': 'Impossible de fermer une table qui contient déjà une commande',
  '重复请求编号冲突': 'Conflit de numéro de requête', '此单已完单，不能再加菜': 'Cette commande est terminée ; aucun plat ne peut être ajouté',
  '请至少选择一道菜': 'Sélectionnez au moins un plat', '请求编号无效': 'Numéro de requête invalide',
  '菜品已下架，请刷新菜单': 'Ce plat n’est plus disponible. Actualisez le menu.',
  '每道菜数量须为 1–30': 'La quantité de chaque plat doit être comprise entre 1 et 30',
  '备注不能超过 300 字': 'La remarque ne peut pas dépasser 300 caractères', '上桌数量超过待出份数': 'La quantité servie dépasse le nombre de portions en attente',
  '此菜正在处理改菜或退菜请求，暂不能上桌': 'Ce plat fait l’objet d’une modification ou d’une annulation ; il ne peut pas encore être servi',
  '没有待上桌菜品': 'Aucun plat en attente de service', '没有待出的菜': 'Aucun plat à servir',
  '此单有改菜或退菜请求正在处理，暂不能一键上桌': 'Une modification ou une annulation est en cours ; le service de tous les plats est temporairement indisponible',
  '退菜数量超过待出份数': 'La quantité annulée dépasse le nombre de portions en attente',
  '该菜已有改菜或退菜请求在处理中': 'Une modification ou une annulation est déjà en cours pour ce plat',
  '没有待出的份数可以修改': 'Aucune portion en attente ne peut être modifiée',
  '替换菜品已下架，请刷新菜单': 'Le plat de remplacement n’est plus disponible. Actualisez le menu.',
  '修改后的份数须为 1–30': 'La quantité modifiée doit être comprise entre 1 et 30',
  '菜品内容没有变化': 'Aucune modification du plat', '还有菜未上桌，暂不能完单': 'Certains plats n’ont pas encore été servis ; la commande ne peut pas être terminée',
  '没有已下单菜品': 'Aucun plat commandé',
  '不能与当前桌并台': 'Impossible de regrouper la table avec elle-même', '请选择另一张桌': 'Choisissez une autre table',
  '目标桌号不存在': 'La table de destination est introuvable', '目标桌已完单，请选择空桌': 'La commande de la table de destination est terminée. Choisissez une table libre.',
  '并台后人数不能超过 30 人': 'Le regroupement ne peut pas dépasser 30 couverts',
  'PIN 错误': 'PIN incorrect', '员工账号已停用，请联系管理员': 'Compte employé désactivé. Contactez un administrateur.',
  '请先输入员工 PIN': 'Saisissez d’abord votre PIN employé', '此操作需要管理员 PIN': 'Cette action nécessite le PIN administrateur',
  '管理员密码错误': 'Mot de passe administrateur incorrect', '页面或接口不存在': 'Page ou service introuvable',
  '尝试次数过多，请 10 分钟后重试': 'Trop de tentatives. Réessayez dans 10 minutes.',
  '未配置 Epson 打印机，可使用浏览器打印。': 'Imprimante Epson non configurée. Utilisez l’impression du navigateur.',
  'Epson 打印机已确认接收小票': 'L’imprimante Epson a confirmé la réception du ticket',
  '打印机未返回有效 ePOS 结果': 'L’imprimante n’a pas renvoyé de résultat ePOS valide',
  '打印机未完成打印': 'L’impression n’a pas abouti',
  'Epson 已确认接收小票': 'Epson a confirmé la réception du ticket', '请检查打印机': 'Vérifiez l’imprimante',
  '服务器连接中断，订单未确认。请保持当前页面并重试。': 'Connexion au serveur interrompue. La commande n’est pas confirmée. Gardez cette page ouverte et réessayez.',
  '管理员验证通过': 'Authentification administrateur réussie', '登录': 'Connexion', '请输入员工或管理员 PIN，连接餐厅服务。': 'Saisissez votre PIN employé ou administrateur pour vous connecter.',
  '进入系统': 'Se connecter', '验证并进入后台': 'Vérifier et ouvrir la gestion',
  '不辣': 'Sans piment', '不要辣': 'Sans piment', '少辣': 'Peu épicé', '微辣': 'Peu épicé',
  '特辣': 'Très épicé', '不要葱': 'Sans ciboule', '少油': 'Peu d’huile', '过敏': 'Allergie',
  '退出': 'Quitter', '小票预览': 'Aperçu du ticket', '已撤销划单 / Service annulé': 'Service annulé',
  '菜单、库存、员工、历史记录和操作日志。': 'Menu, stocks, personnel, historique et journal des opérations.',
  '菜品已保存': 'Plat enregistré', '库存已更新': 'Stock mis à jour', '设置已保存': 'Réglages enregistrés',
  '只有进行中的堂食桌单可以转桌或并台': 'Seules les commandes en cours sur place peuvent être déplacées ou regroupées',
  '此桌有改菜或退菜请求正在处理，请稍后再转桌或并台': 'Une modification ou une annulation est en cours pour cette table. Réessayez plus tard.',
  '目标桌有改菜或退菜请求正在处理，请稍后再并台': 'Une modification ou une annulation est en cours pour la table de destination. Réessayez plus tard.',
  '此单已完单': 'Cette commande est terminée',
  '请求来源不匹配': 'Origine de la requête incorrecte',
  '请求内容过长': 'Contenu de la requête trop volumineux',
  '划单记录不存在': 'Action de service introuvable', '已超过 10 秒撤销时限': 'Le délai de 10 secondes pour annuler est dépassé',
  '只能撤销该单最近一次划单': 'Seule la dernière action de service peut être annulée',
  '请求失败 (500)': 'Échec de la requête (500)', '服务器处理失败，请查看日志': 'Erreur du serveur. Consultez les journaux.',
  '正在连接餐厅服务…': 'Connexion au service du restaurant…', '正在读取订单…': 'Chargement des commandes…',
  '无法连接餐厅服务。请确认本地服务器正在运行。': 'Impossible de joindre le service du restaurant. Vérifiez que le serveur local fonctionne.',
  '过敏原：': 'Allergènes :'
};
const t = text => view === 'kitchen' ? text : lang === 'fr' ? words[text] || text : text;
const uiText = (chinese, french) => view === 'kitchen' ? chinese
  : view === 'expo' ? `${chinese} / ${french}`
  : lang === 'fr' ? french : chinese;
function frenchText(text) {
  const value = String(text ?? '');
  if (words[value]) return words[value];
  const stock = value.match(/^(.+?) 库存不足$/);
  if (stock) return `${state?.menu.find(item => item.nameZh === stock[1])?.nameFr || stock[1]} : stock insuffisant`;
  const merged = value.match(/^已并入桌号：(.+)$/);
  if (merged) return `Regroupé avec la table ${merged[1]}`;
  const moved = value.match(/^已转到桌号：(.+)$/);
  if (moved) return `Déplacé vers la table ${moved[1]}`;
  const printer = value.match(/^订单已保存，但(.+)$/);
  if (printer) return `Commande enregistrée, mais ${frenchText(printer[1])}`;
  const printerFailure = value.match(/^Epson 打印失败：(.+)$/);
  if (printerFailure) return `Échec de l’impression Epson : ${frenchText(printerFailure[1])}`;
  const printerConnection = value.match(/^打印机连接失败：(.+)$/);
  if (printerConnection) return `Échec de connexion à l’imprimante : ${printerConnection[1]}`;
  const printerHttp = value.match(/^打印机返回 HTTP (\d+)$/);
  if (printerHttp) return `L’imprimante a renvoyé HTTP ${printerHttp[1]}`;
  const printerCode = value.match(/^打印机未完成打印：(.+)$/);
  if (printerCode) return `L’imprimante n’a pas terminé l’impression : ${printerCode[1]}`;
  return value;
}
function displayMessage(message) {
  const value = String(message ?? '');
  if (view === 'kitchen') return value;
  if (view === 'expo') return value.includes(' / ') ? value : `${value} / ${frenchText(value)}`;
  return lang === 'fr' ? frenchText(value) : value;
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const euro = cents => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100);
const clock = value => value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
const dateTime = value => value ? new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const minutes = value => Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60000));
const allItems = service => service.orders.flatMap(order => order.items);
const pendingItems = service => allItems(service).filter(item => item.pendingQty > 0);
const serviceForTable = tableId => state.services.find(service => service.tableId === tableId);
const activeService = () => state?.services.find(service => service.id === activeId);
const menuItem = menuId => state.menu.find(item => item.id === menuId);
const count = items => items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
const displayName = item => lang === 'fr' ? item.nameFr : item.nameZh;
const serviceType = service => service.kind === 'takeaway' ? (lang === 'fr' ? 'Commande à emporter' : '打包单') : t('桌号');
const serviceKind = service => `${serviceType(service)} ${service.kind === 'takeaway' ? '' : service.displayCode}`.trim();
const serviceRows = service => service.orders.flatMap(order => order.items.map(item => ({ ...item, orderId: order.id })));
const formatPeople = qty => lang === 'fr' ? `${qty} ${qty === 1 ? 'couvert' : 'couverts'}` : `${qty} 人`;
const formatPortions = qty => lang === 'fr' ? `${qty} ${qty === 1 ? 'portion' : 'portions'}` : `${qty} 份`;
const formatBilingualPeople = qty => `${qty} 人 / ${qty} ${qty === 1 ? 'couvert' : 'couverts'}`;
const formatBilingualPortions = qty => `${qty} 份 / Tout servir (${qty} ${qty === 1 ? 'portion' : 'portions'})`;
function displayNote(note, bilingual = view === 'expo') {
  return String(note || '').split(/[；，、;]/).filter(Boolean).map(part => {
    const french = words[part] || part;
    return bilingual && french !== part ? `${part} / ${french}` : lang === 'fr' && view !== 'expo' ? french : part;
  }).join(bilingual ? ' · ' : lang === 'fr' ? '; ' : '；');
}
const allergenTranslations = { '花生': 'Arachides', '大豆': 'Soja', '芝麻': 'Sésame', '小麦': 'Blé', '蛋': 'Œufs', '甲壳类': 'Crustacés', '亚硫酸盐': 'Sulfites' };
function displayAllergens(allergens) {
  if (lang !== 'fr') return allergens;
  return String(allergens || '').split(/[、，,]/).map(value => allergenTranslations[value.trim()] || value.trim()).filter(Boolean).join(', ');
}

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
    if (error.status === 401) { stream?.close(); stream = null; auth = { pinRequired: true, authorized: false }; render(); }
    if (!error.status) { connected = false; syncIndicator(); }
    toast(error.status ? error.message : '服务器连接中断，订单未确认。请保持当前页面并重试。', true);
    return null;
  }
}

async function loadState() {
  try {
    const next = await api('/api/state');
    const unchanged = state?.revision === next.revision;
    const authorizationChanged = auth?.authorized && auth.adminUnlocked !== !!next.isAdmin;
    if (!unchanged && state) alertForChanges(state, next);
    state = next;
    if (auth?.authorized) {
      auth.adminUnlocked = !!next.isAdmin;
      auth.actor = next.actor || auth.actor;
    }
    connected = true;
    if (unchanged && !authorizationChanged) syncIndicator(); else render();
  } catch (error) {
    connected = false;
    if (error.status === 401) { stream?.close(); stream = null; auth = { pinRequired: true, authorized: false }; }
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

function pendingChangeEntries(services = state?.services || []) {
  return services.flatMap(service => (service.pendingChanges || []).map(change => ({ service, change })));
}

function speakKitchenNotice(text) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = 'zh-CN';
  const voice = speechSynthesis.getVoices().find(candidate => candidate.lang?.toLowerCase().startsWith('zh'));
  if (voice) speech.voice = voice;
  speechSynthesis.speak(speech);
}

function announcePendingChanges(services = state?.services || []) {
  for (const { service, change } of pendingChangeEntries(services)) {
    if (announcedChangeIds.has(change.id)) continue;
    announcedChangeIds.add(change.id);
    const table = service.kind === 'takeaway' ? service.displayCode : `桌号 ${service.displayCode}`;
    const action = change.kind === 'cancel' ? '退菜' : `改菜${change.newName ? `，改为${change.newName}` : ''}`;
    speakKitchenNotice(`${table}，${change.oldName}，${action}`);
  }
}

function alertForChanges(previous, next) {
  if (!['kitchen', 'expo'].includes(view)) return;
  const oldItems = new Map(previous.services.flatMap(service => allItems(service).map(item => [item.id, item])));
  const incoming = next.services.flatMap(service => allItems(service))
    .filter(item => item.pendingQty > 0 && (view === 'expo' || item.type === 'dish') && !oldItems.has(item.id));
  const newlyRushed = view === 'kitchen' ? next.services.filter(service =>
    allItems(service).some(item => item.rush && !oldItems.get(item.id)?.rush)) : [];
  const oldRequests = new Set(pendingChangeEntries(previous.services).map(({ change }) => change.id));
  const changes = pendingChangeEntries(next.services).filter(({ change }) => !oldRequests.has(change.id));
  if (changes.length) { beep(410, .23, .08); setTimeout(() => beep(330, .28, .08), 270); }
  else if (incoming.length) { beep(760, .14); setTimeout(() => beep(960, .14), 180); }
  for (const service of newlyRushed) {
    const table = service.kind === 'takeaway' ? service.displayCode : `桌号 ${service.displayCode}`;
    speakKitchenNotice(`${table}，催菜`);
  }
  if (newlyRushed.length && !changes.length && !incoming.length) beep(620, .2, .07);
}

function updateKitchenWaitTimes() {
  if (view !== 'kitchen' || document.visibilityState !== 'visible') return;
  for (const element of document.querySelectorAll('[data-waiting-since]')) {
    element.textContent = `已等待 ${minutes(element.dataset.waitingSince)} 分钟`;
  }
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
  div.textContent = displayMessage(message);
  toastRoot.append(div);
  setTimeout(() => div.remove(), 3500);
}

function syncIndicator() {
  const indicator = document.getElementById('sync-indicator');
  if (!indicator) return;
  indicator.classList.toggle('offline', !connected);
  indicator.querySelector('span').textContent = displayMessage(connected ? '服务器已连接' : '连接中断');
  document.getElementById('connection-banner')?.classList.toggle('visible', !connected);
}

function showModal(title, subtitle, body, actions = '') {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><button class="modal-close" data-action="close-modal" aria-label="${t('关闭')}">✕</button></div>${body}${actions}</section></div>`;
  modalRoot.querySelector('input:not([type="hidden"]),textarea,button')?.focus();
}
function closeModal() { modalRoot.innerHTML = ''; }
const modalActions = (confirmLabel, cancelLabel = t('取消')) => `<div class="modal-actions"><button class="btn" type="button" data-action="close-modal">${cancelLabel}</button><button class="btn primary" type="submit">${confirmLabel}</button></div>`;

function render() {
  document.documentElement.lang = view === 'kitchen' ? 'zh-CN' : lang === 'fr' ? 'fr' : 'zh-CN';
  if (document.fullscreenElement?.id === 'kitchen-screen' && auth?.authorized && state && view === 'kitchen') {
    const screen = document.getElementById('kitchen-screen');
    screen.querySelector('.kitchen-list').innerHTML = renderKitchenCards();
    screen.querySelector('.kitchen-aggregate').innerHTML = renderKitchenSummary();
    screen.querySelector('.kitchen-alerts').innerHTML = renderKitchenAlerts();
    return;
  }
  if (!auth) { app.innerHTML = `<div class="loading">${t('正在连接餐厅服务…')}</div>`; return; }
  if (!auth.authorized) { app.innerHTML = renderLogin(); return; }
  if (!state) { app.innerHTML = `<div class="loading">${t('正在读取订单…')}</div>`; return; }
  const y = window.scrollY;
  const tabs = [['tables', '点单'], ['kitchen', '后厨'], ['expo', '出菜口'], ['admin', '后台']];
  const navText = (key, label) => view === 'kitchen' ? label
    : view === 'expo' ? ({ tables: '点单 / Commandes', kitchen: '后厨 / Cuisine', expo: '出菜口 / Passe', admin: '后台 / Gestion' })[key]
    : t(label);
  const connectionText = view === 'expo' ? (connected ? '服务器已连接 / Connecté' : '连接中断 / Déconnecté') : displayMessage(connected ? '服务器已连接' : '连接中断');
  const brandCaption = view === 'kitchen' ? '后厨看单' : view === 'expo' ? '餐厅服务 / Service' : lang === 'fr' ? 'SERVICE' : 'SERVICE SYSTEM';
  const connectionBanner = view === 'kitchen' ? '与服务器断开连接，请检查网络。' : displayMessage('与服务器断开连接。订单未确认发送时，请保持当前页面并重试。');
  app.innerHTML = `<div class="app-shell"><div id="connection-banner" class="connection-banner ${connected ? '' : 'visible'}">${connectionBanner}</div><header class="topbar"><div class="brand"><div class="brand-mark">LW</div><div><b>Le Weilai</b><small>${brandCaption}</small></div></div><nav class="nav" aria-label="${lang === 'fr' && view !== 'kitchen' ? 'Navigation principale' : '主导航'}">${tabs.map(([key, label]) => `<button class="${view === key || (view === 'order' && key === 'tables') ? 'active' : ''}" data-action="nav" data-view="${key}">${navText(key, label)}</button>`).join('')}</nav><div class="top-actions"><div id="sync-indicator" class="sync-state ${connected ? '' : 'offline'}"><i></i><span>${connectionText}</span></div>${auth.actor ? `<span class="actor-name">${esc(auth.actor)}</span>` : ''}${['tables', 'order', 'admin'].includes(view) ? `<button class="btn small" data-action="language">${lang === 'zh' ? '中文 / FR' : 'FR / 中文'}</button>` : ''}${auth.pinRequired ? `<button class="btn small ghost" data-action="logout">${view === 'expo' ? '退出 / Quitter' : t('退出')}</button>` : ''}</div></header><main class="container">${view === 'tables' ? renderTables() : view === 'order' ? renderOrder() : view === 'kitchen' ? renderKitchen() : view === 'expo' ? renderExpo() : auth.adminUnlocked ? renderAdmin() : renderAdminGate()}</main></div>`;
  window.scrollTo(0, y);
}

function renderLogin() {
  return `<div class="login-shell"><form class="login-card" data-form="login"><div style="display:flex;justify-content:flex-end"><button class="btn small" type="button" data-action="language">${lang === 'zh' ? '中文 / FR' : 'FR / 中文'}</button></div><div class="brand-mark">LW</div><h1>Le Weilai</h1><p>${t('请输入员工或管理员 PIN，连接餐厅服务。')}</p><div class="field"><label for="pin">PIN</label><input class="field-input" id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required autofocus></div><button class="btn primary big" style="width:100%;margin-top:12px">${t('进入系统')}</button></form></div>`;
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
    return `<button class="table-card ${tableTone(service)}" data-action="table" data-id="${esc(table.id)}"><div class="table-top"><div><span class="minor">${t('桌号')}</span><div class="table-num">${esc(table.id)}</div></div><span class="badge ${service ? 'amber' : ''}">${status}</span></div><div class="table-bottom"><strong>${formatPeople(service ? service.covers : 0)}</strong><span>${service ? (lang === 'fr' ? `${pending} à servir` : `${pending} 待上桌`) : t(table.zone)}</span></div></button>`;
  };
  const groups = ['室内', '露台'].map(zone => `<div class="zone-label">${t(zone)}</div><div class="table-grid">${state.tables.filter(table => table.zone === zone).map(tableTile).join('')}</div>`).join('');
  const takeaways = state.services.filter(s => s.kind === 'takeaway').reverse();
  return `${pageHead(t('选择桌位'), t('选择桌位开始点单，也可从单独入口创建打包单。'))}<div class="split-layout"><section class="panel pad">${groups}</section><aside class="panel pad sticky"><button class="takeaway-entry" data-action="new-takeaway">＋ ${t('单独打包入口')}</button><div class="panel-head"><h2>${t('打包单')}</h2><span class="badge blue">${takeaways.length}</span></div>${takeaways.length ? takeaways.map(service => `<div class="list-row"><div><b>${esc(service.displayCode)}</b><small>${clock(service.openedAt)} · ${service.status === 'complete' ? t('已完单') : (lang === 'fr' ? `${pendingItems(service).length} à servir` : `${pendingItems(service).length} 待上桌`)}</small></div><button class="btn small" data-action="open-service" data-id="${service.id}">${t('打开')}</button></div>`).join('') : `<div class="empty">${t('暂无打包单')}</div>`}<div class="list-row"><span>${t('点单中')}</span><strong>${occupied.filter(s => s.status === 'open').length}</strong></div><div class="list-row"><span>${t('待上桌')}</span><strong>${formatPortions(waiting)}</strong></div><p class="hint">${t('库存由服务器核对，多台设备会同步。')}</p></aside></div>`;
}

function orderLine(item, service) {
  const pending = item.pendingQty;
  const status = pending ? `<span class="badge amber">${lang === 'fr' ? `${pending} à servir` : `待上桌 ${pending}`}</span>` : item.servedQty ? `<span class="badge green">${lang === 'fr' ? `${item.servedQty} portion${item.servedQty > 1 ? 's' : ''} servie${item.servedQty > 1 ? 's' : ''}` : `已上桌 ${item.servedQty}`}</span>` : `<span class="badge red">${t('已退菜')}</span>`;
  const changePending = (service.pendingChanges || []).some(change => change.itemId === item.id);
  const actions = pending && service.status === 'open' ? `<div class="row-actions"><button class="btn small" data-action="change-item" data-id="${item.id}" ${changePending ? 'disabled' : ''}>${t('改菜')}</button><button class="btn small danger" data-action="cancel-item" data-id="${item.id}" ${changePending ? 'disabled' : ''}>${t('退菜')}</button></div>` : '';
  return `<div class="ordered-line"><div><div class="line-main">${esc(displayName(item))} × ${item.qty} ${status}</div><div class="line-sub">${esc(displayNote(item.note))}${item.cancelledQty ? ` · ${t('已退菜')} ${item.cancelledQty}` : ''} · ${clock(item.createdAt)}${changePending ? ` · ${t('后厨处理中')}` : ''}</div></div>${actions}</div>`;
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
  const headline = `<div class="service-headline"><strong>${esc(serviceKind(service))}</strong><span class="badge ${isOpen ? 'amber' : 'green'}">${isOpen ? t('正在点单') : t('已完单')}</span><small>${formatPeople(service.covers)} · ${clock(service.openedAt)}</small></div>`;
  const statusPanel = `<section class="panel order-status">${headline}<div class="panel-head" style="margin:16px 0 0"><h2>${t('本桌全部点单')}</h2><div class="row-actions">${pending.length && isOpen ? `<button class="btn small warn" data-action="rush">${t('催菜')}</button>` : ''}${service.kind === 'dine-in' && isOpen ? `<button class="btn small" data-action="move-service">${t('转桌 / 并台')}</button>` : ''}${!rows.length && isOpen ? `<button class="btn small danger" data-action="discard">${t('取消开单')}</button>` : ''}${rows.length ? `<button class="btn small" data-action="receipt-latest">${t('小票')}</button>` : ''}${state.printer?.configured && latestOrder ? `<button class="btn small" data-action="epson-reprint" data-id="${latestOrder.id}">${t('Epson 重打')}</button>` : ''}</div></div>${ordered}${service.status === 'complete' ? `<p class="hint">${t('服务单已结束，桌位已自动释放。')}</p>` : ''}</section>`;
  const actions = `<button class="btn" data-action="nav" data-view="tables">← ${t('返回桌位')}</button>`;
  if (!isOpen) return `${pageHead(t('桌位点单'), '', actions)}${statusPanel}`;
  const categories = ['全部', ...new Set(state.menu.filter(m => m.active).map(m => m.category))];
  const basketHtml = basket.length ? basket.map(line => {
    const item = menuItem(line.menuId); if (!item) return '';
    return `<div class="basket-row"><div class="basket-row-top"><span>${esc(displayName(item))}</span><span>${euro(item.priceCents * line.qty)}</span></div><div class="quantity"><button data-action="quantity" data-id="${item.id}" data-delta="-1" aria-label="−">−</button><strong>${line.qty}</strong><button data-action="quantity" data-id="${item.id}" data-delta="1" aria-label="＋">＋</button><span class="minor">${esc(item.code)}</span></div><div class="quick-tags">${(state.settings.noteTags || []).map(tag => `<button class="quick-tag ${(line.tags || []).includes(tag) ? 'active' : ''}" data-action="quick-tag" data-id="${item.id}" data-tag="${esc(tag)}">${esc(t(tag))}</button>`).join('')}</div><input class="field-input" data-note="${item.id}" value="${esc(displayNote(line.note, false))}" placeholder="${t('例如：少辣、过敏原')}" aria-label="${t('备注')} ${esc(displayName(item))}"></div>`;
  }).join('') : `<div class="empty">${t('暂无菜品')}</div>`;
  return `${pageHead(t('桌位点单'), `${serviceType(service)} · ${esc(service.displayCode)}`, actions)}${statusPanel}<div class="order-columns"><section class="panel pad"><div class="toolbar"><input class="search" id="menu-query" placeholder="${t('搜索中文、法文、编号或拼音')}" value="${esc(query)}"></div><div class="categories">${categories.map(c => `<button class="category ${category === c ? 'active' : ''}" data-action="category" data-value="${esc(c)}">${t(c)}</button>`).join('')}</div><div class="menu-grid" id="menu-grid">${renderMenu()}</div></section><aside class="panel basket sticky"><div class="panel-head"><h2>${t('点单篮')}</h2><span class="badge green">${formatPortions(count(basket))}</span></div>${basketHtml}<div class="total"><span>${t('合计')}</span><b>${euro(total)}</b></div><div class="basket-actions"><button class="btn primary big" data-action="review-order" ${basket.length ? '' : 'disabled'}>${t('确认下单')} →</button><button class="btn" data-action="clear-basket" ${basket.length ? '' : 'disabled'}>${t('清空')}</button></div><p class="hint">${rows.length ? t('加菜') : t('新单')} · ${t('库存由服务器核对，多台设备会同步。')}</p></aside></div>`;
}

function renderMenu() {
  const term = query.trim().toLocaleLowerCase();
  const items = state.menu.filter(item => item.active && (category === '全部' || item.category === category))
    .filter(item => !term || `${item.nameZh} ${item.nameFr} ${item.code} ${item.aliases}`.toLocaleLowerCase().includes(term));
  if (!items.length) return `<div class="empty" style="grid-column:1/-1">${t('未找到菜品')}</div>`;
  return items.map(item => {
    const sold = item.stock === 0;
    const inBasket = basket.find(line => line.menuId === item.id)?.qty || 0;
    return `<article class="menu-card ${sold ? 'soldout' : ''}"><div><div class="menu-name">${esc(displayName(item))}</div><div class="menu-fr">${esc(lang === 'fr' ? item.nameZh : item.nameFr)}</div></div><div class="menu-card-bottom"><div><div class="price">${euro(item.priceCents)}</div><div class="menu-fr">${esc(item.code)} · ${t(item.category)}${item.allergens ? ` · ${lang === 'fr' ? `${t('过敏原：')} ${displayAllergens(item.allergens)}` : `过敏原： ${item.allergens}`}` : ''}</div>${item.stock !== null ? `<div class="menu-fr">${sold ? t('沽清') : `${t('剩余')} ${item.stock}`}</div>` : ''}</div><button class="add-button" data-action="add-item" data-id="${item.id}" ${sold ? 'disabled' : ''} aria-label="${lang === 'fr' ? `Ajouter ${esc(item.nameFr)}` : `添加 ${esc(item.nameZh)}`}">${sold ? '×' : inBasket ? `+${inBasket}` : '+'}</button></div></article>`;
  }).join('');
}

function kitchenServices() {
  const services = state.services.filter(service => {
    return allItems(service).some(item => item.type === 'dish' && item.pendingQty > 0);
  });
  return services.sort((a, b) => sortMode === 'table'
    ? a.displayCode.localeCompare(b.displayCode, undefined, { numeric: true })
    : Date.parse(a.openedAt) - Date.parse(b.openedAt));
}

function renderKitchenCards() {
  const services = kitchenServices();
  if (!services.length) return '<div class="empty" style="grid-column:1/-1;padding:65px 20px"><strong>暂无待做菜品</strong><br>新订单会自动出现在这里</div>';
  return services.map(service => {
    const items = allItems(service).filter(item => item.type === 'dish' && item.pendingQty > 0);
    const oldestPending = Math.max(...items.map(item => minutes(item.createdAt)));
    const tone = oldestPending >= state.settings.lateMinutes ? 'late' : oldestPending >= state.settings.warnMinutes ? 'overdue' : '';
    const rushed = items.some(item => item.rush);
    const heading = service.kind === 'takeaway' ? service.displayCode : `桌号：${service.displayCode}`;
  const lines = items.map(item => {
      const allergy = item.allergens && /过敏|allerg/i.test(item.note);
      return `<div class="kitchen-line"><div class="kitchen-dish"><span>${esc(item.nameZh)}</span><span>×${item.pendingQty}</span></div><div class="kitchen-line-meta">${item.added ? '<span class="badge green">加菜</span>' : ''}${item.rush ? '<span class="badge red">催菜</span>' : ''}${allergy ? '<span class="badge red">⚠ 过敏提醒</span>' : ''}<span class="kitchen-wait-time" data-waiting-since="${esc(item.createdAt)}">已等待 ${minutes(item.createdAt)} 分钟</span></div>${item.note ? `<div class="kitchen-note">${allergy ? '⚠ ' : ''}${esc(item.note)}</div>` : ''}</div>`;
    }).join('');
    return `<article class="kitchen-card ${tone} ${rushed ? 'rush' : ''}"><div class="kitchen-card-head"><div><div class="kitchen-code">${esc(heading)}</div><span class="minor">${service.covers} 人 · 下单 ${clock(service.openedAt)}</span></div><div class="kitchen-meta">${rushed ? '<b class="badge red">催菜</b>' : ''}</div></div><div class="kitchen-lines">${lines}</div></article>`;
  }).join('');
}

function kitchenTotals() {
  const totals = new Map();
  for (const service of state.services.filter(s => s.status === 'open')) {
    for (const item of allItems(service).filter(i => i.type === 'dish' && i.pendingQty > 0)) {
      const row = totals.get(item.menuId) || { name: item.nameZh, qty: 0, places: [] };
      row.qty += item.pendingQty; row.places.push(`${service.displayCode} ×${item.pendingQty}`);
      totals.set(item.menuId, row);
    }
  }
  return totals;
}

function renderKitchenSummary(totals = kitchenTotals()) {
  const rows = [...totals.values()].sort((a, b) => b.qty - a.qty).map(row => `<div class="aggregate-row"><b><span>${esc(row.name)}</span><span>×${row.qty}</span></b><small>${esc(row.places.join(' · '))}</small></div>`).join('');
  const portions = [...totals.values()].reduce((sum, row) => sum + row.qty, 0);
  return `<div class="panel-head"><h2>同菜汇总</h2><span class="badge green">${portions} 份</span></div>${rows || '<div class="minor">暂无待做菜品</div>'}`;
}

function renderKitchenAlerts() {
  const alerts = pendingChangeEntries();
  if (!alerts.length) return '';
  announcePendingChanges();
  return alerts.map(({ service, change }) => {
    const table = service.kind === 'takeaway' ? `打包单：${service.displayCode}` : `桌号：${service.displayCode}`;
    const label = change.kind === 'cancel' ? '退菜' : '改菜';
    const dish = change.kind === 'change' && change.newName
      ? `${change.oldName} → ${change.newName}` : change.oldName;
    const qty = change.kind === 'cancel' ? change.qty : change.newQty;
    if (view === 'expo') {
      const oldItem = serviceRows(service).find(item => item.id === change.itemId);
      const oldMenu = state.menu.find(item => item.nameZh === change.oldName);
      const newMenu = change.newName ? state.menu.find(item => item.nameZh === change.newName) : null;
      const tableFr = service.kind === 'takeaway' ? `À emporter ${service.displayCode.replace(/\D/g, '')}` : `Table ${service.displayCode}`;
      const dishFr = change.kind === 'change' && change.newName
        ? `${oldMenu?.nameFr || oldItem?.nameFr || change.oldName} → ${newMenu?.nameFr || change.newName}`
        : oldMenu?.nameFr || oldItem?.nameFr || change.oldName;
      const labelFr = change.kind === 'cancel' ? 'Annulation de plat' : 'Modification de plat';
      return `<article class="kitchen-alert"><strong>⚠ ${label} / ${labelFr}</strong><div class="kitchen-alert-dish">${esc(table)} · ${esc(dish)} ×${qty}<br>${esc(tableFr)} · ${esc(dishFr)} ×${qty}</div><small>10 秒后自动处理 / Traitement automatique dans 10 s</small></article>`;
    }
    return `<article class="kitchen-alert"><strong>⚠ ${label}</strong><div class="kitchen-alert-dish">${esc(table)} · ${esc(dish)} ×${qty}</div><small>10 秒后自动处理</small></article>`;
  }).join('');
}

function renderKitchen() {
  const totals = kitchenTotals();
  return `${pageHead('后厨看单', '菜品上桌后自动移除；改菜和退菜会闪烁提示 10 秒。', `<div class="kitchen-tools"><select class="field-input" data-change="sort"><option value="time" ${sortMode === 'time' ? 'selected' : ''}>按下单时间</option><option value="table" ${sortMode === 'table' ? 'selected' : ''}>按桌号</option></select><button class="btn primary" data-action="fullscreen">⛶ 全屏显示</button></div>`, '后厨')}<div id="kitchen-screen" class="kitchen-layout"><div class="kitchen-board"><div class="kitchen-list">${renderKitchenCards()}</div></div><aside class="panel kitchen-aggregate sticky">${renderKitchenSummary(totals)}</aside><div class="kitchen-alerts" aria-live="assertive">${renderKitchenAlerts()}</div></div>`;
}

function expoServiceCard(service) {
  const rows = serviceRows(service);
  const pending = pendingItems(service).reduce((sum, item) => sum + item.pendingQty, 0);
  const served = rows.reduce((sum, item) => sum + item.servedQty, 0);
  const age = pending ? Math.max(...rows.filter(item => item.pendingQty).map(item => minutes(item.createdAt))) : 0;
  const tone = age >= state.settings.lateMinutes ? 'late' : age >= state.settings.warnMinutes ? 'overdue' : '';
  const tableZh = service.kind === 'takeaway' ? `打包单：${service.displayCode}` : `桌号：${service.displayCode}`;
  const tableFr = service.kind === 'takeaway' ? `À emporter ${service.displayCode.replace(/\D/g, '')}` : `Table ${service.displayCode}`;
  const renderRow = item => `<div class="expo-line ${item.type === 'drink' ? 'drink' : ''}"><div><div class="expo-name">${esc(item.nameZh)} ×${item.qty}</div><div class="expo-fr">${esc(item.nameFr)}</div><div class="expo-qty">${item.type === 'drink' ? '饮品 / Boisson · ' : ''}已上桌 / Servi ${item.servedQty} · 待出 / À servir ${item.pendingQty}${item.cancelledQty ? ` · 退菜 / Annulé ${item.cancelledQty}` : ''}</div>${item.note ? `<div class="expo-note">备注 / Remarque : ${esc(displayNote(item.note, true))}</div>` : ''}${item.added ? '<span class="badge green">加菜 / Ajout</span>' : ''}${item.rush ? '<span class="badge red">催菜 / Urgent</span>' : ''}</div>${item.pendingQty && service.status === 'open' ? `<div class="row-actions"><button class="btn small primary" data-action="serve" data-id="${item.id}" data-qty="1">上桌 1 份<br>Servir 1</button>${item.pendingQty > 1 ? `<button class="btn small" data-action="serve" data-id="${item.id}" data-qty="${item.pendingQty}">全部<br>Tout</button>` : ''}</div>` : `<span class="badge ${item.servedQty ? 'green' : 'red'}">${item.servedQty ? '✓' : '退 / Annulé'}</span>`}</div>`;
  return `<article class="expo-card ${tone}"><div class="expo-head"><div><div class="expo-code">${esc(tableZh)}</div><div class="expo-code-fr">${esc(tableFr)}</div><div class="expo-meta">${formatBilingualPeople(service.covers)} · ${clock(service.openedAt)}</div></div><div style="text-align:right"><span class="badge ${pending ? 'amber' : 'blue'}">${pending} 待出 / À servir</span><div class="minor" style="margin-top:6px">${served} 已上桌 / Servi</div></div></div><div class="expo-content">${rows.length ? rows.map(renderRow).join('') : '<div class="empty">尚未下单 / Aucune commande</div>'}</div><div class="expo-foot">${pending ? `<button class="btn primary big" data-action="serve-all" data-id="${service.id}">✓ 一键上桌 ${formatBilingualPortions(pending)}</button>` : ''}<button class="btn ${pending ? '' : 'primary'} big" data-action="complete" data-id="${service.id}" ${pending || !rows.length ? 'disabled' : ''}>✓ 完单 / Terminer</button>${pending ? `<div class="hint">${pending} 份未上桌，逐份点击或一键上桌；全部上齐后点完单释放桌位。<br>${pending} ${pending === 1 ? 'portion' : 'portions'} à servir avant de terminer.</div>` : ''}</div></article>`;
}

function renderExpo() {
  const services = state.services.filter(s => s.orders.length).sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
  const canUndo = undo && Date.now() - Date.parse(undo.at) < 10000;
  const actions = '<button class="btn" data-action="go-stock">沽清 / Rupture</button><button class="btn" data-action="go-overview">今日概览 / Aujourd’hui</button><button class="btn" data-action="nav" data-view="admin">后台 / Gestion</button>';
  return `${pageHead('出菜口 / Passe', '逐份上桌或一键上桌；全部上齐后点完单自动释放桌位。', actions, 'LE WEILAI / PASS')}${canUndo ? `<div class="undo"><span>刚才划单可撤销 / Annuler le dernier service</span><button class="btn small" data-action="undo">撤销 / Annuler</button></div>` : ''}${services.length ? `<div class="expo-grid">${services.map(expoServiceCard).join('')}</div>` : '<div class="empty">没有待出菜的服务单 / Aucune commande en cours</div>'}<div class="kitchen-alerts" aria-live="assertive">${renderKitchenAlerts()}</div>`;
}

function renderAdminGate() {
  return `${pageHead('管理员验证', '进入后台管理前请输入管理员密码。')}
    <section class="panel pad admin-gate"><form data-form="admin-unlock">
      <div class="field"><label for="admin-pin">管理员密码</label><input class="field-input" id="admin-pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required autofocus></div>
      <button class="btn primary" type="submit">验证并进入后台</button>
    </form></section>`;
}

function renderAdmin() {
  const tabs = [['overview', '营业概览'], ['menu', '菜单'], ['stock', '库存 / 沽清'], ['employees', '员工管理'], ['history', '历史服务单'], ['logs', '操作日志'], ['settings', '设置']];
  return `${pageHead(t('后台管理'), t('菜单、库存、员工、历史记录和操作日志。'), '', 'LE WEILAI / MANAGEMENT')}<div class="admin-tabs">${tabs.map(([key, text]) => `<button class="${adminTab === key ? 'active' : ''}" data-action="admin-tab" data-tab="${key}">${t(text)}</button>`).join('')}</div>${adminTab === 'overview' ? renderOverview() : adminTab === 'menu' ? renderAdminMenu() : adminTab === 'stock' ? renderStock() : adminTab === 'employees' ? renderEmployees() : adminTab === 'history' ? renderHistory() : adminTab === 'logs' ? renderLogs() : renderSettings()}`;
}

function renderEmployees() {
  const employees = state.employees || [];
  return `<div class="panel pad"><div class="panel-head"><div><h2>员工管理</h2><span class="minor">员工使用各自 PIN 登录，操作日志记录员工和时间。</span></div><button class="btn primary" data-action="new-employee">＋ 添加员工</button></div>
    ${employees.length ? `<div class="manage-grid">${employees.map(employee => `<article class="manage-card employee-card"><div><b>${esc(employee.name)} <span class="badge ${employee.active ? 'green' : 'red'}">${employee.active ? '在职' : '已停用'}</span></b><small>员工代号：${esc(employee.code)} · 创建于 ${dateTime(employee.createdAt)}</small></div><div class="row-actions"><button class="btn small" data-action="edit-employee" data-id="${employee.id}">编辑</button><button class="btn small ${employee.active ? 'danger' : ''}" data-action="toggle-employee" data-id="${employee.id}" data-active="${employee.active ? '0' : '1'}">${employee.active ? '停用' : '启用'}</button></div></article>`).join('')}</div>` : '<div class="empty">还没有员工。添加后员工即可用个人 PIN 登录。</div>'}
  </div>`;
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
  const label = tableId ? `${t('桌号')} ${tableId}` : t('新建打包单');
  showModal(label, tableId ? t('请输入本桌人数后开台。') : t('打包单有独立编号，不占桌位。'), `<form data-form="start-service"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="tableId" value="${esc(tableId || '')}"><div class="field"><label>${t('人数')}</label><input class="field-input" type="number" name="covers" min="1" max="30" value="${tableId ? 0 : 1}" required></div>${modalActions(tableId ? t('开台点单') : t('创建打包单'))}</form>`);
}

function reviewOrder() {
  if (!basket.length) return;
  const service = activeService();
  if (!service || service.status !== 'open') return;
  const total = basket.reduce((sum, line) => sum + (menuItem(line.menuId)?.priceCents || 0) * line.qty, 0);
  showModal(t('确认下单'), `${service.displayCode} · ${formatPeople(service.covers)}`, `<div class="receipt"><h2>Le Weilai</h2>${basket.map(line => { const item = menuItem(line.menuId); const note = displayNote([...(line.tags || []), line.note].filter(Boolean).join('；'), false); return `<div class="receipt-line"><span>${esc(displayName(item))} ×${line.qty}</span><b>${euro(item.priceCents * line.qty)}</b></div>${note ? `<div class="receipt-note">${esc(note)}</div>` : ''}`; }).join('')}<div class="receipt-rule"></div><div class="receipt-line"><b>${t('合计')}</b><b>${euro(total)}</b></div></div><p class="hint">${t('发送后菜品将实时显示在后厨和出菜口。')}</p><div class="modal-actions"><button class="btn" data-action="close-modal">${t('继续选菜')}</button><button class="btn primary" data-action="confirm-order">${t('确认并发送')}</button></div>`);
}

function showReceipt(service, order = null) {
  order ||= service.orders.at(-1);
  if (!order) return;
  lastReceipt = { service, order };
  const total = order.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  const printMessage = order.printStatus === 'printed' ? 'Epson 已确认接收小票'
    : order.printStatus === 'failed' ? `Epson 打印失败：${order.printError || '请检查打印机'}`
    : '未配置 Epson 打印机，可使用浏览器打印。';
  const body = `<div class="receipt"><h2>Le Weilai</h2><div style="text-align:center">${esc(service.displayCode)} · ${formatPeople(service.covers)}<br>${dateTime(order.createdAt)}</div><div class="receipt-rule"></div>${order.items.map(item => `<div class="receipt-line"><span>${esc(displayName(item))} ×${item.qty}</span><b>${euro(item.priceCents * item.qty)}</b></div><div class="receipt-note">${esc(lang === 'fr' ? item.nameZh : item.nameFr)}${item.note ? ` · ${esc(displayNote(item.note, false))}` : ''}</div>`).join('')}<div class="receipt-rule"></div><div class="receipt-line"><b>${lang === 'fr' ? 'Total' : '合计 / Total'}</b><b>${euro(total)}</b></div><div style="text-align:center;margin-top:10px">${lang === 'fr' ? 'Bon de commande' : '仅供录单 / Bon de commande'}</div></div>`;
  printRoot.innerHTML = body;
  showModal(t('小票预览'), `${service.displayCode} · ${clock(order.createdAt)}`, `${body}<p class="hint" style="color:${order.printStatus === 'failed' ? 'var(--red)' : 'var(--muted)'}">${esc(displayMessage(printMessage))}</p><div class="modal-actions"><button class="btn" data-action="close-modal">${t('关闭')}</button>${state.printer?.configured ? `<button class="btn" data-action="epson-reprint" data-id="${order.id}">${t('Epson 重打')}</button>` : ''}<button class="btn primary" data-action="print">${t('浏览器打印')}</button></div>`);
}

function openCancel(itemId) {
  const item = allItems(activeService()).find(row => row.id === itemId);
  if (!item || !item.pendingQty) return;
  const maxLabel = lang === 'fr' ? `${t('最多')} ${formatPortions(item.pendingQty)}` : `最多 ${formatPortions(item.pendingQty)}`;
  showModal(t('退菜'), `${displayName(item)} · ${maxLabel}`, `<form data-form="cancel-item"><input type="hidden" name="itemId" value="${itemId}"><div class="field"><label>${t('退菜份数')}</label><input class="field-input" name="qty" type="number" min="1" max="${item.pendingQty}" value="${item.pendingQty}" required></div><p class="hint">${t('后厨会立即语音提示并闪烁显示，10 秒后自动退菜。已上桌的份数不能退。')}</p>${modalActions(t('确认退菜并通知后厨'))}</form>`);
}

function openChange(itemId) {
  const service = activeService();
  const item = serviceRows(service).find(row => row.id === itemId);
  if (!item || !item.pendingQty || (service.pendingChanges || []).some(change => change.itemId === itemId)) return;
  const options = state.menu.filter(menu => menu.active).map(menu => `<option value="${menu.id}" ${menu.id === item.menuId ? 'selected' : ''}>${esc(lang === 'fr' ? menu.nameFr : menu.nameZh)} · ${esc(menu.code)}</option>`).join('');
  const serviceLabel = service.kind === 'takeaway' ? `${serviceType(service)} ${service.displayCode}` : `${t('桌号')} ${service.displayCode}`;
  const itemLabel = lang === 'fr' ? `Plat actuel : ${displayName(item)}` : `当前 ${displayName(item)}`;
  showModal(t('改菜'), `${serviceLabel} · ${itemLabel} ×${item.pendingQty}`,
    `<form data-form="change-item"><input type="hidden" name="itemId" value="${itemId}"><div class="field"><label>${t('改为菜品')}</label><select class="field-input" name="menuId" required>${options}</select></div><div class="field"><label>${t('改后待出份数')}</label><input class="field-input" name="qty" type="number" min="1" max="30" value="${item.pendingQty}" required></div><div class="field"><label>${t('新菜备注')}</label><input class="field-input" name="note" maxlength="300" value="${esc(displayNote(item.note || '', false))}"></div><p class="hint">${t('后厨会立即语音提示并闪烁显示，10 秒后自动改菜。')}</p>${modalActions(t('确认改菜并通知后厨'))}</form>`);
}

function openMoveService() {
  const service = activeService();
  if (!service || service.kind !== 'dine-in' || service.status !== 'open') return;
  const options = state.tables.filter(table => table.id !== service.tableId).map(table => {
    const occupied = serviceForTable(table.id);
    const desc = occupied ? `${occupied.displayCode} — ${t('合并到此桌')}` : `${table.id} — ${t('转到空桌')}`;
    return `<option value="${esc(table.id)}">${esc(desc)}</option>`;
  }).join('');
  if (!options) { toast(t('没有可选的目标桌'), true); return; }
  showModal(t('转桌 / 并台'), `${t('当前桌号：')}${service.displayCode}`, `<form data-form="move-service"><div class="field"><label>${t('目标桌')}</label><select class="field-input" name="targetTableId" required>${options}</select></div><p class="hint">${t('空桌会转移本桌服务单；已有服务单的桌会合并两桌菜品和人数。')}</p>${modalActions(t('确认转桌或并台'))}</form>`);
}

function openEmployeeEditor(employeeId = null) {
  const employee = (state.employees || []).find(row => row.id === employeeId);
  showModal(employee ? '编辑员工' : '添加员工', employee ? '可留空 PIN 以保留现有密码' : '员工使用此 PIN 登录，操作会记录姓名和时间',
    `<form data-form="employee"><input type="hidden" name="id" value="${esc(employee?.id || '')}"><input type="hidden" name="active" value="${employee?.active === false ? 'false' : 'true'}"><div class="field"><label>员工姓名</label><input class="field-input" name="name" maxlength="40" required value="${esc(employee?.name || '')}"></div><div class="field"><label>员工代号</label><input class="field-input" name="code" maxlength="20" pattern="[A-Za-z0-9_-]+" required value="${esc(employee?.code || '')}"></div><div class="field"><label>员工 PIN（6–12 位数字）</label><input class="field-input" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6,12}" ${employee ? '' : 'required'} autocomplete="new-password"></div>${modalActions(employee ? '保存员工' : '添加员工')}</form>`);
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
      activeId = null;
      navigate('tables');
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
  if (action === 'change-item') { openChange(key); return; }
  if (action === 'move-service') { openMoveService(); return; }
  if (action === 'rush') { if (await mutate(`/api/services/${activeId}/rush`)) toast('已通知后厨催菜'); return; }
  if (action === 'discard') {
    if (!confirm(uiText('取消这个尚未下单的服务单？', 'Annuler cette commande sans plats ?'))) return;
    if (await mutate(`/api/services/${activeId}/discard`)) { activeId = null; clearBasket(); navigate('tables'); }
    return;
  }
  if (action === 'serve') {
    const result = await mutate(`/api/items/${key}/serve`, { qty: Number(button.dataset.qty) });
    if (result) { undo = { id: result.actionId, at: result.at }; setTimeout(() => { if (undo?.id === result.actionId) { undo = null; render(); } }, 10000); toast('已上桌 / Servi'); render(); }
    return;
  }
  if (action === 'serve-all') {
    const result = await mutate(`/api/services/${key}/serve-all`);
    if (result) { undo = { id: result.actionId, at: result.at }; setTimeout(() => { if (undo?.id === result.actionId) { undo = null; render(); } }, 10000); toast('本单菜品已全部上桌'); render(); }
    return;
  }
  if (action === 'undo') {
    if (undo && await mutate(`/api/serve-actions/${undo.id}/undo`)) { undo = null; toast('已撤销划单 / Service annulé'); render(); }
    return;
  }
  if (action === 'complete') {
    if (!confirm('确认所有菜已经上齐，并将此单标为完单？\nTous les plats ont-ils été servis ?')) return;
    if (await mutate(`/api/services/${key}/complete`)) { undo = null; toast('已完单，桌位已自动释放 / Commande terminée'); render(); }
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
  if (action === 'new-employee') { openEmployeeEditor(); return; }
  if (action === 'edit-employee') { openEmployeeEditor(key); return; }
  if (action === 'toggle-employee') {
    const employee = (state.employees || []).find(row => row.id === key);
    if (!employee) return;
    const active = button.dataset.active === '1';
    if (await mutate(`/api/employees/${key}`, { name: employee.name, code: employee.code, active }, 'PUT')) toast(active ? '员工已启用' : '员工已停用');
    return;
  }
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
    try { const result = await api('/api/login', { method: 'POST', body: { pin: values.pin } }); auth = { pinRequired: true, authorized: true, role: result.role, actor: result.actor, employeeCode: result.employeeCode, adminUnlocked: result.adminUnlocked }; await loadState(); connectEvents(); }
    catch (error) { toast(error.message, true); }
    return;
  }
  if (form.dataset.form === 'admin-unlock') {
    try {
      await api('/api/admin/unlock', { method: 'POST', body: { pin: values.pin } });
      await loadState();
      toast('管理员验证通过');
    } catch (error) { toast(error.message, true); }
    return;
  }
  if (form.dataset.form === 'start-service') {
    const result = await mutate('/api/services', { kind: values.kind, tableId: values.tableId || null, covers: Number(values.covers) });
    if (result) { activeId = result.id; clearBasket(); closeModal(); navigate('order'); }
    return;
  }
  if (form.dataset.form === 'cancel-item') {
    if (await mutate(`/api/items/${values.itemId}/cancel`, { qty: Number(values.qty) })) { closeModal(); toast('后厨已收到退菜提醒，10 秒后自动处理'); }
    return;
  }
  if (form.dataset.form === 'change-item') {
    if (await mutate(`/api/items/${values.itemId}/change`, { menuId: values.menuId, qty: Number(values.qty), note: values.note })) { closeModal(); toast('后厨已收到改菜提醒，10 秒后自动处理'); }
    return;
  }
  if (form.dataset.form === 'move-service') {
    const result = await mutate(`/api/services/${activeId}/move`, { targetTableId: values.targetTableId });
    if (result) {
      activeId = result.id;
      closeModal();
      navigate('order');
      toast(result.operation === 'merge' ? `已并入桌号：${result.displayCode}` : `已转到桌号：${result.displayCode}`);
    }
    return;
  }
  if (form.dataset.form === 'employee') {
    const body = { name: values.name, code: values.code, active: values.active !== 'false' };
    if (values.pin) body.pin = values.pin;
    const result = await mutate(values.id ? `/api/employees/${values.id}` : '/api/employees', body, values.id ? 'PUT' : 'POST');
    if (result) { closeModal(); toast(values.id ? '员工信息已保存' : '员工已添加'); }
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
  if (!document.fullscreenElement && kitchenWakeLock) { kitchenWakeLock.release().catch(() => {}); kitchenWakeLock = null; }
});
window.addEventListener('hashchange', () => {
  const next = location.hash.slice(1);
  if (['tables', 'kitchen', 'expo', 'admin'].includes(next) && next !== view) { view = next; render(); }
});

async function boot() {
  try {
    auth = await api('/api/session');
    if (auth.authorized) { await loadState(); connectEvents(); }
    else render();
  } catch { app.innerHTML = `<div class="loading">${t('无法连接餐厅服务。请确认本地服务器正在运行。')}</div>`; }
}

setInterval(() => { if (auth?.authorized && document.visibilityState === 'visible') loadState(); }, 15000);
setInterval(updateKitchenWaitTimes, 15000);
boot();
