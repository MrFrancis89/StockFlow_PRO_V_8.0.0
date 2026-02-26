// main.js — StockFlow Pro v8.0.0
import { produtosPadrao } from './produtos.js';
import {
    STORAGE_KEYS, carregarDados, salvarDados,
    carregarOcultos, salvarOcultos,
    carregarMeus, salvarMeus,
    carregarTema, salvarTema,
    carregarPosicaoLupa, salvarPosicaoLupa,
    dicaSwipeFoiVista, marcarDicaSwipeVista,
    carregarUltimaVersao, salvarUltimaVersao
} from './storage.js';
import { renderizarListaCompleta, salvarEAtualizar } from './ui.js';
import { coletarDadosDaTabela } from './tabela.js';
import { atualizarPainelCompras, gerarTextoCompras } from './compras.js';
import { darFeedback, obterDataAtual, obterDataAmanha, copiarParaClipboard } from './utils.js';
import { mostrarToast } from './toast.js';
import { mostrarConfirmacao, configurarListenersConfirm, fecharModal } from './confirm.js';
import { abrirCalculadora, fecharCalculadora, calcDigito, calcSalvar, getInputCalculadoraAtual } from './calculadora.js';
import { ativarModoTeclado } from './teclado.js';
import { abrirModalAlerta, fecharModalAlerta, salvarAlerta, verificarAlertas } from './alerta.js';
import { parseAndUpdateQuantity } from './parser.js';
import { initSwipe } from './swipe.js';
import { iniciarNavegacao } from './navegacao.js';
import { alternarCheck, alternarTodos } from './eventos.js';
import { atualizarDropdown } from './dropdown.js';
import { iniciarListaFacil } from './listafacil.js';

const VERSAO_ATUAL = "v8.0.0";

const releaseNotes = {
    "v8.0.0": `StockFlow Pro v8.0.0\n\n- Modo escuro ativado por padrão.\n- Margens reduzidas ao máximo para mais espaço útil.\n- Bug corrigido: campo nome da Lista Fácil agora é input — sem deslizamento ao editar.\n- Botões ▲/▼ movidos para esquerda, sem sobreposição com FAB.\n- Tabela da Lista Fácil com scroll horizontal — dados não ficam ocultos.\n- Ícone PWA e imagem de fundo pizza incluídos no pacote.`,
    "v6.2.3": `StockFlow Pro v6.2.3\n\n- Melhorias na interface: paleta de cores atualizada.\n- Correções no sistema de alertas.\n- Ajustes no swipe para melhor usabilidade.`,
    "v6.2.2": `StockFlow Pro v6.2.2\n\n- Correção crítica: lista pré-definida de produtos carregada corretamente.\n- Fallback defensivo para produtosPadrao undefined.`,
    "v6.2.1": `StockFlow Pro v6.2.1\n\n- Função atualizarDropdown disponível globalmente.\n- Toast de alerta corrigido.\n- Dependência circular entre módulos resolvida.`,
    "v6.2.0": `StockFlow Pro v6.2.0\n\n- Nova aba "Adicionar".\n- Botão "Fixar" e "Apagar" adicionados.`,
    "v6.1.0": `StockFlow Pro v6.1.0\n\n- Alternância calculadora/teclado nativo.\n- Parser de frações (1/2, 2 1/2).`,
    "v6.0.0": `StockFlow Pro v6.0.0\n\n- Navegação por abas: Estoque, Compras, Adicionar.\n- Sistema de novidades automáticas.`
};

function verificarNovidades() {
    const ultimaVersaoVista = carregarUltimaVersao();
    if (ultimaVersaoVista !== VERSAO_ATUAL) {
        if (releaseNotes[VERSAO_ATUAL]) mostrarNovidades(releaseNotes[VERSAO_ATUAL]);
        salvarUltimaVersao(VERSAO_ATUAL);
    }
}

function mostrarNovidades(texto) {
    const modal = document.getElementById('modal-whatsnew');
    document.getElementById('whatsnew-content').innerText = texto;
    modal.style.display = 'flex';
}

