-- Create internal_messages table
CREATE TABLE public.internal_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Policies for internal_messages
CREATE POLICY "Users can view all internal messages"
ON public.internal_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own messages"
ON public.internal_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Add delete policy for companies
-- Check if the user has the required roles
CREATE POLICY "Approvers can delete companies"
ON public.companies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'diretoria', 'gerente', 'coordenador')
  )
);
