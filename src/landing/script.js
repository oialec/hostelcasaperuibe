let quartos = [];
let config = {};

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await loadConfig();
    await loadQuartos();
    setupForm();
    setupAccordion();
    setupQuantity();
    setupMasks();
    setupModal();
});

async function loadConfig() {
    try {
        const data = await supabase.select('config');
        config = {};
        data.forEach(item => config[item.chave] = item.valor);
        updateText('distPraia', config.distancia_praia);
        updateText('heroDistPraia', config.distancia_praia);
        updateText('distMercado', config.distancia_mercado);
        updateText('distMcdonalds', config.distancia_mcdonalds);
        updateText('distCentro', config.distancia_centro);
        if (config.endereco_maps) {
            const mapContainer = document.getElementById('locationMap');
            if (mapContainer) mapContainer.innerHTML = `<iframe src="${config.endereco_maps}" allowfullscreen="" loading="lazy"></iframe>`;
        }
        if (config.foto_hero) {
            const heroBg = document.getElementById('heroBgImage');
            if (heroBg) heroBg.style.backgroundImage = `url(${config.foto_hero})`;
        }
    } catch (e) { console.error('Erro config:', e); }
}

function updateText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
}

async function loadQuartos() {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;
    try {
        try { quartos = await supabase.select('quartos_disponibilidade'); }
        catch { quartos = await supabase.select('quartos', 'ativo=eq.true&order=ordem'); }
        if (!quartos || quartos.length === 0) { grid.innerHTML = '<p style="text-align:center;">Nenhum quarto disponível.</p>'; return; }
        grid.innerHTML = quartos.map(renderRoomCard).join('');
        const select = document.getElementById('quarto');
        if (select) {
            quartos.forEach(q => {
                const opt = document.createElement('option');
                opt.value = q.id;
                opt.textContent = `${q.nome_praia} - ${q.tipo} (${helpers.formatCurrency(q.preco)})`;
                opt.dataset.capacidade = q.capacidade;
                opt.dataset.preco = q.preco;
                select.appendChild(opt);
            });
        }
        lucide.createIcons();
        document.querySelectorAll('.room-cta').forEach(btn => {
            btn.addEventListener('click', () => openReservaModal(btn.dataset.roomId));
        });
    } catch (e) { console.error('Erro quartos:', e); grid.innerHTML = '<p style="text-align:center;color:var(--danger);">Erro ao carregar.</p>'; }
}

function renderRoomCard(q) {
    const status29 = q.status_29_02 || 'disponivel';
    const status30 = q.status_30_03 || 'disponivel';
    // Lógica de período exclusivo
    const statusGeral = (status29 === 'ocupado' || status30 === 'ocupado') ? 'ocupado' : 
                        (status29 === 'pre_reserva' || status30 === 'pre_reserva') ? 'pre_reserva' : 'disponivel';
    const statusInfo = { disponivel: { text: 'Disponível', icon: 'check-circle' }, pre_reserva: { text: 'Em negociação', icon: 'clock' }, ocupado: { text: 'Esgotado', icon: 'x-circle' } };
    const precoPorPessoa = Math.ceil(q.preco / q.capacidade / 4); // por noite
    const isAvailable = statusGeral !== 'ocupado';
    
    return `<div class="room-card">
        <div class="room-image">
            ${q.foto_url ? `<img src="${q.foto_url}" alt="${q.nome_praia}" loading="lazy">` : `<div class="room-image-placeholder"><i data-lucide="image"></i><span>Foto em breve</span></div>`}
            ${q.destaque ? `<span class="room-tag">${q.destaque}</span>` : ''}
        </div>
        <div class="room-content">
            <p class="room-name"><i data-lucide="umbrella"></i>${q.nome_praia}</p>
            <h3 class="room-type">${q.tipo}</h3>
            <div class="room-info">
                <div class="room-info-item"><i data-lucide="users"></i><span>Até ${q.capacidade} pessoas</span></div>
                <div class="room-info-item"><i data-lucide="bed-double"></i><span>${q.camas || 'A definir'}</span></div>
                ${q.descricao ? `<div class="room-info-item"><i data-lucide="info"></i><span>${q.descricao}</span></div>` : ''}
            </div>
            <div class="room-amenities">
                <span class="amenity ${q.tem_ar ? 'yes' : 'no'}"><i data-lucide="${q.tem_ar ? 'check' : 'x'}"></i>AR</span>
                <span class="amenity ${q.tem_tv ? 'yes' : 'no'}"><i data-lucide="${q.tem_tv ? 'check' : 'x'}"></i>TV</span>
                <span class="amenity yes"><i data-lucide="check"></i>Wi-Fi</span>
            </div>
            <div class="room-price-box">
                <div class="room-price">${helpers.formatCurrency(q.preco)}</div>
                <div class="room-price-period">período completo (4 diárias)</div>
                <div class="room-price-per-person">= ${helpers.formatCurrency(precoPorPessoa)}/noite por pessoa</div>
            </div>
            <div class="room-availability">
                <p class="room-availability-title">📅 Disponibilidade:</p>
                <div class="availability-item ${statusGeral}">
                    <i data-lucide="${statusInfo[statusGeral].icon}"></i>
                    Réveillon (29/12 a 03/01) - ${statusInfo[statusGeral].text}
                </div>
            </div>
            <button class="room-cta" data-room-id="${q.id}" ${!isAvailable ? 'disabled' : ''}>
                <i data-lucide="${isAvailable ? 'calendar-check' : 'x'}"></i>
                ${isAvailable ? 'Reservar Este' : 'Esgotado'}
            </button>
        </div>
    </div>`;
}

