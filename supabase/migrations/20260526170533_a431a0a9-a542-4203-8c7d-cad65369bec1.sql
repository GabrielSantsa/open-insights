-- RLS Policies for employee_activity
CREATE POLICY "Users can view their own activity"
ON public.employee_activity FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "Admins can view all activity"
ON public.employee_activity FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'diretoria')
    )
);

-- RLS Policies for trainings
CREATE POLICY "Authenticated users can view all trainings"
ON public.trainings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and HR can manage trainings"
ON public.trainings FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'diretoria')
    )
);

-- RLS Policies for deadlines
CREATE POLICY "Authenticated users can view all deadlines"
ON public.deadlines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and HR can manage deadlines"
ON public.deadlines FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'diretoria')
    )
);

-- Secure search path for the update trigger function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
