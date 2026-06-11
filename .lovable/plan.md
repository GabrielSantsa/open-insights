# Plano

## 1. Restringir a página `/demandas` a administradores e gestores

A rota `/demandas` hoje é acessível a qualquer usuário autenticado. Vamos torná-la exclusiva para `admin` e `gerente` (mesma regra já usada por `isAdmin()` em `src/lib/permissions.ts`).

- Em `src/routes/_authenticated/demandas.tsx`:
  - Ler `roles` do `useAuth()` e usar `isAdmin(roles)`.
  - Se não for admin/gestor, exibir um bloco "Acesso restrito" com botão para voltar ao Dashboard (em vez de mostrar a página).
- Em `src/components/layout/AppSidebar.tsx`:
  - O item "Demandas" passa a aparecer somente quando `isAdmin(roles) === true` (mover para um grupo condicional como já é feito para Administração).

Observação: usamos guard no componente (e não em `beforeLoad`) para manter consistência com o padrão atual do projeto e evitar problemas com o gate do `_authenticated`.

## 2. Configurar a aba "Demandas" dentro do colaborador

A aba já existe (`EmployeeTasksTab`) e busca tarefas por `assignee_id = employee.user_id`. Vamos enriquecê-la para refletir a página principal de demandas, no escopo do colaborador.

Melhorias em `src/components/employees/EmployeeTasksTab.tsx`:

- **Aviso quando o colaborador não tem `user_id` vinculado**: hoje 4 de 7 colaboradores não têm conta de usuário associada — a aba simplesmente fica vazia. Mostrar uma mensagem clara: "Este colaborador ainda não possui conta de usuário vinculada. Vincule um usuário para registrar demandas."
- **KPIs existentes** (Em andamento, Pendentes, Concluídas, Atrasadas) — manter.
- **Tabela completa de demandas** (substitui a lista resumida atual) com colunas: Título, Prioridade, Prazo, Status, Criador, Ações.
  - Badge de status com as cores já usadas em `/demandas`.
  - Badge de prioridade com `TASK_PRIORITY_LABELS`.
  - Botão "Concluir" (visível quando status ≠ `concluida`) — disponível para admin/gestor/coordenador/diretoria (`isApprover`).
  - Botão "Apagar" com AlertDialog — somente admin/gestor (`isAdmin`).
- **Botão "Nova demanda para este colaborador"** no topo da aba (somente para `isApprover`):
  - Abre um Dialog com os campos: Título, Descrição, Setor, Prioridade, Prazo.
  - O responsável já vem fixado como o `user_id` do colaborador (não editável).
  - Cria a tarefa via `supabase.from('tasks').insert({...})` com `creator_id = auth user`, `assignee_id = employee.user_id`.
  - Ao salvar, invalida `["employee-tasks", userId]`.
- **Filtro de status** dentro da aba (Todos / Nova / Em andamento / Aguardando / Concluída / Cancelada).
- **Link "Ver Todas"** continua apontando para `/demandas` — mas só renderiza se o usuário tiver acesso à página (admin/gestor).

## 3. Detalhes técnicos

- Sem novas tabelas, sem migrações.
- Sem mudanças em RLS — as policies atuais de `tasks` permitem que approvers criem/editem; usuários comuns veem suas próprias.
- Reuso de helpers `isAdmin`, `isApprover`, `TASK_STATUS_LABELS`, `TASK_PRIORITY_LABELS` de `src/lib/permissions.ts`.
- Sem alteração no roteamento (a rota continua existindo; o gate é em componente + sidebar).

## Arquivos alterados

- `src/routes/_authenticated/demandas.tsx` — guard de acesso.
- `src/components/layout/AppSidebar.tsx` — esconder item "Demandas" para não-admins.
- `src/components/employees/EmployeeTasksTab.tsx` — aba enriquecida (tabela, criação, conclusão, exclusão, filtro, aviso de user_id).
