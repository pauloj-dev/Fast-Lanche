// Auditoria responsiva (Fase 42). Roda no navegador, nao no `npm test`.
//
// Uso (com `npm run dev`, que serve os arquivos do projeto):
//   1. abra http://localhost:5173/react/index.html (faca login e coloque itens no carrinho para cobrir mais estados);
//   2. no console: const { runResponsiveAudit } = await import('/tests/browser/responsive-audit.js');
//                  console.table((await runResponsiveAudit()).issues);
//
// Cada pagina e carregada num iframe com a largura exata, entao as media queries valem para aquela largura
// independentemente do tamanho da janela. Iframes de desktop tem barra de rolagem (~15px): a largura util fica menor
// que a de um celular real, o que deixa a auditoria um pouco mais rigorosa (margem de seguranca).

export const DEFAULT_WIDTHS = [320, 360, 375, 414, 768, 1024, 1440];
export const DEFAULT_PAGES = [
  'react/index.html', 'react/cardapio.html', 'react/carrinho.html', 'react/checkout.html', 'react/receipt.html',
  'react/login.html', 'react/perfil.html', 'react/reservas.html', 'react/feedbacks.html',
  'pages-html/reservas.html', 'pages-html/feedbacks.html'
];
// Formularios que devem ter uma coluna no celular.
const FORM_GRIDS = '.form-grid, .account-fields, .booking-contact, .booking-when, .profile-fields';
const MIN_TARGET = 24; // WCAG 2.5.8 (AA)
const COMFORT_TARGET = 40; // recomendado para toque

function loadFrame(page, width, height) {
  const frame = document.createElement('iframe');
  frame.style.cssText = `position:fixed;left:0;top:0;border:0;opacity:0;pointer-events:none;width:${width}px;height:${height}px`;
  frame.src = `/${page}`;
  document.body.appendChild(frame);
  return new Promise(resolve => {
    const done = () => resolve(frame);
    frame.onload = done;
    setTimeout(done, 8000);
  });
}

export async function auditPage(page, width, { wait = 1200, height = 900 } = {}) {
  const frame = await loadFrame(page, width, height);
  await new Promise(resolve => setTimeout(resolve, wait));
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  const cs = el => win.getComputedStyle(el);
  const visible = el => { const s = cs(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'); };
  const label = el => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '');
  const inScroller = el => { for (let node = el.parentElement; node && node !== doc.body; node = node.parentElement) if (['auto', 'scroll', 'hidden', 'clip'].includes(cs(node).overflowX)) return true; return false; };
  const unique = list => [...new Set(list)].slice(0, 8);
  const result = { page, width, overflowPx: Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth), offenders: [], smallTargets: [], tightTargets: 0, multiColumnForms: [], clipped: [], squeezed: [], spill: [] };

  doc.querySelectorAll('body *').forEach(el => {
    if (!visible(el)) return;
    const s = cs(el);
    const rect = el.getBoundingClientRect();
    // Elemento passando da borda da tela (fora de contêineres com rolagem intencional).
    if (rect.width && (rect.right > win.innerWidth + 1 || rect.left < -1) && !inScroller(el) && s.position !== 'fixed') result.offenders.push(label(el));
    if (!el.closest('main') || !el.textContent.trim() || el.children.length > 2) return;
    // Texto cortado sem reticencias.
    if ((s.overflowX === 'hidden' || s.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== 'ellipsis' && !el.classList.contains('sr-only')) result.clipped.push(`${label(el)} "${el.textContent.trim().slice(0, 30)}"`);
    // Conteudo vazando da propria caixa (ex.: valor maior que o card). Filhos com transform (inclinacao decorativa)
    // aumentam o scrollWidth sem cortar nada e sao ignorados.
    const decorative = [...el.children].some(child => cs(child).transform !== 'none');
    if (s.overflowX === 'visible' && s.display !== 'inline' && !decorative && !el.matches('input, select, textarea') && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) result.spill.push(`${label(el)} ${el.clientWidth}<${el.scrollWidth}`);
  });

  doc.querySelectorAll('button, .button, .chip, .booking-chip, .payment-option, dt, dd, h1, h2, h3, strong').forEach(el => {
    if (!visible(el)) return;
    const rect = el.getBoundingClientRect();
    const lineHeight = parseFloat(cs(el).lineHeight) || parseFloat(cs(el).fontSize) * 1.3;
    // Elemento espremido: estreito e com muitas linhas (texto quebrando letra a letra).
    if (rect.height / lineHeight > 3 && rect.width < 100) result.squeezed.push(`${label(el)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
  });

  doc.querySelectorAll('a[href], button, select, input:not([type=hidden]), textarea, [role=button]').forEach(el => {
    if (!visible(el) || el.classList.contains('sr-only')) return;
    let target = el;
    if (el.matches('input[type=radio], input[type=checkbox]') && cs(el).opacity === '0') target = el.closest('label') || el;
    if (el.tagName === 'A' && cs(el).display === 'inline' && el.closest('p, small, li span')) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width) return;
    if (rect.width < MIN_TARGET || rect.height < MIN_TARGET) result.smallTargets.push(`${label(target)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    else if (width <= 414 && (rect.width < COMFORT_TARGET || rect.height < COMFORT_TARGET)) result.tightTargets += 1;
  });

  if (width <= 480) doc.querySelectorAll(FORM_GRIDS).forEach(el => {
    if (!visible(el) || !cs(el).display.includes('grid')) return;
    const columns = cs(el).gridTemplateColumns.split(' ').filter(Boolean).length;
    if (columns > 1) result.multiColumnForms.push(`${label(el)} ${columns} colunas`);
  });

  for (const key of ['offenders', 'smallTargets', 'multiColumnForms', 'clipped', 'squeezed', 'spill']) result[key] = unique(result[key]);
  frame.remove();
  return result;
}

const hasIssues = r => r.overflowPx || ['offenders', 'smallTargets', 'multiColumnForms', 'clipped', 'squeezed', 'spill'].some(key => r[key].length);

export async function runResponsiveAudit({ pages = DEFAULT_PAGES, widths = DEFAULT_WIDTHS } = {}) {
  const results = [];
  for (const width of widths) {
    for (const page of pages) results.push(await auditPage(page, width, { wait: page.startsWith('pages-html') ? 1800 : 1000 }));
  }
  return { checked: results.length, issues: results.filter(hasIssues), maxTightTargets: Math.max(0, ...results.map(r => r.tightTargets)) };
}
