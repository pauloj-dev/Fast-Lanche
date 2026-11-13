// receipt.js - Comprovante Digital do Pedido (Fase 21)
import { formatCurrency, openModal, closeModal, showToast } from './ui.js';
import { ORDER_STATUS } from './order-tracking.js';

const RECEIPTS_STORAGE_KEY = 'fastlanche_receipts';

/**
 * Gera um comprovante digital completo a partir dos dados do pedido
 */
function generateReceipt(order) {
    return {
        id: `REC-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        document: order.document || 'Nao informado',
        email: order.userEmail || '',
        paymentMethod: order.paymentMethod,
        paymentLabel: getPaymentLabel(order.paymentMethod),
        paymentStatus: order.paymentStatus,
        status: order.status,
        statusLabel: getStatusLabel(order.status),
        items: order.items.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
            customization: item._customization || null
        })),
        subtotal: order.subtotal || 0,
        deliveryFee: order.deliveryFee || 0,
        total: order.total || 0,
        createdAt: order.createdAt,
        formattedDate: formatReceiptDate(order.createdAt),
        formattedTime: formatReceiptTime(order.createdAt),
        isCanceled: false
    };
}

function getPaymentLabel(method) {
    const labels = {
        pix: 'Pix',
        card: 'Cartao de credito/debito',
        cash: 'Dinheiro'
    };
    return labels[method] || method || 'Nao informado';
}

function getStatusLabel(status) {
    const labels = {
        [ORDER_STATUS.RECEIVED]: 'Pedido recebido',
        [ORDER_STATUS.PAYMENT_CONFIRMED]: 'Pagamento confirmado',
        [ORDER_STATUS.PREPARING]: 'Preparando pedido',
        [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Saiu para entrega',
        [ORDER_STATUS.DELIVERED]: 'Entregue'
    };
    return labels[status] || status || 'Pedido recebido';
}

function formatReceiptDate(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return isoString;
    }
}

function formatReceiptTime(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
}

/**
 * Salva o comprovante no localStorage
 */
function saveReceipt(receipt) {
    try {
        const stored = loadReceipts();
        const filtered = stored.filter(r => r.orderNumber !== receipt.orderNumber);
        filtered.unshift(receipt);
        localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.warn('Erro ao salvar comprovante:', error);
        return false;
    }
}

/**
 * Carrega todos os comprovantes salvos
 */
function loadReceipts() {
    try {
        const stored = localStorage.getItem(RECEIPTS_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Erro ao carregar comprovantes:', error);
        return [];
    }
}

/**
 * Busca um comprovante pelo numero do pedido
 */
function findReceipt(orderNumber) {
    const receipts = loadReceipts();
    return receipts.find(r => r.orderNumber === orderNumber) || null;
}

/**
 * Gera e salva um comprovante a partir dos dados do pedido,
 * e exibe o modal do comprovante
 */
function createAndShowReceipt(order) {
    const receipt = generateReceipt(order);
    saveReceipt(receipt);
    showReceiptModal(receipt);
    return receipt;
}

// ============================================
// MODAL DO COMPROVANTE
// ============================================

function showReceiptModal(receipt) {
    const content = buildReceiptContent(receipt);

    openModal({
        title: 'Comprovante Digital',
        bodyContent: content,
        actions: [
            {
                label: '\u{1F4E5} Baixar PNG',
                variant: 'button-secondary',
                onClick: () => downloadReceiptPNG(receipt)
            },
            {
                label: 'Fechar',
                variant: 'button-primary',
                onClick: closeModal
            }
        ]
    });
}

function buildReceiptContent(receipt) {
    const wrapper = document.createElement('div');
    wrapper.className = 'receipt-wrapper';

    const header = document.createElement('div');
    header.className = 'receipt-header';

    const receiptTitle = document.createElement('div');
    receiptTitle.className = 'receipt-title-group';

    const brandName = document.createElement('strong');
    brandName.className = 'receipt-brand';
    brandName.textContent = 'Fast Lanche';

    const receiptType = document.createElement('span');
    receiptType.className = 'receipt-type';
    receiptType.textContent = 'COMPROVANTE DIGITAL';

    receiptTitle.append(brandName, receiptType);

    const receiptId = document.createElement('div');
    receiptId.className = 'receipt-id-group';

    const idLabel = document.createElement('span');
    idLabel.className = 'receipt-id-label';
    idLabel.textContent = 'Comprovante';

    const idValue = document.createElement('span');
    idValue.className = 'receipt-id-value';
    idValue.textContent = receipt.id;

    receiptId.append(idLabel, idValue);
    header.append(receiptTitle, receiptId);

    const statusBadge = document.createElement('div');
    statusBadge.className = `receipt-status-badge ${getStatusClass(receipt.status)}`;
    statusBadge.textContent = receipt.statusLabel;

    const infoSection = document.createElement('div');
    infoSection.className = 'receipt-section';

    const infoTitle = document.createElement('h4');
    infoTitle.className = 'receipt-section-title';
    infoTitle.textContent = 'Informacoes do pedido';
    infoSection.appendChild(infoTitle);

    const infoGrid = document.createElement('div');
    infoGrid.className = 'receipt-info-grid';

    addInfoRow(infoGrid, 'Pedido', receipt.orderNumber);
    addInfoRow(infoGrid, 'Data', receipt.formattedDate);
    addInfoRow(infoGrid, 'Horario', receipt.formattedTime);
    addInfoRow(infoGrid, 'Cliente', receipt.customerName);
    addInfoRow(infoGrid, 'Telefone', receipt.phone);
    addInfoRow(infoGrid, 'Endereco', receipt.address);
    addInfoRow(infoGrid, 'Documento', receipt.document);
    if (receipt.email) {
        addInfoRow(infoGrid, 'E-mail', receipt.email);
    }
    addInfoRow(infoGrid, 'Pagamento', receipt.paymentLabel);

    infoSection.appendChild(infoGrid);

    const itemsSection = document.createElement('div');
    itemsSection.className = 'receipt-section';

    const itemsTitle = document.createElement('h4');
    itemsTitle.className = 'receipt-section-title';
    itemsTitle.textContent = 'Itens do pedido';
    itemsSection.appendChild(itemsTitle);

    const itemsTable = document.createElement('div');
    itemsTable.className = 'receipt-items-table';

    receipt.items.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'receipt-item-row';

        const itemInfo = document.createElement('div');
        itemInfo.className = 'receipt-item-info';

        const itemName = document.createElement('span');
        itemName.className = 'receipt-item-name';
        itemName.textContent = `${item.quantity}x ${item.name}`;

        itemInfo.appendChild(itemName);

        if (item.customization) {
            const custDetails = document.createElement('div');
            custDetails.className = 'receipt-item-cust';
            const custLines = [];

            if (item.customization.type === 'half_half') {
                custLines.push(`Meio ${item.customization.flavor1}${item.customization.flavor2 ? ` + Meio ${item.customization.flavor2}` : ''}`);
            }
            if (item.customization.type === 'remove_ingredients' && item.customization.removedIngredients?.length) {
                custLines.push(`Sem: ${item.customization.removedIngredients.join(', ')}`);
            }
            if (item.customization.extras?.length) {
                const extrasText = item.customization.extras.map(e => `${e.name}${e.price ? ` (+${formatCurrency(e.price)})` : ''}`).join(', ');
                custLines.push(`Adicionais: ${extrasText}`);
            }
            if (item.customization.observation) {
                custLines.push(`Obs: ${item.customization.observation}`);
            }

            if (custLines.length) {
                custDetails.textContent = custLines.join(' | ');
                itemInfo.appendChild(custDetails);
            }
        }

        const itemTotal = document.createElement('span');
        itemTotal.className = 'receipt-item-total';
        itemTotal.textContent = formatCurrency(item.total);

        itemRow.append(itemInfo, itemTotal);
        itemsTable.appendChild(itemRow);
    });

    itemsSection.appendChild(itemsTable);

    const valuesSection = document.createElement('div');
    valuesSection.className = 'receipt-section receipt-values';

    const valuesDivider = document.createElement('div');
    valuesDivider.className = 'receipt-values-divider';

    addValueRow(valuesDivider, 'Subtotal', formatCurrency(receipt.subtotal));
    addValueRow(valuesDivider, 'Taxa de entrega', formatCurrency(receipt.deliveryFee));

    const totalRow = document.createElement('div');
    totalRow.className = 'receipt-total-row';
    totalRow.innerHTML = `<span>Total</span><strong>${formatCurrency(receipt.total)}</strong>`;

    valuesDivider.appendChild(totalRow);
    valuesSection.appendChild(valuesDivider);

    const footer = document.createElement('div');
    footer.className = 'receipt-footer';
    footer.innerHTML = `
    <p>Obrigado por comprar no Fast Lanche!</p>
    <small>Este comprovante e gerado digitalmente e possui validade para acompanhamento do pedido.</small>
    <small class="receipt-footer-id">${receipt.id} | ${receipt.formattedDate} as ${receipt.formattedTime}</small>
  `;

    wrapper.append(header, statusBadge, infoSection, itemsSection, valuesSection, footer);
    return wrapper;
}

function addInfoRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'receipt-info-row';
    row.innerHTML = `<span class="receipt-info-label">${label}</span><span class="receipt-info-value">${value}</span>`;
    container.appendChild(row);
}

function addValueRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'receipt-value-row';
    row.innerHTML = `<span>${label}</span><span>${value}</span>`;
    container.appendChild(row);
}

function getStatusClass(status) {
    if (status === ORDER_STATUS.DELIVERED) return 'status-delivered';
    if (status === ORDER_STATUS.OUT_FOR_DELIVERY) return 'status-out';
    if (status === ORDER_STATUS.PREPARING) return 'status-preparing';
    if (status === ORDER_STATUS.PAYMENT_CONFIRMED) return 'status-payment';
    return 'status-received';
}

// ============================================
// DOWNLOAD DO COMPROVANTE EM PNG
// ============================================

function downloadReceiptPNG(receipt) {
    const container = document.createElement('div');
    container.style.cssText = [
        'position: fixed',
        'left: -9999px',
        'top: 0',
        'width: 420px',
        'background: #FFFFFF',
        'padding: 24px',
        'font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        'color: #161616',
        'z-index: -1'
    ].join(';');

    container.innerHTML = buildReceiptCaptureHTML(receipt);
    document.body.appendChild(container);

    showToast('Gerando imagem do comprovante...', 'info', 2000);

    loadHtml2Canvas().then(html2canvas => {
        html2canvas(container, {
            scale: 2,
            backgroundColor: '#FFFFFF',
            allowTaint: false,
            useCORS: true,
            logging: false,
            width: 420,
            height: container.scrollHeight
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `comprovante-${receipt.orderNumber}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast(`Comprovante ${receipt.orderNumber} baixado!`, 'success', 3000);
        }).catch(error => {
            console.warn('Erro ao gerar PNG do comprovante:', error);
            showToast('Erro ao gerar imagem. Tente novamente.', 'error');
        }).finally(() => {
            document.body.removeChild(container);
        });
    }).catch(() => {
        showToast('Biblioteca de captura nao disponivel. Verifique a conexao e tente novamente.', 'error');
        document.body.removeChild(container);
    });
}

