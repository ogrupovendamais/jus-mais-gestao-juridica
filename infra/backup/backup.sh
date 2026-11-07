#!/bin/bash
# Backup completo do ERP Cadore (banco + planilhas + documentos organizados por pasta).
# Roda todo dia pelo cron e também pelo botão "Gerar backup agora" do sistema.
# Pacotes em /root/backups/cadore/auto. Guarda 30 dumps do banco e 7 pacotes completos.
set -uo pipefail
umask 077

BASE=/root/backups/cadore/auto
VOL=/root/multiple-supabase/docker/volumes-1779540862/storage/stub/stub
PSQL="docker exec -i supabase-db-1779540862 psql -U postgres -d postgres -v ON_ERROR_STOP=1"
LOCK=$BASE/.gerando
TS=$(TZ=America/Cuiaba date +%Y-%m-%d_%Hh%M)
NOME=backup_cadore_$TS

mkdir -p "$BASE"
exec 9>"$BASE/.lock"
flock -n 9 || { echo "backup já em andamento"; exit 0; }
date -u +%FT%TZ > "$LOCK"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK" "$LOCK"' EXIT
PKG=$WORK/$NOME
mkdir -p "$PKG/banco" "$PKG/planilhas" "$PKG/documentos" "$PKG/modelos" "$PKG/restaurar"
# mapa: arquivo no pacote -> local original no Supabase (bucket + nome), usado na restauração
MAPA="$PKG/restaurar/mapa_arquivos.tsv"
printf 'caminho_no_backup\tbucket\tnome_no_storage\ttipo\n' > "$MAPA"

falha() {
  echo "{\"ok\":false,\"em\":\"$(date -u +%FT%TZ)\",\"erro\":\"$1\"}" > "$BASE/status.json"
  echo "ERRO: $1" >&2
  exit 1
}

# 1. Banco completo (restauração técnica)
docker exec supabase-db-1779540862 pg_dump -U postgres -d postgres | gzip > "$BASE/banco_$TS.sql.gz" || falha "pg_dump"
[ -s "$BASE/banco_$TS.sql.gz" ] || falha "dump vazio"
cp "$BASE/banco_$TS.sql.gz" "$PKG/banco/"

