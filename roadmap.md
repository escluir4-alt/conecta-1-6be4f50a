# Roadmap — Módulo Despesas Casa Clara

## Receitas / contas a receber
- [x] Corrigir confirmação na grade anual com histórico e quitação da parcela correspondente; receita e contrato verificados com sessão real.
- [x] Abrir cadastro preenchido para editar a fonte de renda, preservando recebimentos já confirmados; leitura após salvar verificada.
- [x] Incluir contratos na grade anual por vencimento, compactar cabeçalhos de ações e salvar recebedor Pix com nome completo e cidade por estado; grade real, persistência e opções de municípios verificadas. Consulta de titular por chave Pix não disponível sem serviço bancário autorizado.
- [x] Ampliar cadastro de contratos e cálculo do saldo/parcelas com entrada e remanescente; saldo de R$ 800 após entrada de R$ 200 verificado.
- [x] Listagem e página individual com cadastro, andamento, status e parcelas coloridas; cadastro, edição, status persistente e linhas vermelha/verde/laranja verificados.
- [x] Atualizar parcelas com índice publicado SGS e gerar fatura PDF com Pix; cadastro, pagamento, histórico e download verificados com sessão real; PDF de 1 e 3 páginas inspecionado sem cortes, teste temporário removido. Pix estático não confirma pagamentos automaticamente; índices personalizados exigem taxa informada.
- [x] Reorganizar Receitas como cadastro, Contas a receber como grade anual, Histórico com tabela e filtros de pagamentos e Contratos parcelados com abas e parcelas; cadastro → recebimento → histórico verificado com sessão real, registro temporário removido. Arquivamento e comentários não foram adicionados às receitas (alterações limitadas à apresentação).
- [x] Agenda: sem métricas, feriados de Brasília/DF vermelhos, registros por dia em janela e ordem presente/futuro/passado; verificada com registros reais.
- [x] Agenda: corrigir feriados e duplicação financeira; cadastrar aniversários, plantões 12x36, compromissos, eventos e listas com conclusão e regras de lembrete visíveis na agenda (sem envio de notificações externas); seis cadastros e persistência de checklist verificados com sessão real.
- [x] Persistência por usuário, recebimentos atômicos e histórico imutável com correções auditadas.
- [x] Página mensal com categorias, filtros, KPIs, recorrência e comprovantes.
- [x] Contratos de crediário, parcelas, encargos e documentos de atualização (índice com taxa informada).
- [x] Histórico exclusivo com filtros e relatórios; previsão mensal e lembretes de 7, 3 e 1 dia na página.
- [x] Testes dos cálculos, datas, lembretes e navegação.
- [x] Verificação do recebimento com sessão real — cadastro de receita, recebimento na grade anual e leitura no histórico verificados.
- [x] Módulo Agenda (calendário mensal de receitas e despesas); lembretes removidos de Receitas (serão feitos pela IA).

## Correção do menu
- [x] Corrigir abertura das despesas anuais e parceladas e tornar o menu acessível no celular.
- [x] Verificar todos os links com sessão real e executar testes de navegação.

## Remix do projeto (novo)
- [ ] Novo remix: atualizar ambas as credenciais Pluggy (formulário seguro recusado novamente em 01/11/2026; reenviar somente quando o usuário confirmar).
- [x] Novo remix: migrações copiadas limpas; conjunto de migrações rescaffolded vazio (journal vazio, schema.ts placeholder).
- [ ] Atualizar segredo PLUGGY_CLIENT_ID (aguardando confirmação do usuário para reenviar o formulário seguro)
- [ ] Atualizar segredo PLUGGY_CLIENT_SECRET (aguardando confirmação do usuário para reenviar o formulário seguro)
- [x] Reaplicar estrutura do banco no novo projeto (migração baseline 0000 aplicada; 12 tabelas, RLS, 5 funções, grants)
- [x] Bucket privado de comprovantes já existe no novo projeto (comprovantes, privado, ~1,28 MB)


- [ ] Banco: tabelas financeiras (anos, despesas anuais, contas do mês, contratos, parcelas, comprovantes, propostas, comentários, auditoria) + RLS + funções de pagamento
- [ ] Dados reais: importação idempotente das seções A–D (13 credores, 28 contas, 4 contratos, 155 parcelas)
- [ ] Storage privado de comprovantes (PDF/JPEG/PNG/WEBP, máx. 1.250.000 bytes)
- [ ] /despesas — Registro de Pagamento (KPIs, tabela mensal, pagar, conta avulsa, CSV)
- [ ] /despesas/anuais — grade anual editável, arquivar exercício
- [ ] /despesas/parceladas — contratos com abas, KPIs, parcelas, comentários
- [ ] /historico-pagamentos — histórico agrupado por mês de vencimento, copiar/imprimir
- [ ] /auditoria — logs somente leitura
- [x] Navegação: menu lateral compartilhado (AppShell) ligando Painel e módulo Despesas
- [ ] Testes: moeda em centavos, datas, KPIs, sincronização mensal
- [x] Verificação da navegação no navegador com sessão real

## Menu e telas (novo pedido)
- [x] Menu lateral: Receitas, Despesas (mês/anuais/parceladas), Carteira (ex-Contas e Cartões), Cotações
- [ ] Corrigir erros de compilação em src/lib/finance/finance.functions.ts
- [ ] Renomear tela Contas e Cartões para Carteira
- [x] Bolsa estilo Nubank: 3 colunas (destaques/altas/quedas), busca com sugestões, detalhe com gráfico, tempo real; moedas em página própria
