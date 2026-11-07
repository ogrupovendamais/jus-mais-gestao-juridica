# Backup do ERP Cadore (VPS 2.24.102.120)

- `/root/cadore-backup/backup.sh` — gera `/root/backups/cadore/auto/backup_cadore_<data>.zip`
  (planilhas CSV, documentos na árvore de pastas do sistema, modelos, dump do banco) e `banco_<data>.sql.gz`.
  Retenção: 7 zips e 30 dumps. Cron: `/etc/cron.d/cadore-backup` (06:00 UTC = 02:00 MT). Log: `auto/backup.log`.
- `/root/cadore-backup/server.js` — serviço systemd `cadore-backup` (127.0.0.1:8096), exposto pelo nginx em `/api/backup/`.
  Rotas: `GET status`, `POST gerar`, `GET baixar/:arquivo`. Só usuários master/desenvolvedor ativos; downloads vão para `logs_sistema`.
  Chave service_role em `/root/cadore-backup/service_key` (600).
- Tela: Configurações › Backup e Segurança (`src/components/configuracoes/BackupCard.tsx`).

Restaurar o banco: `gunzip -c banco_<data>.sql.gz | docker exec -i supabase-db-1779540862 psql -U postgres -d postgres` (em banco limpo).

## Senha dos downloads
- A Gestão define na tela (`POST /api/backup/senha`, mín. 8). Fica em `/root/cadore-backup/senha_zip` (600).
- Os pacotes no servidor ficam sem senha (pasta só do root); o download é recriptografado na hora (7z, zip AES-256) com a senha atual.
- Abrir: 7-Zip/WinRAR (o Explorer do Windows não abre AES).

## Limpeza 2026-10-27
13 objetos órfãos do bucket documentos (sem registro em `documentos`) excluídos a pedido do usuário;
cópia em `/root/backups/cadore/orfaos_excluidos_20261027.tar.gz` (6 arquivos + registros.csv).

## Restauração (testada em 2026-10-27)
O pacote leva `restaurar/` com `COMO_RESTAURAR.txt`, `restaurar_arquivos.sh` e `mapa_arquivos.tsv`
(caminho no backup → bucket + nome original no storage).
- Banco: dump restaurado num banco temporário → todas as contagens iguais à produção (clientes, usuários,
  81 policies, 42 funções); só 5 erros internos esperados (graphql_public, event trigger pg_net).
- Arquivos: script enviou os 41 arquivos (39 docs + 2 modelos) para um bucket temporário; baixados de volta,
  41/41 idênticos byte a byte. Bucket de teste removido.