// html2canvas (~200 kB) so e usado ao baixar o comprovante em PNG. Antes era um <script> bloqueante em todas as
// paginas legadas; agora e baixado sob demanda, uma unica vez, com Subresource Integrity (o navegador recusa o arquivo
// se o conteudo do CDN for alterado).
const HTML2CANVAS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const HTML2CANVAS_SRI = 'sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA==';
let html2canvasPromise = null;

export function loadHtml2Canvas() {
    if (typeof window.html2canvas === 'function') return Promise.resolve(window.html2canvas);
    if (!html2canvasPromise) {
        html2canvasPromise = new Promise((resolvePromise, reject) => {
            const script = document.createElement('script');
            script.src = HTML2CANVAS_SRC;
            script.integrity = HTML2CANVAS_SRI;
            script.crossOrigin = 'anonymous';
            script.referrerPolicy = 'no-referrer';
            script.onload = () => typeof window.html2canvas === 'function' ? resolvePromise(window.html2canvas) : reject(new Error('html2canvas indisponivel'));
            script.onerror = () => reject(new Error('Falha ao carregar html2canvas'));
            document.head.appendChild(script);
        }).catch(error => {
            html2canvasPromise = null; // permite tentar de novo (ex.: conexao voltou)
            throw error;
        });
    }
    return html2canvasPromise;
}

