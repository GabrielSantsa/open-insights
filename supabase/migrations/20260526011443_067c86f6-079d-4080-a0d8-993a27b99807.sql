
-- Grant full admin access on all tables via blanket admin policies

-- tasks
DROP POLICY IF EXISTS tasks_admin_all ON public.tasks;
CREATE POLICY tasks_admin_all ON public.tasks FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- task_comments
DROP POLICY IF EXISTS task_comments_admin_all ON public.task_comments;
CREATE POLICY task_comments_admin_all ON public.task_comments FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- companies
DROP POLICY IF EXISTS companies_admin_all ON public.companies;
CREATE POLICY companies_admin_all ON public.companies FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- documents
DROP POLICY IF EXISTS documents_admin_all ON public.documents;
CREATE POLICY documents_admin_all ON public.documents FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- procedures
DROP POLICY IF EXISTS procedures_admin_all ON public.procedures;
CREATE POLICY procedures_admin_all ON public.procedures FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- procedure_steps
DROP POLICY IF EXISTS procedure_steps_admin_all ON public.procedure_steps;
CREATE POLICY procedure_steps_admin_all ON public.procedure_steps FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- news_posts
DROP POLICY IF EXISTS news_admin_all ON public.news_posts;
CREATE POLICY news_admin_all ON public.news_posts FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- calendar_events
DROP POLICY IF EXISTS calendar_admin_all ON public.calendar_events;
CREATE POLICY calendar_admin_all ON public.calendar_events FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- internal_messages: allow admin to also delete/update
DROP POLICY IF EXISTS internal_messages_admin_all ON public.internal_messages;
CREATE POLICY internal_messages_admin_all ON public.internal_messages FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- notifications
DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- apps already has apps_admin_all (kept)
-- profiles already has profiles_admin_all (kept)
-- sectors already has sectors_admin_all (kept)
-- user_roles already has user_roles_admin_all (kept)
-- user_sectors already has user_sectors_admin_all (kept)
