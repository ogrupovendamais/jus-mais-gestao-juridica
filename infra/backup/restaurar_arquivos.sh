#!/bin/bash
# Recoloca os documentos e modelos do backup nos lugares originais de um Supabase (novo ou o mesmo).
# Uso (dentro da pasta extraída do backup):
#   bash restaurar/restaurar_arquivos.sh https://SEU-PROJETO.supabase.co CHAVE_SERVICE_ROLE
# Rode DEPOIS de restaurar o banco (passo 1 do COMO_RESTAURAR.txt). Pode rodar de novo sem problema
# (sobrescreve o que já existir). Precisa só de bash + curl (Linux, Mac ou Git Bash no Windows).
#
# Variáveis opcionais (testes): BUCKET_TESTE=nome manda tudo para um bucket só; LIMITE=n envia só n arquivos.
set -uo pipefail

URL="${1:?Informe a URL do Supabase (ex.: https://xyz.supabase.co)}"
CHAVE="${2:?Informe a chave service_role do Supabase}"
URL="${URL%/}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
MAPA="$RAIZ/restaurar/mapa_arquivos.tsv"
[ -f "$MAPA" ] || { echo "Mapa não encontrado: $MAPA"; exit 1; }

# codifica o nome para URL, mantendo as barras das pastas
codificar() {
  local LC_ALL=C s="$1" i c out=""
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"
    case "$c" in
      [a-zA-Z0-9.~_/-]) out+="$c" ;;
      *) out+=$(printf '%%%02X' "'$c") ;;
    esac
  done
  printf '%s' "$out"
}

criar_bucket() {
  curl -s -o /dev/null -X POST "$URL/storage/v1/bucket" \
    -H "apikey: $CHAVE" -H "Authorization: Bearer $CHAVE" -H "Content-Type: application/json" \
    -d "{\"id\":\"$1\",\"name\":\"$1\",\"public\":false}"
}

ok=0; falhas=0; n=0
declare -A criados
while IFS=$'\t' read -r caminho bucket nome tipo; do
  [ "$caminho" = "caminho_no_backup" ] && continue
  bucket="${BUCKET_TESTE:-$bucket}"
  [ -n "${criados[$bucket]:-}" ] || { criar_bucket "$bucket"; criados[$bucket]=1; }
  arq="$RAIZ/$caminho"
  if [ ! -f "$arq" ]; then echo "FALTA no backup: $caminho"; falhas=$((falhas+1)); continue; fi
  code=$(curl -s -o /tmp/restaurar_resp.$$ -w '%{http_code}' -X POST "$URL/storage/v1/object/$bucket/$(codificar "$nome")" \
    -H "apikey: $CHAVE" -H "Authorization: Bearer $CHAVE" -H "x-upsert: true" -H "Content-Type: $tipo" \
    --data-binary @"$arq")
  if [ "$code" = "200" ]; then ok=$((ok+1)); else falhas=$((falhas+1)); echo "ERRO $code: $caminho -> $(head -c 200 /tmp/restaurar_resp.$$)"; fi
  n=$((n+1)); [ -n "${LIMITE:-}" ] && [ "$n" -ge "$LIMITE" ] && break
done < "$MAPA"
rm -f /tmp/restaurar_resp.$$
echo "Concluído: $ok arquivo(s) enviados, $falhas falha(s)."
[ "$falhas" -eq 0 ]