function atualizarTituloPrincipal() {
    const titulo = document.getElementById('titulo-principal');
    titulo.innerHTML = `StockFlow Pro <span style="color: var(--btn-danger); font-size: 12px; margin-left: 5px;">${VERSAO_ATUAL}</span>`;
}

function atualizarTitulos() {
    document.getElementById("titulo-compras").innerText = "LISTA " + obterDataAmanha();
}

function carregarListaPadrao() {
    var listaCombinada = [];
    var ocultosSistema = carregarOcultos();

    if (Array.isArray(produtosPadrao)) {
        produtosPadrao.forEach(p => {
            var d = p.split("|");
            if (!ocultosSistema.includes(d[0].toLowerCase())) {
                listaCombinada.push({ n: d[0], q: "", u: d[1], c: false, min: null, max: null });
            }
        });
    } else {
        console.error("Erro: produtosPadrao não carregado.");
        ["Arroz|kg","Feijão|kg","Açúcar|kg","Sal|kg","Óleo|uni"].forEach(p => {
            var d = p.split("|");
            listaCombinada.push({ n: d[0], q: "", u: d[1], c: false, min: null, max: null });
        });
    }

    var favoritosUsuario = carregarMeus();
    favoritosUsuario.forEach(item => {
        if (!listaCombinada.some(i => i.n.toLowerCase() === item.n.toLowerCase())) {
            listaCombinada.push({ n: item.n, q: "", u: item.u, c: false, min: null, max: null });
        }
    });

    renderizarListaCompleta(listaCombinada);
}

function filtrarGeral() {
    var tBusca  = document.getElementById('filtroBusca').value.toLowerCase();
    var tSelect = document.getElementById('filtroSelect').value.toLowerCase();
    document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => {
        var nome = r.querySelector(".nome-prod").innerText.toLowerCase();
        r.style.display = (nome.includes(tBusca) && (tSelect === "" || nome === tSelect)) ? "" : "none";
    });
    document.querySelectorAll(".categoria-header-row").forEach(header => {
        let proximo = header.nextElementSibling;
        let temVisivel = false;
        while (proximo && !proximo.classList.contains("categoria-header-row")) {
            if (proximo.style.display !== "none") { temVisivel = true; break; }
            proximo = proximo.nextElementSibling;
        }
        header.style.display = temVisivel ? "" : "none";
    });
}

function adicionarManual(salvarNoPadrao) {
    var p = document.getElementById("novoProduto").value.trim();
    var q = document.getElementById("novoQtd").value.trim();
    var u = document.getElementById("novoUnidade").value;

    if (!p) { mostrarToast("Digite o nome do produto!"); return; }
    darFeedback();

    var dados = carregarDados() || [];
    if (dados.some(item => item.n.toLowerCase() === p.toLowerCase())) {
        mostrarToast("O item já existe na lista!");
        return;
    }

    dados.push({ n: p, q: q, u: u, c: false, min: null, max: null });
    renderizarListaCompleta(dados);
    salvarDados(dados);
    atualizarPainelCompras();

    if (salvarNoPadrao) {
        var favoritosUsuario = carregarMeus();
        if (!favoritosUsuario.some(item => item.n.toLowerCase() === p.toLowerCase())) {
            favoritosUsuario.push({ n: p, u: u });
            salvarMeus(favoritosUsuario);
            mostrarToast("Item fixado!");
        }
    }
    document.getElementById("novoProduto").value = "";
    document.getElementById("novoQtd").value = "";
}

function removerDoPadrao() {
    var p = document.getElementById("novoProduto").value.trim();
    if (!p) { mostrarToast("Digite o nome para remover!"); return; }
    darFeedback();
    var favoritosUsuario = carregarMeus();
    salvarMeus(favoritosUsuario.filter(item => item.n.toLowerCase() !== p.toLowerCase()));
    var ocultosSistema = carregarOcultos();
    if (!ocultosSistema.includes(p.toLowerCase())) {
        ocultosSistema.push(p.toLowerCase());
        salvarOcultos(ocultosSistema);
    }
    document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => {
        if (r.querySelector(".nome-prod").innerText.toLowerCase() === p.toLowerCase()) r.remove();
    });
    const dados = coletarDadosDaTabela();
    salvarDados(dados);
    atualizarPainelCompras();
    atualizarDropdown();
    document.getElementById("novoProduto").value = "";
    document.getElementById("novoQtd").value = "";
}

