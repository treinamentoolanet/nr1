import { Quote, UserSettings } from './types';
import { formatCurrency } from './calculations';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function getExpiryDate(createdAt: string, validadeDias: number) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + validadeDias);
  return d.toLocaleDateString('pt-BR');
}

export function generateQuotePDFHTML(quote: Quote, settings: UserSettings): string {
  const empresa = settings.empresa_nome || 'Sua Empresa';
  const priceLabel = quote.price_mode === 'varejo' ? 'Varejo' : 'Atacado';
  const precoOriginal = quote.preco_unitario;
  const precoComDesconto = precoOriginal * (1 - quote.desconto_percentual / 100);
  const margem = quote.margem_liquida;
  const isLucro = margem >= 0;

  const rows = [
    { label: 'Produto', value: quote.produto_nome },
    { label: 'Impressora', value: quote.printer_nome },
    { label: 'Filamento', value: quote.filament_nome },
    { label: 'Quantidade', value: String(quote.quantidade) },
    { label: 'Preco unitario (' + priceLabel + ')', value: formatCurrency(precoOriginal) },
    ...(quote.desconto_percentual > 0 ? [
      { label: `Desconto (${quote.desconto_percentual}%)`, value: '- ' + formatCurrency(precoOriginal - precoComDesconto) },
      { label: 'Preco com desconto', value: formatCurrency(precoComDesconto) },
    ] : []),
    { label: 'Subtotal', value: formatCurrency(quote.subtotal) },
    ...(quote.imposto_percentual > 0 ? [
      { label: `Impostos (${quote.imposto_percentual}%)`, value: formatCurrency(quote.impostos) },
    ] : []),
    ...(quote.marketplace_nome ? [
      { label: `Taxa marketplace (${quote.marketplace_nome})`, value: formatCurrency(quote.taxa_marketplace_valor + quote.tarifa_fixa_marketplace) },
    ] : []),
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Orcamento ${quote.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a2332; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 32px; border-bottom: 2px solid #e2e8f0; }
  .logo-area h1 { font-size: 24px; font-weight: 800; color: #1a2332; letter-spacing: -0.5px; }
  .logo-area p { font-size: 13px; color: #64748b; margin-top: 3px; }
  .logo-area .company-meta { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
  .logo-area .company-meta span { font-size: 12px; color: #64748b; }
  .quote-badge { text-align: right; }
  .quote-badge .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
  .quote-badge .number { font-size: 28px; font-weight: 800; color: #1565C0; letter-spacing: -1px; margin-top: 2px; }
  .quote-badge .date { font-size: 12px; color: #64748b; margin-top: 4px; }

  /* Status bar */
  .status-bar { display: flex; gap: 20px; margin-bottom: 32px; }
  .status-item { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
  .status-item .s-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 4px; }
  .status-item .s-value { font-size: 15px; font-weight: 700; color: #1a2332; }
  .status-item .s-sub { font-size: 11px; color: #64748b; margin-top: 2px; }

  /* Section title */
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 12px; display: flex; align-items: center; gap-8px; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; margin-left: 10px; }

  /* Breakdown table */
  .breakdown { margin-bottom: 28px; }
  .breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .breakdown-row:last-child { border-bottom: none; }
  .breakdown-row.bold { font-weight: 700; }
  .breakdown-row .r-label { font-size: 13px; color: #475569; }
  .breakdown-row.bold .r-label { color: #1a2332; }
  .breakdown-row .r-value { font-size: 13px; color: #1a2332; font-weight: 600; }

  /* Total box */
  .total-box { background: linear-gradient(135deg, #1565C0 0%, #1976D2 100%); border-radius: 16px; padding: 24px 28px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; }
  .total-box .t-label { color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
  .total-box .t-value { color: #fff; font-size: 36px; font-weight: 800; letter-spacing: -1px; }
  .total-box .t-per { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 2px; }

  /* Margin chip */
  .margin-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; margin-bottom: 28px; }
  .margin-chip.positive { background: #dcfce7; color: #166534; }
  .margin-chip.negative { background: #fee2e2; color: #991b1b; }

  /* Notes */
  .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; }
  .notes-box .n-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #92400e; margin-bottom: 6px; }
  .notes-box p { font-size: 13px; color: #78350f; line-height: 1.6; }

  /* Validity */
  .validity-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin-bottom: 32px; display: flex; align-items: center; gap: 10px; }
  .validity-box .v-icon { font-size: 18px; }
  .validity-box p { font-size: 13px; color: #1e40af; }
  .validity-box strong { font-weight: 700; }

  /* Footer */
  .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 11px; color: #94a3b8; }
  .footer .powered { font-size: 11px; color: #cbd5e1; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <h1>${empresa}</h1>
      <div class="company-meta">
        ${settings.empresa_cnpj ? `<span>CNPJ: ${settings.empresa_cnpj}</span>` : ''}
        ${settings.empresa_contato ? `<span>${settings.empresa_contato}</span>` : ''}
        ${settings.empresa_endereco ? `<span>${settings.empresa_endereco}</span>` : ''}
      </div>
    </div>
    <div class="quote-badge">
      <div class="label">Orcamento</div>
      <div class="number">${quote.numero}</div>
      <div class="date">${formatDate(quote.created_at)}</div>
    </div>
  </div>

  <!-- Status bar -->
  <div class="status-bar">
    <div class="status-item">
      <div class="s-label">Cliente</div>
      <div class="s-value">${quote.cliente_nome}</div>
    </div>
    <div class="status-item">
      <div class="s-label">Produto</div>
      <div class="s-value">${quote.produto_nome}</div>
      <div class="s-sub">Qtd: ${quote.quantidade} unidade${quote.quantidade !== 1 ? 's' : ''}</div>
    </div>
    <div class="status-item">
      <div class="s-label">Validade</div>
      <div class="s-value">${getExpiryDate(quote.created_at, quote.validade_dias)}</div>
      <div class="s-sub">${quote.validade_dias} dias</div>
    </div>
  </div>

  <!-- Detalhamento -->
  <div class="breakdown">
    <div class="section-title">Detalhamento</div>
    ${rows.map(r => `
    <div class="breakdown-row">
      <span class="r-label">${r.label}</span>
      <span class="r-value">${r.value}</span>
    </div>`).join('')}
  </div>

  <!-- Total -->
  <div class="total-box">
    <div>
      <div class="t-label">Total do orcamento</div>
      <div class="t-per">${quote.quantidade} unidade${quote.quantidade !== 1 ? 's' : ''} · ${priceLabel}</div>
    </div>
    <div class="t-value">${formatCurrency(quote.total_final)}</div>
  </div>

  <!-- Margin -->
  <div class="margin-chip ${isLucro ? 'positive' : 'negative'}">
    ${isLucro ? '&#x2713;' : '&#x26A0;'} Margem liquida: ${margem.toFixed(1)}% &nbsp;&bull;&nbsp; Lucro: ${formatCurrency(quote.lucro_liquido)}
  </div>

  ${quote.observacoes ? `
  <!-- Notes -->
  <div class="notes-box">
    <div class="n-title">Observacoes</div>
    <p>${quote.observacoes}</p>
  </div>` : ''}

  <!-- Validity -->
  <div class="validity-box">
    <span class="v-icon">&#128197;</span>
    <p>Este orcamento e valido ate <strong>${getExpiryDate(quote.created_at, quote.validade_dias)}</strong> (${quote.validade_dias} dias a partir de ${formatDate(quote.created_at)}).</p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Orcamento ${quote.numero} &bull; Emitido por ${empresa}</p>
    <p class="powered">Print3D Pricing System</p>
  </div>

</div>
</body>
</html>`;
}

export function printQuotePDF(quote: Quote, settings: UserSettings) {
  const html = generateQuotePDFHTML(quote, settings);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}
