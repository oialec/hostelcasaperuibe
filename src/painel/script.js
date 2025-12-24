// Estado global
let reservas = [];
let quartos = [];
let config = {};
let currentReserva = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupTabs();
    setupEventListeners();
});

function checkAuth() {
    if (sessionStorage.getItem('hostel_auth')) showApp();
}

function login() {
    const senha = document.getElementById('senha').value;
    if (senha === (config.senha_painel || 'hostel2025') || senha === 'hostel2025') {
        sessionStorage.setItem('hostel_auth', 'true');
        showApp();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function logout() {
    sessionStorage.removeItem('hostel_auth');
    location.reload();
}

async function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('active');
    await loadConfig();
    await loadQuartos();
    await loadReservas();
}

async function loadConfig() {
    try {
        const data = await supabase.select('config');
        config = {};
        data.forEach(item => config[item.chave] = item.valor);
        populateConfigForm();
    } catch (e) { console.error('Erro config:', e); }
}

async function loadQuartos() {
    try {
        quartos = await supabase.select('quartos', 'order=ordem');
        renderQuartos();
    } catch (e) { console.error('Erro quartos:', e); }
}

async function loadReservas() {
    try {
        reservas = await supabase.select('reservas', 'order=created_at.desc');
        renderReservas();
        updateStats();
    } catch (e) { console.error('Erro reservas:', e); }
}

function renderReservas() {
    const pendentes = reservas.filter(r => r.status === 'pre_reserva');
    const confirmadas = reservas.filter(r => ['confirmada','aguardando_sinal','sinal_pago','checkin'].includes(r.status));
    
    document.getElementById('reservasPendentes').innerHTML = pendentes.length === 0
        ? '<div class="empty-state"><h3>Nenhuma pré-reserva pendente</h3></div>'
        : pendentes.map(renderReservaCard).join('');
    
    document.getElementById('reservasConfirmadas').innerHTML = confirmadas.length === 0
        ? '<div class="empty-state"><h3>Nenhuma reserva confirmada</h3></div>'
        : confirmadas.map(renderReservaCard).join('');
}

function renderReservaCard(r) {
    const q = quartos.find(x => x.id === r.quarto_id) || {};
    const labels = { pre_reserva:'Pré-reserva', confirmada:'Confirmada', aguardando_sinal:'Aguardando Sinal', sinal_pago:'Sinal Pago', checkin:'Check-in', finalizada:'Finalizada', cancelada:'Cancelada' };
    const isPending = r.status === 'pre_reserva';
    
    return `<div class="reservation-card">
        <div class="reservation-header">
            <h3>${r.nome_responsavel}</h3>
            <span class="status-badge ${r.status}">${labels[r.status]}</span>
        </div>
        <div class="reservation-body">
            <div class="reservation-info">
                <div class="info-row"><strong>Quarto:</strong> ${q.nome_praia || 'N/A'} - ${q.tipo || ''}</div>
                <div class="info-row"><strong>Período:</strong> ${helpers.formatPeriodo(r.periodo)}</div>
                <div class="info-row"><strong>Hóspedes:</strong> ${r.qtd_hospedes} pessoas</div>
                <div class="info-row"><strong>WhatsApp:</strong> ${helpers.formatPhone(r.whatsapp)}</div>
                <div class="info-row"><strong>Valor:</strong> ${helpers.formatCurrency(r.valor_total || q.preco || 0)}</div>
                ${r.observacoes ? `<div class="info-row"><strong>Obs:</strong> ${r.observacoes}</div>` : ''}
            </div>
            <div class="reservation-actions">
                ${isPending ? `
                    <button class="btn btn-success" onclick="confirmarReserva('${r.id}')">✓ Confirmar</button>
                    <button class="btn btn-danger" onclick="cancelarReserva('${r.id}')">✗ Recusar</button>
                ` : ''}
                <button class="btn btn-outline" onclick="gerarContrato('${r.id}')">📄 Contrato</button>
                <button class="btn btn-whatsapp" onclick="enviarWhatsApp('${r.id}')">💬 WhatsApp</button>
            </div>
        </div>
    </div>`;
}

function updateStats() {
    const p = reservas.filter(r => r.status === 'pre_reserva').length;
    const c = reservas.filter(r => ['confirmada','aguardando_sinal','sinal_pago','checkin'].includes(r.status)).length;
    const v = reservas.filter(r => ['confirmada','aguardando_sinal','sinal_pago','checkin'].includes(r.status)).reduce((s,r) => s + (parseFloat(r.valor_total)||0), 0);
    document.getElementById('statPendentes').textContent = p;
    document.getElementById('statConfirmadas').textContent = c;
    document.getElementById('statQuartos').textContent = `${c}/${quartos.length}`;
    document.getElementById('statValor').textContent = helpers.formatCurrency(v);
}

async function confirmarReserva(id) {
    if (!confirm('Confirmar reserva e bloquear quarto?')) return;
    try {
        await supabase.update('reservas', { status: 'confirmada' }, `id=eq.${id}`);
        await loadReservas();
        alert('Reserva confirmada!');
    } catch (e) { alert('Erro ao confirmar.'); }
}

async function cancelarReserva(id) {
    if (!confirm('Cancelar esta reserva?')) return;
    try {
        await supabase.update('reservas', { status: 'cancelada' }, `id=eq.${id}`);
        await loadReservas();
    } catch (e) { alert('Erro ao cancelar.'); }
}

function gerarContrato(id) {
    const r = reservas.find(x => x.id === id);
    if (!r) return;
    const q = quartos.find(x => x.id === r.quarto_id) || {};
    currentReserva = r;
    
    const sinal = (r.valor_total || q.preco) * 0.5;
    const periodo = r.periodo === '29-02' ? '29/12/2025 a 02/01/2026' : '30/12/2025 a 03/01/2026';
    
    document.getElementById('contratoPreview').innerHTML = `
        <h1>CONTRATO DE HOSPEDAGEM</h1>
        <h2>PARTES</h2>
        <p><strong>LOCADOR:</strong> ${config.nome_locador || '___'}, CPF: ${config.cpf_locador || '___'}, Tel: ${config.telefone || '___'}</p>
        <p><strong>LOCATÁRIO:</strong> ${r.nome_responsavel}, CPF: ${r.cpf_responsavel}, Tel: ${r.whatsapp}, Email: ${r.email || '___'}</p>
        
        <h2>OBJETO</h2>
        <p>Hospedagem no <strong>${q.nome_praia} - ${q.tipo}</strong> (até ${q.capacidade} pessoas). ${q.tem_ar ? 'Com AR' : 'Sem AR'}, ${q.tem_tv ? 'Com TV' : 'Sem TV'}.</p>
        
        <h2>PERÍODO E VALORES</h2>
        <p><strong>Período:</strong> ${periodo}</p>
        <p><strong>Valor Total:</strong> ${helpers.formatCurrency(r.valor_total || q.preco)}</p>
        <p><strong>Sinal (50%):</strong> ${helpers.formatCurrency(sinal)} via Pix: ${config.pix_chave || '___'}</p>
        <p><strong>Restante:</strong> ${helpers.formatCurrency(sinal)} no check-in</p>
        
        <h2>HÓSPEDES (${r.qtd_hospedes})</h2>
        <table><tr><th>#</th><th>Nome</th><th>RG</th></tr>
        ${Array.from({length: r.qtd_hospedes}, (_, i) => `<tr><td>${i+1}</td><td>${i===0 ? r.nome_responsavel : '___'}</td><td>___</td></tr>`).join('')}
        </table>
        
        <h2>REGRAS</h2>
        <p>Check-in: 14h | Check-out: 11h | Silêncio: 23h-8h | Piscina: 8h-22h</p>
        <p>Proibido: visitantes, festas, fumar, animais.</p>
        <p>Não incluso: roupa de cama, toalhas, alimentação.</p>
        
        <h2>ASSINATURAS</h2>
        <p style="margin-top:40px;">_____________________ (Locador) &nbsp;&nbsp;&nbsp; _____________________ (Locatário)</p>
    `;
    document.getElementById('contratoModal').classList.add('active');
}

function downloadContrato() {
    const el = document.getElementById('contratoPreview');
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set({ margin: 10, filename: 'contrato.pdf' }).from(el).save();
    } else {
        const w = window.open('', '_blank');
        w.document.write('<html><head><title>Contrato</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px}</style></head><body>' + el.innerHTML + '</body></html>');
        w.document.close();
        w.print();
    }
}

