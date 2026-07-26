# Proje Notları

Bu depo bir **hikaye lore sitesi**. Türkçe bir kurgu evreninin arşivi.

## Önce bunu oku

Hikayenin canon kaynağı [`LORE.md`](LORE.md). Herhangi bir içerik değişikliği
yapmadan önce o dosyayı oku — karakterler, güçler ve efsane orada tanımlı.

## Yapı

- Statik site: HTML + CSS + vanilla JS. **Derleme adımı, paket yöneticisi yok.**
- Tek istisna soru-cevap bölümü: Supabase kullanıyor, kütüphane CDN'den geliyor.
- Bütün içerik `assets/js/data.js` içinde veri olarak duruyor.
- `assets/js/app.js` bu veriyi HTML'e çeviriyor; menü ve alt bilgi de oradan geliyor.
- HTML sayfaları sadece iskelet + `data-*` bağlama noktaları içeriyor.

## Kurallar

- Yeni karakter/güç/kademe eklerken **HTML'e dokunma** — `data.js` yeterli.
- İçerik değişince `LORE.md` ile `data.js` senkron kalmalı.
- Arayüz metinleri **Türkçe**.
- Kod içindeki değişken ve fonksiyon isimleri de Türkçe (mevcut düzene uy).
- Lore sayfalarında kullanıcı verisi ve backend yok — orası tamamen statik.
- Soru-cevap bölümünde backend var (Supabase). Kuralları
  `supabase-kurulum.sql` içinde; **güvenlik tamamen orada**, JS'e güvenilmiyor.
- Supabase anahtarları `assets/js/ayarlar.js` içinde. `anon` anahtar herkese
  açık olabilir; `service_role` anahtarı asla depoya girmemeli.

## Bekleyen işler

`LORE.md` dosyasının sonundaki "Açık Uçlar" bölümüne bak — irade kademelerinin
son hâli, derebeyi isimleri ve zaman çizelgesi henüz netleşmedi.
