# Notas fiscais Axion — implantação do lote visual
Repositório de destino: escluir4-alt/conecta-1-6be4f50a (não confundir com o antigo controle-financeiro-c0221599).
Referência visual: quatro capturas fornecidas pelo titular; reproduzir disposição, não substituir os tokens do tema Axion em src/styles.css.

## Alterações desta branch
- /notas-fiscais: captura/importação, indicadores, filtros, tabela e visualização de PDF/arquivo original.
- /arquivo-fiscal: histórico por ano/mês e busca.
- /mercado-fiscal: notas de mercado, gráficos, subtotal por supermercado e produtos informados.
- Supabase: fiscal_documents, fiscal_document_items e bucket fiscal-private com RLS.
- Não altera /notas, /compras, receitas, despesas ou histórico financeiro.

## Antes do uso
1. Inspecionar o banco real e executar a migration 20261107160000_axion_fiscal_documents.sql no Supabase/Lovable Cloud correto. **Esta branch não executa a migração automaticamente.**
2. Regenerar a árvore de rotas com `bun run build` ou `npm run build`; não editar routeTree.gen.ts manualmente.
3. Executar `bun run test`, `bun run lint`, `bun run build` e validar RLS com duas contas.
4. Confirmar responsividade (mobile e desktop) e o PDF de notas reais sem compartilhar informações sensíveis.
5. Só então mesclar/implantar.

## Restrições documentadas
- QR Code e código de barras exibem orientação; leitura automática/OCR e validação SEFAZ não estão implementados.
- Produtos são informados manualmente após conferência. Não prometer extração automática.
- Valores de telas demonstrativas das referências não foram inseridos como dados reais.
- PDFs são conversões visuais das fotografias, não DANFE fiscal gerado nem documento autenticado.
- URLs assinadas vencem após 120s. É necessário autenticar novamente/selecionar a nota para gerar outra.
- O cadastro antigo baseado em localStorage não é removido, migrado nem apagado; dados anteriores requerem migração supervisionada.
- Exclusão do registro seguida da limpeza do Storage pode deixar arquivo órfão se a limpeza falhar; registrar e reconciliar pendências.
- A migração necessita auditoria contra políticas já existentes antes de uso em produção.

## Critérios de aceite
- Originais preservados, PDF disponível, filtros e totais derivados do banco.
- Notas do mercado isoladas; sem lançar despesas automaticamente.
- Importação inválida e hash duplicado rejeitados.
- Nenhuma alegação de reconhecimento automático sem teste.
- O botão de edição, OCR e scanners devem ser desenvolvidos e validados antes de declarar paridade funcional integral com os exemplos.