function enviarWhatsApp(id) {
    const r = reservas.find(x => x.id === id);
    if (!r) return;
    const q = quartos.find(x => x.id === r.quarto_id) || {};
    const sinal = (r.valor_total || q.preco) * 0.5;
    const periodo = r.periodo === '29-02' ? '29/12 a 02/01' : '30/12 a 03/01';
    
    const msg = r.status !== 'pre_reserva' 
        ? `Olá ${r.nome_responsavel}! 🏖️\n\nSua reserva no *Hostel Casa Peruíbe* foi *CONFIRMADA*!\n\n📋 *Resumo:*\n🏷️ ${q.nome_praia} - ${q.tipo}\n📅 ${periodo}\n👥 ${r.qtd_hospedes} pessoas\n💰 ${helpers.formatCurrency(r.valor_total || q.preco)}\n\n💳 *Sinal (50%):* ${helpers.formatCurrency(sinal)}\nPix: ${config.pix_chave || '___'}\n\n📍 Endereço após pagar sinal\n⏰ Check-in 14h | Check-out 11h\n📌 Trazer roupa de cama e toalhas!`
        : `Olá ${r.nome_responsavel}!\n\nRecebi sua pré-reserva!\n\n🏷️ ${q.nome_praia}\n📅 ${periodo}\n👥 ${r.qtd_hospedes} pessoas\n💰 ${helpers.formatCurrency(r.valor_total || q.preco)}\n\nPosso confirmar?`;
    
    window.open(helpers.whatsAppLink(r.whatsapp, msg), '_blank');
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function setupTabs() {
    document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            document.getElementById(t.dataset.tab).classList.add('active');
        });
    });
}