# 2. Planilhas legíveis no Excel (separador ; e acentos em UTF-8 com BOM)
planilha() {
  local arq="$PKG/planilhas/$1.csv"
  printf '\xEF\xBB\xBF' > "$arq"
  $PSQL -c "\\copy ($2) TO STDOUT WITH CSV HEADER DELIMITER ';'" >> "$arq" || falha "planilha $1"
}
NOMEP="(SELECT full_name FROM profiles p WHERE p.id = %s)"
planilha 01_clientes "SELECT nome, cpf, rg, estado_civil, data_nascimento, nome_mae, nome_pai, email, telefone, logradouro, numero, bairro, cidade, uf, referencia, chave_pix, instituicao_financeira, data_inicio_relacionamento, contatos_complementares, created_at AS cadastrado_em FROM clientes ORDER BY nome"
planilha 02_nichos_e_responsaveis "SELECT c.nome AS cliente, c.cpf, n.nicho, n.status, $(printf "$NOMEP" n.responsavel_principal_id) AS responsavel_principal, (SELECT string_agg(full_name, ', ') FROM profiles p WHERE p.id = ANY(n.responsaveis_secundarios)) AS parceiros_secundarios, n.created_at AS aberto_em FROM cliente_nichos n JOIN clientes c ON c.id = n.cliente_id ORDER BY c.nome, n.nicho"
planilha 03_processos "SELECT c.nome AS cliente, n.nicho, pr.numero, pr.assunto_principal, pr.assunto, pr.status, pr.prioridade, pr.instancia, pr.valor_causa, $(printf "$NOMEP" pr.responsavel_a_id) AS responsavel_a, $(printf "$NOMEP" pr.responsavel_b_id) AS responsavel_b, pr.data_inicio, pr.created_at AS cadastrado_em FROM processos pr LEFT JOIN clientes c ON c.id = pr.cliente_id LEFT JOIN cliente_nichos n ON n.id = pr.cliente_nicho_id ORDER BY c.nome"
planilha 04_audiencias "SELECT a.data, a.hora, a.fuso, a.tipo, a.status, a.titulo, c.nome AS cliente, a.processo_numero, a.local, a.link_reuniao, $(printf "$NOMEP" a.responsavel_id) AS responsavel, $(printf "$NOMEP" a.user_id) AS registrada_por, a.created_at AS registrada_em FROM audiencias a LEFT JOIN clientes c ON c.id = a.cliente_id ORDER BY a.data, a.hora"
planilha 05_tarefas "SELECT t.data_conclusao, t.status, t.prioridade, t.descricao, c.nome AS cliente, coalesce($(printf "$NOMEP" t.responsavel_id), t.responsavel) AS responsavel, $(printf "$NOMEP" t.user_id) AS lancada_por, t.created_at FROM tarefas t LEFT JOIN clientes c ON c.id = t.cliente_id ORDER BY t.data_conclusao"
planilha 06_recados_das_tarefas "SELECT left(t.descricao, 120) AS tarefa, $(printf "$NOMEP" r.user_id) AS autor, r.created_at, r.texto FROM tarefa_comentarios r JOIN tarefas t ON t.id = r.tarefa_id ORDER BY r.created_at"
planilha 07_financeiro "SELECT f.data_vencimento, f.status, f.tipo_lancamento, f.descricao, c.nome AS cliente, f.valor, f.valor_cliente, f.valor_escritorio, f.valor_reserva, $(printf "$NOMEP" f.parceiro_id_1) AS parceiro_1, f.valor_parceiro, $(printf "$NOMEP" f.parceiro_id_2) AS parceiro_2, f.valor_parceiro2, $(printf "$NOMEP" f.parceiro_id_3) AS parceiro_3, f.valor_parceiro3, f.valor_sucumbencia, f.forma_recebimento, f.instituicao_financeira, f.depositante, f.status_cliente, f.status_parceiro, $(printf "$NOMEP" f.user_id) AS lancado_por, f.created_at FROM financeiro_lancamentos f LEFT JOIN clientes c ON c.id = f.cliente_id ORDER BY f.data_vencimento"
planilha 08_propostas_honorarios "SELECT h.created_at, h.status, c.nome AS cliente, h.nicho, h.descricao, h.valor_total, h.valor_entrada, h.num_parcelas, h.primeiro_vencimento, h.forma_pagamento, h.pct_reserva, h.distribuicao, h.cronograma, $(printf "$NOMEP" h.created_by) AS criada_por, $(printf "$NOMEP" h.aprovado_por) AS aprovada_por FROM honorarios_propostas h LEFT JOIN clientes c ON c.id = h.cliente_id ORDER BY h.created_at"
planilha 09_anotacoes_clientes "SELECT c.nome AS cliente, n.nicho, a.tipo, a.titulo, a.conteudo, a.respostas AS questionario,$(printf "$NOMEP" a.user_id) AS autor, a.created_at, a.updated_at FROM cliente_anotacoes a JOIN clientes c ON c.id = a.cliente_id LEFT JOIN cliente_nichos n ON n.id = a.cliente_nicho_id ORDER BY c.nome"
planilha 10_agenda "SELECT e.*, $(printf "$NOMEP" e.user_id) AS criado_por FROM agenda_eventos e ORDER BY 1"
planilha 11_equipe "SELECT nome, cargo, departamento, email, telefone, status, data_admissao, (SELECT classificacao FROM profiles p WHERE p.id = e.profile_id) AS classificacao FROM equipe e ORDER BY nome"

