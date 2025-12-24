// Variáveis globais
let quartos = [];
let config = {};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await loadConfig();
    await loadQuartos();
    setupForm();
    setupAccordion();
    setupQuantity();
    setupMasks();
});

// Carregar configurações
async function loadConfig() {
    try {
        const data = await supabase.select('config');
        config = {};
        data.forEach(item => {
            config[item.chave] = item.valor;
        });
        
        // Atualizar distâncias
        updateText('distPraia', config.distancia_praia);
        updateText('heroDistPraia', config.distancia_praia);
        updateText('distMercado', config.distancia_mercado);
        updateText('distMcdonalds', config.distancia_mcdonalds);
        updateText('distCentro', config.distancia_centro);
        
        // Mapa
        if (config.endereco_maps) {
            const mapContainer = document.getElementById('locationMap');
            if (mapContainer) {
                mapContainer.innerHTML = `<iframe src="${config.endereco_maps}" allowfullscreen="" loading="lazy"></iframe>`;
            }
        }
        
        // Foto hero
        if (config.foto_hero) {
            const heroBg = document.getElementById('heroBgImage');
            if (heroBg) heroBg.style.backgroundImage = `url(${config.foto_hero})`;
        }
    } catch (error) {
        console.error('Erro ao carregar config:', error);
    }
}

function updateText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
}

// Carregar quartos
async function loadQuartos() {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;
    
    try {
        // Tentar view primeiro
        try {
            quartos = await supabase.select('quartos_disponibilidade');
        } catch {
            quartos = await supabase.select('quartos', 'ativo=eq.true&order=ordem');
        }
        
        if (!quartos || quartos.length === 0) {
            grid.innerHTML = '<p style="text-align:center;">Nenhum quarto disponível no momento.</p>';
            return;
        }
        
        grid.innerHTML = quartos.map(renderRoomCard).join('');
        
        // Atualizar select
        const select = document.getElementById('quarto');
        if (select) {
            quartos.forEach(q => {
                const option = document.createElement('option');
                option.value = q.id;
                option.textContent = `${q.nome_praia} - ${q.tipo} (${helpers.formatCurrency(q.preco)})`;
                option.dataset.capacidade = q.capacidade;
                option.dataset.preco = q.preco;
                select.appendChild(option);
            });
        }
        
        lucide.createIcons();
        
        // Eventos dos botões
        document.querySelectorAll('.room-cta').forEach(btn => {
            btn.addEventListener('click', () => selectRoom(btn.dataset.roomId));
        });
    } catch (error) {
        console.error('Erro ao carregar quartos:', error);
        grid.innerHTML = '<p style="text-align:center;color:var(--danger);">Erro ao carregar quartos.</p>';
    }
}