function alternarLista() {
    darFeedback();
    var tabelaWrapper = document.querySelector(".table-wrapper");
    var btnToggle = document.getElementById("btn-toggle-lista");
    if (tabelaWrapper.style.display === "none") {
        tabelaWrapper.style.display = "block";
        btnToggle.innerHTML = "Ocultar Lista de Estoque";
    } else {
        tabelaWrapper.style.display = "none";
        btnToggle.innerHTML = "Mostrar Lista de Estoque";
    }
}

function alternarTema() {
    darFeedback();
    document.body.classList.toggle('light-mode');
    salvarTema(document.body.classList.contains('light-mode') ? 'claro' : 'escuro');
}

function resetarTudo() {
    mostrarConfirmacao("ATENÇÃO: Restaurar lista de fábrica?", () => {
        localStorage.removeItem(STORAGE_KEYS.dados);
        localStorage.removeItem(STORAGE_KEYS.ocultos);
        location.reload();
    });
}

function iniciarNovoDia() {
    mostrarConfirmacao("ZERAR QUANTIDADES?", () => {
        var dados = carregarDados() || [];
        dados.forEach(item => { item.q = ""; item.c = false; });
        salvarDados(dados);
        location.reload();
    }, 'sucesso');
}

function salvarListaNoCelular() {
    var dados = localStorage.getItem(STORAGE_KEYS.dados);
    if (!dados || dados === "[]") return;
    darFeedback();
    var blob = new Blob([dados], { type: "application/json" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href   = url;
    var data = new Date();
    a.download = `ESTOQUE_${String(data.getDate()).padStart(2,'0')}-${String(data.getMonth()+1).padStart(2,'0')}-${data.getFullYear()}_${String(data.getHours()).padStart(2,'0')}h${String(data.getMinutes()).padStart(2,'0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function carregarListaDoCelular(event) {
    var f = event.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function(e) {
        try {
            let dados = JSON.parse(e.target.result);
            dados = dados.map(item => ({
                ...item,
                min: item.min !== undefined ? item.min : null,
                max: item.max !== undefined ? item.max : null
            }));
            localStorage.setItem(STORAGE_KEYS.dados, JSON.stringify(dados));
            location.reload();
        } catch (err) {
            mostrarToast("Erro ao carregar arquivo. Verifique se é um JSON válido.");
        }
    };
    r.readAsText(f);
}

function autoPreencherUnidade() {
    var inputNome = document.getElementById("novoProduto").value.toLowerCase().trim();
    var match = Array.isArray(produtosPadrao)
        ? produtosPadrao.find(p => p.split("|")[0].toLowerCase().startsWith(inputNome))
        : null;
    if (match) document.getElementById("novoUnidade").value = match.split("|")[1];
}

function compartilharEstoque() {
    window.open("https://wa.me/?text=" + encodeURIComponent(gerarTextoEstoque()), '_blank');
}
function copiarEstoque()       { copiarParaClipboard(gerarTextoEstoque()); }
function compartilharCompras() { window.open("https://wa.me/?text=" + encodeURIComponent(gerarTextoCompras()), '_blank'); }
function copiarCompras()       { copiarParaClipboard(gerarTextoCompras()); }

function gerarTextoEstoque() {
    let t = "*ESTOQUE " + obterDataAtual() + "*\n\n";
    let itens = [];
    document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => {
        let cols = r.querySelectorAll("td");
        let nome = cols[1].querySelector('.nome-prod').innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
        let qTxt = cols[2].querySelector("input").value.trim();
        let sel  = cols[3].querySelector("select");
        let unid = sel.options[sel.selectedIndex].text;
        itens.push(qTxt !== "" ? `${nome}: ${qTxt} ${unid}` : `${nome}:   ${unid}`);
    });
    itens.sort();
    itens.forEach(i => t += `${i}\n`);
    return t;
}

function mostrarDicaSwipe() {
    if (!dicaSwipeFoiVista()) {
        setTimeout(() => {
            mostrarToast("Deslize os itens para esquerda para apagar ou configurar alerta");
            marcarDicaSwipeVista();
        }, 1000);
    }
}

// ===== RECONHECIMENTO DE VOZ =====
let recognition = null;
let isRecording  = false;
let activeField  = null;

function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = function() {
        isRecording = true;
        if (activeField === 'produto') {
            document.getElementById('btn-mic-prod').classList.add('ouvindo');
            document.getElementById('novoProduto').placeholder = "Ouvindo...";
        } else if (activeField === 'busca') {
            document.getElementById('btn-mic-busca').classList.add('ouvindo');
            document.getElementById('filtroBusca').placeholder = "Ouvindo...";
        }
    };
    recognition.onend = function() {
        isRecording = false;
        document.getElementById('btn-mic-prod').classList.remove('ouvindo');
        document.getElementById('btn-mic-busca').classList.remove('ouvindo');
        document.getElementById('novoProduto').placeholder = "Item";
        document.getElementById('filtroBusca').placeholder = "Buscar...";
        if (activeField === 'produto') autoPreencherUnidade();
        activeField = null;
    };
    recognition.onerror = function() {
        isRecording = false;
        document.getElementById('btn-mic-prod').classList.remove('ouvindo');
        document.getElementById('btn-mic-busca').classList.remove('ouvindo');
        document.getElementById('novoProduto').placeholder = "Item";
        document.getElementById('filtroBusca').placeholder = "Buscar...";
        activeField = null;
    };
    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        let textoFinal = transcript.replace(/\.$/, '');
        if (activeField === 'produto') {
            document.getElementById('novoProduto').value = textoFinal;
        } else if (activeField === 'busca') {
            document.getElementById('filtroBusca').value = textoFinal;
            filtrarGeral();
        }
    };
}

function toggleMic(campo, event) {
    if (event) event.stopPropagation();
    darFeedback();
    if (!recognition) { mostrarToast("Navegador sem suporte."); return; }
    if (isRecording) {
        recognition.stop();
    } else {
        activeField = campo;
        try { recognition.start(); } catch (e) { recognition.stop(); isRecording = false; }
    }
}

// ===== LUPA FLUTUANTE =====
let isDragging = false;
let startX, startY, initialLeft, initialTop;
const assistiveTouch = document.getElementById('assistive-touch');
let lastTap = 0;
let tapTimeout;
let isTouchEvent = false;

function initLupa() {
    const posLupa = carregarPosicaoLupa();
    if (posLupa) {
        assistiveTouch.style.left   = posLupa.left;
        assistiveTouch.style.top    = posLupa.top;
        assistiveTouch.style.bottom = 'auto';
        assistiveTouch.style.right  = 'auto';
    } else {
        assistiveTouch.style.bottom = '20px';
        assistiveTouch.style.right  = '15px';
        assistiveTouch.style.top    = 'auto';
        assistiveTouch.style.left   = 'auto';
    }

    assistiveTouch.addEventListener('touchstart', onTouchStart, { passive: false });
    assistiveTouch.addEventListener('touchmove',  onTouchMove,  { passive: false });
    assistiveTouch.addEventListener('touchend',   onTouchEnd,   { passive: false });
    assistiveTouch.addEventListener('click', onClick);
    assistiveTouch.addEventListener('touchstart', onDoubleTapTouchStart);
    assistiveTouch.addEventListener('touchend',   onDoubleTapTouchEnd);
}

function onTouchStart(e) {
    e.preventDefault();
    const touch  = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    const rect = assistiveTouch.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop  = rect.top;
    isDragging  = false;
}

function onTouchMove(e) {
    e.preventDefault();
    const touch  = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) isDragging = true;
    if (isDragging) {
        let newLeft = Math.max(0, Math.min(initialLeft + deltaX, window.innerWidth  - assistiveTouch.offsetWidth));
        let newTop  = Math.max(0, Math.min(initialTop  + deltaY, window.innerHeight - assistiveTouch.offsetHeight));
        assistiveTouch.style.left   = newLeft + 'px';
        assistiveTouch.style.top    = newTop  + 'px';
        assistiveTouch.style.bottom = 'auto';
        assistiveTouch.style.right  = 'auto';
    }
}

function onTouchEnd(e) {
    if (isDragging) {
        e.preventDefault();
        salvarPosicaoLupa({ left: assistiveTouch.style.left, top: assistiveTouch.style.top });
    }
    isDragging = false;
}

function onClick(e) {
    if (isTouchEvent || isDragging) { e.preventDefault(); e.stopPropagation(); isTouchEvent = false; return; }
    toggleSearch(e);
}

function onDoubleTapTouchStart() { isTouchEvent = true; }

function onDoubleTapTouchEnd(e) {
    if (isDragging) { e.preventDefault(); e.stopPropagation(); isTouchEvent = false; return; }
    e.preventDefault();
    const now = new Date().getTime();
    if (lastTap && (now - lastTap) < 300) {
        clearTimeout(tapTimeout);
        if (document.getElementById('search-overlay').style.display !== 'block') toggleSearch(null);
        setTimeout(() => toggleMic('busca', null), 150);
        lastTap = 0;
    } else {
        tapTimeout = setTimeout(() => toggleSearch(null), 300);
    }
    lastTap = now;
}

function toggleSearch(event) {
    if (event) event.stopPropagation();
    darFeedback();
    const overlay = document.getElementById('search-overlay');
    if (overlay.style.display === 'block') {
        overlay.style.display = 'none';
    } else {
        overlay.style.display = 'block';
        overlay.style.top = (window.scrollY + 15) + 'px';
        document.getElementById('filtroBusca').focus();
    }
}

document.addEventListener('click', function(event) {
    const overlay = document.getElementById('search-overlay');
    const btn = document.getElementById('assistive-touch');
    if (!overlay.contains(event.target) && !btn.contains(event.target) && overlay.style.display === 'block') {
        toggleSearch(null);
    }
});

window.addEventListener('scroll', function() {
    const overlay = document.getElementById('search-overlay');
    if (overlay.style.display === 'block') overlay.style.top = (window.scrollY + 15) + 'px';
});

// ===== EVENT LISTENERS =====
function configurarEventListeners() {
    document.querySelector('.btn-theme').addEventListener('click', alternarTema);

    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.target.dataset.calc;
            if (val === 'OK') calcSalvar();
            else calcDigito(val);
        });
    });
    document.querySelector('.calc-close').addEventListener('click', fecharCalculadora);

    document.querySelectorAll('.btn-limpar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.limpar;
            if (id) {
                document.getElementById(id).value = '';
                document.getElementById(id).focus();
                if (id === 'filtroBusca') filtrarGeral();
            }
        });
    });

    document.getElementById('btn-mic-prod').addEventListener('click', (e) => toggleMic('produto', e));
    document.getElementById('btn-mic-busca').addEventListener('click', (e) => toggleMic('busca', e));

    document.getElementById('add-btn').addEventListener('click', () => adicionarManual(false));
    document.getElementById('add-star-btn').addEventListener('click', () => adicionarManual(true));
    document.getElementById('remove-star-btn').addEventListener('click', removerDoPadrao);

    document.getElementById('btn-toggle-lista').addEventListener('click', alternarLista);

    document.getElementById('btn-compartilhar-estoque').addEventListener('click', () => { darFeedback(); compartilharEstoque(); });
    document.getElementById('btn-copiar-estoque').addEventListener('click', copiarEstoque);
    document.getElementById('btn-compartilhar-compras').addEventListener('click', () => { darFeedback(); compartilharCompras(); });
    document.getElementById('btn-copiar-compras').addEventListener('click', copiarCompras);

    document.getElementById('btn-novo-dia').addEventListener('click', iniciarNovoDia);
    document.getElementById('btn-exportar').addEventListener('click', salvarListaNoCelular);
    document.getElementById('btn-importar').addEventListener('click', () => { darFeedback(); document.getElementById('input-arquivo').click(); });
    document.getElementById('btn-reset').addEventListener('click', resetarTudo);
    document.getElementById('input-arquivo').addEventListener('change', carregarListaDoCelular);

    document.getElementById('check-todos').addEventListener('change', (e) => alternarTodos(e.target));

    document.getElementById('lista-itens-container').addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') alternarCheck(e.target);
        if (e.target.classList.contains('select-tabela')) {
            const dados = coletarDadosDaTabela();
            salvarDados(dados);
            atualizarPainelCompras();
        }
    });

    document.getElementById('lista-itens-container').addEventListener('blur', (e) => {
        if (e.target.classList.contains('nome-prod')) salvarEAtualizar();
        if (e.target.classList.contains('input-qtd-tabela') && !e.target.hasAttribute('readonly')) {
            parseAndUpdateQuantity(e.target);
        }
    }, true);

    document.getElementById('lista-itens-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('input-qtd-tabela') && e.target.hasAttribute('readonly')) {
            abrirCalculadora(e.target);
        }
    });

    document.getElementById('novoQtd').addEventListener('click', (e) => {
        if (e.target.hasAttribute('readonly')) abrirCalculadora(e.target);
    });
    document.getElementById('novoQtd').addEventListener('blur', (e) => {
        if (!e.target.hasAttribute('readonly')) parseAndUpdateQuantity(e.target);
    });

    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && (e.target.classList.contains('input-qtd-tabela') || e.target.id === 'novoQtd')) {
            e.preventDefault();
            e.target.blur();
        }
    });

    document.getElementById('filtroBusca').addEventListener('input', filtrarGeral);
    document.getElementById('filtroSelect').addEventListener('change', filtrarGeral);

    document.getElementById('btn-scroll-top').addEventListener('click', () => { darFeedback(); window.scrollTo(0, 0); });
    document.getElementById('btn-scroll-bottom').addEventListener('click', () => { darFeedback(); window.scrollTo(0, document.body.scrollHeight); });

    document.getElementById('salvar-alerta').addEventListener('click', salvarAlerta);
    document.querySelectorAll('.fechar-modal-alerta').forEach(btn => btn.addEventListener('click', fecharModalAlerta));

    document.getElementById('calc-btn-teclado').addEventListener('click', function(e) {
        e.stopPropagation();
        const input = getInputCalculadoraAtual();
        if (input) { fecharCalculadora(); ativarModoTeclado(input); }
        else mostrarToast("Clique em um campo de quantidade primeiro.");
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            if (e.target.id === 'modal-confirm')  fecharModal();
            if (e.target.id === 'modal-calc')     fecharCalculadora();
            if (e.target.id === 'modal-alerta')   fecharModalAlerta();
            if (e.target.id === 'modal-whatsnew') e.target.style.display = 'none';
        }
    });

    configurarListenersConfirm();

    document.querySelectorAll('.fechar-whatsnew').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modal-whatsnew').style.display = 'none';
        });
    });
}

function iniciarApp() {
    initSpeech();
    if (carregarTema() === 'claro') document.body.classList.add('light-mode');
    atualizarTituloPrincipal();
    atualizarTitulos();
    initLupa();

    var salvos = carregarDados();
    if (salvos && salvos.length > 0) {
        renderizarListaCompleta(salvos);
    } else {
        carregarListaPadrao();
    }
    atualizarDropdown();
    atualizarPainelCompras();
    initSwipe();
    verificarAlertas();
    mostrarDicaSwipe();
    iniciarNavegacao();
    configurarEventListeners();
    iniciarListaFacil();
    verificarNovidades();
}

iniciarApp();
