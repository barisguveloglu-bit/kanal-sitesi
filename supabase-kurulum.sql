-- ===================================================================
-- KANLI GÖZ — Soru-Cevap veritabanı kurulumu
-- ===================================================================
-- Bu dosyanın tamamını Supabase panelindeki SQL Editor'e yapıştırıp
-- "Run" tuşuna bas. Bir kere çalıştırman yeterli.
--
-- Güvenliğin tamamı bu dosyadaki kurallara (RLS) dayanıyor.
-- Sitedeki JavaScript'e güvenilmiyor — bütün kontroller sunucuda.
-- ===================================================================


-- --- 1. TABLOLAR --------------------------------------------------

create table if not exists public.sorular (
  id            uuid primary key default gen_random_uuid(),
  kullanici_id  uuid not null references auth.users(id) on delete cascade,
  kullanici_ad  text not null,
  kategori      text not null default 'site'
                check (kategori in ('site', 'video', 'diger')),
  soru          text not null
                check (char_length(soru) between 10 and 500),
  cevap         text check (char_length(cevap) <= 2000),
  durum         text not null default 'bekliyor'
                check (durum in ('bekliyor', 'yayinda', 'reddedildi')),
  olusturma     timestamptz not null default now(),
  cevap_tarihi  timestamptz
);

create index if not exists sorular_durum_idx on public.sorular (durum, olusturma desc);
create index if not exists sorular_kullanici_idx on public.sorular (kullanici_id);

-- Yasaklı kullanıcılar
create table if not exists public.yasaklilar (
  kullanici_id  uuid primary key references auth.users(id) on delete cascade,
  kullanici_ad  text,
  sebep         text,
  tarih         timestamptz not null default now()
);

-- Yöneticiler (soruları onaylayıp ban atabilenler)
create table if not exists public.yoneticiler (
  kullanici_id  uuid primary key references auth.users(id) on delete cascade,
  eklenme       timestamptz not null default now()
);


-- --- 2. YARDIMCI FONKSİYONLAR -------------------------------------
-- security definer: bu fonksiyonlar RLS'i atlayarak okuyabilsin diye.
-- Yoksa kuralların içinden bu tablolara bakamayız (sonsuz döngü olur).

create or replace function public.yonetici_mi()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.yoneticiler where kullanici_id = auth.uid()
  );
$$;

create or replace function public.yasakli_mi()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.yasaklilar where kullanici_id = auth.uid()
  );
$$;

-- Spam koruması: son bir saatte kaç soru sormuş?
create or replace function public.son_saatteki_soru_sayisi()
returns integer
language sql security definer stable
set search_path = public
as $$
  select count(*)::integer
  from public.sorular
  where kullanici_id = auth.uid()
    and olusturma > now() - interval '1 hour';
$$;


-- --- 3. TABLO İZİNLERİ --------------------------------------------
-- Postgres'te iki ayrı katman var: GRANT (tabloya hiç dokunabilir mi?)
-- ve RLS (hangi satırları görebilir?). İkisi de gerekli.
--
-- Bunları açıkça yazıyoruz ki proje kurulurken "Yeni tabloları otomatik
-- olarak göster" seçeneği kapalı olsa bile site çalışsın.

grant usage on schema public to anon, authenticated;

-- Yayındaki soruları giriş yapmamış ziyaretçi de okuyabilmeli
grant select on public.sorular to anon, authenticated;

-- Soru sorma, cevaplama ve silme — hangi satıra dokunabildiğini RLS belirliyor
grant insert, update, delete on public.sorular to authenticated;

-- Ban listesi sadece giriş yapmışlara açık; yönetici olmayanı RLS eliyor
grant select, insert, delete on public.yasaklilar to authenticated;

-- public.yoneticiler tablosuna BİLEREK hiçbir izin verilmiyor.
-- O tabloya sadece SQL Editor'den erişilebilir.

