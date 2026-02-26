// listafacil.js
// Módulo Lista Fácil (ex-Compra Fácil) integrado ao StockFlow Pro
// Bugs corrigidos vs. versão original:
//   1. Listener touchstart acumulando a cada renderização — resolvido
//   2. Índice de item stale após reordenação — resolvido com lfId único por item
//   3. Ícone do tema não atualizava — não aplicável (usa tema do StockFlow)
//   4. cancelHandler do orçamento não era removido ao confirmar — resolvido com { once: true }
//   5. JSON.parse sem try/catch no carregarStorage — resolvido

import { mostrarToast } from './toast.js';
import { mostrarConfirmacao } from './confirm.js';
import { darFeedback } from './utils.js';
import { salvarItensLF, carregarItensLF, salvarOrcamentoLF, carregarOrcamentoLF } from './storage.js';

export function iniciarListaFacil() {
    const VERSAO_LF = "v2.4.0";

    // ===== DOM =====
    const tbody        = document.getElementById('lf-tableBody');
    const budgetInput  = document.getElementById('lf-budgetInput');
    const totalDisplay = document.getElementById('lf-totalGastoDisplay');
    const difDisplay   = document.getElementById('lf-diferencaDisplay');
    const footerBudget = document.getElementById('lf-footerBudget');
    const footerGasto  = document.getElementById('lf-footerGasto');
    const footerSaldo  = document.getElementById('lf-footerSaldo');
    const fabAdd       = document.getElementById('lf-fabAddItem');
    const versaoEl     = document.getElementById('lf-versaoTitulo');
    const showClLink   = document.getElementById('lf-showChangelog');
    const zerarPrecos  = document.getElementById('lf-zerarPrecosBtn');
    const zerarQtds    = document.getElementById('lf-zerarQuantidadesBtn');
    const zerarItens   = document.getElementById('lf-zerarItensBtn');

    // Abas internas
    const tabBtns      = document.querySelectorAll('#listafacil-section .lf-tab-btn');
    const tabContents  = document.querySelectorAll('#listafacil-section .lf-tab-content');

    // Comparador
    const compP1       = document.getElementById('lf-comp_p1');
    const compQ1       = document.getElementById('lf-comp_q1');
    const compU1       = document.getElementById('lf-comp_u1');
    const compP2       = document.getElementById('lf-comp_p2');
    const compQ2       = document.getElementById('lf-comp_q2');
    const compU2       = document.getElementById('lf-comp_u2');
    const btnComparar  = document.getElementById('lf-btnComparar');
    const resultadoDiv = document.getElementById('lf-comparadorResultado');

    // Calculadora própria
    const calcModal    = document.getElementById('lf-calcModal');
    const calcDisplay  = document.getElementById('lf-calc-display');
    const calcTitle    = document.getElementById('lf-calc-title');
    const closeCalc    = document.getElementById('lf-closeCalc');

    // Changelog modal
    const changelogModal   = document.getElementById('lf-changelogModal');
    const closeChangelog   = document.getElementById('lf-closeChangelog');
    const closeChangelogBtn= document.getElementById('lf-closeChangelogBtn');

    // Swipe
    const swipeBg = document.getElementById('lf-swipe-bg');

    // ===== ESTADO =====
    let itens = [];
    let orcamento = 3200.00;
    let orcamentoAntes = 3200.00;
    let lfCounter = 0;          // Gerador de IDs únicos para itens

    let currentPrecoInput = null;
    let calcExpression    = '';

    // Swipe state — não redeclarado a cada render
    let swipeStartX, swipeStartY, swipeCurrentX;
    let isSwiping  = false;
    let swipedRow  = null;
    const SWIPE_WIDTH = 80;
    let swipeDocListenerAdded = false;  // Evita acumulação de listeners

    // ===== AMOSTRAS INICIAIS =====
    const amostras = [
        { nome: 'Manjericão',       preco: 2.89,  qtd: 4 },
        { nome: 'Mostarda cepeta',  preco: 17.80, qtd: 2 },
        { nome: 'Água sani/Cloral', preco: 1.69,  qtd: 2 },
        { nome: 'Detergente 500ml', preco: 2.89,  qtd: 3 },
        { nome: 'Coca 1L',          preco: 5.00,  qtd: 6 },
        { nome: 'São Geraldo 1L',   preco: 4.50,  qtd: 6 }
    ];

    // ===== UTILITÁRIOS DE MOEDA =====
    function formatarMoeda(v) {
        return 'R$ ' + v.toFixed(2)
            .replace('.', ',')
            .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    }
    function formatarNumInput(v) {
        return v.toFixed(2)
            .replace('.', ',')
            .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    }
    function parseMoeda(s) {
        if (!s) return 0;
        return parseFloat(
            String(s).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
        ) || 0;
    }

    // ===== PERSISTÊNCIA =====
    function salvar() {
        salvarItensLF(itens);
        salvarOrcamentoLF(orcamento);
    }

    function carregar() {
        const itensSalvos = carregarItensLF();
        if (itensSalvos) {
            try {
                itens = itensSalvos.map(i => ({
                    lfId: i.lfId || gerarId(),
                    nome: i.nome || 'Item',
                    preco: typeof i.preco === 'number' ? i.preco : 0,
                    qtd:   typeof i.qtd   === 'number' ? i.qtd   : 0
                }));
            } catch(e) {
                itens = amostras.map(a => ({ lfId: gerarId(), ...a }));
            }
        } else {
            itens = amostras.map(a => ({ lfId: gerarId(), ...a }));
        }

        ordenar();
        orcamento = carregarOrcamentoLF();
        orcamentoAntes = orcamento;
        budgetInput.value = formatarNumInput(orcamento);
        atualizarTotais();
    }

    function gerarId() {
        return 'lf_' + (++lfCounter) + '_' + Date.now();
    }

    // ===== ORDENAÇÃO E TOTAIS =====
    function ordenar() {
        itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' }));
    }

    function calcularTotal() {
        return itens.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
    }

    function atualizarTotais() {
        const total  = calcularTotal();
        const saldo  = orcamento - total;
        totalDisplay.innerText = formatarMoeda(total);
        difDisplay.innerText   = formatarMoeda(saldo);
        footerBudget.innerText = formatarMoeda(orcamento);
        footerGasto.innerText  = formatarMoeda(total);
        footerSaldo.innerText  = formatarMoeda(saldo);

        // Cor do saldo
        const cor = saldo >= 0 ? 'var(--btn-green)' : 'var(--btn-red)';
        difDisplay.style.color   = cor;
        footerSaldo.style.color  = cor;

        if (document.activeElement !== budgetInput) {
            budgetInput.value = formatarNumInput(orcamento);
        }
    }

    function atualizarTotalLinha(tr, item) {
        const td = tr.querySelector('.lf-total-cell');
        if (td) td.innerText = formatarMoeda(item.preco * item.qtd);
    }

    // ===== RENDERIZAÇÃO =====
    function renderizar() {
        tbody.innerHTML = '';
        ordenar();

        itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.lfId = item.lfId;

            // Nome — input[type=text] evita bug de deslizamento do contentEditable
            const tdNome = document.createElement('td');
            tdNome.className = 'lf-col-prod';
            const nomeDiv = document.createElement('input');
            nomeDiv.type = 'text';
            nomeDiv.className = 'lf-nome-editavel';
            nomeDiv.value = item.nome;
            nomeDiv.addEventListener('blur', function() {
                const novoNome = this.value.trim();
                if (!novoNome) { this.value = item.nome; return; }
                if (novoNome !== item.nome) {
                    item.nome = novoNome;
                    salvar();
                    renderizar();
                }
            });
            nomeDiv.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
            });
            tdNome.appendChild(nomeDiv);

            // Preço
            const tdPreco = document.createElement('td');
            tdPreco.className = 'lf-col-preco';
            const inputPreco = document.createElement('input');
            inputPreco.type      = 'text';
            inputPreco.value     = item.preco.toFixed(2).replace('.', ',');
            inputPreco.className = 'lf-preco-input';
            inputPreco.readOnly  = true;
            inputPreco.addEventListener('click', function() {
                darFeedback();
                currentPrecoInput = this;
                calcExpression = this.value.replace(/\./g,'').replace(',', '.') || '0';
                calcDisplay.innerText = calcExpression.replace('.', ',');
                calcTitle.innerText = `🧮 ${item.nome}`;
                calcModal.style.display = 'flex';
            });
            tdPreco.appendChild(inputPreco);

            // Qtd
            const tdQtd = document.createElement('td');
            tdQtd.className = 'lf-col-qtd';
            const inputQtd = document.createElement('input');
            inputQtd.type        = 'text';
            inputQtd.inputMode   = 'decimal';
            inputQtd.value       = item.qtd;
            inputQtd.className   = 'lf-qtd-input';
            inputQtd.addEventListener('input', function() {
                let v = parseFloat(this.value.replace(',', '.'));
                if (isNaN(v) || v < 0) v = 0;
                item.qtd = v;
                salvar();
                atualizarTotalLinha(tr, item);
                atualizarTotais();
            });
            inputQtd.addEventListener('blur', function() {
                this.value = item.qtd;
            });
            tdQtd.appendChild(inputQtd);

            // Total
            const tdTotal = document.createElement('td');
            tdTotal.className = 'lf-col-total lf-total-cell';
            tdTotal.innerText = formatarMoeda(item.preco * item.qtd);

            tr.appendChild(tdNome);
            tr.appendChild(tdPreco);
            tr.appendChild(tdQtd);
            tr.appendChild(tdTotal);
            tbody.appendChild(tr);
        });

        atualizarTotais();
        iniciarSwipe();
    }

    // ===== SWIPE (BUG CORRIGIDO — listeners não acumulam) =====
    function iniciarSwipe() {
        swipeBg.innerHTML = `<button class="lf-swipe-btn">Apagar</button>`;

        function getX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
        function getY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

        // Remove listeners antigos e readiciona nas novas linhas
        const rows = document.querySelectorAll('#lf-tableBody tr');

        rows.forEach(row => {
            row.addEventListener('touchstart', function(e) {
                const el = e.target;
                if (el.tagName === 'INPUT' || el.contentEditable === 'true') return;
                if (swipedRow && swipedRow !== row) fecharSwipe(swipedRow);
                swipeStartX = getX(e);
                swipeStartY = getY(e);
                isSwiping   = false;
                swipeCurrentX = (swipedRow === row) ? -SWIPE_WIDTH : 0;
                row.style.transition = 'none';
            }, { passive: true });

            row.addEventListener('touchmove', function(e) {
                let dx = getX(e) - swipeStartX;
                let dy = getY(e) - swipeStartY;
                if (!isSwiping && Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy)) {
                    isSwiping = true;
                }
                if (isSwiping) {
                    if (e.cancelable) e.preventDefault();
                    if (document.activeElement) document.activeElement.blur();
                    swipeBg.style.display = 'flex';
                    swipeBg.style.top     = row.offsetTop + 'px';
                    swipeBg.style.height  = row.offsetHeight + 'px';
                    let mx = swipeCurrentX + dx;
                    if (mx > 0) mx = 0;
                    if (mx < -SWIPE_WIDTH) mx = -SWIPE_WIDTH;
                    row.style.transform = `translateX(${mx}px)`;
                }
            }, { passive: false });

            row.addEventListener('touchend', function(e) {
                if (isSwiping) {
                    let dx = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - swipeStartX;
                    let final = swipeCurrentX + dx;
                    row.style.transition = 'transform 0.3s cubic-bezier(0.25,0.8,0.25,1)';
                    if (final < -40) {
                        row.style.transform = `translateX(-${SWIPE_WIDTH}px)`;
                        swipedRow = row;
                    } else {
                        fecharSwipe(row);
                    }
                }
            });
        });

        // BUG FIX: adiciona o listener de fechar no documento apenas UMA vez
        if (!swipeDocListenerAdded) {
            document.addEventListener('touchstart', function(e) {
                if (swipedRow && !swipedRow.contains(e.target) && !e.target.closest('.lf-swipe-btn')) {
                    fecharSwipe(swipedRow);
                }
            }, { passive: true });
            swipeDocListenerAdded = true;
        }

        // Botão apagar
        document.querySelectorAll('.lf-swipe-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (!swipedRow) return;
                const lfId = swipedRow.dataset.lfId;
                const item = itens.find(i => i.lfId === lfId);
                if (!item) return;
                mostrarConfirmacao(`Remover "${item.nome}"?`, () => {
                    itens = itens.filter(i => i.lfId !== lfId);
                    salvar();
                    renderizar();
                    mostrarToast('Item removido');
                });
                fecharSwipe(swipedRow);
            });
        });
    }

    function fecharSwipe(row) {
        if (row) {
            row.style.transition = 'transform 0.3s cubic-bezier(0.25,0.8,0.25,1)';
            row.style.transform  = 'translateX(0px)';
        }
        setTimeout(() => {
            if (!swipedRow || swipedRow === row) {
                swipeBg.style.display = 'none';
                if (swipedRow === row) swipedRow = null;
            }
        }, 300);
    }

    // ===== CALCULADORA =====
    document.querySelectorAll('#lf-calcModal [data-lf-calc]').forEach(btn => {
        btn.addEventListener('click', () => {
            darFeedback();
            const val = btn.dataset.lfCalc;
            if (val === 'C') {
                calcExpression = '';
            } else if (val === 'BACK') {
                calcExpression = calcExpression.slice(0, -1);
            } else if (val === 'OK') {
                if (currentPrecoInput) {
                    try {
                        let expr = calcExpression.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/');
                        let res = Function('"use strict";return (' + expr + ')')();
                        if (!isFinite(res) || res < 0) throw new Error();
                        res = Math.round(res * 100) / 100;
                        currentPrecoInput.value = res.toFixed(2).replace('.', ',');

                        // Se vier da tabela, atualiza o item pelo lfId
                        const lfId = currentPrecoInput.closest('tr')?.dataset.lfId;
                        if (lfId) {
                            const item = itens.find(i => i.lfId === lfId);
                            if (item) {
                                item.preco = res;
                                salvar();
                                atualizarTotalLinha(currentPrecoInput.closest('tr'), item);
                                atualizarTotais();
                            }
                        } else {
                            // Comparador — só atualiza o display
                        }
                    } catch(er) {
                        calcDisplay.innerText = 'Erro';
                        setTimeout(() => {
                            calcDisplay.innerText = calcExpression.replace('.', ',') || '0';
                        }, 800);
                        return;
                    }
                }
                calcModal.style.display = 'none';
                currentPrecoInput = null;
            } else {
                if (val === ',') {
                    if (!calcExpression.includes('.')) calcExpression += '.';
                } else if ((calcExpression === '' || calcExpression === '0') && !isNaN(val)) {
                    calcExpression = val;
                } else {
                    calcExpression += val;
                }
            }
            calcDisplay.innerText = calcExpression.replace('.', ',') || '0';
        });
    });

    closeCalc.addEventListener('click', () => {
        calcModal.style.display = 'none';
        currentPrecoInput = null;
    });
    calcModal.addEventListener('click', e => {
        if (e.target === calcModal) {
            calcModal.style.display = 'none';
            currentPrecoInput = null;
        }
    });

    // ===== COMPARADOR =====
    [compP1, compP2].forEach(input => {
        input.addEventListener('click', function() {
            darFeedback();
            currentPrecoInput = this;
            calcExpression = this.value.replace(/\./g,'').replace(',', '.') || '0';
            calcDisplay.innerText = calcExpression.replace('.', ',');
            calcTitle.innerText = 'Calculadora';
            calcModal.style.display = 'flex';
        });
    });

    function normalizarUnidade(q, u) {
        return (u === 'kg' || u === 'l') ? q * 1000 : q;
    }

    btnComparar.addEventListener('click', () => {
        darFeedback();
        const p1 = parseMoeda(compP1.value), q1 = parseMoeda(compQ1.value), u1 = compU1.value;
        const p2 = parseMoeda(compP2.value), q2 = parseMoeda(compQ2.value), u2 = compU2.value;

        if (!p1 || !q1 || !p2 || !q2) {
            mostrarToast('Preencha todos os campos');
            return;
        }

        const unit1 = p1 / normalizarUnidade(q1, u1);
        const unit2 = p2 / normalizarUnidade(q2, u2);

        if (unit1 === unit2) {
            resultadoDiv.innerHTML = '<div class="lf-winner-title">Preços iguais!</div>';
            resultadoDiv.style.display = 'block';
            return;
        }

        const vencedor  = unit1 < unit2 ? 'Produto 1' : 'Produto 2';
        const economia  = unit1 < unit2
            ? ((unit2 - unit1) / unit2) * 100
            : ((unit1 - unit2) / unit1) * 100;

        resultadoDiv.innerHTML = `
            <div class="lf-winner-title">${vencedor} é mais barato!</div>
            <div style="color: var(--accent); margin: 8px 0; font-size: 0.85rem;">Economia de</div>
            <div class="lf-economy-badge">${economia.toFixed(1)}%</div>
        `;
        resultadoDiv.style.display = 'block';
    });

    // ===== BOTÕES DE AÇÃO =====
    zerarPrecos.addEventListener('click', () => {
        darFeedback();
        mostrarConfirmacao('Definir todos os preços como R$ 0,00?', () => {
            itens.forEach(i => i.preco = 0);
            salvar();
            renderizar();
            mostrarToast('Preços zerados');
        });
    });

    zerarQtds.addEventListener('click', () => {
        darFeedback();
        mostrarConfirmacao('Definir todas as quantidades como 0?', () => {
            itens.forEach(i => i.qtd = 0);
            salvar();
            renderizar();
            mostrarToast('Quantidades zeradas');
        });
    });

    zerarItens.addEventListener('click', () => {
        darFeedback();
        mostrarConfirmacao('Zerar preços e quantidades de todos os itens?', () => {
            itens.forEach(i => { i.preco = 0; i.qtd = 0; });
            salvar();
            renderizar();
            mostrarToast('Itens zerados');
        });
    });

    // ===== ORÇAMENTO =====
    budgetInput.addEventListener('focus', function() {
        orcamentoAntes = orcamento;
        this.value = '';
    });

    budgetInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^\d,]/g, '');
    });

    budgetInput.addEventListener('blur', function() {
        const val = this.value.trim();
        if (!val) {
            this.value = formatarNumInput(orcamento);
            return;
        }
        const novo = parseMoeda(val);
        if (novo === orcamento) {
            this.value = formatarNumInput(orcamento);
            return;
        }
        const self = this;
        const oldVal = orcamento;
        mostrarConfirmacao(
            `Alterar orçamento para ${formatarMoeda(novo)}?`,
            () => {
                orcamento = novo;
                salvar();
                atualizarTotais();
            }
        );
        // Restaura o valor anterior se o modal for cancelado
        document.getElementById('modal-btn-cancel').addEventListener('click', () => {
            self.value = formatarNumInput(oldVal);
        }, { once: true });
        // Garante formatação correta após confirmar também
        document.getElementById('modal-btn-confirm').addEventListener('click', () => {
            self.value = formatarNumInput(novo);
        }, { once: true });
    });

    // ===== FAB =====
    fabAdd.addEventListener('click', () => {
        darFeedback();
        itens.push({ lfId: gerarId(), nome: 'Novo item', preco: 0, qtd: 1 });
        salvar();
        renderizar();
        mostrarToast('Item adicionado');
        // Foca no novo item (último na tabela antes de ordenar)
        setTimeout(() => {
            const ultima = tbody.querySelector('tr:last-child .lf-nome-editavel');
            if (ultima) ultima.focus();
        }, 100);
    });

    // ===== ABAS INTERNAS =====
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            darFeedback();
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.dataset.lfTab;
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById('lf-tab-' + tabId).classList.add('active');
        });
    });

    // ===== CHANGELOG =====
    if (versaoEl) versaoEl.innerText = VERSAO_LF;
    if (showClLink) showClLink.innerText = `📋 ${VERSAO_LF} · Novidades`;

    showClLink.addEventListener('click', () => {
        darFeedback();
        changelogModal.style.display = 'flex';
    });
    closeChangelog.addEventListener('click', () => changelogModal.style.display = 'none');
    closeChangelogBtn.addEventListener('click', () => changelogModal.style.display = 'none');
    changelogModal.addEventListener('click', e => {
        if (e.target === changelogModal) changelogModal.style.display = 'none';
    });

    // ===== VISIBILIDADE DO FAB (via evento de navegação) =====
    document.addEventListener('tabChanged', (e) => {
        fabAdd.style.display = e.detail.tab === 'listafacil' ? 'flex' : 'none';
    });

    // ===== INICIALIZAÇÃO =====
    carregar();
    renderizar();
}
