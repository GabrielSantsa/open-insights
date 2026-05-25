# União Contadores — Plano de Implementação

Intranet operacional para ~30 usuários, com RBAC por perfil + setor, módulos integrados e backend nativo via Lovable Cloud (Supabase).

## Stack
- TanStack Start (React 19 + TS + Vite) — já é o template do projeto
- Tailwind v4 + Shadcn/UI + Lucide
- TanStack Query (cache/estado de servidor)
- Lovable Cloud: Auth, Postgres + RLS, Storage, Realtime
- Formulários: react-hook-form + zod

> Observação técnica: o template usa **TanStack Router** (file-based em `src/routes/`), não React Router. O roteamento será feito nessa convenção, mantendo a mesma experiência.

## Fase 0 — Fundação
1. Ativar Lovable Cloud (Supabase gerenciado).
2. Design system: paleta sóbria corporativa (azul-petróleo + cinza + accent âmbar), tipografia Inter/IBM Plex, tokens em `src/styles.css`, sem excesso de animação.
3. Layout base: `Sidebar` recolhível + `Topbar` (busca, notificações, perfil) + área principal com `<Outlet />`.

## Fase 1 — Auth + RBAC + Setores
- Supabase Auth (email/senha + recuperação de senha + `/reset-password`).
- Enum `app_role`: `admin`, `diretoria`, `gerente`, `coordenador`, `colaborador`.
- Tabelas: `profiles`, `sectors`, `user_roles`, `user_sectors`.
- Função `has_role(uuid, app_role)` SECURITY DEFINER.
- Função `can_view_sector(uuid, uuid)` (diretoria/admin = global).
- Layout `_authenticated` com `beforeLoad` para gate.
- Hook `useAuth` + contexto de permissões.

## Fase 2 — Banco completo + RLS + Storage
Tabelas:
`profiles`, `roles` (enum), `user_roles`, `sectors`, `user_sectors`,
`tasks`, `task_comments`,
`procedures`, `procedure_steps`, `procedure_user_progress`, `procedure_favorites`,
`documents`, `document_access_log`,
`apps`, `app_favorites`, `app_access_log`,
`companies`,
`calendar_events`,
`news_posts`,
`notifications`,
`audit_log`.

Buckets privados: `documents`, `procedures`, `news`.
RLS em todas as tabelas, baseada em `has_role` + `can_view_sector`.
Trigger `handle_new_user` cria `profiles` + role padrão `colaborador`.
Função `log_audit(action, resource, metadata)` para registro centralizado.

## Fase 3 — Dashboard
Cards: Minhas Pendências, Comunicados Recentes, Procedimentos Favoritos, Apps Mais Utilizados, Próximos Eventos, Meu Perfil.

## Fase 4 — Módulos funcionais
1. **Demandas** — CRUD, filtros por status/prioridade/setor, regras por perfil, comentários.
2. **Procedimentos** — base de conhecimento + etapas + checklist **individual** por usuário (`procedure_user_progress`), favoritos, anexos PDF via Storage.
3. **Documentos** — upload/listagem/download por categoria e setor, flag “sensível”, auditoria de visualização/download.
4. **Apps & Ferramentas** — catálogo CRUD (admin), abrir externo ou iframe, favoritar, log de acesso.
5. **Empresas** — cadastro simples (Razão Social, Fantasia, Responsável, Setor, Status, Observações).
6. **Calendário** — eventos no banco, visões mensal/semanal/agenda, notificações 24h/1h/no momento via job (Realtime + tabela `notifications`).
7. **Notícias** — workflow Rascunho → Aguardando Aprovação → Publicado, categorias, aprovação por Diretoria/Gerente/Coordenador autorizado.

## Fase 5 — Administração + Auditoria + Notificações
- Painel admin: usuários (criar, editar, desativar, vincular setores, definir perfil), setores, apps.
- `audit_log` populado pelas server functions + triggers nos pontos sensíveis.
- Notificações em tempo real (Supabase Realtime) com contador na topbar.

## Fase 6 — Seed inicial
- 6 setores, 8 apps, 5 procedimentos, 10 notícias de exemplo (via migration `INSERT`).

## Fase 7 — Entregáveis finais
- `README.md` com: visão geral, stack, variáveis de ambiente, deploy (Cloudflare Workers / self-host), seed, contas de teste.
- Revisão final de RLS, permissões e fluxos.

## Estrutura de pastas
```text
src/
  routes/
    __root.tsx
    index.tsx                       (redireciona p/ /dashboard ou /login)
    login.tsx
    reset-password.tsx
    _authenticated.tsx              (gate)
    _authenticated/
      dashboard.tsx
      demandas.tsx, demandas.$id.tsx
      procedimentos.tsx, procedimentos.$id.tsx
      documentos.tsx
      apps.tsx
      empresas.tsx
      calendario.tsx
      noticias.tsx, noticias.$id.tsx
      admin/usuarios.tsx
      admin/setores.tsx
      admin/apps.tsx
      admin/auditoria.tsx
  components/
    layout/ (AppSidebar, Topbar, NotificationsMenu, ProfileMenu, GlobalSearch)
    dashboard/ (PendingCard, NewsCard, FavoriteProceduresCard, AppsCard, EventsCard, ProfileCard)
    demandas/ procedimentos/ documentos/ apps/ empresas/ calendario/ noticias/ admin/
    ui/ (shadcn)
  lib/
    permissions.ts
    *.functions.ts (server functions)
  integrations/supabase/ (gerado)
  hooks/ (useAuth, usePermissions, useNotifications)
```

## Notas importantes
- **Escopo enorme**: vou entregar em fases nesta ordem (0 → 1 → 2 → 3 → 4 → 5 → 6 → 7), commitando a cada fase. Você poderá testar incrementalmente.
- Esta primeira iteração entregará **Fases 0–3 + Demandas e Procedimentos (núcleo da Fase 4)**. As demais virão em sequência para evitar um único push gigante e difícil de revisar.
- Sem dark mode (não foi pedido). Idioma da UI: PT-BR.
- Sem integração com Google Calendar (conforme pedido).
- Iframe de apps respeitará `X-Frame-Options` do alvo — quando bloqueado, abre em nova aba.

Confirma o plano (e a estratégia de entrega em fases)?