function renderQuartos() {
    document.getElementById('quartosGrid').innerHTML = quartos.map(q => `
        <div class="room-card">
            <div class="room-image">
                ${q.foto_url ? `<img src="${q.foto_url}" alt="${q.nome_praia}">` : '📷'}
                ${q.destaque ? `<span class="room-tag">${q.destaque}</span>` : ''}
            </div>
            <div class="room-content">
                <h3>${q.nome_praia}</h3>
                <p class="room-type">${q.tipo}</p>
                <div class="room-details">
                    <span class="room-detail">👥 ${q.capacidade}</span>
                    <span class="room-detail">🛏️ ${q.camas || '?'}</span>
                    <span style="color:${q.tem_ar?'green':'red'}">${q.tem_ar?'✓':'✗'} AR</span>
                    <span style="color:${q.tem_tv?'green':'red'}">${q.tem_tv?'✓':'✗'} TV</span>
                </div>
                <div class="room-price">${helpers.formatCurrency(q.preco)}</div>
                <button class="btn btn-outline" onclick="editarQuarto(${q.id})">✏️ Editar</button>
            </div>
        </div>
    `).join('');
}

function editarQuarto(id) {
    const q = quartos.find(x => x.id === id);
    if (!q) return;
    document.getElementById('editQuartoId').value = q.id;
    document.getElementById('editNomePraia').value = q.nome_praia;
    document.getElementById('editTipo').value = q.tipo;
    document.getElementById('editCapacidade').value = q.capacidade;
    document.getElementById('editPreco').value = q.preco;
    document.getElementById('editCamas').value = q.camas || '';
    document.getElementById('editDescricao').value = q.descricao || '';
    document.getElementById('editDestaque').value = q.destaque || '';
    document.getElementById('editTemAr').checked = q.tem_ar;
    document.getElementById('editTemTv').checked = q.tem_tv;
    document.getElementById('editFotoUrl').value = q.foto_url || '';
    document.getElementById('quartoModal').classList.add('active');
}

async function salvarQuarto() {
    const id = document.getElementById('editQuartoId').value;
    try {
        await supabase.update('quartos', {
            nome_praia: document.getElementById('editNomePraia').value,
            tipo: document.getElementById('editTipo').value,
            capacidade: parseInt(document.getElementById('editCapacidade').value),
            preco: parseFloat(document.getElementById('editPreco').value),
            camas: document.getElementById('editCamas').value,
            descricao: document.getElementById('editDescricao').value,
            destaque: document.getElementById('editDestaque').value,
            tem_ar: document.getElementById('editTemAr').checked,
            tem_tv: document.getElementById('editTemTv').checked,
            foto_url: document.getElementById('editFotoUrl').value
        }, `id=eq.${id}`);
        closeModal('quartoModal');
        await loadQuartos();
        alert('Quarto atualizado!');
    } catch (e) { alert('Erro ao salvar.'); }
}

function populateConfigForm() {
    ['nome_locador','cpf_locador','telefone','email','pix_tipo','pix_chave','pix_nome','endereco_completo','endereco_bairro','endereco_cep','endereco_maps','distancia_praia','distancia_mercado','distancia_centro','distancia_mcdonalds','checkin_horario','checkout_horario','instagram','senha_painel'].forEach(f => {
        const el = document.getElementById(`config_${f}`);
        if (el && config[f]) el.value = config[f];
    });
}

async function salvarConfig() {
    const fields = ['nome_locador','cpf_locador','telefone','email','pix_tipo','pix_chave','pix_nome','endereco_completo','endereco_bairro','endereco_cep','endereco_maps','distancia_praia','distancia_mercado','distancia_centro','distancia_mcdonalds','checkin_horario','checkout_horario','instagram','senha_painel'];
    try {
        for (const f of fields) {
            const el = document.getElementById(`config_${f}`);
            if (el) await supabase.update('config', { valor: el.value }, `chave=eq.${f}`);
        }
        await loadConfig();
        alert('Configurações salvas!');
    } catch (e) { alert('Erro ao salvar.'); }
}

function setupEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', e => { e.preventDefault(); login(); });
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
    });
}
