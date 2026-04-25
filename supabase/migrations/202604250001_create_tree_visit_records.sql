create table if not exists public.tree_visit_records (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  project_id uuid references public.projects(id),
  tree_id text not null,
  tpm_status text,
  health text,
  damage text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists tree_visit_records_project_tree_idx
  on public.tree_visit_records (project_id, tree_id, created_at desc);

create index if not exists tree_visit_records_visit_id_idx
  on public.tree_visit_records (visit_id);
