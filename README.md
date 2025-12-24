# 🏖️ Hostel Casa Peruíbe

Sistema completo de reservas para hospedagem estilo hostel.

## 🚀 Deploy Rápido

### 1. Configurar Supabase

1. Acesse seu projeto no [Supabase](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase-setup.sql` e execute
4. Vá em **Storage** e crie um bucket chamado `hostel-fotos` (público)

### 2. Deploy no Vercel (via GitHub)

1. Crie um repositório no GitHub
2. Faça upload de todos os arquivos
3. Acesse [vercel.com](https://vercel.com)
4. Clique em "Import Project"
5. Selecione seu repositório
6. Clique em "Deploy"

Pronto! Seu site estará no ar em minutos.

## 📁 Estrutura

```
hostel-peruibe/
├── index.html              # Landing page
├── painel.html             # Painel do Davi
├── vercel.json             # Config do Vercel
├── package.json
├── supabase-setup.sql      # SQL para criar tabelas
└── src/
    ├── lib/
    │   └── supabase.js     # Cliente Supabase
    ├── landing/
    │   ├── style.css       # Estilos da landing
    │   └── script.js       # Lógica da landing
    └── painel/
        ├── style.css       # Estilos do painel
        └── script.js       # Lógica do painel
```

## 🔗 URLs

- **Landing Page:** `https://seu-site.vercel.app`
- **Painel Admin:** `https://seu-site.vercel.app/painel`

## 🔐 Acesso ao Painel

- **Senha padrão:** `hostel2025`
- Você pode alterar nas configurações do painel

## ✨ Funcionalidades

### Landing Page
- Design responsivo e moderno
- Cards dos quartos com disponibilidade em tempo real
- Formulário de pré-reserva
- Redirecionamento automático pro WhatsApp
- Seções: Hero, Como Funciona, Quartos, Incluso, Casa, Localização, Regras

### Painel Admin
- Dashboard com estatísticas
- Gerenciamento de reservas (confirmar, recusar, cancelar)
- Geração de contrato em PDF
- Envio de confirmação pelo WhatsApp
- Edição de quartos (fotos, preços, descrições)
- Configurações gerais (dados do Pix, endereço, etc)

## 📸 Subir Fotos

1. Acesse seu Supabase > Storage > `hostel-fotos`
2. Clique em "Upload files"
3. Selecione as fotos
4. Copie a URL pública
5. Cole no painel ao editar o quarto

## 🛠️ Personalização

### Alterar Cores
Edite as variáveis CSS em `src/landing/style.css`:
```css
:root {
    --ocean-deep: #0C4A6E;
    --sky-blue: #0EA5E9;
    --sun-gold: #F59E0B;
    /* ... */
}
```

### Alterar WhatsApp
Edite o número em `src/lib/supabase.js` ou nas configurações do painel.

## 📞 Suporte

Desenvolvido para o Réveillon 2025 em Peruíbe.
