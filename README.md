# StockFlow Pro v8.0.0

> Controle de estoque e lista de compras para dispositivos móveis. Offline-first, zero dependências.

[![Versão](https://img.shields.io/badge/versão-v8.0.0-blue)](#)
[![PWA](https://img.shields.io/badge/PWA-pronto-brightgreen)](#)
[![Tema](https://img.shields.io/badge/tema%20padrão-escuro-black)](#)

---

## Funcionalidades

### Estoque
- Tabela categorizada automática (9 categorias)
- Edição inline, calculadora por campo, parser de frações
- Reconhecimento de voz
- Alertas mínimo/máximo por item
- Exportação/importação JSON, WhatsApp e clipboard

### Lista Fácil (v2.4.0)
- Lista de compras com Item / Preço / Qtd / Total
- Painel de totais: Orçamento / Gasto / Saldo em tempo real
- Comparador de preços por unidade (kg, g, L, ml, un)
- Scroll horizontal na tabela para telas pequenas
- Swipe para excluir, FAB "+" para adicionar
- Dados persistidos independentemente do Estoque

### UX
- 4 abas: Estoque · Compras · Adicionar · Lista Fácil
- **Modo escuro padrão** (com memória de preferência)
- Lupa flutuante arrastável (busca + microfone)
- Imagem de fundo pizza (60% opacidade)
- Ícone PWA personalizado
- Feedback sonoro + vibração

---

## Estrutura

```
stockflow-pro/
├── index.html        # Shell HTML completo
├── style.css         # Estilos (inclui prefixo lf- para Lista Fácil)
├── fundo-pizza.jpg   # Imagem de fundo (60% opacidade)
├── icone.png         # Ícone PWA
│
├── main.js           # Orquestrador (v8.0.0)
├── listafacil.js     # Módulo Lista Fácil (v2.4.0)
├── storage.js        # localStorage (inclui chaves LF)
├── navegacao.js      # Abas + CustomEvent tabChanged
│
└── [demais módulos]  # alerta, calculadora, swipe, utils...
```

---

## Como Rodar

```bash
python3 -m http.server 8080
# ou
npx serve .
```

> ES Modules exigem servidor HTTP. Não funciona via `file://`.

---

## Changelog

Veja [CHANGELOG.md](./CHANGELOG.md).

## Licença

MIT © StockFlow Pro
