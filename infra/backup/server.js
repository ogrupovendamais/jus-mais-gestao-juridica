// Serviço de backup do ERP Cadore: status, gerar agora e baixar o pacote (só Gestão).
// Fica atrás do nginx em /api/backup/ (porta local 8096).
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn, execFile } = require("child_process");
const express = require("/root/google-service/node_modules/express");
const axios = require("/root/google-service/node_modules/axios");

const PORT = 8096;
const PASTA = "/root/backups/cadore/auto";
const SCRIPT = "/root/cadore-backup/backup.sh";
const ARQ_SENHA = "/root/cadore-backup/senha_zip"; // senha dos downloads (definida pela Gestão na tela)
const SUPABASE_URL = "http://127.0.0.1:8060";
const SERVICE_KEY = fs.readFileSync("/root/cadore-backup/service_key", "utf8").trim();
const svc = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const app = express();
app.use(express.json());

const lerSenha = () => {
  try {
    return fs.readFileSync(ARQ_SENHA, "utf8");
  } catch {
    return "";
  }
};

// Só usuários ativos da Gestão Administrativa (master) ou desenvolvedor
async function exigirGestao(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ erro: "Faça login no sistema." });
    const { data: user } = await axios.get(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    const { data: perfis } = await axios.get(`${SUPABASE_URL}/rest/v1/profiles`, {
      headers: svc,
      params: { id: `eq.${user.id}`, select: "role,ativo,email" },
    });
    const p = perfis && perfis[0];
    if (!p || p.ativo === false || !["master", "desenvolvedor"].includes(p.role)) {
      return res.status(403).json({ erro: "Somente a Gestão Administrativa pode acessar os backups." });
    }
    req.usuario = { id: user.id, email: p.email || user.email };
    next();
  } catch (e) {
    res.status(401).json({ erro: "Sessão inválida. Entre no sistema novamente." });
  }
}

const registrar = (u, acao, descricao, detalhes) =>
  axios
    .post(`${SUPABASE_URL}/rest/v1/logs_sistema`, { user_id: u.id, user_email: u.email, acao, descricao, detalhes }, { headers: svc })
    .catch(() => {});

const lerStatus = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(PASTA, "status.json"), "utf8"));
  } catch {
    return null;
  }
};

app.get("/api/backup/status", exigirGestao, (req, res) => {
  const arquivos = fs.existsSync(PASTA)
    ? fs
        .readdirSync(PASTA)
        .filter((f) => /^backup_cadore_[\w-]+\.zip$/.test(f))
        .map((f) => {
          const st = fs.statSync(path.join(PASTA, f));
          return { arquivo: f, tamanho: st.size, em: st.mtime.toISOString() };
        })
        .sort((a, b) => b.em.localeCompare(a.em))
    : [];
  res.json({ ultimo: lerStatus(), gerando: fs.existsSync(path.join(PASTA, ".gerando")), senhaDefinida: !!lerSenha(), arquivos });
});

app.post("/api/backup/gerar", exigirGestao, (req, res) => {
  if (fs.existsSync(path.join(PASTA, ".gerando"))) return res.status(409).json({ erro: "Já existe um backup sendo gerado." });
  const p = spawn("/bin/bash", [SCRIPT], { detached: true, stdio: "ignore" });
  p.unref();
  registrar(req.usuario, "BACKUP_GERAR", "Backup gerado manualmente pelo sistema", {});
  res.status(202).json({ ok: true });
});

app.post("/api/backup/senha", exigirGestao, (req, res) => {
  const senha = String((req.body && req.body.senha) || "");
  if (senha.length < 8) return res.status(400).json({ erro: "A senha precisa ter pelo menos 8 caracteres." });
  fs.writeFileSync(ARQ_SENHA, senha, { mode: 0o600 });
  registrar(req.usuario, "BACKUP_SENHA", "Senha dos backups definida/alterada", {});
  res.json({ ok: true });
});

// Download: refaz o pacote criptografado (AES-256) com a senha atual, na hora
app.get("/api/backup/baixar/:arquivo", exigirGestao, async (req, res) => {
  const nome = req.params.arquivo;
  if (!/^backup_cadore_[\w-]+\.zip$/.test(nome)) return res.status(400).json({ erro: "Arquivo inválido." });
  const caminho = path.join(PASTA, nome);
  if (!fs.existsSync(caminho)) return res.status(404).json({ erro: "Backup não encontrado." });
  const senha = lerSenha();
  if (!senha) return res.status(409).json({ erro: "Defina a senha do backup antes de baixar." });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadore-bkp-"));
  const limpar = () => fs.rmSync(tmp, { recursive: true, force: true });
  const rodar = (cmd, args, opts = {}) =>
    new Promise((ok, falha) => execFile(cmd, args, { maxBuffer: 1 << 20, ...opts }, (e) => (e ? falha(e) : ok())));
  try {
    fs.chmodSync(tmp, 0o700);
    await rodar("unzip", ["-q", caminho, "-d", path.join(tmp, "conteudo")]);
    const saida = path.join(tmp, nome);
    // -mem=AES256: criptografia forte; abre com 7-Zip/WinRAR pedindo a senha
    await rodar("7z", ["a", "-tzip", "-mem=AES256", "-mx=5", `-p${senha}`, saida, "."], { cwd: path.join(tmp, "conteudo") });
    registrar(req.usuario, "BACKUP_DOWNLOAD", `Backup baixado: ${nome}`, { arquivo: nome, criptografado: true });
    res.download(saida, nome, limpar);
  } catch (e) {
    limpar();
    res.status(500).json({ erro: "Falha ao preparar o backup protegido." });
  }
});

app.listen(PORT, "127.0.0.1", () => console.log(`cadore-backup na porta ${PORT}`));
