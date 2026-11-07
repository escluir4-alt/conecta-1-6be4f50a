-- Axion: arquivo fiscal privado. Aplicar somente após conferência do projeto Supabase correto.
create table if not exists public.fiscal_documents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 issuer text not null check (length(trim(issuer)) > 0),
 issued_on date not null,
 document_number text,
 access_key text check (access_key is null or access_key ~ '^[0-9]{44}$'),
 total_cents bigint not null check(total_cents>=0),
 category text not null default 'outros' check(category in ('mercado','outros')),
 original_path text not null,
 pdf_path text not null,
 original_name text not null,
 file_sha256 text not null check(file_sha256 ~ '^[0-9a-f]{64}$'),
 verified boolean not null default false,
 created_at timestamptz not null default now()
);
create unique index if not exists fiscal_document_key_unique on public.fiscal_documents(user_id,access_key) where access_key is not null;
create unique index if not exists fiscal_document_hash_unique on public.fiscal_documents(user_id,file_sha256);
create index if not exists fiscal_documents_user_date on public.fiscal_documents(user_id,issued_on desc);
create table if not exists public.fiscal_document_items(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid not null references public.fiscal_documents(id) on delete cascade,
 description text not null check(length(trim(description))>0),
 quantity numeric(12,3) not null check(quantity>0),
 unit_price_cents bigint not null check(unit_price_cents>=0),
 total_cents bigint not null check(total_cents>=0)
);
create index if not exists fiscal_items_document on public.fiscal_document_items(document_id);
alter table public.fiscal_documents enable row level security;
alter table public.fiscal_document_items enable row level security;
drop policy if exists fiscal_docs_owner on public.fiscal_documents;
create policy fiscal_docs_owner on public.fiscal_documents for all to authenticated using (user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists fiscal_items_owner on public.fiscal_document_items;
create policy fiscal_items_owner on public.fiscal_document_items for all to authenticated
 using (user_id=auth.uid() and exists(select 1 from public.fiscal_documents d where d.id=document_id and d.user_id=auth.uid()))
 with check (user_id=auth.uid() and exists(select 1 from public.fiscal_documents d where d.id=document_id and d.user_id=auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('fiscal-private','fiscal-private',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
drop policy if exists fiscal_storage_owner_select on storage.objects;
create policy fiscal_storage_owner_select on storage.objects for select to authenticated
 using (bucket_id='fiscal-private' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists fiscal_storage_owner_insert on storage.objects;
create policy fiscal_storage_owner_insert on storage.objects for insert to authenticated
 with check (bucket_id='fiscal-private' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists fiscal_storage_owner_delete on storage.objects;
create policy fiscal_storage_owner_delete on storage.objects for delete to authenticated
 using (bucket_id='fiscal-private' and (storage.foldername(name))[1]=auth.uid()::text);
-- Nenhum lançamento é inserido em despesas ou receitas por esta migração.