function buildReceiptCaptureHTML(receipt) {
    const itemRows = receipt.items.map(item => {
        let custHtml = '';
        if (item.customization) {
            const parts = [];
            if (item.customization.type === 'half_half') {
                parts.push('Meio ' + item.customization.flavor1 + (item.customization.flavor2 ? ' + Meio ' + item.customization.flavor2 : ''));
            }
            if (item.customization.type === 'remove_ingredients' && item.customization.removedIngredients?.length) {
                parts.push('Sem: ' + item.customization.removedIngredients.join(', '));
            }
            if (item.customization.extras?.length) {
                const extrasText = item.customization.extras.map(e => e.name + (e.price ? ' (+' + formatCurrency(e.price) + ')' : '')).join(', ');
                parts.push('Adicionais: ' + extrasText);
            }
            if (item.customization.observation) {
                parts.push('Obs: ' + item.customization.observation);
            }
            if (parts.length) {
                custHtml = '<div style="font-size:11px;color:#6B6A63;margin-top:2px;line-height:1.4;">' + parts.join(' | ') + '</div>';
            }
        }
        return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:6px 8px;border-radius:6px;background:#FAFAF8;font-size:13px;">'
            + '<div style="flex:1;">'
            + '<span style="font-weight:600;color:#161616;">' + item.quantity + 'x ' + item.name + '</span>'
            + custHtml
            + '</div>'
            + '<span style="font-weight:700;color:#161616;white-space:nowrap;">' + formatCurrency(item.total) + '</span>'
            + '</div>';
    }).join('');

    return '<div style="display:grid;gap:16px;">'
        + '  <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:2px dashed #DDDDD6;">'
        + '    <div style="display:grid;gap:2px;">'
        + '      <strong style="font-size:20px;color:#E63946;">Fast Lanche</strong>'
        + '      <span style="font-size:10px;font-weight:700;color:#6B6A63;letter-spacing:1px;text-transform:uppercase;">COMPROVANTE DIGITAL</span>'
        + '    </div>'
        + '    <div style="display:grid;gap:2px;text-align:right;">'
        + '      <span style="font-size:10px;color:#6B6A63;">Comprovante</span>'
        + '      <span style="font-size:11px;font-weight:700;color:#161616;word-break:break-all;">' + receipt.id + '</span>'
        + '    </div>'
        + '  </div>'
        + '  <div style="text-align:center;font-size:13px;font-weight:800;padding:6px 12px;border-radius:6px;color:#FFFFFF;background:#6B6A63;">' + receipt.statusLabel + '</div>'
        + '  <div style="display:grid;gap:8px;">'
        + '    <h4 style="font-size:12px;font-weight:700;color:#6B6A63;text-transform:uppercase;letter-spacing:.5px;padding-bottom:4px;border-bottom:1px solid #DDDDD6;margin:0;">Informacoes do pedido</h4>'
        + '    <div style="display:grid;gap:4px;font-size:13px;">'
        + buildInfoCaptureHTML('Pedido', receipt.orderNumber)
        + buildInfoCaptureHTML('Data', receipt.formattedDate)
        + buildInfoCaptureHTML('Horario', receipt.formattedTime)
        + buildInfoCaptureHTML('Cliente', receipt.customerName)
        + buildInfoCaptureHTML('Telefone', receipt.phone)
        + buildInfoCaptureHTML('Endereco', receipt.address)
        + buildInfoCaptureHTML('Documento', receipt.document)
        + (receipt.email ? buildInfoCaptureHTML('E-mail', receipt.email) : '')
        + buildInfoCaptureHTML('Pagamento', receipt.paymentLabel)
        + '    </div>'
        + '  </div>'
        + '  <div style="display:grid;gap:8px;">'
        + '    <h4 style="font-size:12px;font-weight:700;color:#6B6A63;text-transform:uppercase;letter-spacing:.5px;padding-bottom:4px;border-bottom:1px solid #DDDDD6;margin:0;">Itens do pedido</h4>'
        + '    <div style="display:grid;gap:4px;">' + itemRows + '</div>'
        + '  </div>'
        + '  <div style="display:grid;gap:6px;padding-top:6px;border-top:1px solid #DDDDD6;">'
        + '    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px;color:#6B6A63;"><span>Subtotal</span><span>' + formatCurrency(receipt.subtotal) + '</span></div>'
        + '    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px;color:#6B6A63;"><span>Taxa de entrega</span><span>' + formatCurrency(receipt.deliveryFee) + '</span></div>'
        + '    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:8px;margin-top:4px;border-top:2px dashed #161616;font-size:16px;font-weight:900;color:#161616;"><span>Total</span><strong>' + formatCurrency(receipt.total) + '</strong></div>'
        + '  </div>'
        + '  <div style="text-align:center;padding-top:10px;border-top:2px dashed #DDDDD6;font-size:12px;color:#6B6A63;display:grid;gap:4px;">'
        + '    <p style="font-weight:700;color:#161616;margin:0;">Obrigado por comprar no Fast Lanche!</p>'
        + '    <small style="font-size:10px;">Este comprovante e gerado digitalmente.</small>'
        + '    <small style="font-size:9px;color:#6B6A63;margin-top:2px;">' + receipt.id + ' | ' + receipt.formattedDate + ' as ' + receipt.formattedTime + '</small>'
        + '  </div>'
        + '</div>';
}

