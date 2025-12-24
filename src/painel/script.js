let reservas = [], quartos = [], config = {}, currentReserva = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupTabs();
    setupEventListeners();
});

function checkAuth() { if (sessionStorage.getItem('hostel_auth')) showApp(); }

function login() {
    const senha = document.getElementById('senha').value;
    if (senha === (config.senha_painel || 'hostel2025') || senha === 'hostel2025') {
        sessionStorage.setItem('hostel_auth', 'true');
        showApp();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function logout() { sessionStorage.removeItem('hostel_auth'); location.reload(); }

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
    const labels = { pre_reserva:'Pré-reserva', confirmada:'Confirmada', aguardando_sinal:'Aguardando Sinal', sinal_pago:'Sinal Pago', checkin:'Check-in', finalizada:'Finalizada', cancelada:'Cancelada' };
    
    document.getElementById('reservasPendentes').innerHTML = pendentes.length === 0
        ? '<div class="empty-state"><h3>Nenhuma pré-reserva pendente</h3><p>Novas pré-reservas aparecerão aqui</p></div>'
        : pendentes.map(r => renderReservaCard(r, labels)).join('');
    
    document.getElementById('reservasConfirmadas').innerHTML = confirmadas.length === 0
        ? '<div class="empty-state"><h3>Nenhuma reserva confirmada</h3></div>'
        : confirmadas.map(r => renderReservaCard(r, labels)).join('');
}

function renderReservaCard(r, labels) {
    const q = quartos.find(x => x.id === r.quarto_id) || {};
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
                <button class="btn btn-outline" onclick="editarReserva('${r.id}')">✏️ Editar</button>
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
        // Buscar a reserva
        const reserva = reservas.find(r => r.id === id);
        if (!reserva) { alert('Reserva não encontrada'); return; }
        
        // Atualizar status da reserva
        await supabase.update('reservas', { status: 'confirmada' }, `id=eq.${id}`);
        
        // BLOQUEAR O QUARTO para o período específico
        const quartoId = reserva.quarto_id;
        const periodo = reserva.periodo;
        
        if (periodo === '29-02') {
            await supabase.update('quartos', { status_29_02: 'ocupado' }, `id=eq.${quartoId}`);
        } else if (periodo === '30-03') {
            await supabase.update('quartos', { status_30_03: 'ocupado' }, `id=eq.${quartoId}`);
        }
        
        await loadQuartos();
        await loadReservas();
        alert('Reserva confirmada e quarto bloqueado!');
    } catch (e) { 
        console.error(e);
        alert('Erro ao confirmar: ' + e.message); 
    }
}

async function cancelarReserva(id) {
    if (!confirm('Cancelar esta reserva? O quarto será liberado.')) return;
    try {
        // Buscar a reserva
        const reserva = reservas.find(r => r.id === id);
        
        // Se estava confirmada, liberar o quarto
        if (reserva && ['confirmada','aguardando_sinal','sinal_pago','checkin'].includes(reserva.status)) {
            const quartoId = reserva.quarto_id;
            const periodo = reserva.periodo;
            
            if (periodo === '29-02') {
                await supabase.update('quartos', { status_29_02: 'disponivel' }, `id=eq.${quartoId}`);
            } else if (periodo === '30-03') {
                await supabase.update('quartos', { status_30_03: 'disponivel' }, `id=eq.${quartoId}`);
            }
        }
        
        await supabase.update('reservas', { status: 'cancelada' }, `id=eq.${id}`);
        await loadQuartos();
        await loadReservas();
        alert('Reserva cancelada e quarto liberado!');
    } catch (e) { alert('Erro ao cancelar.'); }
}

