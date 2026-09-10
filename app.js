const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();

app.use(express.json());


// =========================
// SWAGGER
// =========================

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "API de Veículos",
            version: "1.0.0",
            description:
                "API de veículos com cadastro de usuário, login, JWT e upload de imagens."
        },

        servers: [
            {
                url: "http://localhost:3000"
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },

    apis: ["./app.js"]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs)
);


// =========================
// PASTA DE UPLOADS
// =========================

const pastaUploads = path.join(__dirname, "uploads");

if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads);
}

app.use(
    "/uploads",
    express.static(pastaUploads)
);


// =========================
// DADOS EM MEMÓRIA
// =========================

let veiculos = [];
let proximoId = 1;

let usuarios = [];
let proximoUsuarioId = 1;

const CHAVE_SECRETA =
    "chave-secreta-av2-carros";


// =========================
// CONFIGURAÇÃO DO MULTER
// =========================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, pastaUploads);
    },

    filename: (req, file, cb) => {

        const nomeArquivo =
            Date.now() +
            path.extname(file.originalname);

        cb(null, nomeArquivo);
    }

});


const filtroArquivo = (
    req,
    file,
    cb
) => {

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (
        tiposPermitidos.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Formato inválido. Envie JPG, PNG ou WEBP."
            )
        );

    }

};


const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: filtroArquivo

});


// =========================
// ROTA INICIAL
// =========================

app.get("/", (req, res) => {

    res.json({
        mensagem:
            "API de veículos funcionando!"
    });

});


// =========================
// CADASTRO DE USUÁRIO
// =========================

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cadastrar um usuário
 *     tags:
 *       - Usuários
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Joao
 *               email:
 *                 type: string
 *                 example: joao@gmail.com
 *               senha:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso
 *       400:
 *         description: Dados inválidos
 */

app.post(
    "/usuarios",
    async (req, res) => {

        try {

            const {
                nome,
                email,
                senha
            } = req.body;

            if (
                !nome ||
                !email ||
                !senha
            ) {

                return res
                    .status(400)
                    .json({
                        mensagem:
                            "Nome, email e senha são obrigatórios."
                    });

            }

            const usuarioExistente =
                usuarios.find(
                    u =>
                        u.email === email
                );

            if (usuarioExistente) {

                return res
                    .status(400)
                    .json({
                        mensagem:
                            "Email já cadastrado."
                    });

            }

            const senhaCriptografada =
                await bcrypt.hash(
                    senha,
                    10
                );

            const novoUsuario = {

                id:
                    proximoUsuarioId++,

                nome,

                email,

                senha:
                    senhaCriptografada

            };

            usuarios.push(
                novoUsuario
            );

            res
                .status(201)
                .json({

                    mensagem:
                        "Usuário cadastrado com sucesso.",

                    usuario: {

                        id:
                            novoUsuario.id,

                        nome:
                            novoUsuario.nome,

                        email:
                            novoUsuario.email

                    }

                });

        } catch (erro) {

            res
                .status(500)
                .json({
                    mensagem:
                        "Erro ao cadastrar usuário."
                });

        }

    }
);


// =========================
// LOGIN
// =========================

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Realizar login
 *     tags:
 *       - Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 example: joao@gmail.com
 *               senha:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Email ou senha inválidos
 */

app.post(
    "/login",
    async (req, res) => {

        try {

            const {
                email,
                senha
            } = req.body;

            if (
                !email ||
                !senha
            ) {

                return res
                    .status(400)
                    .json({
                        mensagem:
                            "Email e senha são obrigatórios."
                    });

            }

            const usuario =
                usuarios.find(
                    u =>
                        u.email === email
                );

            if (!usuario) {

                return res
                    .status(401)
                    .json({
                        mensagem:
                            "Email ou senha inválidos."
                    });

            }

            const senhaCorreta =
                await bcrypt.compare(
                    senha,
                    usuario.senha
                );

            if (!senhaCorreta) {

                return res
                    .status(401)
                    .json({
                        mensagem:
                            "Email ou senha inválidos."
                    });

            }

            const token =
                jwt.sign(

                    {
                        id:
                            usuario.id,

                        email:
                            usuario.email
                    },

                    CHAVE_SECRETA,

                    {
                        expiresIn: "1h"
                    }

                );

            res.json({

                mensagem:
                    "Login realizado com sucesso.",

                token: token

            });

        } catch (erro) {

            res
                .status(500)
                .json({
                    mensagem:
                        "Erro ao realizar login."
                });

        }

    }
);


