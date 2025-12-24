// Fotos locais dos quartos
const FOTOS_QUARTOS = {
    'Costão': 'img/quarto-costao.jpg',
    'Ruínas': 'img/quarto-ruinas.jpg',
    'Prainha': 'img/quarto-prainha.jpg',
    'Guaraú': 'img/quarto-guarau.jpg'
};

let quartos = [], config = {};

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await loadConfig();
    await loadQuartos();
    setupForm();
    setupAccordion();
    setupModal();
});

async function loadConfig() {
    try {
        const data = await supabase.select('config');
        data.forEach(item => config[item.chave] = item.valor);
    } catch (e) { console.log('Config padrão'); }
}

async function loadQuartos() {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;
    
    try {
        quartos = await supabase.select('quartos', 'order=ordem');
        
        if (!quartos || quartos.length === 0) {
            quartos = [
                { id: 1, nome_praia: 'Costão', tipo: 'Quarto Econômico', capacidade: 4, preco: 2500, camas: '1 casal + 2 solteiro', descricao: 'Ideal para famílias pequenas', tem_ar: false, tem_tv: false, destaque: '💰 Menor preço', status_29_02: 'disponivel', status_30_03: 'disponivel' },
                { id: 2, nome_praia: 'Ruínas', tipo: 'Quarto Standard', capacidade: 5, preco: 3200, camas: '1 casal + 3 solteiro', descricao: 'Espaçoso com ótima ventilação', tem_ar: false, tem_tv: true, destaque: null, status_29_02: 'disponivel', status_30_03: 'disponivel' },
                { id: 3, nome_praia: 'Prainha', tipo: 'Quarto Conforto', capacidade: 5, preco: 3500, camas: '1 casal + 1 beliche + 1 solteiro', descricao: 'Com ar-condicionado e TV', tem_ar: true, tem_tv: true, destaque: '⭐ Mais procurado', status_29_02: 'disponivel', status_30_03: 'disponivel' },
                { id: 4, nome_praia: 'Guaraú', tipo: 'Quarto Premium', capacidade: 6, preco: 4500, camas: '1 casal + 2 beliches', descricao: 'Suíte com banheiro privativo', tem_ar: true, tem_tv: true, destaque: '👑 Suíte Premium', status_29_02: 'disponivel', status_30_03: 'disponivel' }
            ];
        }
        
        grid.innerHTML = quartos.map(renderRoomCard).join('');
        
        const select = document.getElementById('quarto');
        if (select) {
            select.innerHTML = '<option value="">Selecione o quarto</option>';
            quartos.forEach(q => {
                const opt = document.createElement('option');
                opt.value = q.id;
                opt.textContent = `${q.nome_praia} - ${q.tipo} (${helpers.formatCurrency(q.preco)})`;
                opt.dataset.capacidade = q.capacidade;
                select.appendChild(opt);
            });
        }
        
        lucide.createIcons();
        
        document.querySelectorAll('.room-cta').forEach(btn => {
            btn.addEventListener('click', () => openReservaModal(btn.dataset.roomId));
        });
        
    } catch (e) {
        console.error('Erro:', e);
        grid.innerHTML = '<p style="text-align:center;color:#e74c3c;">Erro ao carregar. Recarregue a página.</p>';
    }
}

