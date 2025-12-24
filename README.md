# 🏖️ Guest House Peruíbe

Sistema completo de reservas para hospedagem estilo guest house.

## 🚀 Deploy Rápido

### 1. Configurar Supabase

1. Acesse seu projeto no [Supabase](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase-setup.sql` e execute
4. Vá em **Storage** e crie um bucket chamado `hostel-fotos` (público)

### 2. Deploy no Vercel

1. Crie um repositório no GitHub
2. Faça upload de todos os arquivos
3. Acesse [vercel.com](https://vercel.com)
4. Clique em "Import Project"
5. Selecione seu repositório
6. Clique em "Deploy"

## 📁 Estrutura

```
hostel-peruibe/
├── index.html              # Landing page
├── painel.html             # Painel do Davi
├── vercel.json             # Config do Vercel
├── supabase-setup.sql      # SQL para criar tabelas
└── src/
    ├── lib/supabase.js     # Cliente Supabase
    ├── landing/            # CSS e JS da landing
    └── painel/             # CSS e JS do painel
```

## 🔗 URLs

- **Landing Page:** `https://seu-site.vercel.app`
- **Painel Admin:** `https://seu-site.vercel.app/painel`

## 🔐 Acesso ao Painel

- **Senha padrão:** `hostel2025`
- Você pode alterar nas configurações do painel

## ✨ Funcionalidades

### Landing Page
- Nome atualizado: Guest House Peruíbe
- Nova headline com cálculo por pessoa
- Seção "O que é Guest House"
- Seção "Conheça o Anfitrião" + oferta de videochamada
- Formulário em modal (abre ao clicar em Reservar)
- Regras expandidas (segurança, uso de espaços)
- Destaque "sem café da manhã"
- Disponibilidade unificada (período exclusivo)

### Painel Admin
- Dashboard com estatísticas
- **EDITAR RESERVAS** (nome, quarto, período, status, etc)
- Geração de **CONTRATO COMPLETO EM PDF**
- Envio de confirmação pelo WhatsApp
- Edição de quartos (fotos, preços, descrições)
- Configurações gerais (Pix, endereço, etc)

## 📸 Subir Fotos

1. Acesse Supabase > Storage > `hostel-fotos`
2. Faça upload das fotos
3. Copie a URL pública
4. Cole no painel ao editar o quarto

## 📞 Contato

WhatsApp Davi: (11) 99877-0637
