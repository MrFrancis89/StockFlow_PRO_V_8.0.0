# Changelog — StockFlow Pro

Todas as mudanças notáveis são documentadas aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) · Versão Semântica.

---

## [v8.0.0] — 2026

### Corrigido
- **Bug crítico — Lista Fácil campo nome**: o campo de edição usava `contentEditable` em uma `<div>`, fazendo o container deslizar para a direita no iOS ao digitar, ocultando o texto. Substituído por `<input type="text">` — bug eliminado.
- **Sobreposição dos botões ▲/▼**: botões de scroll movidos para o lado **esquerdo** da tela, eliminando sobreposição com FAB "+" e conteúdo.

### Adicionado
- **Modo escuro padrão**: app abre sempre no modo escuro. Tema salvo pelo usuário continua sendo respeitado.
- **Scroll horizontal na tabela Lista Fácil**: `overflow-x: auto` + `min-width` nas colunas — todos os dados ficam visíveis em telas pequenas.
- **Ícone PWA** (`icone.png`): adicionado ao projeto e referenciado como `link rel="icon"` e `apple-touch-icon`.
- **Imagem de fundo** (`fundo-pizza.jpg`): incluída no pacote, aplicada com 60% de opacidade.
- `meta name="theme-color"` com cor escura para integração no iOS/Android.
- Título HTML atualizado para `StockFlow Pro v8.0.0`.

### Alterado
- **Margens reduzidas**: `padding` do body: `16px 16px 80px 16px` → `6px 8px 70px 8px`.
- Cabeçalho e abas com padding/margin menores — mais espaço útil.
- `nav-float` (▲/▼): `right: 20px` → `left: 12px`.
- `.lf-table-wrapper`: `overflow-x: hidden` → `overflow-x: auto`.
- Colunas da tabela LF: larguras fixas → `min-width + width` combinados.
- Versão Lista Fácil: `v2.3.0` → `v2.4.0`.

---

## [v6.3.0] — 2026

### Adicionado
- Nova seção "Lista Fácil" como 4ª aba
- Módulo `listafacil.js` completo (ES Module)
- Comparador de preços por unidade (kg, g, L, ml, un)
- Orçamento editável com confirmação modal
- FAB "+" contextual, Swipe para excluir
- `storage.js` com chaves `listaFacil_*`
- `navegacao.js` emite `CustomEvent('tabChanged')`

### Corrigido
- `salvarMeus` / `salvarOcultos` não importados → ReferenceError
- `fecharModal` não importado → ReferenceError
- Chave hardcoded em `alerta.js`
- Segundo loop destrutivo em `verificarAlertas()`
- Memory leak: `URL.revokeObjectURL` adicionado
- try/catch no import de arquivo JSON
- Export morto `acaoConfirmacao` removido de `confirm.js`

---

## [v6.2.x — v6.0.0] — 2025
- v6.2.3: Paleta e swipe
- v6.2.2: Fallback produtosPadrao
- v6.2.1: Dependência circular
- v6.2.0: Aba Adicionar, Fixar, Apagar
- v6.1.0: Teclado nativo, frações
- v6.0.0: ES Modules, abas, modal novidades

## [v5.3.0] — 2024
- Swipe, calculadora, voz, temas, categorias, alertas, lupa