// EDITAR RESERVA
function editarReserva(id) {
    const r = reservas.find(x => x.id === id);
    if (!r) return;
    currentReserva = r;
    
    document.getElementById('editReservaId').value = r.id;
    document.getElementById('editNomeResp').value = r.nome_responsavel;
    document.getElementById('editWhatsapp').value = r.whatsapp;
    document.getElementById('editEmail').value = r.email || '';
    document.getElementById('editCpf').value = r.cpf_responsavel || '';
    document.getElementById('editQtdHospedes').value = r.qtd_hospedes;
    document.getElementById('editObservacoes').value = r.observacoes || '';
    document.getElementById('editStatus').value = r.status;
    
    // Preencher select de quartos
    const selectQuarto = document.getElementById('editQuartoId');
    selectQuarto.innerHTML = quartos.map(q => `<option value="${q.id}" ${q.id === r.quarto_id ? 'selected' : ''}>${q.nome_praia} - ${q.tipo}</option>`).join('');
    
    // Preencher período
    document.getElementById('editPeriodo').value = r.periodo;
    
    document.getElementById('editReservaModal').classList.add('active');
}

async function salvarReserva() {
    const id = document.getElementById('editReservaId').value;
    const quarto = quartos.find(q => q.id === parseInt(document.getElementById('editQuartoId').value));
    
    const data = {
        nome_responsavel: document.getElementById('editNomeResp').value,
        whatsapp: document.getElementById('editWhatsapp').value,
        email: document.getElementById('editEmail').value,
        cpf_responsavel: document.getElementById('editCpf').value,
        quarto_id: parseInt(document.getElementById('editQuartoId').value),
        periodo: document.getElementById('editPeriodo').value,
        qtd_hospedes: parseInt(document.getElementById('editQtdHospedes').value),
        observacoes: document.getElementById('editObservacoes').value,
        status: document.getElementById('editStatus').value,
        valor_total: quarto ? quarto.preco : currentReserva.valor_total,
        valor_sinal: quarto ? quarto.preco * 0.5 : currentReserva.valor_sinal
    };
    
    try {
        await supabase.update('reservas', data, `id=eq.${id}`);
        closeModal('editReservaModal');
        await loadReservas();
        alert('Reserva atualizada!');
    } catch (e) {
        console.error('Erro:', e);
        alert('Erro ao salvar.');
    }
}