// =========================
// MIDDLEWARE DE TOKEN
// =========================

function verificarToken(
    req,
    res,
    next
) {

    const authHeader =
        req.headers.authorization;

    if (!authHeader) {

        return res
            .status(401)
            .json({
                mensagem:
                    "Token não informado."
            });

    }

    const partes =
        authHeader.split(" ");

    if (
        partes.length !== 2 ||
        partes[0] !== "Bearer"
    ) {

        return res
            .status(401)
            .json({
                mensagem:
                    "Token inválido."
            });

    }

    const token =
        partes[1];

    try {

        const usuarioDecodificado =
            jwt.verify(
                token,
                CHAVE_SECRETA
            );

        req.usuario =
            usuarioDecodificado;

        next();

    } catch (erro) {

        return res
            .status(401)
            .json({
                mensagem:
                    "Token inválido ou expirado."
            });

    }

}


// =========================
// CADASTRAR VEÍCULO
// =========================

/**
 * @swagger
 * /veiculos:
 *   post:
 *     summary: Cadastrar veículo
 *     tags:
 *       - Veículos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - marca
 *               - modelo
 *               - ano
 *               - preco
 *             properties:
 *               marca:
 *                 type: string
 *                 example: Toyota
 *               modelo:
 *                 type: string
 *                 example: Corolla
 *               ano:
 *                 type: integer
 *                 example: 2024
 *               preco:
 *                 type: number
 *                 example: 150000
 *     responses:
 *       201:
 *         description: Veículo cadastrado
 *       401:
 *         description: Token necessário
 */

app.post(
    "/veiculos",
    verificarToken,
    (req, res) => {

        const {
            marca,
            modelo,
            ano,
            preco
        } = req.body;

        if (
            !marca ||
            !modelo ||
            !ano ||
            !preco
        ) {

            return res
                .status(400)
                .json({
                    mensagem:
                        "Todos os campos são obrigatórios."
                });

        }

        const novoVeiculo = {

            id:
                proximoId++,

            marca,

            modelo,

            ano,

            preco,

            imagem: null

        };

        veiculos.push(
            novoVeiculo
        );

        res
            .status(201)
            .json(
                novoVeiculo
            );

    }
);


// =========================
// LISTAR VEÍCULOS
// =========================

/**
 * @swagger
 * /veiculos:
 *   get:
 *     summary: Listar todos os veículos
 *     tags:
 *       - Veículos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de veículos
 *       401:
 *         description: Token necessário
 */

app.get(
    "/veiculos",
    verificarToken,
    (req, res) => {

        res.json(
            veiculos
        );

    }
);


// =========================
// BUSCAR VEÍCULO POR ID
// =========================

/**
 * @swagger
 * /veiculos/{id}:
 *   get:
 *     summary: Buscar veículo pelo ID
 *     tags:
 *       - Veículos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Veículo encontrado
 *       404:
 *         description: Veículo não encontrado
 */

app.get(
    "/veiculos/:id",
    verificarToken,
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const veiculo =
            veiculos.find(
                v =>
                    v.id === id
            );

        if (!veiculo) {

            return res
                .status(404)
                .json({
                    mensagem:
                        "Veículo não encontrado."
                });

        }

        res.json(
            veiculo
        );

    }
);


// =========================
// EDITAR VEÍCULO
// =========================