function renderRoomCard(q) {
    const fotoUrl = FOTOS_QUARTOS[q.nome_praia] || 'img/quarto-costao.jpg';
    
    const status29 = q.status_29_02 || 'disponivel';
    const status30 = q.status_30_03 || 'disponivel';
    const ocupado29 = status29 === 'ocupado' || status29 === 'confirmada';
    const ocupado30 = status30 === 'ocupado' || status30 === 'confirmada';
    const ambosOcupados = ocupado29 && ocupado30;
    
    const visualizando = (q.id * 3 + 2) % 5 + 3;
    
    let periodoStatus = '';
    if (ambosOcupados) {
        periodoStatus = `<div class="room-status ocupado"><i data-lucide="x-circle"></i> Esgotado para o Réveillon</div>`;
    } else {
        periodoStatus = `
            <div class="room-periodos">
                <div class="periodo-item ${ocupado29 ? 'ocupado' : 'disponivel'}">
                    <i data-lucide="${ocupado29 ? 'x-circle' : 'check-circle'}"></i>
                    <span>29/12 - 02/01</span>
                    <small>${ocupado29 ? 'Reservado' : 'Disponível'}</small>
                </div>
                <div class="periodo-item ${ocupado30 ? 'ocupado' : 'disponivel'}">
                    <i data-lucide="${ocupado30 ? 'x-circle' : 'check-circle'}"></i>
                    <span>30/12 - 03/01</span>
                    <small>${ocupado30 ? 'Reservado' : 'Disponível'}</small>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="room-card ${ambosOcupados ? 'esgotado' : ''}">
            <div class="room-image">
                <img src="${fotoUrl}" alt="${q.nome_praia}">
                ${q.destaque ? `<span class="room-tag">${q.destaque}</span>` : ''}
                ${!ambosOcupados ? `<div class="room-visualizando"><i data-lucide="eye"></i> ${visualizando} pessoas vendo agora</div>` : ''}
            </div>
            <div class="room-content">
                <div class="room-header">
                    <span class="room-name"><i data-lucide="waves"></i> ${q.nome_praia}</span>
                    <span class="room-type">${q.tipo}</span>
                </div>
                <div class="room-details">
                    <span><i data-lucide="users"></i> Até ${q.capacidade} pessoas</span>
                    <span><i data-lucide="bed-double"></i> ${q.camas || 'Consultar'}</span>
                </div>
                <p class="room-desc"><i data-lucide="info"></i> ${q.descricao || ''}</p>
                <div class="room-amenities">
                    <span class="${q.tem_ar ? 'yes' : 'no'}"><i data-lucide="${q.tem_ar ? 'check' : 'x'}"></i> AR</span>
                    <span class="${q.tem_tv ? 'yes' : 'no'}"><i data-lucide="${q.tem_tv ? 'check' : 'x'}"></i> TV</span>
                    <span class="yes"><i data-lucide="check"></i> Wi-Fi</span>
                </div>
                ${periodoStatus}
                <div class="room-footer">
                    <div class="room-price">
                        <span class="price-value">${helpers.formatCurrency(q.preco)}</span>
                        <span class="price-period">4 diárias</span>
                    </div>
                    <button class="room-cta" data-room-id="${q.id}" ${ambosOcupados ? 'disabled' : ''}>
                        <i data-lucide="${ambosOcupados ? 'x' : 'message-circle'}"></i>
                        ${ambosOcupados ? 'Esgotado' : 'Tenho Interesse'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function openReservaModal(roomId) {
    const modal = document.getElementById('reservaModal');
    const select = document.getElementById('quarto');
    
    if (select && roomId) {
        select.value = roomId;
        const quarto = quartos.find(q => q.id == roomId);
        if (quarto) updatePeriodosDisponiveis(quarto);
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updatePeriodosDisponiveis(quarto) {
    const container = document.getElementById('periodosContainer');
    if (!container) return;
    
    const ocupado29 = quarto.status_29_02 === 'ocupado' || quarto.status_29_02 === 'confirmada';
    const ocupado30 = quarto.status_30_03 === 'ocupado' || quarto.status_30_03 === 'confirmada';
    
    container.innerHTML = `
        <label class="radio-item ${ocupado29 ? 'disabled' : ''}">
            <input type="radio" name="periodo" value="29-02" ${ocupado29 ? 'disabled' : ''} required>
            <span>29/12 a 02/01 (4 diárias) ${ocupado29 ? '- RESERVADO' : ''}</span>
        </label>
        <label class="radio-item ${ocupado30 ? 'disabled' : ''}">
            <input type="radio" name="periodo" value="30-03" ${ocupado30 ? 'disabled' : ''}>
            <span>30/12 a 03/01 (4 diárias) ${ocupado30 ? '- RESERVADO' : ''}</span>
        </label>
    `;
    
    if (!ocupado29) container.querySelector('input[value="29-02"]').checked = true;
    else if (!ocupado30) container.querySelector('input[value="30-03"]').checked = true;
}

function closeReservaModal() {
    document.getElementById('reservaModal').classList.remove('active');
    document.body.style.overflow = '';
}

function setupModal() {
    document.getElementById('closeModal')?.addEventListener('click', closeReservaModal);
    document.getElementById('reservaModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'reservaModal') closeReservaModal();
    });
    
    document.getElementById('quarto')?.addEventListener('change', (e) => {
        const quarto = quartos.find(q => q.id == e.target.value);
        if (quarto) updatePeriodosDisponiveis(quarto);
    });
}

function setupForm() {
    const form = document.getElementById('bookingForm');
    const qtdMinus = document.getElementById('qtdMinus');
    const qtdPlus = document.getElementById('qtdPlus');
    const qtdValue = document.getElementById('qtdValue');
    const qtdInput = document.getElementById('qtdHospedes');
    
    let qtd = 2;
    
    qtdMinus?.addEventListener('click', () => {
        if (qtd > 1) { qtd--; qtdValue.textContent = qtd; qtdInput.value = qtd; }
    });
    
    qtdPlus?.addEventListener('click', () => {
        const max = document.getElementById('quarto')?.selectedOptions[0]?.dataset.capacidade || 10;
        if (qtd < max) { qtd++; qtdValue.textContent = qtd; qtdInput.value = qtd; }
    });
    
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading-spinner small"></div> Enviando...';
        
        const nome = document.getElementById('nome').value;
        const whatsapp = document.getElementById('whatsapp').value;
        const cpf = document.getElementById('cpf').value;
        const email = document.getElementById('email').value;
        const quartoId = document.getElementById('quarto').value;
        const periodo = document.querySelector('input[name="periodo"]:checked')?.value;
        const qtdHospedes = document.getElementById('qtdHospedes').value;
        const observacoes = document.getElementById('observacoes').value;
        
        const quarto = quartos.find(q => q.id == quartoId);
        
        try {
            // Inserir reserva
            await supabase.insert('reservas', {
                nome_responsavel: nome,
                whatsapp: whatsapp.replace(/\D/g, ''),
                cpf_responsavel: cpf,
                email: email,
                quarto_id: parseInt(quartoId),
                periodo: periodo,
                qtd_hospedes: parseInt(qtdHospedes),
                observacoes: observacoes,
                valor_total: quarto?.preco || 0,
                valor_sinal: (quarto?.preco || 0) * 0.5,
                status: 'pre_reserva'
            });
            
            // Bloquear o período do quarto
            const updateData = periodo === '29-02' 
                ? { status_29_02: 'pre_reserva' } 
                : { status_30_03: 'pre_reserva' };
            await supabase.update('quartos', updateData, `id=eq.${quartoId}`);
            
        } catch (err) { console.log('Erro ao salvar, mas continua para WhatsApp:', err); }
        
        const periodoTexto = periodo === '29-02' ? '29/12 a 02/01' : '30/12 a 03/01';
        const msg = `Olá Davi! 🏖️

Tenho interesse na Guest House Peruíbe!

📋 *Dados:*
• Nome: ${nome}
• WhatsApp: ${whatsapp}
• E-mail: ${email}

🛏️ *Quarto:* ${quarto?.nome_praia} - ${quarto?.tipo}
📅 *Período:* ${periodoTexto}
👥 *Pessoas:* ${qtdHospedes}
💰 *Valor:* ${helpers.formatCurrency(quarto?.preco || 0)}

${observacoes ? `📝 *Obs:* ${observacoes}` : ''}

Aguardo retorno! 😊`;
        
        window.open(helpers.whatsAppLink(config.telefone || '11998770637', msg), '_blank');
        
        closeReservaModal();
        form.reset();
        qtd = 2; qtdValue.textContent = '2'; qtdInput.value = '2';
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="message-circle"></i> Falar com Davi no WhatsApp';
        lucide.createIcons();
    });
}

function setupAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const wasOpen = item.classList.contains('open');
            document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
            if (!wasOpen) item.classList.add('open');
        });
    });
}
