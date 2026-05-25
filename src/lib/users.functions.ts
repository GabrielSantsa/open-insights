import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(2).max(120),
  position: z.string().max(120).optional().nullable(),
  role: z.enum(["admin", "diretoria", "gerente", "coordenador", "colaborador"]),
  sectorIds: z.array(z.string().uuid()).max(20).optional().default([]),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is admin
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (rolesData ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw new Response("Forbidden: admin only", { status: 403 });
    }

    // Create the auth user (auto-confirmed)
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });
    if (createErr || !created.user) {
      throw new Response(createErr?.message ?? "Erro ao criar usuário", {
        status: 400,
      });
    }

    const newUserId = created.user.id;

    // Ensure profile exists (in case trigger isn't installed)
    await supabaseAdmin.from("profiles").upsert(
      {
        id: newUserId,
        full_name: data.fullName,
        email: data.email,
        position: data.position ?? null,
      },
      { onConflict: "id" },
    );

    // Replace role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });

    // Sectors
    if (data.sectorIds.length) {
      await supabaseAdmin
        .from("user_sectors")
        .insert(data.sectorIds.map((sid) => ({ user_id: newUserId, sector_id: sid })));
    }

    return { userId: newUserId };
  });
