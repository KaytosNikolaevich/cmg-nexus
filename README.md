# Meridian Monitor

Aja como um desenvolvedor Full-Stack Sênior. Sua missão é criar do zero, de forma funcional e integrada, a plataforma web CMG (Central de Monitoramento & Gestão de Facilities), baseada nas especificações do documento CMG_Requisitos_v1.pdf. O sistema deve substituir o uso de planilhas e papéis na Torre Meridian, unificando a execução de campo e a gestão em tempo real.  DIRETRIZES TÉCNICAS E DE SEGURANÇA BÁSICAS:Stack: React, TailwindCSS, e Supabase (para banco de dados persistente, armazenamento de fotos e autenticação).  Sem dados falsos: O banco de dados deve ser gerado completamente vazio. Não crie tarefas, fotos ou históricos de exemplo.Segurança (RLS): Configure o Row Level Security. Um Analista só pode visualizar e interagir com as atividades delegadas a ele. O Gestor tem visão global.  Usuário Master (Seed inicial): Crie automaticamente no banco de dados um usuário de Gestão para que eu possa fazer o primeiro acesso:ID da empresa: admin01  Senha: Master@Cmg2026! (Respeitando a regra de mínimo 10 caracteres, maiúsculas, minúsculas, números e especiais).  Perfil: Gestão.  Responsividade: O layout deve funcionar perfeitamente em celulares, tablets e computadores.  1. AUTENTICAÇÃO E USUÁRIOS:  Login utilizando "ID da empresa" e "senha". Sessão deve ser persistente.  Tela de cadastro simplificado para Analistas contendo: nome, data de nascimento, ID da empresa e senha (sem necessidade de aprovação).  Validação estrita de senha no cadastro: mínimo de 10 caracteres contendo letras maiúsculas, minúsculas, números e caracteres especiais.  Fluxo funcional de recuperação de senha e botão de logout.  2. PERFIL DO ANALISTA E EXECUÇÃO EM CAMPO:  Tela "Atividades Delegadas": Lista dividida em abas ou seções para atividades "em andamento" e "concluídas".  Três tipos de formulários de execução:  Ronda de Pavimentos: Campos para registrar temperatura, condições dos Lados A e B e fotos.  Ajuste de VAG: Campos estruturados para "antes", "ação realizada" e "depois".  Manutenção Preventiva: Campos para introdução, situação-problema, ações realizadas, fotos e conclusão.  Upload de Fotos: Botão para anexar fotos (câmera ou galeria) com opção de adicionar legenda. Limite de 50 MB por arquivo, aceitando apenas JPEG e PNG.  O usuário deve poder excluir uma foto antes de concluir a atividade.  Relatórios: O sistema deve gerar um relatório técnico com padrão visual institucional (PDF) apenas após a atividade ser marcada como concluída.  3. PERFIL DO GESTOR E INTEGRAÇÃO DE DADOS:  Dashboard: Uma visão geral atualizada em tempo real alimentada pela execução em campo, sem necessidade de digitação dupla. Deve conter um Gráfico de Rosquinha (Donut chart) mostrando o status das atividades por analista.  Distribuição de Atividades: Interface onde o Gestor cria novas atividades (escolhendo as áreas: Climatização, Elétrica, Manutenção predial ou Operação de sistemas) e as atribui a Analistas específicos.  Exportação: Funcionalidade para exportar as informações das atividades do painel para PDF e Word, incluindo um filtro por dia.  Gere toda a estrutura de tabelas no Supabase necessária para suportar isso e construa o front-end completo, conectando as pontas para que o sistema seja entregue pronto para uso imediato.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b6356399-d755-4bc2-a383-132cc6b6dbfd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
