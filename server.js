/**
 * server.js
 * Backend mínimo para o CRUD que salva os dados em arquivo JSON.
 *
 * - Serve arquivos estáticos em /public
 * - Exponha API REST em /api/employees
 *
 * Como rodar:
 * 1) npm install
 * 2) npm start
 *
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FOLDER = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_FOLDER, 'db.json');

app.use(cors());
app.use(express.json()); // para req.body JSON

// Serve os arquivos estáticos (front-end)
app.use(express.static(path.join(__dirname, 'public')));

// --- Helpers para ler/escrever arquivo JSON ---
async function ensureDB() {
    try {
        await fs.mkdir(DB_FOLDER, { recursive: true });
        if (!fsSync.existsSync(DB_FILE)) {
            await fs.writeFile(DB_FILE, '[]', 'utf8');
        }
    } catch (err) {
        throw new Error('Erro criando DB: ' + err.message);
    }
}

async function readDB() {
    await ensureDB();
    const content = await fs.readFile(DB_FILE, 'utf8');
    try {
        return JSON.parse(content || '[]');
    } catch (err) {
        // se arquivo corrompido, reescrever como []
        await fs.writeFile(DB_FILE, '[]', 'utf8');
        return [];
    }
}

async function writeDB(data) {
    await ensureDB();
    // grava atomically (escrita completa)
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// --- Rotas API ---
// GET /api/employees -> lista todos
app.get('/api/employees', async (req, res) => {
    try {
        const items = await readDB();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Erro lendo banco: ' + err.message });
    }
});

// POST /api/employees -> cria
app.post('/api/employees', async (req, res) => {
    try {
        const { nome, funcao, salario } = req.body;
        if (!nome || !funcao || salario === undefined) {
            return res.status(400).json({ error: 'Campos obrigatórios: nome, funcao, salario' });
        }
        const items = await readDB();
        // gerar id incremental (maior id + 1)
        const newId = items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
        const novo = {
            id: newId,
            nome: String(nome),
            funcao: String(funcao),
            salario: Number(salario)
        };
        items.push(novo);
        await writeDB(items);
        res.status(201).json(novo);
    } catch (err) {
        res.status(500).json({ error: 'Erro criando registro: ' + err.message });
    }
});

// PUT /api/employees/:id -> atualiza
app.put('/api/employees/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nome, funcao, salario } = req.body;
        const items = await readDB();
        const idx = items.findIndex(it => it.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Registro não encontrado' });
        // atualizar valores (validação mínima)
        items[idx].nome = nome !== undefined ? String(nome) : items[idx].nome;
        items[idx].funcao = funcao !== undefined ? String(funcao) : items[idx].funcao;
        items[idx].salario = salario !== undefined ? Number(salario) : items[idx].salario;
        await writeDB(items);
        res.json(items[idx]);
    } catch (err) {
        res.status(500).json({ error: 'Erro atualizando: ' + err.message });
    }
});

// DELETE /api/employees/:id -> remove
app.delete('/api/employees/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        let items = await readDB();
        const idx = items.findIndex(it => it.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Registro não encontrado' });
        const removed = items.splice(idx, 1)[0];
        await writeDB(items);
        res.json({ removed });
    } catch (err) {
        res.status(500).json({ error: 'Erro removendo: ' + err.message });
    }
});

// fallback: serve index.html (already served by static), but mantemos a rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