function buildInfoCaptureHTML(label, value) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;line-height:1.5;">'
        + '<span style="color:#6B6A63;flex-shrink:0;">' + label + '</span>'
        + '<span style="font-weight:600;color:#161616;text-align:right;word-break:break-word;max-width:60%;">' + value + '</span>'
        + '</div>';
}

// ============================================
// LISTAGEM DE COMPROVANTES SALVOS
// ============================================

function openReceiptsListModal() {
    const receipts = loadReceipts();

    const content = document.createElement('div');
    content.className = 'receipts-list-content';

    if (receipts.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = '<span class="empty-state-icon">\u{1F4C4}</span><span class="empty-state-text">Nenhum comprovante encontrado.</span>';
        content.appendChild(empty);
    } else {
        const list = document.createElement('div');
        list.className = 'receipts-list';

        receipts.forEach(receipt => {
            const card = document.createElement('button');
            card.className = 'receipts-list-card';
            card.type = 'button';
            card.addEventListener('click', () => {
                closeModal();
                setTimeout(() => showReceiptModal(receipt), 300);
            });

            const cardInfo = document.createElement('div');
            cardInfo.className = 'receipts-card-info';

            const cardOrder = document.createElement('strong');
            cardOrder.textContent = receipt.orderNumber;

            const cardDate = document.createElement('span');
            cardDate.className = 'receipts-card-date';
            cardDate.textContent = receipt.formattedDate + ' as ' + receipt.formattedTime;

            cardInfo.append(cardOrder, cardDate);

            const cardTotal = document.createElement('span');
            cardTotal.className = 'receipts-card-total';
            cardTotal.textContent = formatCurrency(receipt.total);

            card.append(cardInfo, cardTotal);
            list.appendChild(card);
        });

        content.appendChild(list);
    }

    openModal({
        title: 'Meus Comprovantes',
        bodyContent: content,
        actions: [
            {
                label: 'Fechar',
                variant: 'button-primary',
                onClick: closeModal
            }
        ]
    });
}

function setupReceipt() {
    // O botão "Comprovantes" foi movido para o dropdown de perfil (user-navigation.js)
    // Remover botão antigo do main-nav se existir
    const existingBtn = document.getElementById('nav-receipts-btn');
    if (existingBtn) {
        existingBtn.remove();
    }
}

export {
    createAndShowReceipt,
    findReceipt,
    generateReceipt,
    loadReceipts,
    openReceiptsListModal,
    downloadReceiptPNG,
    saveReceipt,
    setupReceipt,
    showReceiptModal
};