// MODAL
function setupModal() {
    document.getElementById('closeModal')?.addEventListener('click', closeReservaModal);
    document.getElementById('reservaModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeReservaModal();
    });
    document.querySelector('.mobile-cta-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openReservaModal();
    });
}

function openReservaModal(quartoId = null) {
    const modal = document.getElementById('reservaModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (quartoId) {
        const select = document.getElementById('quarto');
        if (select) {
            select.value = quartoId;
            select.dispatchEvent(new Event('change'));
        }
    }
    lucide.createIcons();
}

function closeReservaModal() {
    const modal = document.getElementById('reservaModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function setupForm() {
    const form = document.getElementById('bookingForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader-2"></i> Enviando...';
        try {
            const formData = {
                nome_responsavel: document.getElementById('nome').value.trim(),
                whatsapp: document.getElementById('whatsapp').value.replace(/\D/g, ''),
                cpf_responsavel: document.getElementById('cpf').value.trim(),
                email: document.getElementById('email').value.trim(),
                quarto_id: parseInt(document.getElementById('quarto').value),
                periodo: document.querySelector('input[name="periodo"]:checked')?.value,
                qtd_hospedes: parseInt(document.getElementById('qtdHospedes').value),
                observacoes: document.getElementById('observacoes').value.trim(),
                status: 'pre_reserva'
            };
            const quartoSel = quartos.find(q => q.id === formData.quarto_id);
            if (quartoSel) {
                formData.valor_total = quartoSel.preco;
                formData.valor_sinal = quartoSel.preco * 0.5;
            }
            await supabase.insert('reservas', formData);
            const periodo = formData.periodo === '29-02' ? '29/12 a 02/01' : '30/12 a 03/01';
            const quartoNome = quartoSel ? `${quartoSel.nome_praia} - ${quartoSel.tipo}` : '';
            const msg = `Olá Davi! 🏖️\n\nPré-reserva no Guest House Peruíbe!\n\n📋 *Dados:*\n• ${formData.nome_responsavel}\n• WhatsApp: ${helpers.formatPhone(formData.whatsapp)}\n• Email: ${formData.email}\n\n🛏️ *Reserva:*\n• Quarto: ${quartoNome}\n• Período: ${periodo}\n• ${formData.qtd_hospedes} pessoas\n${formData.observacoes ? `• Obs: ${formData.observacoes}` : ''}\n\nAguardo confirmação! 😊`;
            window.open(helpers.whatsAppLink(config.telefone || '11998770637', msg), '_blank');
            form.reset();
            document.getElementById('qtdValue').textContent = '2';
            document.getElementById('qtdHospedes').value = '2';
            closeReservaModal();
            alert('Pré-reserva enviada! Você foi redirecionado para o WhatsApp.');
        } catch (e) {
            console.error('Erro:', e);
            alert('Erro ao enviar. Tente novamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="send"></i> Enviar e Falar com Davi';
            lucide.createIcons();
        }
    });
    document.querySelectorAll('.radio-item input').forEach(input => {
        input.addEventListener('change', () => {
            document.querySelectorAll('.radio-item').forEach(item => item.classList.remove('selected'));
            if (input.checked) input.closest('.radio-item').classList.add('selected');
        });
    });
}

function setupAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.closest('.accordion-item');
            item.classList.toggle('open');
        });
    });
}

function setupQuantity() {
    const qtdValue = document.getElementById('qtdValue');
    const qtdInput = document.getElementById('qtdHospedes');
    const minusBtn = document.getElementById('qtdMinus');
    const plusBtn = document.getElementById('qtdPlus');
    const quartoSelect = document.getElementById('quarto');
    if (!qtdValue || !qtdInput || !minusBtn || !plusBtn) return;
    const updateQtd = (delta) => {
        let current = parseInt(qtdValue.textContent);
        let max = 5;
        if (quartoSelect?.value) {
            const opt = quartoSelect.options[quartoSelect.selectedIndex];
            if (opt?.dataset.capacidade) max = parseInt(opt.dataset.capacidade);
        }
        current = Math.max(1, Math.min(max, current + delta));
        qtdValue.textContent = current;
        qtdInput.value = current;
    };
    minusBtn.addEventListener('click', () => updateQtd(-1));
    plusBtn.addEventListener('click', () => updateQtd(1));
    quartoSelect?.addEventListener('change', () => {
        const opt = quartoSelect.options[quartoSelect.selectedIndex];
        if (opt?.dataset.capacidade) {
            const max = parseInt(opt.dataset.capacidade);
            const current = parseInt(qtdValue.textContent);
            if (current > max) { qtdValue.textContent = max; qtdInput.value = max; }
        }
    });
}

function setupMasks() {
    const whatsapp = document.getElementById('whatsapp');
    if (whatsapp) {
        whatsapp.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length <= 11) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            e.target.value = v;
        });
    }
    const cpf = document.getElementById('cpf');
    if (cpf) {
        cpf.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length <= 11) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            e.target.value = v;
        });
    }
}
