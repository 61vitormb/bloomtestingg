/**
 * Funções de servidor da conta (executadas apenas no backend).
 *
 * deleteMyAccount: exclusão efetiva e definitiva (LGPD art. 18, VI).
 * 1. Apaga os registros com o cliente autenticado da própria usuária (RLS garante o isolamento).
 * 2. Remove o usuário do Auth com a chave de serviço — que nunca chega ao navegador.
 * O id excluído vem exclusivamente do token validado pelo middleware, nunca do corpo da requisição.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const USER_TABLES = ["daily_logs", "mood_logs", "cycles", "user_preferences"] as const;

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    for (const table of USER_TABLES) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) throw new Error(`Não foi possível apagar ${table}: ${error.message}`);
    }
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
    if (profileError) throw new Error(`Não foi possível apagar o perfil: ${profileError.message}`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw new Error(`Não foi possível remover a conta: ${authError.message}`);

    return { deleted: true as const };
  });
