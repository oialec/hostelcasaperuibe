// Configuração do Supabase
const SUPABASE_URL = 'https://vzdgwosgcojhztbrkukh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6ZGd3b3NnY29qaHp0YnJrdWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTQ0MDMsImV4cCI6MjA4MjEzMDQwM30.vSCHbyFLgfepCoWpeg_lKfZoanpCNsVea2uNfGuAxpA';
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/hostel-fotos`;

// Cliente Supabase simples (sem dependência externa)
const supabase = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
    
    // Fazer requisições ao Supabase
    async request(endpoint, options = {}) {
        const url = `${this.url}/rest/v1/${endpoint}`;
        const headers = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': options.prefer || 'return=representation',
            ...options.headers
        };
        
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase error: ${error}`);
        }
        
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    },
    
    // SELECT
    async select(table, query = '') {
        return this.request(`${table}${query ? '?' + query : ''}`);
    },
    
    // INSERT
    async insert(table, data) {
        return this.request(table, {
            method: 'POST',
            body: data
        });
    },
    
    // UPDATE
    async update(table, data, query) {
        return this.request(`${table}?${query}`, {
            method: 'PATCH',
            body: data
        });
    },
    
    // DELETE
    async delete(table, query) {
        return this.request(`${table}?${query}`, {
            method: 'DELETE'
        });
    },
    
    // RPC (funções)
    async rpc(functionName, params = {}) {
        const url = `${this.url}/rest/v1/rpc/${functionName}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': this.key,
                'Authorization': `Bearer ${this.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        return response.json();
    },
    
    // Storage - Upload
    async uploadFile(bucket, path, file) {
        const url = `${this.url}/storage/v1/object/${bucket}/${path}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': this.key,
                'Authorization': `Bearer ${this.key}`,
                'Content-Type': file.type,
                'x-upsert': 'true'
            },
            body: file
        });
        
        if (!response.ok) {
            throw new Error('Erro no upload');
        }
        
        return {
            path,
            url: `${this.url}/storage/v1/object/public/${bucket}/${path}`
        };
    },
    
    // Storage - Delete
    async deleteFile(bucket, paths) {
        const url = `${this.url}/storage/v1/object/${bucket}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': this.key,
                'Authorization': `Bearer ${this.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prefixes: paths })
        });
        return response.json();
    },
    
    // Pegar URL pública de arquivo
    getPublicUrl(bucket, path) {
        return `${this.url}/storage/v1/object/public/${bucket}/${path}`;
    }
};

// Funções auxiliares
const helpers = {
    // Formatar telefone para WhatsApp
    formatWhatsApp(phone) {
        const numbers = phone.replace(/\D/g, '');
        return numbers.startsWith('55') ? numbers : `55${numbers}`;
    },
    
    // Formatar CPF
    formatCPF(cpf) {
        const numbers = cpf.replace(/\D/g, '');
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },
    
    // Formatar telefone para exibição
    formatPhone(phone) {
        const numbers = phone.replace(/\D/g, '');
        if (numbers.length === 11) {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    },
    
    // Formatar moeda
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    
    // Gerar link WhatsApp
    whatsAppLink(phone, message) {
        const formattedPhone = this.formatWhatsApp(phone);
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    },
    
    // Data por extenso
    formatDateExtended(date) {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(date).toLocaleDateString('pt-BR', options);
    },
    
    // Período legível
    formatPeriodo(periodo) {
        if (periodo === '29-02') return '29/12 a 02/01';
        if (periodo === '30-03') return '30/12 a 03/01';
        return periodo;
    },
    
    // Status legível
    formatStatus(status) {
        const map = {
            'pre_reserva': 'Pré-reserva',
            'confirmada': 'Confirmada',
            'aguardando_sinal': 'Aguardando Sinal',
            'sinal_pago': 'Sinal Pago',
            'checkin': 'Check-in Realizado',
            'finalizada': 'Finalizada',
            'cancelada': 'Cancelada'
        };
        return map[status] || status;
    },
    
    // Cor do status
    statusColor(status) {
        const map = {
            'pre_reserva': '#F59E0B',
            'confirmada': '#10B981',
            'aguardando_sinal': '#F59E0B',
            'sinal_pago': '#10B981',
            'checkin': '#0EA5E9',
            'finalizada': '#64748B',
            'cancelada': '#EF4444'
        };
        return map[status] || '#64748B';
    }
};

// Exportar para uso global
window.supabase = supabase;
window.helpers = helpers;
window.STORAGE_URL = STORAGE_URL;
