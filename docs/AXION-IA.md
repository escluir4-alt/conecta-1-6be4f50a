# Axion IA no Conecta

O balão do titular abre a rota única `/assistente`. Substitui o componente de demonstração; não há rota paralela de IA. O chat não grava pagamentos, agenda, bancos ou documentos do cofre.

## Preparar e ativar

1. Em um projeto Supabase de teste, execute `drizzle/migrations/0005_axion_ia.sql` pelo editor SQL administrativo. Este arquivo é um passo explícito, não entra automaticamente no journal Drizzle. Cria apenas objetos Axion; não modifica dados existentes.
2. No mesmo projeto, copie o UUID do titular em Authentication → Users. Execute como administrador, substituindo o UUID de exemplo:

   ```sql
   insert into public.axion_owner (singleton, user_id)
   values (true, '00000000-0000-0000-0000-000000000000');
   ```

   Há um único titular. Para corrigir uma configuração equivocada, atualize a linha somente após conferir a conta. Nunca derive autorização de e-mail ou metadado alterável pelo cliente. Não use a chave service role no navegador.
3. Configure **segredos do servidor** (sem prefixo VITE e sem commitar valores):
   - `AXION_OPENAI_API_KEY`: credencial da API do provedor.
   - `AXION_OPENAI_MODEL`: modelo habilitado na conta e compatível com Responses e visão para anexos. Valide o suporte a busca antes de habilitar o recurso.
   - `AXION_MAX_REQUEST_CENTS`: limite superior conservador em centavos de cada chamada, incluindo entrada, saída, imagem, busca (quando ativa), câmbio e taxas. O código não estima preços; sem este valor o envio permanece desabilitado. Se não puder estabelecer um limite superior, mantenha o provedor desativado.
   - `AXION_WEB_SEARCH=1`: opcional. Use apenas após validar modelo e custos da ferramenta. Pesquisa não recebe automaticamente histórico, memória, imagem ou registros do Conecta.
4. Faça piloto com dados fictícios. Confira titular/convidado, saldo aberto comparado aos registros materializados, fuso, perda de sessão, edição/versão, consulta parcial, erros do provedor, reserva, exclusão e dispositivo móvel. Use um projeto/chave de provedor dedicados e reserve margem dentro do teto total do projeto para custos externos à Axion. Repita os passos no ambiente real somente após aprovação do piloto.

A reserva atômica do banco soma o limite superior de cada chamada no mês de São Paulo e impede superar 3000 centavos em **reservas**. Não é medidor de fatura, não inclui serviços fora da rota e não devolve valores automaticamente após falha ou timeout. Configure monitoramento do provedor e não compartilhe a chave com serviços não contabilizados. O padrão é sem chamadas até configurar.

## Entregue e limites

- Conversa geral, modo direto/detalhado, opção de análise aprofundada; sem bloqueio por assunto imposto pelo app. O provedor conserva seus próprios limites.
- Consulta opcional e somente leitura dos registros de despesas materializadas, receitas previstas e agenda. Nenhum saldo bancário é inferido. Não cria contas anuais nem mistura parcelas, faturas ou caixa. Se faltar sincronização dos módulos, as consultas refletem apenas os dados registrados.
- Histórico Supabase por titular, versões por edição, renomear, arquivar, exportar, excluir e proteção de revisão concorrente; busca por título entre as 100 conversas recentes. Preferências e memória explícita editável, desabilitada por padrão como contexto.
- Imagem enviada diretamente ao provedor só quando anexada (original não armazenado), ditado e leitura dependentes do navegador. Conversas e memória ficam no banco com RLS, não fazem parte do cofre cifrado. O modo privado permite envio ao provedor; não é execução local.
- Não incluídos: provedor local/híbrido, PDF/OCR específico, arquivo de áudio, streaming, rotinas e conectores externos. Não há execução de propostas, ações bancárias, monitoramento, WhatsApp ou importação automática de outros projetos.

## Reversão

Remova/desative os segredos de IA para parar chamadas. Reverta o commit da instalação para retirar o acesso pelo aplicativo; não reescreva o histórico Git. Exporte conversas antes de decidir sobre a retenção dos objetos Axion; a reversão do código não apaga dados.

## Configuração no aplicativo

Aplique também `drizzle/migrations/0006_axion_provider_vault.sql` em ambientes com Supabase Vault. Depois de vincular a primeira conta, abra **Axion IA → Configuração → Provedor OpenAI**. Informe a chave, o identificador do modelo e o limite superior por chamada. Para trocar a chave, informe outra; para alterar só modelo e custo, deixe a chave em branco. O valor nunca é devolvido à interface. A instalação usa a credencial de serviço existente apenas no servidor e RPCs restritas para acessar o segredo. As variáveis de ambiente acima são uma alternativa administrativa global; evite usá-las se quiser separar as credenciais na troca de titular.

Em **Alterar titular**, indique outra conta confirmada. Em até 15 minutos, o destinatário entra no Conecta e abre `/assistente` para aceitar. Não há envio de e-mail. A aceitação revoga o acesso anterior à Axion, remove a chave cadastrada no app e não migra histórico ou memória. O novo titular cadastra sua própria chave. A reserva mensal continua compartilhada pela instalação. Para alterar apenas o e-mail da mesma conta, use a configuração da conta: a Axion identifica pelo UUID, não pelo e-mail.