// CONTRATO COMPLETO
function gerarContrato(id) {
    const r = reservas.find(x => x.id === id);
    if (!r) return;
    const q = quartos.find(x => x.id === r.quarto_id) || {};
    currentReserva = r;
    
    const dataHoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const valorTotal = r.valor_total || q.preco || 0;
    const sinal = valorTotal * 0.5;
    const checkinData = r.periodo === '29-02' ? '29/12/2025' : '30/12/2025';
    const checkoutData = r.periodo === '29-02' ? '02/01/2026' : '03/01/2026';
    
    const contratoHTML = `
        <h1>CONTRATO DE HOSPEDAGEM TEMPORÁRIA</h1>
        <p style="text-align:center;color:#666;margin-bottom:20px;">Guest House Peruíbe - Réveillon 2025</p>
        
        <h2>1. IDENTIFICAÇÃO DAS PARTES</h2>
        <p><strong>LOCADOR:</strong></p>
        <table>
            <tr><td width="150"><strong>Nome:</strong></td><td>${config.nome_locador || '________________________________'}</td></tr>
            <tr><td><strong>CPF:</strong></td><td>${config.cpf_locador || '________________________________'}</td></tr>
            <tr><td><strong>Telefone:</strong></td><td>${helpers.formatPhone(config.telefone || '')}</td></tr>
            <tr><td><strong>E-mail:</strong></td><td>${config.email || '________________________________'}</td></tr>
        </table>
        
        <p style="margin-top:15px;"><strong>LOCATÁRIO (Hóspede Responsável):</strong></p>
        <table>
            <tr><td width="150"><strong>Nome:</strong></td><td>${r.nome_responsavel}</td></tr>
            <tr><td><strong>CPF:</strong></td><td>${r.cpf_responsavel || '________________________________'}</td></tr>
            <tr><td><strong>Telefone:</strong></td><td>${helpers.formatPhone(r.whatsapp)}</td></tr>
            <tr><td><strong>E-mail:</strong></td><td>${r.email || '________________________________'}</td></tr>
        </table>
        
        <h2>2. OBJETO DO CONTRATO</h2>
        <p>O presente contrato tem como objeto a hospedagem temporária no imóvel localizado em <strong>Peruíbe - SP</strong>, modalidade "guest house", com locação do seguinte espaço:</p>
        <table>
            <tr><td width="150"><strong>Quarto:</strong></td><td>${q.nome_praia || 'N/A'} - ${q.tipo || ''}</td></tr>
            <tr><td><strong>Capacidade:</strong></td><td>Até ${q.capacidade || r.qtd_hospedes} pessoas</td></tr>
            <tr><td><strong>Comodidades:</strong></td><td>${q.tem_ar ? '✓ Ar-condicionado' : '✗ Sem AR'} | ${q.tem_tv ? '✓ TV' : '✗ Sem TV'} | ✓ Wi-Fi</td></tr>
            <tr><td><strong>Descrição:</strong></td><td>${q.camas || 'A definir'}</td></tr>
        </table>
        
        <h2>3. PERÍODO E VALORES</h2>
        <table>
            <tr><td width="150"><strong>Check-in:</strong></td><td>${checkinData} a partir das 14h00</td></tr>
            <tr><td><strong>Check-out:</strong></td><td>${checkoutData} até as 11h00</td></tr>
            <tr><td><strong>Total de diárias:</strong></td><td>4 (quatro) diárias</td></tr>
        </table>
        <table style="margin-top:10px;">
            <tr><th>Descrição</th><th>Valor</th></tr>
            <tr><td>Valor Total da Hospedagem</td><td><strong>${helpers.formatCurrency(valorTotal)}</strong></td></tr>
            <tr><td>Sinal (50%) - via Pix</td><td>${helpers.formatCurrency(sinal)}</td></tr>
            <tr><td>Restante (50%) - no check-in</td><td>${helpers.formatCurrency(sinal)}</td></tr>
        </table>
        
        <p style="margin-top:15px;"><strong>DADOS PARA PAGAMENTO PIX:</strong></p>
        <table>
            <tr><td width="150"><strong>Tipo:</strong></td><td>${config.pix_tipo || 'Telefone'}</td></tr>
            <tr><td><strong>Chave:</strong></td><td><strong>${config.pix_chave || 'A informar'}</strong></td></tr>
            <tr><td><strong>Nome:</strong></td><td>${config.pix_nome || config.nome_locador || 'A informar'}</td></tr>
        </table>
        
        <h2>4. HÓSPEDES</h2>
        <p>O LOCATÁRIO declara que ocuparão o quarto <strong>${r.qtd_hospedes}</strong> pessoa(s), conforme lista abaixo:</p>
        <table>
            <tr><th>#</th><th>Nome Completo</th><th>RG/CPF</th></tr>
            ${Array.from({length: r.qtd_hospedes}, (_, i) => `<tr><td>${i + 1}</td><td>${i === 0 ? r.nome_responsavel : '________________________________________'}</td><td>${i === 0 ? (r.cpf_responsavel || '________________') : '________________'}</td></tr>`).join('')}
        </table>
        
        <h2>5. ÁREAS DE USO</h2>
        <p><strong>Uso exclusivo:</strong> Quarto reservado (${q.nome_praia})</p>
        <p><strong>Uso compartilhado:</strong> Piscina (8h-22h), Sala (AR + TV), Cozinha completa, Banheiro social, Área externa, Estacionamento</p>
        
        <h2>6. REGRAS DA HOSPEDAGEM</h2>
        <p><strong>Horários:</strong> Check-in 14h | Check-out 11h | Silêncio 23h-8h | Piscina 8h-22h</p>
        <p><strong>Proibições:</strong> Visitantes externos, festas, som alto após 22h, fumar dentro da casa, animais de estimação.</p>
        <p><strong>Convivência:</strong> Limpar cozinha após uso, não monopolizar TV, respeitar horário de banho, separar lixo.</p>
        <p><strong>Segurança:</strong> Manter portão trancado, crianças na piscina com supervisão, não fazer cópia de chaves.</p>
        <p><strong>Não incluso:</strong> Café da manhã, roupa de cama, toalhas, produtos de higiene, limpeza diária.</p>
        
        <h2>7. VISTORIA</h2>
        <p>No check-in será realizada vistoria do quarto. O LOCATÁRIO se compromete a devolver em mesmo estado, respondendo por danos causados.</p>
        
        <h2>8. CANCELAMENTO</h2>
        <table>
            <tr><th>Prazo</th><th>Reembolso do Sinal</th></tr>
            <tr><td>Até 7 dias antes do check-in</td><td>100% do valor pago</td></tr>
            <tr><td>De 3 a 6 dias antes</td><td>50% do valor pago</td></tr>
            <tr><td>Menos de 3 dias</td><td>Sem reembolso</td></tr>
        </table>
        
        <h2>9. DISPOSIÇÕES GERAIS</h2>
        <p>O LOCATÁRIO declara ter lido e concordar com todas as regras estabelecidas neste contrato. O descumprimento das regras poderá resultar na saída imediata sem direito a reembolso.</p>
        
        <h2>10. FORO</h2>
        <p>Fica eleito o foro da comarca de Peruíbe/SP para dirimir quaisquer questões oriundas deste contrato.</p>
        
        <p style="margin-top:30px;">Peruíbe/SP, ${dataHoje}</p>
        
        <div style="display:flex;justify-content:space-between;margin-top:50px;">
            <div style="text-align:center;width:45%;">
                <div style="border-top:1px solid #000;padding-top:5px;">
                    <strong>LOCADOR</strong><br>
                    ${config.nome_locador || '________________________________'}
                </div>
            </div>
            <div style="text-align:center;width:45%;">
                <div style="border-top:1px solid #000;padding-top:5px;">
                    <strong>LOCATÁRIO</strong><br>
                    ${r.nome_responsavel}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('contratoPreview').innerHTML = contratoHTML;
    document.getElementById('contratoModal').classList.add('active');
}

function downloadContrato() {
    const element = document.getElementById('contratoPreview');
    const nomeArquivo = `contrato-${currentReserva?.nome_responsavel?.replace(/\s+/g, '-').toLowerCase() || 'reserva'}.pdf`;
    
    if (typeof html2pdf !== 'undefined') {
        const opt = {
            margin: [10, 15, 10, 15],
            filename: nomeArquivo,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    } else {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Contrato</title>
            <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px;line-height:1.5}
            h1{font-size:16px;text-align:center}h2{font-size:13px;margin:15px 0 8px;border-bottom:1px solid #ccc;padding-bottom:3px}
            table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ddd;padding:6px;text-align:left;font-size:11px}th{background:#f5f5f5}</style>
            </head><body>${element.innerHTML}</body></html>`);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }
}

