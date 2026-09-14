const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());

let veiculos = [];
let proximoId = 1;

let usuarios = [];
let proximoUsuarioId = 1;

const CHAVE_SECRETA = "av2-veiculos-chave-secreta";

// =========================
// ROTA INICIAL
// =========================

app.get("/", (req, res) => {
    res.json({
        mensagem: "API de veículos funcionando!"
    });
});

// =========================
// CADASTRAR USUÁRIO
// =========================

app.post("/usuarios", async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem: "Nome, email e senha são obrigatórios."
            });
        }

        const usuarioExistente = usuarios.find(
            u => u.email === email
        );

        if (usuarioExistente) {
            return res.status(400).json({
                mensagem: "Email já cadastrado."
            });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const novoUsuario = {
            id: proximoUsuarioId++,
            nome,
            email,
            senha: senhaCriptografada
        };

        usuarios.push(novoUsuario);

        res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso.",
            usuario: {
                id: novoUsuario.id,
                nome: novoUsuario.nome,
                email: novoUsuario.email
            }
        });

    } catch (erro) {
        res.status(500).json({
            mensagem: "Erro ao cadastrar usuário."
        });
    }
});

// =========================
// LOGIN
// =========================

app.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: "Email e senha são obrigatórios."
            });
        }

        const usuario = usuarios.find(
            u => u.email === email
        );

        if (!usuario) {
            return res.status(401).json({
                mensagem: "Email ou senha inválidos."
            });
        }

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "Email ou senha inválidos."
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email
            },
            CHAVE_SECRETA,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            mensagem: "Login realizado com sucesso.",
            token: token
        });

    } catch (erro) {
        res.status(500).json({
            mensagem: "Erro ao realizar login."
        });
    }
});

// =========================
// MIDDLEWARE DE TOKEN
// =========================

function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            mensagem: "Token não informado."
        });
    }

    const partes = authHeader.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({
            mensagem: "Token inválido."
        });
    }

    const token = partes[1];

    try {
        const usuarioDecodificado = jwt.verify(
            token,
            CHAVE_SECRETA
        );

        req.usuario = usuarioDecodificado;
        next();

    } catch (erro) {
        return res.status(401).json({
            mensagem: "Token inválido ou expirado."
        });
    }
}

// =========================
// CADASTRAR VEÍCULO
// =========================

app.post("/veiculos", verificarToken, (req, res) => {
    const { marca, modelo, ano, preco } = req.body;

    if (!marca || !modelo || !ano || !preco) {
        return res.status(400).json({
            mensagem: "Todos os campos são obrigatórios."
        });
    }

    const novoVeiculo = {
        id: proximoId++,
        marca,
        modelo,
        ano,
        preco
    };

    veiculos.push(novoVeiculo);

    res.status(201).json(novoVeiculo);
});

// =========================
// LISTAR VEÍCULOS
// =========================

app.get("/veiculos", verificarToken, (req, res) => {
    res.json(veiculos);
});

// =========================
// BUSCAR VEÍCULO POR ID
// =========================

app.get("/veiculos/:id", verificarToken, (req, res) => {
    const id = Number(req.params.id);

    const veiculo = veiculos.find(v => v.id === id);

    if (!veiculo) {
        return res.status(404).json({
            mensagem: "Veículo não encontrado."
        });
    }

    res.json(veiculo);
});

// =========================
// EDITAR VEÍCULO
// =========================

app.put("/veiculos/:id", verificarToken, (req, res) => {
    const id = Number(req.params.id);

    const veiculo = veiculos.find(v => v.id === id);

    if (!veiculo) {
        return res.status(404).json({
            mensagem: "Veículo não encontrado."
        });
    }

    const { marca, modelo, ano, preco } = req.body;

    if (!marca || !modelo || !ano || !preco) {
        return res.status(400).json({
            mensagem: "Todos os campos são obrigatórios."
        });
    }

    veiculo.marca = marca;
    veiculo.modelo = modelo;
    veiculo.ano = ano;
    veiculo.preco = preco;

    res.json(veiculo);
});

// =========================
// EXCLUIR VEÍCULO
// =========================

app.delete("/veiculos/:id", verificarToken, (req, res) => {
    const id = Number(req.params.id);

    const indice = veiculos.findIndex(v => v.id === id);

    if (indice === -1) {
        return res.status(404).json({
            mensagem: "Veículo não encontrado."
        });
    }

    const removido = veiculos.splice(indice, 1);

    res.json({
        mensagem: "Veículo excluído com sucesso.",
        veiculo: removido[0]
    });
});

// =========================
// INICIAR SERVIDOR
// =========================

const PORTA = 3000;

app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});