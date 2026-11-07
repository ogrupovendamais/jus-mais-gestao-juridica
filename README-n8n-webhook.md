# Configuração do Webhook N8N para Consulta de Processos

Este documento explica como configurar o webhook do N8N para resolver o problema de CORS ao consultar a API Datajud.

## Arquivos Criados

### 1. `n8n-consulta-processos-workflow.json`

Arquivo de configuração do workflow do N8N que contém:

- **Webhook de entrada**: Recebe requisições POST do frontend
- **Extração de parâmetros**: Processa tribunal e número do processo
- **Consulta à API Datajud**: Faz a requisição real para a API
- **Processamento de resposta**: Formata os dados retornados
- **Tratamento de erros**: Gerencia erros e exceções
- **Resposta com CORS**: Retorna dados com headers CORS apropriados

## Como Configurar

### 1. Importar o Workflow no N8N

1. Acesse sua instância do N8N
2. Vá em "Workflows" > "Import from File"
3. Selecione o arquivo `n8n-consulta-processos-workflow.json`
4. Ative o workflow

### 2. Configurar a URL do Webhook

1. No workflow importado, clique no nó "Webhook"
2. Copie a URL do webhook gerada
3. No arquivo `src/pages/ConsultaProcessos.tsx`, substitua:
   ```typescript
   const webhookUrl = "https://seu-n8n-instance.com/webhook/consulta-processo";
   ```
   Pela URL real do seu webhook.

### 3. Configurar Credenciais da API Datajud

No nó "Consulta Datajud API":

1. Verifique se a chave de API está correta: https://datajud-wiki.cnj.jus.br/api-publica/acesso
2. A chave atual no workflow é: `cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==`
3. Substitua pela sua chave se necessário

## Estrutura da Requisição

O frontend envia uma requisição POST para o webhook com:

```json
{
  "tribunal": "tst",
  "numeroProcesso": "1234567-89.2023.5.01.0001"
}
```

## Estrutura da Resposta

### Sucesso:

```json
{
  "success": true,
  "message": "Processo encontrado com sucesso",
  "data": {
    "numeroProcesso": "1234567-89.2023.5.01.0001",
    "classe": "Reclamação Trabalhista",
    "assunto": "Rescisão do Contrato de Trabalho",
    "dataAjuizamento": "2023-01-15",
    "orgaoJulgador": "1ª Vara do Trabalho",
    "partes": [
      {
        "nome": "João Silva",
        "tipo": "Requerente"
      }
    ],
    "movimentacoes": [
      {
        "data": "2023-01-15T10:00:00Z",
        "descricao": "Distribuição",
        "complemento": "Processo distribuído"
      }
    ]
  }
}
```

### Erro:

```json
{
  "success": false,
  "message": "Processo não encontrado",
  "data": null
}
```

## Tribunais Suportados

O workflow suporta todos os tribunais da API Datajud:

- **tst**: Tribunal Superior do Trabalho
- **tjac**: Tribunal de Justiça do Acre
- **tjal**: Tribunal de Justiça de Alagoas
- **tjap**: Tribunal de Justiça do Amapá
- **tjam**: Tribunal de Justiça do Amazonas
- **tjba**: Tribunal de Justiça da Bahia
- **tjce**: Tribunal de Justiça do Ceará
- **tjdft**: Tribunal de Justiça do Distrito Federal e Territórios
- **tjes**: Tribunal de Justiça do Espírito Santo
- **tjgo**: Tribunal de Justiça de Goiás
- **tjma**: Tribunal de Justiça do Maranhão
- **tjmt**: Tribunal de Justiça de Mato Grosso
- **tjms**: Tribunal de Justiça de Mato Grosso do Sul
- **tjmg**: Tribunal de Justiça de Minas Gerais
- **tjpa**: Tribunal de Justiça do Pará
- **tjpb**: Tribunal de Justiça da Paraíba
- **tjpr**: Tribunal de Justiça do Paraná
- **tjpe**: Tribunal de Justiça de Pernambuco
- **tjpi**: Tribunal de Justiça do Piauí
- **tjrj**: Tribunal de Justiça do Rio de Janeiro
- **tjrn**: Tribunal de Justiça do Rio Grande do Norte
- **tjrs**: Tribunal de Justiça do Rio Grande do Sul
- **tjro**: Tribunal de Justiça de Rondônia
- **tjrr**: Tribunal de Justiça de Roraima
- **tjsc**: Tribunal de Justiça de Santa Catarina
- **tjsp**: Tribunal de Justiça de São Paulo
- **tjse**: Tribunal de Justiça de Sergipe
- **tjto**: Tribunal de Justiça do Tocantins
- **trf1**: Tribunal Regional Federal da 1ª Região
- **trf2**: Tribunal Regional Federal da 2ª Região
- **trf3**: Tribunal Regional Federal da 3ª Região
- **trf4**: Tribunal Regional Federal da 4ª Região
- **trf5**: Tribunal Regional Federal da 5ª Região
- **trf6**: Tribunal Regional Federal da 6ª Região

## Vantagens da Solução

1. **Resolve CORS**: Elimina problemas de política de origem cruzada
2. **Segurança**: Mantém a chave da API no servidor (N8N)
3. **Flexibilidade**: Permite processamento adicional dos dados
4. **Monitoramento**: N8N oferece logs e monitoramento das requisições
5. **Escalabilidade**: Pode ser facilmente expandido para outros endpoints

## Próximos Passos

1. Configure sua instância do N8N
2. Importe o workflow
3. Atualize a URL do webhook no código
4. Teste a funcionalidade
5. Monitore os logs no N8N para debugging

## Troubleshooting

- **Erro 404**: Verifique se a URL do webhook está correta
- **Erro de CORS**: Confirme se os headers CORS estão configurados no N8N
- **Erro de API**: Verifique se a chave da API Datajud está válida
- **Timeout**: Ajuste o timeout no N8N se necessário