function enviarWhatsApp(id) {
    const r = reservas.find(x => x.id === id);
    if (!r) return;
    const q = quartos.find(x => x.id === r.quarto_id) || {};
    const sinal = (r.valor_total || q.preco) * 0.5;
    const periodo = r.periodo === '29-02' ? '29/12 a 02/01' : '30/12 a 03/01';
    
    const msg = r.status !== 'pre_reserva' 
        ? `Olá ${r.nome_responsavel}! 🏖️\n\nSua reserva na *Guest House Peruíbe* foi *CONFIRMADA*!\n\n📋 *Resumo:*\n🏷️ ${q.nome_praia} - ${q.tipo}\n📅 ${periodo}\n👥 ${r.qtd_hospedes} pessoas\n💰 ${helpers.formatCurrency(r.valor_total || q.preco)}\n\n💳 *Sinal (50%):* ${helpers.formatCurrency(sinal)}\n*Pix:* ${config.pix_chave || '___'}\n*Nome:* ${config.pix_nome || '___'}\n\n📍 Endereço após pagar sinal\n⏰ Check-in 14h | Check-out 11h\n📌 Trazer roupa de cama e toalhas!\n\nQualquer dúvida, só chamar! 🤙`
        : `Olá ${r.nome_responsavel}!\n\nRecebi sua pré-reserva na *Guest House Peruíbe*!\n\n🏷️ ${q.nome_praia}\n📅 ${periodo}\n👥 ${r.qtd_hospedes} pessoas\n💰 ${helpers.formatCurrency(r.valor_total || q.preco)}\n\nPosso confirmar?`;
    
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
                    <span>👥 ${q.capacidade}</span>
                    <span>🛏️ ${q.camas || '?'}</span>
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