/**
 * @swagger
 * /veiculos/{id}:
 *   put:
 *     summary: Editar veículo
 *     tags:
 *       - Veículos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marca:
 *                 type: string
 *               modelo:
 *                 type: string
 *               ano:
 *                 type: integer
 *               preco:
 *                 type: number
 *     responses:
 *       200:
 *         description: Veículo editado
 *       404:
 *         description: Veículo não encontrado
 */

app.put(
    "/veiculos/:id",
    verificarToken,
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const veiculo =
            veiculos.find(
                v =>
                    v.id === id
            );

        if (!veiculo) {

            return res
                .status(404)
                .json({
                    mensagem:
                        "Veículo não encontrado."
                });

        }

        const {
            marca,
            modelo,
            ano,
            preco
        } = req.body;

        if (
            !marca ||
            !modelo ||
            !ano ||
            !preco
        ) {

            return res
                .status(400)
                .json({
                    mensagem:
                        "Todos os campos são obrigatórios."
                });

        }

        veiculo.marca =
            marca;

        veiculo.modelo =
            modelo;

        veiculo.ano =
            ano;

        veiculo.preco =
            preco;

        res.json(
            veiculo
        );

    }
);


// =========================
// EXCLUIR VEÍCULO
// =========================

/**
 * @swagger
 * /veiculos/{id}:
 *   delete:
 *     summary: Excluir veículo
 *     tags:
 *       - Veículos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Veículo excluído
 *       404:
 *         description: Veículo não encontrado
 */

app.delete(
    "/veiculos/:id",
    verificarToken,
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const indice =
            veiculos.findIndex(
                v =>
                    v.id === id
            );

        if (
            indice === -1
        ) {

            return res
                .status(404)
                .json({
                    mensagem:
                        "Veículo não encontrado."
                });

        }

        const removido =
            veiculos.splice(
                indice,
                1
            );

        res.json({

            mensagem:
                "Veículo excluído com sucesso.",

            veiculo:
                removido[0]

        });

    }
);


// =========================
// UPLOAD DE IMAGEM
// =========================

/**
 * @swagger
 * /veiculos/{id}/imagem:
 *   post:
 *     summary: Enviar imagem do veículo
 *     tags:
 *       - Veículos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagem:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagem enviada com sucesso
 *       400:
 *         description: Imagem inválida
 *       404:
 *         description: Veículo não encontrado
 */

app.post(
    "/veiculos/:id/imagem",
    verificarToken,
    upload.single("imagem"),
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const veiculo =
            veiculos.find(
                v =>
                    v.id === id
            );

        if (!veiculo) {

            if (req.file) {

                fs.unlinkSync(
                    req.file.path
                );

            }

            return res
                .status(404)
                .json({
                    mensagem:
                        "Veículo não encontrado."
                });

        }

        if (!req.file) {

            return res
                .status(400)
                .json({
                    mensagem:
                        "Nenhuma imagem enviada."
                });

        }

        veiculo.imagem =
            `/uploads/${req.file.filename}`;

        res.json({

            mensagem:
                "Imagem enviada com sucesso.",

            veiculo:
                veiculo

        });

    }
);


// =========================
// ERROS DO UPLOAD
// =========================

app.use(
    (
        erro,
        req,
        res,
        next
    ) => {

        if (
            erro instanceof
            multer.MulterError
        ) {

            if (
                erro.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .json({
                        mensagem:
                            "Imagem muito grande. Máximo de 5 MB."
                    });

            }

            return res
                .status(400)
                .json({
                    mensagem:
                        "Erro no upload da imagem."
                });

        }

        if (erro) {

            return res
                .status(400)
                .json({
                    mensagem:
                        erro.message
                });

        }

        next();

    }
);


// =========================
// INICIAR SERVIDOR
// =========================

const PORTA = 3000;

app.listen(
    PORTA,
    () => {

        console.log(
            `Servidor rodando em http://localhost:${PORTA}`
        );

        console.log(
            `Swagger em http://localhost:${PORTA}/api-docs`
        );

    }
);