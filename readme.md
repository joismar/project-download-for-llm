# Processador de Código para LLMs

Este projeto é uma aplicação que processa repositórios do GitHub ou arquivos ZIP contendo código-fonte, dividindo-os em chunks para uso com modelos de linguagem (LLMs). Ele inclui um frontend em HTML/JavaScript e uma função backend (supabase) para baixar repositórios do GitHub.

---

## Funcionalidades

- **Entrada de código**: Suporte para URL de repositórios GitHub ou upload de arquivos ZIP.
- **Configurações personalizáveis**: Extensões de arquivo e tamanho máximo de chunks.
- **Processamento de código**: Geração de chunks de código com estatísticas detalhadas.
- **Download de resultados**: Arquivos processados disponíveis para download individual ou em um ZIP.

---

## Pré-requisitos

- **Deno** (para testar a função localmente)
- **Docker** (requisito do supabase cli para fazer upload/download da function)
- **Supabase CLI** (para deploy da function)
- **Navegador moderno** (para executar o frontend)

---

## Estrutura do Projeto

```plaintext
project-download-for-llm/
├── index.html          # Frontend principal
├── script.js           # Lógica do frontend
├── supabase/
│   └── functions/
│       └── download-github-repo/
│           └── index.ts  # Função para baixar repositórios do GitHub
└── README.md           # Documentação do projeto
```

---

## Como executar localmente

### 1. Executar o Frontend

1. Abra o arquivo index.html em um navegador.
2. Configure a fonte do código (URL do GitHub ou upload de arquivo ZIP).
3. Clique em **Processar Código** para iniciar o processamento.

---

### 2. Testar a Função Localmente

A função está localizada em index.ts. Para testá-la localmente:

1. **Executando com Deno**:
   No terminal, execute:
   ```bash
   deno run --allow-net supabase\functions\download-github-repo\index.ts
   ```

2. **Testar a função**:
   Use uma ferramenta como `curl` ou Postman para enviar uma requisição `POST` (ou teste direto da ferramenta):
   ```bash
   curl -X POST http://localhost:8000 \
   -H "Content-Type: application/json" \
   -d '{"url": "https://github.com/usuario/repositorio", "branch": "main"}'
   ```

   A resposta será o arquivo ZIP do repositório.

---

### 3. Fazer Deploy da Função no Supabase

1. **Instalar o Supabase CLI**:
   Siga as instruções de instalação no site oficial: [Supabase CLI](https://supabase.com/docs/guides/cli).

2. **Configurar o Supabase CLI**:
   Faça login no Supabase:
   ```bash
   supabase login
   ```

3. **Deploy da função**:
   Execute o comando de deploy:
   ```bash
   supabase functions deploy download-github-repo
   ```

4. **Testar a função no Supabase**:
   Após o deploy, use a URL fornecida pelo Supabase para testar a função. Por exemplo:
   ```bash
   curl -X POST https://<supabase-url>/functions/v1/download-github-repo \
   -H "Content-Type: application/json" \
   -d '{"url": "https://github.com/usuario/repositorio", "branch": "main"}'
   ```

---

## Configurações do Frontend

### Parâmetros configuráveis:

- **Fonte do código**:
  - URL do GitHub
  - Upload de arquivo ZIP
- **Extensões de arquivo**: Especifique as extensões de arquivo a serem processadas (ex.: `.js, .ts, .html`).
- **Tamanho máximo por chunk**: Defina o número máximo de caracteres por chunk.

---

## Problemas comuns

1. **Erro ao processar o arquivo ZIP**:
   - Certifique-se de que o arquivo ZIP contém arquivos com as extensões configuradas.
   - Verifique se o tamanho do chunk é maior que 10.000 caracteres.

2. **Erro ao baixar repositório do GitHub**:
   - Verifique se a URL do repositório é válida.
   - Certifique-se de que a função está configurada corretamente.

---

## Contribuição

Sinta-se à vontade para abrir issues ou enviar pull requests para melhorias no projeto.

---

## Licença

Este projeto está licenciado sob a MIT License.