(() => {
  const STORE_KEY = 'leweilai-kds-demo-v1';
  const DAY = 86400000;
  const now = () => new Date().toISOString();
  const ago = minutes => new Date(Date.now() - minutes * 60000).toISOString();
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dict = {
    '点单':'Commande','后厨':'Cuisine','出菜口':'Envoi','后台':'Gestion','座位与点单':'Tables & commandes','后厨看单':'Écran cuisine','出菜口划单':'Passe plats','后台管理':'Administration',
    '今日服务概览':'Service du jour','桌位':'Tables','桌号':'Table','室内':'Salle','露台':'Terrasse','空闲':'Libre','点单中':'En cours','有菜超时':'En retard','已出齐':'Servie',
    '选一桌开始点单':'Choisissez une table','点桌后输入人数，选菜并发送':'Ouvrez une table, indiquez le nombre de couverts, choisissez les plats puis envoyez.',
    '搜索菜名、拼音首字母或编号':'Rechercher un plat, un code ou une initiale','全部':'Tout','菜品':'Plats','饮品酒水':'Boissons','份':'portion(s)','人':'couverts','当前桌位':'Table actuelle','等待中的桌':'Tables en attente',
    '正在营业':'Service en cours','当前浏览器演示':'DÉMO · NAVIGATEUR','演示数据保存在本机浏览器，多开窗口可同步':'Données de démonstration sur cet appareil · synchronisées entre fenêtres',
    '返回桌位':'Retour aux tables','下单篮':'Commande','菜品已沽清':'Épuisé','已沽清':'Épuisé','剩':'reste','发送订单':'Envoyer la commande','确认并发送':'Confirmer et envoyer','继续选菜':'Continuer','清空':'Vider','小计':'Total','共':'Total','还没有选菜':'Aucun plat sélectionné',
    '已加入本次点单':'Ajouté à la commande','加菜':'Ajouter des plats','改单 / 退菜':'Modifier / annuler','催菜':'Relancer la cuisine','已上桌':'Servi','全部上桌':'Tout servir','撤销刚才划单':'Annuler le dernier envoi','同菜汇总':'Récapitulatif des plats','暂无待做菜品':'Aucun plat en attente','本桌已出齐':'Table servie','已等待':'En attente','上一道出菜后':'Depuis le dernier envoi','超时':'En retard','过敏提醒':'ALERTE ALLERGIE','等待断档':'Sans nouvel envoi',
    '沽清':'Rupture','今日概览':'Aujourd’hui','菜单管理':'Menu','库存':'Stocks','日志':'Journal','参数设置':'Réglages','新增菜品':'Ajouter un plat','新增桌位':'Ajouter une table','保存':'Enregistrer','取消':'Annuler','重置演示':'Réinitialiser la démo','重新打印':'Réimprimer','打印小票':'Imprimer le ticket','小票预览':'Aperçu du ticket','发送成功':'Commande envoyée','每桌进度':'Avancement par table','数据日志':'Historique des actions','系统配置':'Configuration',
    '台':'tables','桌':'Table','下单':'Commande','正在出菜':'En cours','离线':'Hors ligne','在线':'En ligne','分钟':'min','分钟以上':'min et +','正在等待':'En attente','今日订单':'Commandes du jour','今日人数':'Couverts','已上桌菜品':'Plats servis','平均出餐':'Temps moyen','热销菜品':'Meilleures ventes','查看本桌菜品状态':'Suivi de cette table','操作':'Actions','堂食':'Sur place','打包':'À emporter','桌位状态':'État des tables','当前剩余':'En stock','无限量':'Illimité','停止售卖':'Suspendre','恢复售卖':'Remettre en vente','限量':'Quantité limitée','下一步':'Continuer','请输入用餐人数':'Nombre de couverts','打印机未连接':'Imprimante non configurée','所有菜品':'Tous les plats','菜单类型':'Type','价格':'Prix','分类':'Catégorie','编号':'Code','中文名':'Nom chinois','法语名':'Nom français','上架':'En vente','过敏原':'Allergènes','备注':'Remarque','用餐人数':'Couverts','当前等待桌':'Tables en attente','按下单时间':'Par heure de commande','按桌号':'Par numéro de table','待做':'À préparer','等待时间':'Temps d’attente','等待':'En attente','道':'plats','推后厨与出菜口':'Cuisine + passe','只推到出菜口':'Passe uniquement','状态':'Statut','订单确认':'Confirmer la commande','请核对菜品、数量和备注':'Vérifiez les plats, les quantités et les remarques.','发送后将生成小票':'Un ticket sera généré après l’envoi.','模拟 Epson 小票打印':'Aperçu imprimante Epson (démo)','撤销时限':'Annulation disponible 10 secondes','没有待上桌的菜':'Aucun plat à servir','正在出菜的桌位会显示在这里':'Les tables actives apparaissent ici','根据已划单菜品统计':'Calculé à partir des plats servis','含堂食与加菜':'Sur place et ajouts inclus','按菜品下单至划单':'Du ticket au service','今日还没有已上桌菜品':'Aucun plat servi aujourd’hui','今日已完成':'Servies aujourd’hui','谁、什么时间、改了什么':'Qui a fait quoi et quand','库存不足，请调整数量':'Stock insuffisant, ajustez la quantité','库存不足':'Stock insuffisant','已催厨房':'Cuisine relancée','已撤销，后厨屏已恢复':'Action annulée · réaffichée en cuisine','撤销时限已过':'Délai d’annulation dépassé','二次确认并通知后厨':'Confirmer et prévenir la cuisine','退菜通知已发送':'Annulation envoyée','已上桌的菜不能退菜':'Un plat servi ne peut pas être annulé','操作类型':'Type d’action','原因 / 新做法':'Motif / modification','留空为无限量':'Vide = illimité','拼音首字母或法语关键词':'Initiales pinyin ou mot-clé en français','添加':'Ajouter','补充备注':'Ajouter une remarque','从菜单点＋添加':'Touchez + dans le menu pour ajouter','三步完成':'En trois étapes','选桌':'Choisir une table','点菜':'Choisir les plats','售罄菜品会即时禁点；出菜口划单后所有屏幕同步更新。':'Les plats épuisés sont désactivés. Le service met les écrans à jour.','菜品与饮品在同一菜单中选择；饮品只显示在出菜口。':'Plats et boissons dans le même menu. Les boissons restent au passe.','发送后生成小票预览。接入 Epson ePOS 后可自动打印。':'Aperçu du ticket ici. L’impression Epson ePOS nécessite une configuration.','切换到后台':'Administration','服务员自备':'Préparée au passe','整桌上齐':'Tout servir','上一道出菜后':'Depuis le dernier envoi','所有桌位都已出齐':'Toutes les tables sont servies','只显示菜品 · 出菜口划单后同步消失':'Plats uniquement · retirés après validation au passe','每道菜点「已上桌」；饮品在此准备，不经过后厨':'Validez chaque plat servi. Les boissons sont préparées ici.','按份数从多到少':'Du plus grand au plus petit nombre de portions','饮品酒水只在出菜口显示。厨房屏只看不点。':'Les boissons apparaissent au passe. L’écran cuisine est en lecture seule.','本演示不处理收银、支付或税控账单。正式营业需接入云同步与打印服务。':'Cette démo ne gère ni paiements ni factures. La production nécessite synchronisation et imprimante.','演示版说明':'À propos de la démo','跨设备实时同步、账号 PIN、Epson ePOS 自动打印与断网补单需接入正式服务端。此演示使用本机浏览器存储。':'Synchronisation multi-appareils, codes PIN, impression ePOS et mode hors ligne nécessitent un serveur. Cette démo utilise le stockage local.','终端与打印':'Terminaux et impression','出餐提醒':'Alertes de service','厨房字体大小':'Taille du texte cuisine','增强后厨可读性':'Lisibilité sur grand écran','浏览器演示音量':'Volume de la démo','连接 Epson ePOS 后配置':'À configurer avec Epson ePOS','中文 / 法文':'Chinois / français','菜单已保存':'Menu enregistré','库存已更新':'Stock mis à jour','桌位已保存':'Table enregistrée','桌号已存在':'Ce numéro de table existe déjà','有待上桌菜品，不能删除':'Impossible de supprimer une table avec une commande active','所有当前演示数据将恢复为示例状态。':'Les données de démonstration seront réinitialisées.','进行中':'En cours','已下架':'Retiré du menu','一键沽清':'Marquer épuisé','恢复售卖':'Remettre en vente','打开出菜口':'Ouvrir le passe','没有找到匹配的菜品':'Aucun plat correspondant','新单':'Nouvelle commande','加':'Ajout','退菜':'Annulée','新增':'Ajouter','删除':'Supprimer','编辑':'Modifier','区域':'Zone','座位数':'Nombre de places','整桌上齐':'Tout servir','打包':'À emporter','操作类型':'Type d’action','小计':'Total','小票已生成，可在浏览器打印对话框选择打印机。':'Ticket prêt. Choisissez une imprimante dans le navigateur.','仅供录单，不是结账凭证':'Pour la saisie, pas un reçu de paiement','设置已保存':'Réglages enregistrés','演示数据已恢复':'Démo réinitialisée','待上桌':'À servir','打印机 IP':'IP imprimante','菜单管理':'Menu','出菜口划单':'Passe plats','桌位点单':'Commande par table','桌位排序':'Tri des tables','总计':'Total','本桌未上桌':'À servir pour cette table','沽清与限量':'Rupture et stock limité','断档提醒':'Alerte sans nouvel envoi','厨房屏与出菜口超时颜色阈值':'Seuils de couleur au passe et en cuisine','单道菜等待时长':'Temps d’attente par plat','上一道出菜后无新菜':'Depuis le dernier envoi','订单类型':'Type de commande','新增桌位':'Ajouter une table','桌点后输入人数，选菜并发送':'Ouvrez une table, indiquez le nombre de couverts, choisissez les plats puis envoyez.','每日重置沽清':'Réinitialiser les ruptures chaque jour','自动恢复':'Réapprovisionnement automatique','今日已完成':'Servies aujourd’hui','示例数据已恢复':'Démo réinitialisée','当前剩余':'En stock','等待':'En attente','超时':'En retard','沽清':'Marquer épuisé','新增菜品':'Ajouter un plat','编辑菜品':'Modifier un plat','中文名、法语名与沽清库存':'Noms, traduction et stock','搜索别名':'Alias de recherche','今日服务概览':'Service du jour','座位':'places','桌位':'Tables','点单篮':'Commande','离线 · 数据已保存在本机浏览器，多开窗口可同步':'Hors ligne · données locales synchronisées entre fenêtres','等待断档':'Sans nouvel envoi','桌位数量':'Tables','今日人数':'Couverts','移动端演示':'Démo mobile',
  };
  const t = text => language === 'fr' ? (dict[text] || text) : text;
  const frCategory = name => language === 'fr' ? ({'热菜':'Plats chauds','凉菜':'Entrées froides','主食':'Riz & nouilles','汤品':'Soupes','饮料酒水':'Boissons'}[name] || name) : name;
  const tagLabels = ['不辣','微辣','特辣','不要葱','打包','过敏'];
  const tagsInLocale = tag => language === 'fr' ? ({'不辣':'Sans piment','微辣':'Peu épicé','特辣':'Très épicé','不要葱':'Sans oignon vert','打包':'À emporter','过敏':'Allergie'}[tag] || tag) : tag;

  const defaultCatalog = () => [
    {id:'m01',code:'A01',name:'宫保鸡丁',fr:'Poulet Kung Pao',category:'热菜',price:14.8,type:'dish',stock:12,allergens:'花生',aliases:'gbjd kung pao poulet',notes:'',active:true},
    {id:'m02',code:'A02',name:'麻婆豆腐',fr:'Tofu Mapo',category:'热菜',price:12.5,type:'dish',stock:null,allergens:'大豆',aliases:'mpdf mapo tofu',notes:'',active:true},
    {id:'m03',code:'A03',name:'脆皮鸭',fr:'Canard croustillant',category:'热菜',price:18.9,type:'dish',stock:8,allergens:'芝麻',aliases:'cpy canard croustillant',notes:'',active:true},
    {id:'m04',code:'A04',name:'牛肉炒面',fr:'Nouilles sautées au bœuf',category:'主食',price:15.5,type:'dish',stock:9,allergens:'小麦、大豆',aliases:'nrclm bœuf nouilles',notes:'',active:true},
    {id:'m05',code:'A05',name:'扬州炒饭',fr:'Riz sauté de Yangzhou',category:'主食',price:13.5,type:'dish',stock:7,allergens:'蛋、甲壳类',aliases:'yzcf riz sauté',notes:'',active:true},
    {id:'m06',code:'A06',name:'酸辣汤',fr:'Soupe aigre-piquante',category:'汤品',price:6.5,type:'dish',stock:10,allergens:'蛋、大豆',aliases:'slt soupe aigre',notes:'',active:true},
    {id:'m07',code:'A07',name:'拍黄瓜',fr:'Concombre écrasé',category:'凉菜',price:7.5,type:'dish',stock:6,allergens:'芝麻',aliases:'phg concombre',notes:'',active:true},
    {id:'m08',code:'A08',name:'茉莉花茶',fr:'Thé au jasmin',category:'饮料酒水',price:4.5,type:'drink',stock:14,allergens:'',aliases:'mlhc thé jasmin',notes:'',active:true},
    {id:'m09',code:'A09',name:'橙汁',fr:"Jus d'orange",category:'饮料酒水',price:4.8,type:'drink',stock:8,allergens:'',aliases:'zj jus orange',notes:'',active:true},
    {id:'m10',code:'A10',name:'法国红酒（杯）',fr:'Vin rouge français (verre)',category:'饮料酒水',price:7.5,type:'drink',stock:10,allergens:'亚硫酸盐',aliases:'fgjh vin rouge',notes:'',active:true},
    {id:'m11',code:'A11',name:'春卷',fr:'Nems végétariens',category:'凉菜',price:8.5,type:'dish',stock:10,allergens:'小麦、大豆',aliases:'cj nems',notes:'',active:true},
    {id:'m12',code:'A12',name:'白米饭',fr:'Riz blanc',category:'主食',price:2.5,type:'dish',stock:null,allergens:'',aliases:'bmf riz blanc',notes:'',active:true}
  ];
  const defaultTables = () => Array.from({length:12},(_,i)=>({id:`T${String(i+1).padStart(2,'0')}`,zone:i<8?'室内':'露台',seats:i%4===0?6:4}));
  function makeSeed(){
    const catalog = defaultCatalog(), menu = Object.fromEntries(catalog.map(item=>[item.id,item]));
    const item = (id,qty,mins,status='pending',note='',extra={}) => ({id:uid('it'),menuId:id,name:menu[id].name,fr:menu[id].fr,category:menu[id].category,type:menu[id].type,qty,createdAt:ago(mins),status,note,added:!!extra.added,rush:!!extra.rush,allergens:menu[id].allergens,servedAt:status==='served'?ago(extra.servedMins||1):null,cancelledAt:null});
    const orders = [
      {id:'LW-301',tableId:'T03',covers:3,createdAt:ago(47),kind:'dine-in',items:[item('m01',2,44,'pending','微辣',{}),item('m03',1,39,'pending','',{}),item('m08',1,42,'served','',{servedMins:31})]},
      {id:'LW-302',tableId:'T07',covers:2,createdAt:ago(28),kind:'dine-in',items:[item('m01',1,27,'pending','不要葱',{added:true}),item('m06',1,23,'pending','',{}),item('m10',1,21,'pending','',{})]},
      {id:'LW-303',tableId:'T12',covers:4,createdAt:ago(13),kind:'dine-in',items:[item('m04',2,13,'pending','花生过敏',{added:true}),item('m05',1,11,'pending','',{}),item('m08',1,10,'pending','',{})]}
    ];
    return {catalog,tables:defaultTables(),orders,settings:{timeoutWarn:20,timeoutLate:35,gapWarn:10,sortBy:'time',fontScale:1,soundKitchen:65,soundExpo:55,printerIp:'',receiptLanguage:'中法双语',keepStockReset:false,autoPrint:false},logs:[{id:uid('log'),at:ago(48),who:'系统',what:'演示数据已载入 · 3 张桌位有待上桌菜品'}],nextOrder:304};
  }
  let data;
  try{data=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(!data||!Array.isArray(data.orders)||!Array.isArray(data.catalog))data=makeSeed();}catch{data=makeSeed();}
  const todayKey=new Date().toLocaleDateString('sv-SE');
  data.catalog.forEach(item=>{if(item.dailyStock===undefined)item.dailyStock=item.stock;});
  if(data.stockDay!==todayKey){if(data.settings?.autoResetStock!==false)data.catalog.forEach(item=>{if(item.dailyStock!==undefined)item.stock=item.dailyStock;});data.stockDay=todayKey;}
  let role='order', managerPage='today', currentTable=null, coversDraft=2, currentKind='dine-in', basket=[], category='全部', search='', sortBy=null, lastTicket=data.lastTicket||null, modalSubmit=null, timerHandle=null;
  let language = localStorage.getItem(`${STORE_KEY}:lang`) || 'zh';
  const tabId=uid('tab');
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('leweilai-kds-sync-v1'):null;
  const money=value=>new Intl.NumberFormat(language==='fr'?'fr-FR':'zh-CN',{style:'currency',currency:'EUR'}).format(value||0);
  const timeOf=value=>new Date(value).toLocaleTimeString(language==='fr'?'fr-FR':'zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
  const minSince=value=>Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));
  const sinceLabel=value=>`${minSince(value)} ${t('分钟')}`;
  const todayStart=()=>new Date(new Date().setHours(0,0,0,0));
  const isToday=value=>new Date(value)>=todayStart();
  const allItems=()=>data.orders.flatMap(order=>order.items.map(item=>({...item,orderId:order.id,tableId:order.tableId,covers:order.covers,orderCreatedAt:order.createdAt,kind:order.kind})));
  const ordersFor=tableId=>data.orders.filter(order=>order.tableId===tableId);
  const pendingFor=tableId=>ordersFor(tableId).flatMap(order=>order.items.filter(item=>item.status==='pending').map(item=>({...item,orderId:order.id,tableId:order.tableId,covers:order.covers,orderCreatedAt:order.createdAt,kind:order.kind})));
  const currentPending=()=>currentTable?pendingFor(currentTable):[];
  const catalogItem=id=>data.catalog.find(item=>item.id===id);
  const activeTables=()=>data.tables.filter(table=>pendingFor(table.id).length>0);
  const qtyTotal=items=>items.reduce((sum,item)=>sum+Number(item.qty||0),0);
  const tableAge=tableId=>{const items=pendingFor(tableId);return items.length?Math.max(...items.map(item=>minSince(item.createdAt))):0;};
  const tableLastServed=tableId=>ordersFor(tableId).flatMap(order=>order.items.filter(item=>item.status==='served'&&item.servedAt)).map(item=>item.servedAt).sort().at(-1)||null;
  const tableStatus=table=>{const pending=pendingFor(table.id);if(pending.length){const age=Math.max(...pending.map(item=>minSince(item.createdAt)));return age>=data.settings.timeoutLate?'late':age>=data.settings.timeoutWarn?'warning':'active';}const served=ordersFor(table.id).some(order=>order.items.some(item=>item.status==='served'&&isToday(item.servedAt)));return served?'done':'free';};
  function persist(what='数据已更新'){
    localStorage.setItem(STORE_KEY,JSON.stringify(data));
    if(channel)channel.postMessage({from:tabId,state:data,what});
    render();
  }
  function addLog(what,who=role==='expo'?'出菜口':role==='admin'?'管理员':'服务员'){
    data.logs.unshift({id:uid('log'),at:now(),who,what});data.logs=data.logs.slice(0,150);
  }
  function toast(message,kind=''){
    let root=document.querySelector('.toast-stack');if(!root){root=document.createElement('div');root.className='toast-stack';document.body.append(root);}
    const node=document.createElement('div');node.className=`toast ${kind}`;node.textContent=message;root.append(node);setTimeout(()=>node.remove(),3400);
  }
  function sound(freq=740,duration=.13){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const ctx=new Audio();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=freq;osc.type='sine';gain.gain.value=.035;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);osc.onended=()=>ctx.close();}catch{}}
  function openDialog(html,submit=null){
    modalSubmit=submit;const root=document.getElementById('dialog-root');root.innerHTML=`<div class="modal-backdrop" data-action="backdrop"><section class="dialog" role="dialog" aria-modal="true">${html}</section></div>`;
    root.querySelector('dialog')?.showModal();root.querySelector('input:not([type="hidden"]),textarea,select')?.focus();
  }
  function closeDialog(){const root=document.getElementById('dialog-root');root.innerHTML='';modalSubmit=null;}
  function dialogHead(title,sub=''){return `<div class="dialog-head"><div><div class="dialog-title">${esc(title)}</div>${sub?`<div class="dialog-sub">${esc(sub)}</div>`:''}</div><button type="button" class="dialog-close" data-action="close-modal" aria-label="${t('取消')}">✕</button></div>`;}
  function actionButton(label,action,cls='btn',extra=''){return `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;}

  function render(){
    document.documentElement.style.setProperty('--font-scale',String(data.settings.fontScale||1));
    document.body.classList.toggle('offline',!navigator.onLine);
    const navItems=[['order','◫','点单'],['kitchen','▦','后厨'],['expo','↗','出菜口'],['admin','⚙','后台']];
    const nav=items=>items.map(([key,icon,label])=>`<button class="${role===key?'active':''}" data-action="navigate" data-role="${key}"><span class="nav-icon">${icon}</span>${t(label)}</button>`).join('');
    const titleMap={order:currentTable?'桌位点单':'选一桌开始点单',kitchen:'后厨看单',expo:'出菜口划单',admin:'后台管理'};
    document.getElementById('app').innerHTML=`<div class="shell"><div class="offline-banner">${t('离线')} · ${t('数据已保存在本机浏览器，多开窗口可同步')}</div><header class="topbar"><div class="brand"><div class="brand-mark">LW</div><div><div class="brand-name">Le Weilai</div><div class="brand-sub">SERVICE SYSTEM</div></div></div><nav class="nav" aria-label="${t('操作')}">${nav(navItems)}</nav><div class="top-spacer"></div><div class="demo-pill">${t('当前浏览器演示')}</div><div class="live-pill"><span class="live-dot"></span><span>${t('正在营业')}</span></div><div class="top-actions"><button class="lang-btn" data-action="language">${language==='zh'?'中 / FR':'FR / 中'}</button></div></header><main class="main">${role==='order'?renderOrderPage():role==='kitchen'?renderKitchenPage():role==='expo'?renderExpoPage():renderAdminPage()}</main><nav class="mobile-nav" aria-label="${t('操作')}">${nav(navItems)}</nav></div>`;
    updateClocks();
  }
  function heading(title,description='',actions=''){
    return `<div class="page-heading"><div><div class="eyebrow">LE WEILAI / ${role==='order'?'SERVICE':role==='kitchen'?'KITCHEN':role==='expo'?'PASS':'MANAGEMENT'}</div><h1 class="page-title">${t(title)}</h1>${description?`<p class="page-description">${t(description)}</p>`:''}</div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`;
  }
  function renderTableMap(){
    const groups=['室内','露台'];
    const tiles=zone=>data.tables.filter(table=>table.zone===zone).map(table=>{
      const status=tableStatus(table),items=pendingFor(table.id),covers=ordersFor(table.id).find(order=>items.length&&order.items.some(item=>item.status==='pending'))?.covers;
      const stateLabel=status==='free'?t('空闲'):status==='done'?t('已出齐'):status==='late'?`${t('超时')} · ${tableAge(table.id)} ${t('分钟')}`:status==='warning'?`${t('等待')} ${tableAge(table.id)} ${t('分钟')}`:t('点单中');
      return `<button class="table-tile is-${status}" data-action="select-table" data-id="${esc(table.id)}"><i class="tile-border"></i><span class="table-number">${esc(table.id)}</span><span class="table-people">${covers?`♙ ${covers}`:table.seats+' '+t('人')}</span><div class="tile-zone">${t(zone)} · ${table.seats} ${t('人')}</div><div class="table-state"><strong>${stateLabel}</strong><span>${items.length?`${items.length} ${t('道')||'道'}`:timeOf(now())}</span></div></button>`;
    }).join('');
    return `<section class="surface table-panel"><div class="panel-head"><div><h2 class="panel-title">${t('桌位')} <span class="muted">/ 12</span></h2><div class="panel-note">${t('桌点后输入人数，选菜并发送')}</div></div><span class="tag tag-lime">${activeTables().length} ${t('正在出菜')}</span></div>${groups.map(zone=>`<div class="zone-head">${t(zone)}</div><div class="table-grid">${tiles(zone)}</div>`).join('')}</section>`;
  }
  function renderOrderPage(){
    if(!currentTable){
      const active=activeTables(),items=allItems().filter(item=>item.status==='served'&&isToday(item.servedAt));
      const headingActions=`<button class="btn btn-quiet" data-action="reset-demo">↻ ${t('重置演示')}</button>`;
      return `${heading('选一桌开始点单','点桌后输入人数，选菜并发送',headingActions)}<div class="table-layout">${renderTableMap()}<aside class="surface table-side"><div class="panel-head"><div class="side-title">${t('今日服务概览')}</div><span class="side-count">${new Date().toLocaleDateString(language==='fr'?'fr-FR':'zh-CN',{day:'2-digit',month:'short'})}</span></div><div class="side-stat"><span>${t('当前等待桌')}</span><b>${active.length} ${t('桌')}</b></div><div class="side-stat"><span>${t('待上桌')}</span><b>${qtyTotal(allItems().filter(item=>item.status==='pending'))} ${t('份')}</b></div><div class="side-stat"><span>${t('今日已完成')}</span><b>${items.length} ${t('份')}</b></div><div class="side-tip"><b>${t('三步完成')}</b><br>${t('选桌')} → ${t('点菜')} → ${t('发送订单')}<br>${t('售罄菜品会即时禁点；出菜口划单后所有屏幕同步更新。')}</div></aside></div>`;
    }
    const table=data.tables.find(row=>row.id===currentTable)||{id:currentTable,zone:'室内',seats:4},active=currentPending(),previousOrders=ordersFor(currentTable),existing=previousOrders.length>0,covers=previousOrders.at(-1)?.covers||coversDraft;
    const count=qtyTotal(basket),total=basket.reduce((sum,item)=>sum+(catalogItem(item.menuId)?.price||0)*item.qty,0);
    const actions=`<button class="btn btn-small btn-quiet" data-action="return-tables">← ${t('返回桌位')}</button>${active.length?`<button class="btn btn-small" data-action="call-table">♧ ${t('催菜')}</button>`:''}`;
    const activeList=active.length?`<div class="notice"><b>${t('本桌未上桌')} · ${active.length} ${t('道菜')}</b><div class="section-divider"></div>${active.map(item=>`<div class="manage-row" style="margin:5px 0"><div><div class="manage-name">${esc(language==='fr'?item.fr:item.name)} × ${item.qty}</div><div class="manage-meta">${item.status==='pending'?t('待做'):t('已上桌')} · ${sinceLabel(item.createdAt)}</div></div><button class="btn btn-small btn-danger" data-action="change-item" data-order="${esc(item.orderId)}" data-item="${esc(item.id)}">${t('改单 / 退菜')}</button></div>`).join('')}</div>`:'';
    const categories=['全部',...new Set(data.catalog.filter(item=>item.active).map(item=>item.category))];
    return `${heading('桌位点单',`${t(table.zone)} · ${covers} ${t('人')}`,actions)}<div class="order-topline"><div class="desk-chip">${esc(currentTable)}</div><span class="tag ${existing?'tag-lime':''}">${existing?t('加菜'):t('新单')}</span><span class="tag">${covers} ${t('人')}</span><div class="searchbox"><input id="menu-search" type="search" placeholder="${t('搜索菜名、拼音首字母或编号')}" value="${esc(search)}" autocomplete="off"></div></div><div class="order-layout"><section class="surface menu-panel">${activeList}<div class="category-row">${categories.map(name=>`<button class="category-pill ${category===name?'active':''}" data-action="category" data-value="${esc(name)}">${esc(frCategory(name))}</button>`).join('')}</div><div class="menu-grid" id="menu-grid">${renderMenuCards()}</div><div class="demo-footnote">${t('菜品与饮品在同一菜单中选择；饮品只显示在出菜口。')}</div></section><aside class="surface order-summary"><div class="panel-head"><div><h2 class="panel-title">${t('下单篮')}</h2><div class="panel-note">${existing?t('加菜'):t('新单')} · ${esc(currentTable)}</div></div><span class="tag tag-lime">${count} ${t('份')}</span></div>${basket.length?`<div class="basket-list">${basket.map(renderBasketRow).join('')}</div>`:`<div class="basket-empty">${t('还没有选菜')}<br><span class="muted">${t('从菜单点＋添加')}</span></div>`}<div class="summary-total"><span>${t('小计')} · ${count} ${t('份')}</span><strong>${money(total)}</strong></div><div class="summary-actions"><button class="btn btn-primary" data-action="review-order" ${basket.length?'':'disabled'}>${t('确认并发送')} →</button><button class="btn" data-action="reprint" ${lastTicket?'':'disabled'}>▤ ${t('重新打印')}</button><button class="btn btn-quiet" data-action="clear-basket" ${basket.length?'':'disabled'}>${t('清空')}</button></div><p class="demo-footnote">${t('发送后生成小票预览。接入 Epson ePOS 后可自动打印。')}</p></aside></div>`;
  }
  function renderMenuCards(){
    if(!currentTable)return'';
    const query=search.trim().toLocaleLowerCase();
    const rows=data.catalog.filter(item=>item.active&&(category==='全部'||item.category===category)).filter(item=>!query||`${item.name} ${item.fr} ${item.code} ${item.aliases}`.toLocaleLowerCase().includes(query));
    if(!rows.length)return `<div class="empty-message">${t('没有找到匹配的菜品')}</div>`;
    return rows.map(item=>{
      const qty=basket.find(row=>row.menuId===item.id)?.qty||0,soldout=item.stock!==null&&item.stock<=0;
      const typeLabel=item.type==='drink'?'饮品酒水':'菜品';
      return `<article class="menu-card ${soldout?'soldout':''}"><div><div class="menu-name">${esc(language==='fr'?item.fr:item.name)}</div><div class="menu-fr">${esc(language==='fr'?item.name:item.fr)}</div></div><div class="menu-bottom"><div><div class="menu-meta"><span class="menu-price">${money(item.price)}</span><span class="menu-code">${esc(item.code)}</span></div><div class="menu-fr">${frCategory(item.category)} · ${item.type==='drink'?t('饮品酒水'):t('菜品')}${item.allergens?` · ${t('过敏原')}: ${esc(item.allergens)}`:''}</div></div><button class="menu-add" aria-label="${t('添加')} ${esc(item.name)}" data-action="add-to-basket" data-id="${esc(item.id)}" ${soldout?'disabled':''}>${soldout?'×':qty?`+${qty}`:'+'}</button></div>${item.stock!==null&&item.stock<=5&&!soldout?`<span class="tag tag-orange">${t('剩')} ${item.stock}</span>`:''}${soldout?`<span class="tag tag-red">${t('菜品已沽清')}</span>`:''}</article>`;
    }).join('');
  }
  function renderBasketRow(row){
    const item=catalogItem(row.menuId);if(!item)return'';
    return `<div class="basket-row"><div class="basket-name"><span>${esc(language==='fr'?item.fr:item.name)}${item.type==='drink'?` <span class="tag tag-blue">${t('饮品酒水')}</span>`:''}</span><span>${money(item.price*row.qty)}</span></div><div class="basket-controls"><div class="qty-controls"><button data-action="basket-qty" data-id="${esc(item.id)}" data-delta="-1" aria-label="−">−</button><b>${row.qty}</b><button data-action="basket-qty" data-id="${esc(item.id)}" data-delta="1" aria-label="+">+</button></div><span class="menu-code">${esc(item.code)}</span></div><div class="quick-tags">${tagLabels.map(tag=>`<button class="quick-tag ${row.tags?.includes(tag)?'active':''}" data-action="basket-tag" data-id="${esc(item.id)}" data-tag="${esc(tag)}">${esc(tagsInLocale(tag))}</button>`).join('')}</div><textarea data-note="${esc(item.id)}" placeholder="${t('补充备注')}" aria-label="${t('备注')} · ${esc(item.name)}">${esc(row.note||'')}</textarea></div>`;
  }
  function renderKitchenPage(){
    const tables=activeTables().slice().sort((a,b)=>{
      const mode=sortBy||data.settings.sortBy;
      if(mode==='table')return a.id.localeCompare(b.id,undefined,{numeric:true});
      const ap=pendingFor(a.id),bp=pendingFor(b.id);return new Date(Math.min(...ap.map(i=>new Date(i.orderCreatedAt))))-new Date(Math.min(...bp.map(i=>new Date(i.orderCreatedAt))));
    });
    const cards=tables.map(table=>renderKitchenCard(table)).join('');
    const dataItems=allItems().filter(item=>item.status==='pending'&&item.type==='dish');
    const totals=new Map();dataItems.forEach(item=>{const key=item.menuId||item.name;if(!totals.has(key))totals.set(key,{name:language==='fr'?item.fr:item.name,total:0,tables:new Map()});const row=totals.get(key);row.total+=item.qty;row.tables.set(item.tableId,(row.tables.get(item.tableId)||0)+item.qty);});
    const aggregate=[...totals.values()].sort((a,b)=>b.total-a.total).map(item=>`<div class="ingredient-row"><div class="ingredient-top"><span class="ingredient-name">${esc(item.name)}</span><span class="ingredient-total">×${item.total}</span></div><div class="ingredient-tables">${[...item.tables].map(([table,qty])=>`${table} × ${qty}`).join(' · ')}</div></div>`).join('');
    const sortSelect=`<select class="sort-control" data-change="sort-by" aria-label="${t('桌位排序')}"><option value="time" ${(sortBy||data.settings.sortBy)==='time'?'selected':''}>${t('按下单时间')}</option><option value="table" ${(sortBy||data.settings.sortBy)==='table'?'selected':''}>${t('按桌号')}</option></select>`;
    return `${heading('后厨看单','只显示菜品 · 出菜口划单后同步消失',sortSelect)}<div class="kitchen-layout"><section class="kitchen-board">${cards||`<div class="kitchen-empty"><b>${t('暂无待做菜品')}</b>${t('所有桌位都已出齐')}</div>`}</section><aside class="surface summary-panel"><div class="panel-head"><div><div class="panel-title">${t('同菜汇总')}</div><div class="panel-note">${t('按份数从多到少')}</div></div><span class="tag tag-lime">${qtyTotal(dataItems)} ${t('份')}</span></div>${aggregate||`<div class="basket-empty">${t('暂无待做菜品')}</div>`}<div class="demo-footnote">${t('饮品酒水只在出菜口显示。厨房屏只看不点。')}</div></aside></div>`;
  }
  function renderKitchenCard(table){
    const items=pendingFor(table.id).filter(item=>item.type==='dish'),all=pendingFor(table.id);if(!items.length)return'';
    const age=Math.max(...items.map(item=>minSince(item.createdAt))),status=age>=data.settings.timeoutLate?'late':age>=data.settings.timeoutWarn?'warning':'',last=tableLastServed(table.id),gap=last?minSince(last):null,gapAlert=gap!==null&&gap>=data.settings.gapWarn;
    const allergen=items.some(item=>/过敏|allerg/i.test(item.note||''));
    const cancelNotices=allItems().filter(item=>item.tableId===table.id&&item.status==='cancelled'&&item.cancelledAt&&Date.now()-new Date(item.cancelledAt)<10000);
    return `<article class="kitchen-card ${status} ${gapAlert?'gap-alert':''} ${items.some(item=>item.rush)?'rushing':''} ${allergen?'flash-note':''}" data-max-age="${age}" data-gap-age="${gap??0}"><div class="kitchen-card-head"><div class="kitchen-number">${esc(table.id)}</div><div class="kitchen-head-right"><div class="kitchen-cover">${all[0]?.covers||table.seats} ${t('人')} · ${t('下单')} ${timeOf(items[0].orderCreatedAt)}</div><div class="kitchen-age"><span data-live="${esc(items[0].orderCreatedAt)}">${minSince(items[0].orderCreatedAt)}</span> ${t('分钟')}</div></div><div class="kitchen-gap">${last?`${t('上一道出菜后')} <b><span data-clock-kind="gap" data-live="${esc(last)}">${gap}</span> ${t('分钟')}</b>`:`${t('等待断档')} · —`}</div></div>${allergen?`<div class="allergen-panel">⚠ ${t('过敏提醒')} · ${esc(items.find(i=>/过敏|allerg/i.test(i.note||''))?.note||'')}</div>`:''}<div class="kitchen-items">${items.map(item=>renderKitchenItem(item)).join('')}${cancelNotices.map(item=>`<div class="kitchen-item flash-note" data-cancel-at="${esc(item.cancelledAt)}"><div class="kitchen-item-head"><span class="kitchen-dish" style="text-decoration:line-through;color:#ff9c8d">${esc(language==='fr'?item.fr:item.name)} × ${item.qty}</span><span class="tag tag-red">${t('退菜')} · 10s</span></div></div>`).join('')}</div></article>`;
  }
  function renderKitchenItem(item){
    const age=minSince(item.createdAt),status=age>=data.settings.timeoutLate?'late':age>=data.settings.timeoutWarn?'warning':'';
    return `<div class="kitchen-item ${item.rush?'flash-note':''}"><div class="kitchen-item-head"><span class="kitchen-dish">${esc(language==='fr'?item.fr:item.name)}${item.added?` <span class="tag tag-lime">${t('加')}</span>`:''}</span><span class="kitchen-qty">×${item.qty}</span></div><div class="kitchen-item-meta"><span class="kitchen-timer ${status}" data-live="${esc(item.createdAt)}">${age} ${t('分钟')}</span>${item.rush?`<span class="tag tag-orange blink">${t('催菜')}</span>`:''}<span class="tag ${status==='late'?'tag-red':status==='warning'?'tag-orange':''}">${status==='late'?t('超时'):status==='warning'?t('等待'):t('待做')}</span></div>${item.note?`<div class="kitchen-notes">${item.allergens&&/过敏|allerg/i.test(item.note)?'⚠ ':''}${esc(item.note)}</div>`:''}</div>`;
  }
  function renderExpoPage(){
    const tables=activeTables().slice().sort((a,b)=>{
      const mode=sortBy||data.settings.sortBy;if(mode==='table')return a.id.localeCompare(b.id,undefined,{numeric:true});
      return new Date(pendingFor(a.id)[0].orderCreatedAt)-new Date(pendingFor(b.id)[0].orderCreatedAt);
    });
    const cards=tables.map(table=>renderExpoCard(table)).join('');
    const canUndo=data.undoServe&&Date.now()-new Date(data.undoServe.at)<10000;
    const toolbar=`<select class="sort-control" data-change="sort-by" aria-label="${t('桌位排序')}"><option value="time" ${(sortBy||data.settings.sortBy)==='time'?'selected':''}>${t('按下单时间')}</option><option value="table" ${(sortBy||data.settings.sortBy)==='table'?'selected':''}>${t('按桌号')}</option></select><button class="btn btn-small" data-action="quick-soldout">⚡ ${t('沽清')}</button><button class="btn btn-small" data-action="go-today">▤ ${t('今日概览')}</button><button class="btn btn-small" data-action="go-admin">⚙ ${t('切换到后台')}</button>`;
    const cancelled=data.undoServe;
    return `${heading('出菜口划单','每道菜点「已上桌」；饮品在此准备，不经过后厨',toolbar)}${canUndo?`<div class="undo-bar"><span>↶ ${t('撤销刚才划单')} · <b><span id="undo-clock">${Math.max(1,10-Math.floor((Date.now()-new Date(data.undoServe.at))/1000))}</span> s</b></span><button class="btn btn-small" data-action="undo-serve">${t('撤销')}</button></div>`:''}${cards?`<section class="expo-board">${cards}</section>`:`<div class="expo-empty"><span>✓</span><b>${t('没有待上桌的菜')}</b><br>${t('正在出菜的桌位会显示在这里')}</div>`}`;
  }
  function renderExpoCard(table){
    const items=pendingFor(table.id),servedToday=ordersFor(table.id).flatMap(order=>order.items.filter(item=>item.status==='served'&&isToday(item.servedAt))).length,age=Math.max(...items.map(item=>minSince(item.createdAt)),0),status=age>=data.settings.timeoutLate?'late':age>=data.settings.timeoutWarn?'warning':'',last=tableLastServed(table.id),gap=last?minSince(last):0,gapAlert=!!last&&gap>=data.settings.gapWarn;
    return `<article class="expo-card ${status} ${gapAlert?'gap-alert':''}" data-gap-age="${last?gap:0}"><div class="expo-card-head"><div><div class="expo-table">${esc(table.id)}</div><div class="expo-head-meta">${items[0]?.covers||table.seats} ${t('人')} · ${t('下单')} ${timeOf(items[0].orderCreatedAt)} · <span data-live="${esc(items[0].orderCreatedAt)}">${minSince(items[0].orderCreatedAt)}</span> ${t('分钟')}</div><div class="expo-head-meta">${t('上一道出菜后')} ${last?`<span data-clock-kind="gap" data-live="${esc(last)}">${gap}</span>`:0} ${t('分钟')}</div></div><div class="expo-progress">${t('已上桌')}<br><b>${servedToday}/${servedToday+items.length}</b></div></div><div class="expo-items">${items.map(item=>`<div class="expo-item ${item.type==='drink'?'drink':''}"><div>${item.type==='drink'?`<div class="expo-kind">${t('饮品酒水')} · ${t('服务员自备')}</div>`:''}<div class="expo-name">${esc(language==='fr'?item.fr:item.name)} × ${item.qty}${item.added?` <span class="tag tag-lime">${t('加')}</span>`:''}</div><div class="kitchen-item-meta"><span class="kitchen-timer" data-live="${esc(item.createdAt)}">${minSince(item.createdAt)} ${t('分钟')}</span>${item.rush?`<span class="tag tag-orange">${t('催菜')}</span>`:''}</div>${item.note?`<div class="kitchen-notes">${esc(item.note)}</div>`:''}</div><button class="serve-btn" data-action="serve-one" data-order="${esc(item.orderId)}" data-item="${esc(item.id)}">✓ ${t('已上桌')}</button></div>`).join('')}</div><div class="all-served"><button class="btn btn-small btn-primary" data-action="serve-table" data-table="${esc(table.id)}">${t('整桌上齐')} · ${items.length} ${t('道菜')}</button></div></article>`;
  }
  function todayStats(){
    const today=data.orders.filter(order=>isToday(order.createdAt)),served=allItems().filter(item=>item.status==='served'&&isToday(item.servedAt));
    const sold=new Map();served.forEach(item=>{const key=item.name;sold.set(key,(sold.get(key)||0)+item.qty);});
    const times=allItems().filter(item=>item.status==='served'&&item.servedAt&&isToday(item.servedAt)).map(item=>(new Date(item.servedAt)-new Date(item.createdAt))/60000).filter(value=>value>=0);
    const covers=new Map();today.forEach(order=>covers.set(order.tableId,Math.max(covers.get(order.tableId)||0,order.covers)));
    return {orders:today.length,covers:[...covers.values()].reduce((sum,value)=>sum+value,0),served:qtyTotal(served),avg:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):0,best:[...sold].sort((a,b)=>b[1]-a[1]).slice(0,5)};
  }
  function renderAdminPage(){
    const tabs=[['today','今日概览'],['menu','菜单管理'],['stock','沽清'],['tables','桌位'],['logs','日志'],['settings','参数设置']];
    const content=managerPage==='today'?renderTodayAdmin():managerPage==='menu'?renderMenuAdmin():managerPage==='stock'?renderStockAdmin():managerPage==='tables'?renderTablesAdmin():managerPage==='logs'?renderLogsAdmin():renderSettingsAdmin();
    return `${heading('后台管理','菜单、沽清、桌位与今日营业数据',`<button class="btn btn-small btn-quiet" data-action="reset-demo">↻ ${t('重置演示')}</button>`)}<div class="admin-tabs">${tabs.map(([key,label])=>`<button class="${managerPage===key?'active':''}" data-action="admin-tab" data-page="${key}">${t(label)}</button>`).join('')}</div>${content}`;
  }
  function renderTodayAdmin(){
    const stats=todayStats(),active=activeTables().length;
    return `<div class="stats-grid"><article class="surface stat-card"><div class="stat-label">${t('今日订单')}</div><div class="stat-value">${stats.orders}</div><div class="stat-sub">${t('含堂食与加菜')}</div></article><article class="surface stat-card"><div class="stat-label">${t('今日人数')}</div><div class="stat-value">${stats.covers}</div><div class="stat-sub">couverts</div></article><article class="surface stat-card"><div class="stat-label">${t('当前等待桌')}</div><div class="stat-value">${active}</div><div class="stat-sub">${qtyTotal(allItems().filter(item=>item.status==='pending'))} ${t('份')} ${t('未上桌')}</div></article><article class="surface stat-card"><div class="stat-label">${t('平均出餐')}</div><div class="stat-value">${stats.avg}<span style="font-size:14px"> ${t('分钟')}</span></div><div class="stat-sub">${t('按菜品下单至划单')}</div></article></div><div class="admin-grid"><section class="surface admin-panel"><div class="panel-head"><div><h2 class="panel-title">${t('热销菜品')}</h2><div class="panel-note">${t('根据已划单菜品统计')}</div></div></div>${stats.best.length?stats.best.map(([name,qty],i)=>`<div class="rank-row"><span class="rank-num">0${i+1}</span><span class="rank-name">${esc(language==='fr'?data.catalog.find(item=>item.name===name)?.fr||name:name)}</span><span class="rank-qty">× ${qty}</span></div>`).join(''):`<div class="basket-empty">${t('今日还没有已上桌菜品')}</div>`}</section><section class="surface admin-panel"><div class="panel-head"><div><h2 class="panel-title">${t('桌位状态')}</h2><div class="panel-note">${data.tables.length} ${t('台')}</div></div><button class="soft-link" data-action="navigate" data-role="expo">${t('打开出菜口')} →</button></div>${data.tables.map(table=>{const status=tableStatus(table),items=pendingFor(table.id);return `<div class="manage-row"><div><div class="manage-name">${esc(table.id)} · ${t(table.zone)}</div><div class="manage-meta">${status==='free'?t('空闲'):status==='done'?t('已出齐'):`${qtyTotal(items)} ${t('份')} · ${tableAge(table.id)} ${t('分钟')}`}</div></div><span class="tag ${status==='late'?'tag-red':status==='warning'?'tag-orange':status==='done'?'tag-green':''}">${status==='free'?t('空闲'):status==='done'?t('已出齐'):status==='late'?t('超时'):t('进行中')}</span></div>`;}).join('')}</section></div><div class="demo-footnote">${t('本演示不处理收银、支付或税控账单。正式营业需接入云同步与打印服务。')}</div>`;
  }
  function renderMenuAdmin(){
    return `<section class="surface admin-panel"><div class="panel-head"><div><h2 class="panel-title">${t('菜单管理')}</h2><div class="panel-note">${t('菜单中法名、分类、价格与售卖状态可在此维护')}</div></div><button class="btn btn-small btn-primary" data-action="new-menu-item">＋ ${t('新增菜品')}</button></div><div class="admin-list">${data.catalog.map(item=>`<div class="manage-row"><div><div class="manage-name">${esc(item.name)} <span class="muted">· ${esc(item.fr)}</span></div><div class="manage-meta">${esc(item.code)} · ${frCategory(item.category)} · ${item.type==='drink'?t('饮品酒水'):t('菜品')} · ${money(item.price)}${item.allergens?` · ${t('过敏原')}: ${esc(item.allergens)}`:''}</div></div><div class="manage-actions"><span class="tag ${item.active?'tag-green':'tag-red'}">${item.active?t('上架'):'已下架'}</span><button class="btn btn-small" data-action="edit-menu-item" data-id="${esc(item.id)}">${t('编辑')}</button></div></div>`).join('')}</div></section>`;
  }
  function renderStockAdmin(){
    return `<div class="notice"><b>${t('次日营业可重置沽清状态')}</b> · ${t('限量库存减至 0 份后，点单端自动显示售罄。')}</div><section class="surface admin-panel"><div class="panel-head"><div><h2 class="panel-title">${t('沽清与限量')}</h2><div class="panel-note">${t('修改库存后，点单菜单即刻更新')}</div></div></div><div class="admin-list">${data.catalog.map(item=>`<div class="manage-row"><div><div class="manage-name">${esc(language==='fr'?item.fr:item.name)} <span class="tag ${item.type==='drink'?'tag-blue':''}">${item.type==='drink'?t('饮品酒水'):t('菜品')}</span></div><div class="manage-meta">${esc(item.code)} · ${item.stock===null?t('无限量'):`${t('当前剩余')} ${item.stock} ${t('份')}`}</div></div><div class="manage-actions"><button class="btn btn-small ${item.stock===0?'btn-primary':''}" data-action="toggle-stock" data-id="${esc(item.id)}">${item.stock===0?t('恢复售卖'):t('一键沽清')}</button><input class="setting-input stock-input" type="number" min="0" max="999" value="${item.stock??''}" placeholder="∞" aria-label="${t('库存数量')} · ${esc(item.name)}" data-stock="${esc(item.id)}"><button class="btn btn-small" data-action="save-stock" data-id="${esc(item.id)}">${t('保存')}</button></div></div>`).join('')}</div></section>`;
  }
  function renderTablesAdmin(){
    return `<section class="surface admin-panel"><div class="panel-head"><div><h2 class="panel-title">${t('桌位')}</h2><div class="panel-note">${t('桌号、区域与座位数')}</div></div><button class="btn btn-small btn-primary" data-action="new-table">＋ ${t('新增桌位')}</button></div><div class="admin-list">${data.tables.map(table=>`<div class="manage-row"><div><div class="manage-name">${esc(table.id)} · ${t(table.zone)}</div><div class="manage-meta">${table.seats} ${t('人')} · ${tableStatus(table)==='free'?t('空闲'):t('当前等待桌')}</div></div><div class="manage-actions"><button class="btn btn-small" data-action="edit-table" data-id="${esc(table.id)}">${t('编辑')}</button><button class="btn btn-small btn-danger" data-action="remove-table" data-id="${esc(table.id)}">${t('删除')}</button></div></div>`).join('')}</div></section>`;
  }
  function renderLogsAdmin(){
    return `<section class="surface admin-panel"><div class="panel-head"><div><h2 class="panel-title">${t('数据日志')}</h2><div class="panel-note">${t('谁、什么时间、改了什么')}</div></div><span class="tag">${data.logs.length}</span></div><div class="event-list">${data.logs.slice(0,60).map(row=>`<div class="event-row"><span class="event-time">${new Date(row.at).toLocaleString(language==='fr'?'fr-FR':'zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}</span><span class="event-who">${esc(row.who)}</span><span class="event-what">${esc(row.what)}</span></div>`).join('')}</div></section>`;
  }
  function settingRow(label,help,control){return `<div class="setting-row"><div><div class="setting-label">${t(label)}</div>${help?`<div class="setting-help">${t(help)}</div>`:''}</div>${control}</div>`;}
  function renderSettingsAdmin(){
    const s=data.settings;
    return `<div class="admin-section"><section class="surface admin-panel"><div class="panel-head"><div><h2 class="panel-title">${t('出餐提醒')}</h2><div class="panel-note">${t('厨房屏与出菜口超时颜色阈值')}</div></div></div>${settingRow('变黄提醒','单道菜等待时长',`<div><input class="setting-input" type="number" min="1" max="120" value="${s.timeoutWarn}" data-setting="timeoutWarn"> ${t('分钟')}</div>`)}${settingRow('变红闪烁','单道菜等待时长',`<div><input class="setting-input" type="number" min="2" max="180" value="${s.timeoutLate}" data-setting="timeoutLate"> ${t('分钟')}</div>`)}${settingRow('断档提醒','上一道出菜后无新菜',`<div><input class="setting-input" type="number" min="1" max="90" value="${s.gapWarn}" data-setting="gapWarn"> ${t('分钟')}</div>`)}${settingRow('桌位排序','后厨屏与出菜口',`<select class="setting-input" data-setting="sortBy"><option value="time" ${s.sortBy==='time'?'selected':''}>${t('按下单时间')}</option><option value="table" ${s.sortBy==='table'?'selected':''}>${t('按桌号')}</option></select>`)}${settingRow('每日重置沽清','次日营业时恢复每日初始库存',`<label><input type="checkbox" data-setting="autoResetStock" ${s.autoResetStock!==false?'checked':''}> ${t('自动恢复')}</label>`)}</section><section class="surface admin-panel"><div class="panel-head"><div><h2 class="panel-title">${t('终端与打印')}</h2><div class="panel-note">${t('Epson TM-m30II · ePOS 网络打印')}</div></div></div>${settingRow('厨房字体大小','增强后厨可读性',`<select class="setting-input" data-setting="fontScale"><option value="1" ${s.fontScale==1?'selected':''}>100%</option><option value="1.1" ${s.fontScale==1.1?'selected':''}>110%</option><option value="1.2" ${s.fontScale==1.2?'selected':''}>120%</option><option value="1.3" ${s.fontScale==1.3?'selected':''}>130%</option></select>`)}${settingRow('提示音','浏览器演示音量',`<div><input class="setting-input" type="number" min="0" max="100" value="${s.soundKitchen}" data-setting="soundKitchen"> %</div>`)}${settingRow('打印机 IP','连接 Epson ePOS 后配置',`<input class="setting-input" type="text" placeholder="192.168.1.50" value="${esc(s.printerIp)}" data-setting="printerIp">`)}${settingRow('小票语言','中文 / 法文',`<select class="setting-input" data-setting="receiptLanguage"><option ${s.receiptLanguage==='中法双语'?'selected':''}>中法双语</option><option ${s.receiptLanguage==='中文'?'selected':''}>中文</option><option ${s.receiptLanguage==='法文'?'selected':''}>法文</option></select>`)}</section></div><div class="notice" style="margin-top:13px"><b>${t('演示版说明')}</b> · ${t('跨设备实时同步、账号 PIN、Epson ePOS 自动打印与断网补单需接入正式服务端。此演示使用本机浏览器存储。')}</div>`;
  }

  function openCovers(table){
    const row=data.tables.find(item=>item.id===table);
    if(pendingFor(table).length){currentTable=table;coversDraft=ordersFor(table).at(-1)?.covers||2;currentKind=ordersFor(table).at(-1)?.kind||'dine-in';basket=[];search='';category='全部';render();return;}
    coversDraft=2;
    openDialog(`${dialogHead(`${t('桌位')} ${table}`,`${t(row?.zone||'室内')} · ${row?.seats||4} ${t('座位')}`)}<form data-form="covers"><input type="hidden" name="table" value="${esc(table)}"><div class="field"><label>${t('请输入用餐人数')}</label><input type="number" name="covers" min="1" max="30" value="2" required></div><div class="field"><label>${t('订单类型')}</label><select name="kind"><option value="dine-in">${t('堂食')}</option><option value="takeaway">${t('打包')}</option></select></div><div class="dialog-actions"><button class="btn" type="button" data-action="close-modal">${t('取消')}</button><button class="btn btn-primary" type="submit">${t('下一步')} →</button></div></form>`);
  }
  function openReview(){
    if(!basket.length)return;
    const stockIssue=basket.find(row=>{const menu=catalogItem(row.menuId);return menu&&menu.stock!==null&&row.qty>menu.stock;});
    if(stockIssue){toast(`${catalogItem(stockIssue.menuId).name} · ${t('库存不足，请调整数量')}`,'error');return;}
    const total=basket.reduce((sum,row)=>sum+(catalogItem(row.menuId)?.price||0)*row.qty,0);
    openDialog(`${dialogHead(t('订单确认'),t('请核对菜品、数量和备注'))}<div class="notice">${t('桌位')} <b>${esc(currentTable)}</b> · ${coversDraft} ${t('人')}${ordersFor(currentTable).length?` · ${t('加菜')}`:''}</div><ul class="confirm-list">${basket.map(row=>{const item=catalogItem(row.menuId);return `<li><span><b>${esc(language==='fr'?item.fr:item.name)} × ${row.qty}</b>${row.note||row.tags?.length?`<small>${esc([...(row.tags||[]).map(tagsInLocale),row.note].filter(Boolean).join(' / '))}</small>`:''}</span><span>${money(item.price*row.qty)}</span></li>`;}).join('')}</ul><div class="confirm-total"><span>${t('共')} ${qtyTotal(basket)} ${t('份')}</span><span>${money(total)}</span></div><p class="demo-footnote">${t('发送后将生成小票')} · ${t('模拟 Epson 小票打印')}</p><div class="dialog-actions"><button class="btn" data-action="close-modal">${t('继续选菜')}</button><button class="btn btn-primary" data-action="confirm-send">${t('确认并发送')} →</button></div>`);
  }
  function sendOrder(){
    if(!currentTable||!basket.length)return;
    const conflict=basket.find(row=>{const menu=catalogItem(row.menuId);return !menu||!menu.active||(menu.stock!==null&&row.qty>menu.stock);});
    if(conflict){closeDialog();toast(`${catalogItem(conflict.menuId)?.name||''} · ${t('菜品已沽清')}`,'error');return;}
    const orderId=`LW-${data.nextOrder++}`,stamp=now(),existing=ordersFor(currentTable).length>0;
    const items=basket.map(row=>{const menu=catalogItem(row.menuId);if(menu.stock!==null)menu.stock-=row.qty;return {id:uid('it'),menuId:menu.id,name:menu.name,fr:menu.fr,category:menu.category,type:menu.type,qty:row.qty,createdAt:stamp,status:'pending',note:[...(row.tags||[]).map(tagsInLocale),row.note].filter(Boolean).join(' / '),added:existing,rush:false,allergens:menu.allergens,servedAt:null,cancelledAt:null};});
    const order={id:orderId,tableId:currentTable,covers:Number(coversDraft)||2,createdAt:stamp,kind:currentKind,items};data.orders.push(order);
    const tableName=currentTable;addLog(`${tableName} ${existing?t('加菜'):t('下单')} · ${items.map(item=>`${item.name} ×${item.qty}`).join('、')}`,'服务员');
    data.lastTicket={orderId,tableId:tableName,covers:order.covers,createdAt:stamp,items:items.map(item=>({...item})),kind:order.kind};
    lastTicket=data.lastTicket;basket=[];closeDialog();persist();sound(880,.16);setTimeout(()=>sound(1120,.1),130);toast(`${tableName} · ${t('发送成功')} · ${t('小票预览')}`);
    showTicket(lastTicket,true);
  }
  function showTicket(ticket,recent=false){
    if(!ticket)return;
    const total=ticket.items.reduce((sum,item)=>sum+(catalogItem(item.menuId)?.price||0)*item.qty,0);
    openDialog(`${dialogHead(t('小票预览'),`${ticket.orderId} · ${timeOf(ticket.createdAt)}`)}<div class="ticket"><h2>Le Weilai</h2><div class="ticket-meta">${t('桌位')} ${esc(ticket.tableId)} · ${ticket.covers} ${t('人')} · ${timeOf(ticket.createdAt)}</div><hr>${ticket.items.map(item=>`<div class="ticket-line"><span>${esc(item.name)} × ${item.qty}</span><span>${money((catalogItem(item.menuId)?.price||0)*item.qty)}</span></div>${item.note?`<div class="ticket-note">${esc(item.note)}</div>`:''}`).join('')}<hr><div class="ticket-line"><b>${t('总计')}</b><b>${money(total)}</b></div><div class="ticket-foot">${ticket.kind==='takeaway'?t('打包'):t('堂食')} · ${t('仅供录单，不是结账凭证')}</div></div><div class="notice" style="margin-top:14px">${t('打印机未连接')} · ${t('小票已生成，可在浏览器打印对话框选择打印机。')}</div><div class="dialog-actions"><button class="btn" data-action="close-modal">${t('完成')}</button><button class="btn btn-primary" data-action="print-ticket">▤ ${t('打印小票')}</button></div>`);
  }
  function printTicket(){
    if(!lastTicket)return;
    const ticket=lastTicket,total=ticket.items.reduce((sum,item)=>sum+(catalogItem(item.menuId)?.price||0)*item.qty,0);
    document.getElementById('print-area').innerHTML=`<div class="ticket"><h2>Le Weilai</h2><div class="ticket-meta">${t('桌位')} ${esc(ticket.tableId)} · ${ticket.covers} ${t('人')} · ${timeOf(ticket.createdAt)}</div><hr>${ticket.items.map(item=>`<div class="ticket-line"><span>${esc(item.name)} × ${item.qty}</span><span>${money((catalogItem(item.menuId)?.price||0)*item.qty)}</span></div>${item.note?`<div class="ticket-note">${esc(item.note)}</div>`:''}`).join('')}<hr><div class="ticket-line"><b>${t('总计')}</b><b>${money(total)}</b></div></div>`;
    window.print();
  }
  function serveItems(rows,tableId){
    if(!rows.length)return;
    const stamp=now();data.undoServe={at:stamp,items:rows.map(({orderId,item})=>({orderId,itemId:item.id,servedAt:item.servedAt||null})),tableId};
    rows.forEach(({orderId,item})=>{const order=data.orders.find(row=>row.id===orderId),target=order?.items.find(row=>row.id===item.id);if(target){target.status='served';target.servedAt=stamp;target.rush=false;}});
    addLog(`${tableId} · ${rows.map(({item})=>`${item.name} ×${item.qty}`).join('、')} · ${t('已上桌')}`,'出菜口');persist();sound(550,.08);toast(`${tableId} · ${t('已上桌')}`);
  }
  function undoServe(){
    const record=data.undoServe;if(!record||Date.now()-new Date(record.at)>10000){toast(t('撤销时限已过'),'error');return;}
    record.items.forEach(ref=>{const order=data.orders.find(row=>row.id===ref.orderId),item=order?.items.find(row=>row.id===ref.itemId);if(item){item.status='pending';item.servedAt=ref.servedAt||null;}});addLog(`${record.tableId} · ${t('撤销刚才划单')}`,'出菜口');data.undoServe=null;persist();toast(t('已撤销，后厨屏已恢复'));
  }
  function rushTable(tableId){
    const rows=pendingFor(tableId);if(!rows.length)return;
    const at=now();rows.forEach(row=>{const item=data.orders.find(order=>order.id===row.orderId)?.items.find(item=>item.id===row.id);if(item)item.rush=true;});addLog(`${tableId} · ${t('催菜')}`,'服务员');persist();sound(940,.2);toast(`${tableId} · ${t('已催厨房')}`);
  }
  function cancelItem(orderId,itemId,reason){
    const order=data.orders.find(row=>row.id===orderId),item=order?.items.find(row=>row.id===itemId);if(!item)return;
    if(item.status==='served'){toast(t('已上桌的菜不能退菜'),'error');return;}
    item.status='cancelled';item.cancelledAt=now();item.cancelReason=reason||t('退菜');addLog(`${order.tableId} · ${item.name} ×${item.qty} · ${item.cancelReason}`,'服务员');data.lastCancel={at:item.cancelledAt,tableId:order.tableId};persist();sound(320,.35);toast(`${t('退菜通知已发送')} · ${order.tableId}`);closeDialog();
  }
  function openCancelDialog(orderId,itemId){
    const order=data.orders.find(row=>row.id===orderId),item=order?.items.find(row=>row.id===itemId);if(!item)return;
    openDialog(`${dialogHead(t('改单 / 退菜'),`${order.tableId} · ${item.name} × ${item.qty}`)}<div class="notice">${t('退菜或改单将立即在后厨高亮显示，并记入操作日志。')}</div><form data-form="cancel-item"><input type="hidden" name="order" value="${esc(orderId)}"><input type="hidden" name="item" value="${esc(itemId)}"><div class="field"><label>${t('操作类型')}</label><select name="reason"><option>${t('退菜')}</option><option>${t('改单')}</option></select></div><div class="field"><label>${t('原因 / 新做法')}</label><textarea name="detail" placeholder="${t('例如：改为不辣，重新下单')}" required></textarea></div><div class="dialog-actions"><button class="btn" type="button" data-action="close-modal">${t('取消')}</button><button class="btn btn-danger" type="submit">${t('二次确认并通知后厨')}</button></div></form>`);
  }
  function openMenuDialog(item=null){
    const edit=!!item,categories=[...new Set([...data.catalog.map(row=>row.category),'热菜','凉菜','主食','汤品','饮料酒水'])];
    openDialog(`${dialogHead(edit?t('编辑菜品'):t('新增菜品'),t('中文名、法语名与沽清库存'))}<form data-form="menu-item"><input type="hidden" name="id" value="${esc(item?.id||'')}"><div class="split"><div class="field"><label>${t('中文名')}</label><input name="name" required value="${esc(item?.name||'')}"></div><div class="field"><label>${t('法语名')}</label><input name="fr" required value="${esc(item?.fr||'')}"></div></div><div class="split"><div class="field"><label>${t('编号')}</label><input name="code" required value="${esc(item?.code||`A${String(data.catalog.length+1).padStart(2,'0')}`)}"></div><div class="field"><label>${t('价格')} (€)</label><input name="price" type="number" min="0" step="0.1" required value="${item?.price??10}"></div></div><div class="split"><div class="field"><label>${t('分类')}</label><input name="category" list="category-list" required value="${esc(item?.category||'热菜')}"><datalist id="category-list">${categories.map(value=>`<option value="${esc(value)}">`).join('')}</datalist></div><div class="field"><label>${t('菜单类型')}</label><select name="type"><option value="dish" ${!item||item.type==='dish'?'selected':''}>${t('菜品')} · ${t('推后厨与出菜口')}</option><option value="drink" ${item?.type==='drink'?'selected':''}>${t('饮品酒水')} · ${t('只推到出菜口')}</option></select></div></div><div class="split"><div class="field"><label>${t('库存数量')} (${t('留空为无限量')})</label><input name="stock" type="number" min="0" value="${item?.stock??''}" placeholder="∞"></div><div class="field"><label>${t('过敏原')} · ${t('14 种法定过敏原')}</label><input name="allergens" value="${esc(item?.allergens||'')}"></div></div><div class="field"><label>${t('搜索别名')} · ${t('拼音首字母或法语关键词')}</label><input name="aliases" value="${esc(item?.aliases||'')}"></div><div class="field"><label><input type="checkbox" name="active" ${item?.active===false?'':'checked'}> ${t('上架')}</label></div><div class="dialog-actions"><button class="btn" type="button" data-action="close-modal">${t('取消')}</button><button class="btn btn-primary" type="submit">${t('保存')}</button></div></form>`);
  }
  function openTableDialog(table=null){
    openDialog(`${dialogHead(table?t('编辑桌位'):t('新增桌位'),t('桌号、区域与座位数'))}<form data-form="table"><input type="hidden" name="oldId" value="${esc(table?.id||'')}"><div class="field"><label>${t('桌号')}</label><input name="id" required value="${esc(table?.id||`T${String(data.tables.length+1).padStart(2,'0')}`)}"></div><div class="field"><label>${t('区域')}</label><select name="zone"><option ${table?.zone==='室内'?'selected':''}>室内</option><option ${table?.zone==='露台'?'selected':''}>露台</option></select></div><div class="field"><label>${t('座位数')}</label><input name="seats" type="number" min="1" max="20" value="${table?.seats||4}" required></div><div class="dialog-actions"><button class="btn" type="button" data-action="close-modal">${t('取消')}</button><button class="btn btn-primary" type="submit">${t('保存')}</button></div></form>`);
  }
  function resetDemo(){
    data=makeSeed();currentTable=null;basket=[];search='';category='全部';lastTicket=null;managerPage='today';persist();toast(t('演示数据已恢复'));
  }
  function updateClocks(){
    document.querySelectorAll('[data-live]').forEach(node=>{node.textContent=String(minSince(node.dataset.live));const age=minSince(node.dataset.live);node.classList.toggle('warning',age>=data.settings.timeoutWarn&&age<data.settings.timeoutLate);node.classList.toggle('late',age>=data.settings.timeoutLate);});
    document.querySelectorAll('[data-max-age]').forEach(node=>{const age=Math.max(...[...node.querySelectorAll('[data-live]')].map(span=>minSince(span.dataset.live)),0);node.dataset.maxAge=age;node.classList.toggle('warning',age>=data.settings.timeoutWarn&&age<data.settings.timeoutLate);node.classList.toggle('late',age>=data.settings.timeoutLate);});
    document.querySelectorAll('[data-gap-age]').forEach(node=>{const age=Math.max(...[...node.querySelectorAll('[data-clock-kind="gap"]')].map(span=>minSince(span.dataset.live)),0);node.dataset.gapAge=age;node.classList.toggle('gap-alert',age>=data.settings.gapWarn);});
    document.querySelectorAll('[data-cancel-at]').forEach(node=>{if(Date.now()-new Date(node.dataset.cancelAt).getTime()>=10000)node.remove();});
    const undo=document.getElementById('undo-clock');if(undo&&data.undoServe){const remain=10-Math.floor((Date.now()-new Date(data.undoServe.at))/1000);if(remain<0){data.undoServe=null;persist();}else undo.textContent=String(Math.max(1,remain));}
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    const action=button.dataset.action;
    if(action==='navigate'){role=button.dataset.role;if(role!=='order')currentTable=null;render();return;}
    if(action==='language'){language=language==='zh'?'fr':'zh';localStorage.setItem(`${STORE_KEY}:lang`,language);render();return;}
    if(action==='select-table'){openCovers(button.dataset.id);return;}
    if(action==='return-tables'){currentTable=null;basket=[];search='';category='全部';render();return;}
    if(action==='category'){category=button.dataset.value;render();return;}
    if(action==='add-to-basket'){const item=catalogItem(button.dataset.id);if(!item||item.stock===0)return;const row=basket.find(line=>line.menuId===item.id);if(row){if(item.stock!==null&&row.qty>=item.stock){toast(t('库存不足'),'error');return;}row.qty++;}else basket.push({menuId:item.id,qty:1,tags:[],note:''});render();return;}
    if(action==='basket-qty'){const row=basket.find(line=>line.menuId===button.dataset.id),item=catalogItem(button.dataset.id);if(!row)return;const delta=Number(button.dataset.delta);if(delta>0&&item.stock!==null&&row.qty>=item.stock){toast(t('库存不足'),'error');return;}row.qty+=delta;if(row.qty<=0)basket=basket.filter(line=>line!==row);render();return;}
    if(action==='basket-tag'){const row=basket.find(line=>line.menuId===button.dataset.id);if(!row)return;row.tags=row.tags||[];row.tags.includes(button.dataset.tag)?row.tags=row.tags.filter(tag=>tag!==button.dataset.tag):row.tags.push(button.dataset.tag);render();return;}
    if(action==='review-order'){openReview();return;}
    if(action==='confirm-send'){sendOrder();return;}
    if(action==='clear-basket'){basket=[];render();return;}
    if(action==='close-modal'){closeDialog();return;}
    if(action==='backdrop'){if(event.target===button)closeDialog();return;}
    if(action==='reprint'){if(data.lastTicket)lastTicket=data.lastTicket;showTicket(lastTicket);return;}
    if(action==='print-ticket'){printTicket();return;}
    if(action==='serve-one'){const order=data.orders.find(row=>row.id===button.dataset.order),item=order?.items.find(row=>row.id===button.dataset.item);if(item&&item.status==='pending')serveItems([{orderId:order.id,item}],order.tableId);return;}
    if(action==='serve-table'){const rows=data.orders.filter(order=>order.tableId===button.dataset.table).flatMap(order=>order.items.filter(item=>item.status==='pending').map(item=>({orderId:order.id,item})));serveItems(rows,button.dataset.table);return;}
    if(action==='undo-serve'){undoServe();return;}
    if(action==='call-table'){rushTable(currentTable);return;}
    if(action==='change-item'){openCancelDialog(button.dataset.order,button.dataset.item);return;}
    if(action==='admin-tab'){managerPage=button.dataset.page;render();return;}
    if(action==='go-today'){role='admin';managerPage='today';currentTable=null;render();return;}
    if(action==='go-admin'){role='admin';managerPage='stock';currentTable=null;render();return;}
    if(action==='quick-soldout'){role='admin';managerPage='stock';render();return;}
    if(action==='new-menu-item'){openMenuDialog();return;}
    if(action==='edit-menu-item'){openMenuDialog(catalogItem(button.dataset.id));return;}
    if(action==='toggle-stock'){const item=catalogItem(button.dataset.id);if(!item)return;if(item.stock===0){item.stock=item.stockBefore??item.dailyStock??null;delete item.stockBefore;addLog(`${item.name} · ${t('恢复售卖')}`);}else{item.stockBefore=item.stock;item.stock=0;addLog(`${item.name} · ${t('一键沽清')}`);}persist();toast(`${item.name} · ${item.stock===0?t('菜品已沽清'):t('恢复售卖')}`);return;}
    if(action==='save-stock'){const item=catalogItem(button.dataset.id),input=document.querySelector(`[data-stock="${CSS.escape(button.dataset.id)}"]`);if(!item||!input)return;item.stock=input.value===''?null:Math.max(0,Number(input.value));item.dailyStock=item.stock;delete item.stockBefore;addLog(`${item.name} · ${item.stock===0?t('沽清'):t('剩余')} ${item.stock??t('无限量')}`);persist();toast(t('库存已更新'));return;}
    if(action==='new-table'){openTableDialog();return;}
    if(action==='edit-table'){const row=data.tables.find(item=>item.id===button.dataset.id);openTableDialog(row);return;}
    if(action==='remove-table'){const table=data.tables.find(row=>row.id===button.dataset.id);if(!table)return;if(pendingFor(table.id).length){toast(t('有待上桌菜品，不能删除'),'error');return;}if(confirm(`${t('删除')} ${table.id}？`)){data.tables=data.tables.filter(row=>row.id!==table.id);addLog(`${table.id} · ${t('删除')}`);persist();}return;}
    if(action==='reset-demo'){if(confirm(`${t('重置演示')}？${t('所有当前演示数据将恢复为示例状态。')}`))resetDemo();return;}
    if(action==='edit-table'){openTableDialog(data.tables.find(item=>item.id===button.dataset.id));return;}
  });

  document.addEventListener('input',event=>{
    const target=event.target;
    if(target.id==='menu-search'){search=target.value;const grid=document.getElementById('menu-grid');if(grid)grid.innerHTML=renderMenuCards();return;}
    if(target.matches('[data-note]')){const row=basket.find(item=>item.menuId===target.dataset.note);if(row)row.note=target.value;return;}
  });
  document.addEventListener('change',event=>{
    const target=event.target;
    if(target.matches('[data-change="sort-by"]')){sortBy=target.value;render();return;}
    if(target.matches('[data-setting]')){const key=target.dataset.setting,value=target.type==='checkbox'?target.checked:target.type==='number'?Number(target.value):target.value;data.settings[key]=value;if(key==='sortBy')sortBy=value;addLog(`${t('参数设置')} · ${key} = ${value}`,'管理员');persist();toast(t('设置已保存'));return;}
    if(target.matches('[data-stock]'))return;
  });
  document.addEventListener('submit',event=>{
    const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();const values=Object.fromEntries(new FormData(form).entries());
    if(form.dataset.form==='covers'){currentTable=values.table;coversDraft=Math.max(1,Number(values.covers)||2);currentKind=values.kind||'dine-in';closeDialog();role='order';basket=[];search='';category='全部';render();if(currentKind==='takeaway'){toast(t('打包')+' · '+t('进入同一流程'));}return;}
    if(form.dataset.form==='cancel-item'){const detail=values.detail?.trim();cancelItem(values.order,values.item,`${values.reason}${detail?` · ${detail}`:''}`);return;}
    if(form.dataset.form==='menu-item'){
      const item={id:values.id||uid('m'),code:values.code.trim(),name:values.name.trim(),fr:values.fr.trim(),category:values.category.trim(),price:Number(values.price),type:values.type,stock:values.stock===''?null:Math.max(0,Number(values.stock)),allergens:values.allergens.trim(),aliases:values.aliases.trim(),active:form.querySelector('[name="active"]').checked};
      const index=data.catalog.findIndex(row=>row.id===item.id);if(index>=0)data.catalog[index]=item;else data.catalog.push(item);addLog(`${item.name} · ${index>=0?t('编辑'):t('新增菜品')}`,'管理员');closeDialog();persist();toast(t('菜单已保存'));return;
    }
    if(form.dataset.form==='table'){
      const next={id:values.id.trim().toUpperCase(),zone:values.zone,seats:Math.max(1,Number(values.seats)||4)},old=values.oldId;
      if(data.tables.some(row=>row.id===next.id&&row.id!==old)){toast(t('桌号已存在'),'error');return;}
      const index=data.tables.findIndex(row=>row.id===old);if(index>=0){data.tables[index]=next;if(old!==next.id)data.orders.filter(order=>order.tableId===old).forEach(order=>order.tableId=next.id);}else data.tables.push(next);addLog(`${next.id} · ${t(index>=0?'编辑':'新增桌位')}`,'管理员');closeDialog();persist();toast(t('桌位已保存'));return;
    }
  });
  if(channel)channel.onmessage=event=>{if(event.data?.from===tabId||!event.data?.state)return;data=event.data.state;try{localStorage.setItem(STORE_KEY,JSON.stringify(data));}catch{}render();};
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  window.addEventListener('storage',event=>{if(event.key===STORE_KEY&&event.newValue){try{data=JSON.parse(event.newValue);render();}catch{}}});
  window.addEventListener('online',render);window.addEventListener('offline',render);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDialog();});
  if(!localStorage.getItem(STORE_KEY))persist();else render();
  timerHandle=setInterval(updateClocks,1000);
})();
