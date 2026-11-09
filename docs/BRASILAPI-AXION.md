# BrasilAPI — Axion

Integração gratuita de consultas públicas a https://brasilapi.com.br/docs. Sem chave nem alteração de banco de dados.

- Camada server-side: src/lib/brasilapi/client.ts; CNPJ, CEP, banco COMPE, feriados, FIPE por código, SELIC/CDI.
- Formulários: botão opcional de consulta de CNPJ no cadastro de nota fiscal, preenchendo apenas a sugestão de fornecedor, sob revisão manual. Com chave de acesso NFC-e/NF-e de 44 dígitos, extrair CNPJ do emitente dos caracteres 7-20; não enviar PDF a terceiros.
- Axion IA: consulta direta sem modelo no modo interno e fatos adicionais para Gemini/OpenAI quando o pedido identificar explicitamente consulta pública. Não oferece operação bancária nem escrita.
- Proteções: autenticação, validação estrita, domínios e rotas fixos, sem redirects, timeout 8,5 s, cache por endpoint, limite best-effort por instância. Não usar para varreduras ou crawling.
- Dados empresariais não são atestados de idoneidade. Feriados locais da agenda permanecem como estão. Taxas não recalculam dívidas, parcelas ou Despesas Anuais.

## Validação
Executar npm test -- src/lib/brasilapi/intent.test.ts e npm run build. Em notas fiscais, consultar CNPJ de teste e conferir nome antes de salvar. Na Axion IA em "Consultas internas", testar "CNPJ 19.131.243/0001-97", "CEP 01001-000", "Banco 001", "FIPE 001004-9", "feriados 2027" e "taxa do CDI". Testar 404, timeout, 429 e sessões deslogadas. Nenhuma consulta deve modificar cadastros.

## Reversão
Reverter commit/PR de integração; não há migração SQL ou segredos para remover.
