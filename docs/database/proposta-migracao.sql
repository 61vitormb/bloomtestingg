-- =====================================================================
-- Bloom — proposta de migração (NÃO aplicada automaticamente)
-- =====================================================================
-- O schema do Bloom vive no Lovable Cloud e as migrações existentes não
-- estão versionadas neste repositório, por isso não puderam ser lidas
-- nem alteradas a partir daqui (ver docs/02-requisitos.md, LIM-01/LIM-02).
--
-- Este script documenta e reforça, de forma idempotente, as políticas de
-- acesso que o app pressupõe. Para aplicar: peça ao Lovable para executar
-- esta migração ou rode no SQL Editor do projeto. Revise antes de aplicar.
-- =====================================================================

-- 1) Row Level Security em todas as tabelas com dados pessoais
alter table public.cycles            enable row level security;
alter table public.daily_logs        enable row level security;
alter table public.mood_logs         enable row level security;
alter table public.profiles          enable row level security;
alter table public.user_preferences  enable row level security;

-- 2) Políticas: cada usuária acessa apenas as próprias linhas
do $$
declare t text;
begin
  foreach t in array array['cycles','daily_logs','mood_logs','user_preferences'] loop
    execute format('drop policy if exists "bloom_owner_all" on public.%I', t);
    execute format(
      'create policy "bloom_owner_all" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

drop policy if exists "bloom_profile_owner" on public.profiles;
create policy "bloom_profile_owner" on public.profiles for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 3) Integridade usada pelo app (upserts por dia)
create unique index if not exists daily_logs_user_day_uidx on public.daily_logs (user_id, log_date);
create unique index if not exists mood_logs_user_day_uidx  on public.mood_logs  (user_id, log_date);
create unique index if not exists cycles_user_start_uidx   on public.cycles     (user_id, start_date);

-- 4) Validações no backend (defesa em profundidade, espelham src/domain/validation.ts)
alter table public.cycles drop constraint if exists cycles_end_after_start;
alter table public.cycles add constraint cycles_end_after_start
  check (end_date is null or end_date >= start_date);

alter table public.daily_logs drop constraint if exists daily_logs_flow_valid;
alter table public.daily_logs add constraint daily_logs_flow_valid
  check (flow_intensity is null or flow_intensity in ('none','light','moderate','heavy'));

alter table public.daily_logs drop constraint if exists daily_logs_notes_len;
alter table public.daily_logs add constraint daily_logs_notes_len
  check (notes is null or char_length(notes) <= 2000);

alter table public.mood_logs drop constraint if exists mood_logs_intensity_range;
alter table public.mood_logs add constraint mood_logs_intensity_range
  check (intensity is null or intensity between 1 and 5);

alter table public.user_preferences drop constraint if exists prefs_cycle_range;
alter table public.user_preferences add constraint prefs_cycle_range
  check ((average_cycle_length is null or average_cycle_length between 15 and 90)
     and (average_period_length is null or average_period_length between 1 and 15));

-- 5) (Opcional, futuro) colunas dedicadas para as métricas hoje codificadas em symptoms
--    ("m:energy:4" etc. — ver src/domain/metrics.ts). Manter o app compatível com ambos
--    os formatos durante a transição.
-- alter table public.daily_logs add column if not exists energy smallint check (energy between 1 and 5);
-- alter table public.daily_logs add column if not exists sleep_quality smallint check (sleep_quality between 1 and 5);
-- alter table public.daily_logs add column if not exists sleep_hours numeric(3,1) check (sleep_hours between 0 and 16);
-- alter table public.daily_logs add column if not exists cramps smallint check (cramps between 0 and 3);
-- alter table public.daily_logs add column if not exists pain smallint check (pain between 0 and 3);

-- 6) Verificação rápida (rodar depois de aplicar)
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public';