grant execute on function public.yonetici_mi()            to anon, authenticated;
grant execute on function public.yasakli_mi()             to anon, authenticated;
grant execute on function public.son_saatteki_soru_sayisi() to authenticated;


-- --- 4. RLS'İ AÇ --------------------------------------------------

alter table public.sorular     enable row level security;
alter table public.yasaklilar  enable row level security;
alter table public.yoneticiler enable row level security;


-- --- 5. SORULAR KURALLARI -----------------------------------------

-- Herkes yayındaki soruları okuyabilir (giriş yapmasa bile)
drop policy if exists "yayindakileri herkes okur" on public.sorular;
create policy "yayindakileri herkes okur"
  on public.sorular for select
  using (durum = 'yayinda');

-- Kullanıcı kendi sorularını (beklemedekiler dahil) görebilir
drop policy if exists "kendi sorularini gorur" on public.sorular;
create policy "kendi sorularini gorur"
  on public.sorular for select
  using (auth.uid() = kullanici_id);

-- Yönetici hepsini görür
drop policy if exists "yonetici hepsini gorur" on public.sorular;
create policy "yonetici hepsini gorur"
  on public.sorular for select
  using (public.yonetici_mi());

-- Soru sorma: giriş yapmış + yasaklı değil + saatte en fazla 3 soru
-- + kendi adına + durumu kendisi belirleyemez
drop policy if exists "yasakli olmayan soru sorar" on public.sorular;
create policy "yasakli olmayan soru sorar"
  on public.sorular for insert
  to authenticated
  with check (
    auth.uid() = kullanici_id
    and not public.yasakli_mi()
    and public.son_saatteki_soru_sayisi() < 3
    and durum = 'bekliyor'
    and cevap is null
  );

-- Sadece yönetici cevaplayıp yayınlayabilir
drop policy if exists "yonetici gunceller" on public.sorular;
create policy "yonetici gunceller"
  on public.sorular for update
  using (public.yonetici_mi())
  with check (public.yonetici_mi());

drop policy if exists "yonetici siler" on public.sorular;
create policy "yonetici siler"
  on public.sorular for delete
  using (public.yonetici_mi());


-- --- 6. YASAKLILAR KURALLARI --------------------------------------
-- Yasaklı listesini kimse okuyamaz; sadece yönetici.
-- Kullanıcı kendi durumunu yasakli_mi() fonksiyonuyla öğreniyor.

drop policy if exists "yasakli listesini yonetici gorur" on public.yasaklilar;
create policy "yasakli listesini yonetici gorur"
  on public.yasaklilar for select
  using (public.yonetici_mi());

drop policy if exists "yonetici ban atar" on public.yasaklilar;
create policy "yonetici ban atar"
  on public.yasaklilar for insert
  to authenticated
  with check (public.yonetici_mi());

drop policy if exists "yonetici ban kaldirir" on public.yasaklilar;
create policy "yonetici ban kaldirir"
  on public.yasaklilar for delete
  using (public.yonetici_mi());


-- --- 7. YÖNETİCİLER KURALLARI -------------------------------------
-- Kimse bu tabloyu okuyamaz veya yazamaz.
-- Yönetici eklemek sadece buradan, SQL Editor'den yapılır.
-- (Hiç policy tanımlamıyoruz; RLS açık olduğu için her şey kapalı.)


-- ===================================================================
-- SON ADIM — KENDİNİ YÖNETİCİ YAP
-- ===================================================================
-- 1. Önce siteye gidip Google ile bir kez giriş yap.
-- 2. Sonra aşağıdaki satırın başındaki -- işaretlerini silip çalıştır:
--
-- insert into public.yoneticiler (kullanici_id)
-- select id from auth.users where email = 'buraya@kendi-mailin.com'
-- on conflict do nothing;
--
-- Kontrol için:
-- select * from public.yoneticiler;
-- ===================================================================
