# Reconstrução completa do fluxo de Atividades

## Objetivo
Substituir integralmente as telas atuais de listagem e detalhe por uma implementação nova, mantendo a conexão com os dados, permissões e armazenamento já existentes.

## Implementação
1. **Recriar a listagem de Atividades**
   - Remover o arquivo atual e criar uma nova tela em `/atividades`.
   - Exibir título, subtítulo e abas com contadores para Pendente, Em andamento, Pausada e Concluída.
   - Criar novos cartões clicáveis com status, tipo, data, título, descrição, área e localização.
   - Manter atualização automática quando as atividades mudarem.

2. **Recriar o detalhe da Atividade**
   - Remover o arquivo atual e criar uma nova tela em `/atividades/:activityId`.
   - Exibir cabeçalho completo, status, data programada e localização.
   - Implementar os blocos de atualização de status, escopo delegado, registro de execução e evidências fotográficas.
   - Manter os campos específicos de cada tipo de atividade, upload por câmera/galeria, legenda, exclusão antes da conclusão e relatório após conclusão.
   - Adicionar barra inferior com Salvar e Concluir atividade.

3. **Confiabilidade e acabamento**
   - Tratar carregamento, atividade indisponível e erros de leitura/salvamento.
   - Preservar as regras atuais de acesso do Gestor e do Analista responsável, sem alterações no banco.
   - Validar as telas em computador e celular, incluindo abertura do cartão, mudança de status e salvamento.

## Arquivos substituídos
- `src/routes/_authenticated/atividades/index.tsx`
- `src/routes/_authenticated/atividades/$activityId.tsx`

## Fora do escopo
- Nenhuma migração ou alteração no banco de dados.
- Nenhuma mudança nas demais páginas.
- O Lovable registra as alterações no repositório sincronizado; não será executado push manual.