# 3. Documentos com a mesma árvore de pastas do sistema (Nicho/Cliente/Pasta/arquivo)
$PSQL -At -F $'\t' > "$WORK/docs.tsv" <<'SQL' || falha "lista de documentos"
WITH RECURSIVE arvore AS (
  SELECT id, parent_id, nome::text AS caminho FROM documentos WHERE parent_id IS NULL
  UNION ALL
  SELECT d.id, d.parent_id, a.caminho || '/' || d.nome FROM documentos d JOIN arvore a ON d.parent_id = a.id
)
SELECT o.name, o.version, coalesce(a.caminho, '_SEM_PASTA/' || d.nome), coalesce(o.metadata->>'mimetype', 'application/octet-stream')
FROM documentos d
JOIN storage.objects o ON o.bucket_id = 'documentos' AND o.name = d.storage_path
LEFT JOIN arvore a ON a.id = d.id
WHERE NOT d.is_folder;
SQL
n_docs=0
while IFS=$'\t' read -r obj versao caminho tipo; do
  src="$VOL/documentos/$obj/$versao"
  [ -f "$src" ] || continue
  # nomes aceitos pelo Windows
  limpo=$(printf '%s' "$caminho" | sed 's/[:*?"<>|\\]/_/g; s/[. ]*$//')
  dest="$PKG/documentos/$limpo"
  if [ -e "$dest" ]; then
    i=2; base="${dest%.*}"; ext="${dest##*.}"; [ "$base" = "$dest" ] && ext=""
    while [ -e "$base ($i)${ext:+.$ext}" ]; do i=$((i+1)); done
    dest="$base ($i)${ext:+.$ext}"
  fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest" && n_docs=$((n_docs+1)) && printf '%s\t%s\t%s\t%s\n' "${dest#"$PKG"/}" documentos "$obj" "$tipo" >> "$MAPA"
done < "$WORK/docs.tsv"

# 4. Modelos de documentos
$PSQL -At -F $'\t' -c "SELECT o.name, o.version, t.nome, coalesce(o.metadata->>'mimetype', 'application/octet-stream') FROM document_templates t JOIN storage.objects o ON o.bucket_id = 'templates' AND o.name = t.storage_path" > "$WORK/modelos.tsv"
while IFS=$'\t' read -r obj versao nome tipo; do
  src="$VOL/templates/$obj/$versao"
  rel="modelos/$(printf '%s' "$nome" | sed 's/[:*?"<>|\\/]/_/g').docx"
  [ -f "$src" ] && cp "$src" "$PKG/$rel" && printf '%s\t%s\t%s\t%s\n' "$rel" templates "$obj" "$tipo" >> "$MAPA"
done < "$WORK/modelos.tsv"

# Kit de restauração (script + instruções) vai junto no pacote
cp /root/cadore-backup/restaurar_arquivos.sh /root/cadore-backup/COMO_RESTAURAR.txt "$PKG/restaurar/" 2>/dev/null

# 5. Leia-me
cat > "$PKG/LEIA-ME.txt" <<EOF
BACKUP DO ERP CADORE ADVOGADOS
Gerado em: $(TZ=America/Cuiaba date '+%d/%m/%Y às %H:%M') (horário de Mato Grosso)

O QUE TEM AQUI
- planilhas/   Abra no Excel: clientes, nichos, processos, audiências, tarefas, financeiro,
               propostas de honorários, anotações, agenda e equipe.
- documentos/  Todos os arquivos enviados ao sistema ($n_docs arquivos), nas mesmas pastas do ERP
               (Nicho > Cliente > Pasta).
- modelos/     Modelos de documentos (Word).
- banco/       Cópia técnica completa do banco de dados (.sql.gz). Serve para o suporte
               restaurar o sistema inteiro em caso de perda. Não precisa abrir.
- restaurar/   Kit para o suporte recolocar o sistema em um Supabase novo (banco + documentos
               nos lugares originais). Veja restaurar/COMO_RESTAURAR.txt.

CUIDADOS (LGPD)
Este arquivo contém dados pessoais de clientes. Guarde o pen drive/HD em local seguro,
não envie por e-mail/WhatsApp e apague cópias antigas que não forem mais necessárias.
EOF

# 6. Empacota (zip abre direto no Windows)
( cd "$WORK" && zip -qr -9 "$BASE/$NOME.zip.tmp" "$NOME" ) || falha "zip"
mv "$BASE/$NOME.zip.tmp" "$BASE/$NOME.zip"

# 7. Retenção
ls -1t "$BASE"/banco_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
ls -1t "$BASE"/backup_cadore_*.zip 2>/dev/null | tail -n +8 | xargs -r rm -f

TAM=$(stat -c %s "$BASE/$NOME.zip")
echo "{\"ok\":true,\"em\":\"$(date -u +%FT%TZ)\",\"arquivo\":\"$NOME.zip\",\"tamanho\":$TAM,\"documentos\":$n_docs}" > "$BASE/status.json"
echo "ok $NOME.zip $TAM bytes, $n_docs documentos"
