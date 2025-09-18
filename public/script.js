/**
 * script.js (frontend)
 * - usa fetch para consumir a API em /api/employees
 * - operações: listar, criar, editar, deletar
 *
 * Observações:
 * - Está escrito em módulo ES (type="module" no index.html)
 * - Funções documentadas e estrutura clara para manutenção
 */

const modalContainer = document.getElementById('modalContainer');
const tbody = document.querySelector('tbody');
const sId = document.getElementById('m-id');
const sNome = document.getElementById('m-nome');
const sFuncao = document.getElementById('m-funcao');
const sSalario = document.getElementById('m-salario');
const btnSalvar = document.getElementById('btnSalvar');
const btnNew = document.getElementById('new');
const form = document.getElementById('formEmployee');

const API_BASE = '/api/employees';

/* ---------- Modal handling ---------- */
function openModal(edit = false, data = {}) {
    modalContainer.classList.add('active');
    modalContainer.setAttribute('aria-hidden', 'false');

    // fechar clicando fora
    modalContainer.onclick = (e) => {
        if (e.target === modalContainer) closeModal();
    };

    if (edit) {
        sId.value = data.id ?? '';
        sNome.value = data.nome ?? '';
        sFuncao.value = data.funcao ?? '';
        sSalario.value = data.salario ?? '';
        document.getElementById('modalTitle').textContent = 'Editar Funcionário';
    } else {
        sId.value = '';
        sNome.value = '';
        sFuncao.value = '';
        sSalario.value = '';
        document.getElementById('modalTitle').textContent = 'Novo Funcionário';
    }

    sNome.focus();
}

function closeModal() {
    modalContainer.classList.remove('active');
    modalContainer.setAttribute('aria-hidden', 'true');
}

/* ---------- Renderização da tabela ---------- */
function formatMoney(value) {
    if (isNaN(Number(value))) return value;
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function createRow(item) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
    <td>${escapeHtml(item.nome)}</td>
    <td>${escapeHtml(item.funcao)}</td>
    <td>${formatMoney(item.salario)}</td>
    <td class="acao">
      <button data-action="edit" data-id="${item.id}"><i class='bx bx-edit' ></i></button>
    </td>
    <td class="acao">
      <button data-action="delete" data-id="${item.id}"><i class='bx bx-trash' ></i></button>
    </td>
  `;

    // delegado de eventos para editar/excluir
    tr.querySelector('[data-action="edit"]').addEventListener('click', () => {
        openModal(true, item);
    });
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (confirm(`Confirma exclusão de "${item.nome}"?`)) deleteItem(item.id);
    });

    return tr;
}

/* Proteção mínima contra XSS (escapa texto para inserir em HTML) */
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/* ---------- Chamadas à API ---------- */
async function loadItens() {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        tbody.innerHTML = '';
        data.forEach(item => {
            tbody.appendChild(createRow(item));
        });
    } catch (err) {
        console.error('Erro carregando itens:', err);
        tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar dados: ${err.message}</td></tr>`;
    }
}

async function createItem(payload) {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function updateItem(id, payload) {
    const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function deleteItem(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        // recarrega
        await loadItens();
    } catch (err) {
        console.error('Erro ao deletar:', err);
        alert('Erro ao deletar: ' + err.message);
    }
}

/* ---------- Form submit ---------- */
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // validação simples
    if (!sNome.value.trim() || !sFuncao.value.trim() || sSalario.value === '') {
        alert('Preencha todos os campos.');
        return;
    }

    const payload = {
        nome: sNome.value.trim(),
        funcao: sFuncao.value.trim(),
        salario: Number(sSalario.value)
    };

    try {
        if (sId.value) {
            // edição
            await updateItem(sId.value, payload);
        } else {
            // criação
            await createItem(payload);
        }
        closeModal();
        await loadItens();
    } catch (err) {
        console.error('Erro salvar:', err);
        alert('Erro ao salvar: ' + err.message);
    }
});

/* ---------- UI events ---------- */
btnNew.addEventListener('click', () => openModal(false));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

/* ---------- Inicialização ---------- */
loadItens();
