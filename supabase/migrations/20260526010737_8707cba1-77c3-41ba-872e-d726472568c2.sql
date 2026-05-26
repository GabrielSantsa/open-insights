-- Ensure foreign keys to tasks
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_creator_id_fkey;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_assignee_id_fkey
FOREIGN KEY (assignee_id) REFERENCES public.profiles(id);

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES public.profiles(id);

-- Update internal_messages to point to profiles
ALTER TABLE public.internal_messages DROP CONSTRAINT IF EXISTS internal_messages_sender_id_fkey;

ALTER TABLE public.internal_messages
ADD CONSTRAINT internal_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.profiles(id);
