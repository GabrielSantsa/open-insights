# União Contadores — Intranet

Intranet operacional interna da União Contadores, construída como aplicação web full-stack com backend gerenciado e RBAC completo por perfil e setor.

## Visão geral

Sistema para ~30 usuários que centraliza:

- **Demandas** — gestão de tarefas com prioridade, prazo, status e responsável.
- **Procedimentos** — base de conhecimento com checklists **individuais por usuário** e versionamento.
- **Documentos** — repositório corporativo com controle de acesso por setor e flag de sensibilidade.
- **Apps & Ferramentas** — catálogo dos sistemas usados pela equipe (Receita, eCAC, Questor etc.).
- **Empresas** — cadastro consolidado dos clientes.
- **Calendário** — prazos fiscais, reuniões, treinamentos e avisos.
- **Notícias** — mural com workflow de aprovação (rascunho → aguardando aprovação → publicado).
- **Administração** — gestão de usuários, perfis, setores e auditoria.

## Perfis de acesso (RBAC)

| Perfil       | Pode                                                                 |
| ------------ | -------------------------------------------------------------------- |
| Admin        | Tudo — usuários, setores, permissões, apps, configuração             |
| Diretoria    | Acesso global a todos os setores; criar/aprovar notícias e eventos   |
| Gerente      | Criar demandas, aprovar conteúdo do setor                            |
| Coordenador  | Criar demandas, gerenciar equipe do setor, aprovar conteúdos         |
| Colaborador  | Concluir demandas, usar apps, marcar checklist de procedimentos      |

Vínculo usuário ↔ setor é gerenciado pelo Admin e usado pelas políticas de acesso (RLS) do banco.

## Stack

- **Frontend**: React 19 + TypeScript + TanStack Start (Vite 7) + TanStack Router + TanStack Query
- **UI**: Tailwind CSS v4 + Shadcn/UI + Lucide Icons
- **Backend**: Lovable Cloud (PostgreSQL + Auth + Storage + Realtime)
- **Forms**: React Hook Form + Zod
- **Deploy alvo**: Cloudflare Workers (via `@cloudflare/vite-plugin`)

## Estrutura

```
src/
  routes/                       # File-based routing (TanStack Router)
    __root.tsx                  # Layout raiz + QueryClientProvider + AuthProvider
    index.tsx                   # Redireciona p/ /dashboard ou /login
    login.tsx, reset-password.tsx
    _authenticated.tsx          # Gate de autenticação + sidebar/topbar
    _authenticated/
      dashboard.tsx, demandas.tsx,
      procedimentos.tsx, procedimentos.$id.tsx,
      documentos.tsx, apps.tsx, empresas.tsx,
      calendario.tsx, noticias.tsx, admin.tsx
  components/
    layout/                     # AppSidebar, Topbar
    ui/                         # Shadcn (button, card, table, ...)
  hooks/use-auth.tsx            # Contexto de autenticação + papéis
  lib/permissions.ts            # Enums, labels, helpers de RBAC
  integrations/supabase/        # Auto-gerado pelo Lovable Cloud
```

## Banco de dados

Tabelas principais (todas com RLS habilitado):

`sectors`, `profiles`, `user_roles`, `user_sectors`, `tasks`, `task_comments`, `procedures`, `procedure_steps`, `procedure_user_progress` (checklist individual), `procedure_favorites`, `documents`, `document_access_log`, `apps`, `app_favorites`, `app_access_log`, `companies`, `calendar_events`, `news_posts`, `notifications`, `audit_log`.

Funções `SECURITY DEFINER` chave:

- `has_role(uuid, app_role)` — verifica papel.
- `is_admin(uuid)` — atalho para admin.
- `has_sector_access(uuid, uuid)` — admin/diretoria = global; demais = `user_sectors`.
- `can_approve(uuid)` — admin/diretoria/gerente/coordenador.
- `handle_new_user()` — trigger que cria `profile` + papel `colaborador` no signup.

Buckets de storage: `documents`, `procedures`, `news` (todos privados).

Realtime habilitado em: `notifications`, `tasks`, `calendar_events`.

## Variáveis de ambiente

Geradas automaticamente pelo Lovable Cloud em `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
# Server-side (process.env)
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # apenas em self-host
```

## Desenvolvimento

```bash
bun install
bun run dev       # http://localhost:5173
bun run build
bun run preview
```

## Deploy

### Lovable (recomendado)

Botão "Publish" no editor — frontend e backend deployam juntos. Domínio customizado disponível em Configurações.

### Self-hosting

1. Crie um projeto Supabase próprio (ou use o existente).
2. Rode as migrations do diretório `supabase/migrations/`:
   ```bash
   supabase db push
   ```
3. Configure as variáveis de ambiente em produção.
4. Build e deploy:
   - **Cloudflare Workers**: `wrangler deploy` (config em `wrangler.jsonc`).
   - **Node**: `bun run build` + servir `.output/`.
5. Configure URL de redirect do Auth em `Authentication → URL Configuration` no Supabase apontando para seu domínio de produção.

Documentação completa de self-hosting Lovable: <https://docs.lovable.dev/tips-tricks/self-hosting>

## Primeiro acesso

1. Cadastre-se em `/login` (aba "Cadastrar"). O primeiro usuário recebe automaticamente o papel `colaborador`.
2. Para promover o primeiro **Admin**, rode no SQL Editor:
   ```sql
   UPDATE public.user_roles SET role = 'admin'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'seu@email.com');
   ```
3. Acesse `/admin` para gerenciar os demais usuários, setores e permissões.

## Seed inicial

A migration inicial já popula:

- 6 setores (Fiscal, Contábil, DP, Financeiro, Comercial, Diretoria)
- 8 aplicativos (Receita Federal, eCAC, eSocial, Questor, etc.)
- 5 procedimentos com etapas (Abertura de Empresa, Admissão, Fechamento Fiscal, DCTFWeb, Baixa de Empresa)
- 10 notícias de exemplo

## Roadmap (próximas iterações)

- Upload de documentos via UI com auditoria automática
- Editor visual de procedimentos (CRUD de etapas)
- CRUD completo de notícias com workflow de aprovação
- Calendário em visão mensal/semanal interativa
- CRUD de empresas
- Busca global na topbar
- Vínculo usuário ↔ setor no painel admin
- Notificações automáticas (prazos próximos, eventos, novas notícias)

---

Construído com [Lovable](https://lovable.dev).
