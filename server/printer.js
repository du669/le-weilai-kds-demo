// Epson ePOS-Print XML over HTTP(S). The printer must be reachable by this server.
const configured = process.env.EPSON_PRINTER_URL?.trim() || '';
const printLanguage = process.env.EPSON_PRINT_LANG === 'zh' ? 'zh' : 'fr';

let endpoint = null;
if (configured) {
  endpoint = new URL(configured);
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.pathname !== '/cgi-bin/epos/service.cgi') {
    throw new Error('EPSON_PRINTER_URL 须为 Epson ePOS 的 /cgi-bin/epos/service.cgi 地址');
  }
  if (!endpoint.searchParams.has('devid')) endpoint.searchParams.set('devid', 'local_printer');
  if (!endpoint.searchParams.has('timeout')) endpoint.searchParams.set('timeout', '10000');
}

export const printerConfigured = !!endpoint;

const xmlEscape = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])
  .replace(/\r?\n/g, '&#10;');
const price = cents => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const text = value => `<text>${xmlEscape(value)}&#10;</text>`;

export function receiptXml(service, order) {
  const label = service.kind === 'takeaway'
    ? (printLanguage === 'zh' ? service.displayCode : `A EMPORTER ${service.displayCode.replace(/\D/g, '')}`)
    : (printLanguage === 'zh' ? `桌号 ${service.displayCode}` : `TABLE ${service.displayCode}`);
  const lines = [
    label,
    `${service.covers} ${printLanguage === 'zh' ? '人' : 'couverts'}  ${new Date(order.createdAt).toLocaleString('fr-FR')}`,
    '--------------------------------',
    ...order.items.flatMap(item => [
      `${printLanguage === 'zh' ? item.nameZh : item.nameFr} x${item.qty}  ${price(item.priceCents * item.qty)}`,
      ...(item.note ? [item.note] : [])
    ]),
    '--------------------------------',
    `${printLanguage === 'zh' ? '合计' : 'TOTAL'}  ${price(order.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0))}`,
    printLanguage === 'zh' ? '仅供录单，不是结账凭证' : 'Bon de commande - non fiscal'
  ];
  const document = `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print"><text lang="${printLanguage === 'zh' ? 'zh-hans' : 'en'}"/><text align="center" dw="true" dh="true">Le Weilai&#10;</text><text align="left" dw="false" dh="false"/>${lines.map(text).join('')}<cut type="feed"/></epos-print>`;
  return `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${document}</s:Body></s:Envelope>`;
}

export async function printOrder(service, order) {
  if (!endpoint) return { status: 'unconfigured', message: '未配置 Epson 打印机，可使用浏览器打印。' };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
        SOAPAction: '""'
      },
      body: receiptXml(service, order),
      signal: AbortSignal.timeout(12000)
    });
    const result = (await response.text()).slice(0, 8192);
    if (!response.ok) return { status: 'failed', message: `打印机返回 HTTP ${response.status}` };
    const match = result.match(/<response\b([^>]*)\/?\s*>/i);
    if (!match) return { status: 'failed', message: '打印机未返回有效 ePOS 结果' };
    const success = match[1].match(/\bsuccess=["']([^"']+)["']/i)?.[1];
    const code = match[1].match(/\bcode=["']([^"']*)["']/i)?.[1];
    if (!/^(true|1)$/i.test(success || '')) return { status: 'failed', message: `打印机未完成打印${code ? `：${code}` : ''}` };
    return { status: 'printed', message: 'Epson 打印机已确认接收小票' };
  } catch (error) {
    return { status: 'failed', message: `打印机连接失败：${error.message}` };
  }
}