// Renderizar card
function renderRoomCard(quarto) {
    const status29 = quarto.status_29_02 || 'disponivel';
    const status30 = quarto.status_30_03 || 'disponivel';
    
    const statusInfo = {
        'disponivel': { text: 'Disponível', icon: 'check-circle' },
        'pre_reserva': { text: 'Em negociação', icon: 'clock' },
        'ocupado': { text: 'Esgotado', icon: 'x-circle' }
    };
    
    const precoPorPessoa = Math.ceil(quarto.preco / quarto.capacidade);
    const isAvailable = status29 !== 'ocupado' || status30 !== 'ocupado';
    
    return `
        <div class="room-card">
            <div class="room-image">
                ${quarto.foto_url 
                    ? `<img src="${quarto.foto_url}" alt="${quarto.nome_praia}" loading="lazy">`
                    : `<div class="room-image-placeholder">
                        <i data-lucide="image"></i>
                        <span>Foto em breve</span>
                      </div>`
                }
                ${quarto.destaque ? `<span class="room-tag">${quarto.destaque}</span>` : ''}
            </div>
            <div class="room-content">
                <p class="room-name">
                    <i data-lucide="umbrella"></i>
                    ${quarto.nome_praia}
                </p>
                <h3 class="room-type">${quarto.tipo}</h3>
                
                <div class="room-info">
                    <div class="room-info-item">
                        <i data-lucide="users"></i>
                        <span>Até ${quarto.capacidade} pessoas</span>
                    </div>
                    <div class="room-info-item">
                        <i data-lucide="bed-double"></i>
                        <span>${quarto.camas || 'A definir'}</span>
                    </div>
                    ${quarto.descricao ? `
                    <div class="room-info-item">
                        <i data-lucide="info"></i>
                        <span>${quarto.descricao}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="room-amenities">
                    <span class="amenity ${quarto.tem_ar ? 'yes' : 'no'}">
                        <i data-lucide="${quarto.tem_ar ? 'check' : 'x'}"></i>
                        AR
                    </span>
                    <span class="amenity ${quarto.tem_tv ? 'yes' : 'no'}">
                        <i data-lucide="${quarto.tem_tv ? 'check' : 'x'}"></i>
                        TV
                    </span>
                    <span class="amenity yes">
                        <i data-lucide="check"></i>
                        Wi-Fi
                    </span>
                </div>
                
                <div class="room-price-box">
                    <div class="room-price">${helpers.formatCurrency(quarto.preco)}</div>
                    <div class="room-price-period">período completo (4 diárias)</div>
                    <div class="room-price-per-person">= ${helpers.formatCurrency(precoPorPessoa)}/pessoa</div>
                </div>
                
                <div class="room-availability">
                    <p class="room-availability-title">📅 Disponibilidade:</p>
                    <div class="availability-item ${status29}">
                        <i data-lucide="${statusInfo[status29].icon}"></i>
                        29/12 a 02/01 - ${statusInfo[status29].text}
                    </div>
                    <div class="availability-item ${status30}">
                        <i data-lucide="${statusInfo[status30].icon}"></i>
                        30/12 a 03/01 - ${statusInfo[status30].text}
                    </div>
                </div>
                
                <button class="room-cta" data-room-id="${quarto.id}" ${!isAvailable ? 'disabled' : ''}>
                    <i data-lucide="${isAvailable ? 'calendar-check' : 'x'}"></i>
                    ${isAvailable ? 'Reservar Este' : 'Esgotado'}
                </button>
            </div>
        </div>
    `;
}

// Selecionar quarto
function selectRoom(roomId) {
    const select = document.getElementById('quarto');
    if (select) {
        select.value = roomId;
        
        // Atualizar capacidade máxima
        const option = select.options[select.selectedIndex];
        if (option && option.dataset.capacidade) {
            const maxQtd = parseInt(option.dataset.capacidade);
            const qtdValue = document.getElementById('qtdValue');
            const qtdInput = document.getElementById('qtdHospedes');
            if (qtdValue && parseInt(qtdValue.textContent) > maxQtd) {
                qtdValue.textContent = maxQtd;
                if (qtdInput) qtdInput.value = maxQtd;
            }
        }
    }
    
    // Scroll pro formulário
    document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
}

// Setup do formulário
function setupForm() {
    const form = document.getElementById('bookingForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Enviando...';
        
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
            
            // Pegar preço do quarto selecionado
            const quartoSelecionado = quartos.find(q => q.id === formData.quarto_id);
            if (quartoSelecionado) {
                formData.valor_total = quartoSelecionado.preco;
                formData.valor_sinal = quartoSelecionado.preco * 0.5;
            }
            
            // Salvar no Supabase
            await supabase.insert('reservas', formData);
            
            // Montar mensagem pro WhatsApp
            const periodoTexto = formData.periodo === '29-02' ? '29/12 a 02/01' : '30/12 a 03/01';
            const quartoNome = quartoSelecionado ? `${quartoSelecionado.nome_praia} - ${quartoSelecionado.tipo}` : 'Não selecionado';
            
            const mensagem = `Olá Davi! 🏖️

Acabei de fazer uma pré-reserva no site do Hostel Casa Peruíbe!

📋 *Meus dados:*
• Nome: ${formData.nome_responsavel}
• WhatsApp: ${helpers.formatPhone(formData.whatsapp)}
• E-mail: ${formData.email}

🛏️ *Reserva:*
• Quarto: ${quartoNome}
• Período: ${periodoTexto}
• Pessoas: ${formData.qtd_hospedes}
${formData.observacoes ? `• Obs: ${formData.observacoes}` : ''}

Aguardo confirmação! 😊`;
            
            // Redirecionar pro WhatsApp
            const whatsappUrl = helpers.whatsAppLink(config.telefone || '11998770637', mensagem);
            window.open(whatsappUrl, '_blank');
            
            // Reset form
            form.reset();
            document.getElementById('qtdValue').textContent = '2';
            document.getElementById('qtdHospedes').value = '2';
            
            alert('Pré-reserva enviada! Você será redirecionado para o WhatsApp.');
            
        } catch (error) {
            console.error('Erro ao enviar reserva:', error);
            alert('Erro ao enviar reserva. Tente novamente ou entre em contato pelo WhatsApp.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="send"></i> Enviar e Falar com Davi';
            lucide.createIcons();
        }
    });
    
    // Radio items styling
    document.querySelectorAll('.radio-item input').forEach(input => {
        input.addEventListener('change', () => {
            document.querySelectorAll('.radio-item').forEach(item => item.classList.remove('selected'));
            if (input.checked) {
                input.closest('.radio-item').classList.add('selected');
            }
        });
    });
}

// Accordion
function setupAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.closest('.accordion-item');
            const isOpen = item.classList.contains('open');
            
            // Fechar outros (opcional - remover se quiser múltiplos abertos)
            // document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
            
            item.classList.toggle('open', !isOpen);
        });
    });
}

// Quantity selector
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
        
        // Pegar capacidade máxima do quarto selecionado
        if (quartoSelect && quartoSelect.value) {
            const option = quartoSelect.options[quartoSelect.selectedIndex];
            if (option && option.dataset.capacidade) {
                max = parseInt(option.dataset.capacidade);
            }
        }
        
        current = Math.max(1, Math.min(max, current + delta));
        qtdValue.textContent = current;
        qtdInput.value = current;
    };
    
    minusBtn.addEventListener('click', () => updateQtd(-1));
    plusBtn.addEventListener('click', () => updateQtd(1));
    
    // Atualizar max quando mudar quarto
    if (quartoSelect) {
        quartoSelect.addEventListener('change', () => {
            const option = quartoSelect.options[quartoSelect.selectedIndex];
            if (option && option.dataset.capacidade) {
                const max = parseInt(option.dataset.capacidade);
                const current = parseInt(qtdValue.textContent);
                if (current > max) {
                    qtdValue.textContent = max;
                    qtdInput.value = max;
                }
            }
        });
    }
}

// Máscaras de input
function setupMasks() {
    // WhatsApp
    const whatsappInput = document.getElementById('whatsapp');
    if (whatsappInput) {
        whatsappInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            }
            e.target.value = value;
        });
    }
    
    // CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            }
            e.target.value = value;
        });
    }
}
