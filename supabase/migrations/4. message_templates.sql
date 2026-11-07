-- Create message_templates table
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null,
  content text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.message_templates enable row level security;

-- Recreate policies safely
drop policy if exists "Users can view default or own templates" on public.message_templates;
create policy "Users can view default or own templates"
  on public.message_templates
  for select
  to authenticated
  using (is_default = true or user_id = auth.uid());

drop policy if exists "Users can insert their own templates" on public.message_templates;
create policy "Users can insert their own templates"
  on public.message_templates
  for insert
  to authenticated
  with check (user_id = auth.uid() and is_default = false);

drop policy if exists "Users can update their own templates" on public.message_templates;
create policy "Users can update their own templates"
  on public.message_templates
  for update
  to authenticated
  using (user_id = auth.uid() and is_default = false);

drop policy if exists "Users can delete their own templates" on public.message_templates;
create policy "Users can delete their own templates"
  on public.message_templates
  for delete
  to authenticated
  using (user_id = auth.uid() and is_default = false);

-- Trigger for updated_at
drop trigger if exists set_message_templates_updated_at on public.message_templates;
create trigger set_message_templates_updated_at
before update on public.message_templates
for each row execute function public.update_updated_at_column();

-- Seed default templates only if table is empty
insert into public.message_templates (user_id, title, content, is_default)
select * from (
  values
    (null::uuid, 'Atualização de Processo', 'Olá [nome_cliente], o status do seu processo nº [numero_processo] foi atualizado para: [status_processo].', true),
    (null::uuid, 'Lembrete de Audiência', 'Prezado(a) [nome_cliente], lembramos da sua audiência agendada para o dia [data_audiencia] às [hora_audiencia] referente ao processo nº [numero_processo].', true),
    (null::uuid, 'Cobrança de Honorários', 'Olá [nome_cliente], este é um lembrete sobre o pagamento dos honorários no valor de R$ [valor_honorarios], com vencimento em [data_vencimento].', true)
) as v(user_id, title, content, is_default)
where not exists (select 1 from public.message_templates);