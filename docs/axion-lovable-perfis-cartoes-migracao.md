# Axion — conciliação de cartões com o Lovable Cloud

## Situação documentada (2026-11-09)
- O Lovable confirmou que aplicou **0005_finance_consumption_classification** e **0006_annual_expense_sources** e atualizou o cache PostgREST. **Não repetir essas migrações.**
- O erro observado no navegador foi **PGRST205 — public.finance_account_profiles ausente no schema cache**.
- O PR #25 alterou o aplicativo para manter as Despesas Anuais utilizáveis e **bloquear gravações de vínculos de cartão quando o esquema necessário está indisponível**. Não desfazer essa proteção.
- A tabela e a RPC correspondentes já estavam especificadas em `supabase/migrations/20261107140000_finance_card_profiles_invoices.sql`.
- O arquivo `drizzle/migrations/0009_finance_card_profiles_invoices.sql` espelha a migração original e registra-a no journal utilizado pelo Lovable.
- A existência desses arquivos **não significa que o SQL já tenha sido aplicado ao banco**.

## Pré-verificação obrigatória (somente leitura)

Antes de qualquer execução, identificar o banco de dados **já conectado ao Axion**. Verificar backup/snapshot com capacidade de restauração e sua data. Se não for possível confirmar um backup recuperável, **não executar SQL**.

No editor SQL **do banco correto**, verificar:

```sql
SELECT to_regclass('public.annual_expenses') AS annual_expenses,
       to_regclass('public.finance_bills') AS finance_bills,
       to_regclass('public.annual_expense_months') AS annual_expense_months,
       to_regclass('public.finance_account_profiles') AS finance_account_profiles,
       to_regclass('public.finance_card_closed_invoices') AS finance_card_closed_invoices,
       to_regprocedure('public.apply_closed_card_invoice(text,text,date,date,bigint,text,text)') AS invoice_rpc;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('annual_expenses', 'finance_account_profiles', 'finance_card_closed_invoices')
  AND column_name IN ('expense_kind','consumption_value_type','expense_source','source_contract_id',
                      'source_template_id','user_id','account_id','display_name','card_brand',
                      'annual_expense_id','period','amount_cents')
ORDER BY table_name, ordinal_position;

SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('finance_account_profiles','finance_card_closed_invoices');
```

Consultar também contagens e totais de `annual_expenses`, `annual_expense_months`, `finance_bills`, `installment_contracts` e `installment_entries` antes da alteração (sem exportar informações sensíveis aos logs). Não tratar os números do relatório antigo do Lovable como contagem atual garantida.

## Aplicação segura

1. Se as duas tabelas e a RPC já existirem com esquema correto, **não reaplicar a migração**. Verificar permissões, política RLS, usuário autorizado e recarregar o cache `NOTIFY pgrst, 'reload schema';`.
2. Se **não existirem**, com backup confirmado, aplicar **uma única vez** a migração de cartões correspondente ao fluxo do Lovable, `drizzle/migrations/0009_finance_card_profiles_invoices.sql`. Não executar simultaneamente a cópia de `supabase/migrations`. Usar transação quando a ferramenta de migração permitir.
3. Se existir apenas parte do esquema, **interromper** e apresentar as diferenças. Não descartar/recriar tabelas nem sobrescrever vínculos.
4. Validar RLS: um usuário não deve poder ler nem editar perfis ou faturas de outro. Verificar a RPC `apply_closed_card_invoice` e sua autorização `authenticated`. Recarregar o PostgREST e regenerar os tipos do banco caso o Lovable exija; preservar as alterações funcionais já mescladas.
5. Confirmar no formulário do cartão que o credor certo foi associado **sem nova despesa duplicada**. Só então testar a sincronização com **faturas fechadas oficiais**, com preferência por dados não reais ou por simulação sem gravação.
6. Conferir o resumo anual: somente Despesas Anuais são fonte dos indicadores. Cartões atualizam as competências correspondentes, não somam saldos globais.

## Critérios de aceite

- `getFinanceAccountProfiles` retorna `available:true` sem erro PGRST205.
- Os vínculos persistem ao recarregar a página; cartões diferentes não compartilham inadvertidamente o mesmo credor.
- Sem alteração de valores/pagamentos anteriores nem duplicação de parcelas ou faturas.
- Testes automáticos, compilação e TypeScript aprovados; testes de navegador e banco são obrigatórios e **não** são substituídos por CI.
- Nenhuma nova hospedagem, publicação ou alteração visual.

**Nota:** aplicar migração do banco é uma operação distinta do merge no GitHub. Não declarar sucesso até a aplicação e a verificação no banco vinculado ao Axion.

## Resultado da execução direta em 2026-11-09

A conexão do Lovable autorizada no ChatGPT permitiu executar a migração SQL diretamente no banco do projeto `65a672c4-5b72-40df-9a2f-ac50a2c55ca0`.
O banco confirmou a criação de `public.finance_account_profiles`, `public.finance_card_closed_invoices` e da função `public.apply_closed_card_invoice`.
A consulta posterior confirmou RLS ativo e políticas por titular nas duas tabelas. Contagens antes e depois: 21 despesas anuais, 231 competências, 58 contas, 4 contratos, 155 parcelas; as duas tabelas novas estavam vazias. As migrações 0005/0006 permaneceram intactas.

**Pendência de segurança:** o catálogo PostgreSQL mostrou privilégios extras de `TRUNCATE`, `REFERENCES` e `TRIGGER` para o papel `authenticated` nas duas tabelas novas, apesar de a migração originalmente solicitar somente SELECT/INSERT/UPDATE/DELETE. O SQL de revogação já está incluído ao final do script 0009 atualizado no PR.

A execução da revogação direta foi **recusada pela limitação temporária de operações de banco do Lovable** (a chamada não executou). Repetir apenas esta instrução assim que o acesso retornar:

```sql
REVOKE TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.finance_account_profiles, public.finance_card_closed_invoices
FROM authenticated;
```

Confirmar depois usando `has_table_privilege('authenticated', 'public.finance_account_profiles', 'TRUNCATE')` e equivalente para invoices (ambas devem ser `false`). Conferir que SELECT/INSERT/UPDATE/DELETE continuam autorizados. A RPC deve permitir EXECUTE a authenticated, negar anon e usar SECURITY INVOKER.

**Histórico Drizzle:** a consulta após criar as tabelas ainda registrava somente **7 migrações**. O SQL executado diretamente não se registra automaticamente no histórico. Não declarar a etapa de migração Drizzle concluída sem conciliar a entrada correspondente. O PR #26 permanece aberto, sem publicar.

**Validação pendente:** operações reais com sessão autenticada, persistência de vínculo após recarregar e reconciliação de fatura fechada ainda não foram verificadas; não usar os dados financeiros reais para fazer um teste destrutivo.

