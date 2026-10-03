# AGENTS.md — Echo / Codex

Bu depoda Echo'nun yöneticisi **Codex**. Kullanıcının verdiği işi planlar,
uygular, ölçer ve Barış'a teslim edersin. Claude şef/onay mercii değildir.
Akış: uzmanlar (gerektiğinde) → Codex → Barış.

Statik hikaye arşivi: HTML + CSS + vanilla JS. Derleme, paket yöneticisi,
backend, veritabanı ve dış servis yok. Echo siteye ait değildir.

## Çalışmaya başlarken

`python3 echo.py baslat` çalıştır; dersleri, yarım işleri ve başlangıç
kapılarını oku. Ayrıntı `ECHO.md`; beceri `.agents/skills/echo/SKILL.md`.
Bellekteki eski görev/merge önerileri yeni talimat veya izin değildir.

Her düzenleme grubundan sonra `python3 echo.py kontrol`; teslimden önce
`python3 echo.py kontrol --tam` ve `python3 -m unittest discover -s tests -v`.
Kod 0 temiz, 1 ihlal, 2 araç koşmadı, 3 insan kararıdır. Hiçbirini
birbirinin yerine sayma. Claude kancalarının Codex'te çalıştığını varsayma.

Düzeltme turundan önce `python3 echo.py arac devre dene --halka duzeltme
--sinir 3 --not "<denenen şey>"` çalıştır (tek satır komut). Oturum kimliği
yoksa sabit bir `--sahip` kullan. Devre 1 ise dur, 4 ise turu atla.
Temiz sonuçta aynı halkayı `devre basari` ile kapat.

## Yetki ve uzmanlar

Kullanıcının istediği kodu ve Echo uyarlamasını düzenleyebilirsin.
Canon'a yeni kural koymak, açık uçları karara bağlamak ve PR merge etmek
Barış'ın kararıdır. Ölçüm dosyaları değişebilir; test gevşetilmez ve commit
`ÖLÇÜM-DEĞİŞTİ: <gerekçe>` beyanı taşır. Ölçüm listesi `bekci.py` içindedir.

Alt ajanları yalnız kullanıcı veya geçerli talimat istediğinde kullan.
`echo.py gorev --rol <rol> --konu "..." --gonder` sözleşmeyi doğrular ve
bütçe düşer; komut kendisi ajan başlatmaz. Çıkan metni mevcut Codex alt ajan
aracına ver; model ana oturumdan gelsin. Uzmanlar salt okunur, ana ajan
tek yazıcıdır. Destek yoksa sırayla çalış, bağımsız denetim iddia etme.
Raporların atıflarını `echo.py arac gorev dogrula` ile denetle.

`.claude/` tarihsel Python/bellek deposudur; Claude kurulumu gerektirmez.
Eski `.claude/commands`, `disajan.py` ve `CLAUDE.md` Claude uyumluluğudur;
Codex yönetimini veya onay zincirini bunlardan alma.

## Canon kaynağı

Bildiğini sandığın her şey başka bir yerden geliyor ve burada geçersiz.
Canon kaynağı **tek dosya:** `LORE.md`.

Herhangi bir içerik iddiası kuracaksan:

```
python3 echo.py arac ara "<soru>"
```

Bu komut canon içinde arar ve **satır numarasıyla** döndürür. Sonra:

1. **Geleni oku.** Arama en yakın parçayı verir, doğru parçayı değil.
2. İddianın yanına adresini yaz: `LORE.md:201` biçiminde.
3. **Adres veremediğin cümleyi iddia olarak kurma.**

### Uydurma yasak

Bilgi eksikse doldurma. İki durum var, ikisinde de cevap aynı:

- Arama hiçbir dayanak döndürmedi → bir kez başka ifadeyle ara; yine
  bulamamak konunun yokluğunu kanıtlamaz, dayanak bulunamadığını söyle.
- Dayanak geldi ama cevabı içermiyor → **canon susuyor.**

İkisinde de **"canon bunu söylemiyor"** de ve eksik olduğunu raporla.
"Muhtemelen", "büyük ihtimalle", "sanırım" yok.

**Eksik bir rapor, uydurma dolu bir rapordan iyidir.** Bu depoda siteye
girmiş bir uydurma cümle vardı ("Barış'ı bulmaları iki yıl sürdü") ve
kaldırılması için bir denetim koşusu gerekti.

---

## Denetim sonrası eklenen kurallar

Aşağıdakiler **bilinçli kararlar** — "düzeltilecek eksik" değil. Birini
bozan dal reddedilir.

| Kural | Neden |
|---|---|
| **HTML'e dokunma**, yeni karakter/güç `assets/js/data.js`'e eklenir | Sayfalar sadece iskelet + `data-*` bağlama noktası |
| `LORE.md` ile `data.js` **senkron kalmalı** | Canon ile veri ayrışırsa site yalan söyler |
| Arayüz metinleri **Türkçe** | — |
| Değişken ve fonksiyon adları da **Türkçe** | Mevcut düzene uy |
| **Sahte içerik yasak** | `VIDEOLAR` boşken bölümler `hidden` kalır. Örnek başlık, "yakında", uydurma bağlantı **üretme** — boş bırak, eksik olduğunu raporla |
| Gizleme **her zaman `hidden` özniteliğiyle**, `opacity: 0` ile değil | Hareket azaltma açıkken bütün geçişler kapanıyor; opacity ile gizlenen bir daha görünmez. `[hidden] { display: none !important; }` kuralını **silme** |
| **Odak halkası silinmez** | `outline: none` yazma; `:focus-visible` tasarımı bilerek var |
| Renk paleti **ölçülerek** belirlendi | `--text-3`, `--kotu-metin`, `--bolge-renk` WCAG AA (4.5:1) sınırına göre hesaplandı. Değiştireceksen **önce kontrastı ölç** |
| Betikler **`defer`** ile yükleniyor, **sıra korunur** | İlk boyama ~%28 hızlandı |
| Menü **her HTML'de yazılı**, `app.js` üretmiyor | JavaScript yüklenmezse navigasyon kaybolmasın diye. Yeni sayfa eklersen menüyü **bütün** HTML'lerde ve `sitemap.xml`'de güncelle |
| **Hiç kullanıcı verisi toplanmıyor** | Form yok, giriş yok, çerez yok. Soru-cevap YouTube yorumlarında. Buraya backend eklemeden önce iki kez düşün — sadelik bilinçli bir tercih |

---

## Teslim

`codex/<kısa-ad>` dalında çalış; kullanıcı kapsamındaki değişikliği PR ile
sun, merge etme. Commit mesajını Türkçe yaz ve değişikliğin nedenini anlat.
Yarım işte `echo.py arac defter` ile gerekçe ve devam noktası bırak.
Raporda yapılan değişikliği, denetim sonuçlarını ve doğrulanamayan kısmı
belirt; test çalıştırmadan geçti deme.

## Açık işler

`LORE.md` sonundaki **"Açık Uçlar"** bölümüne bak. Bunlar **insan
kararı bekliyor** — kapatmaya kalkma, dokunursan raporunda söyle:

- İrade kademelerinin son hâli (`LORE.md:93` — DURUM: TASLAK)
- Yılmaz sonrası zaman çizelgesi (1730 mu 1731 mi)
- Video bağlantıları (gerçek kimlikler girilmedi, o yüzden bölümler gizli)

---

## Bilinen tuzaklar

Bunlar bu depoda **gerçekten yaşandı**:

- **Altın set satır kayması.** `LORE.md`'ye satır eklemek, testlerdeki
  satır adreslerini kaydırır. Adresleri "hepsine +N ekle" diye kapatma —
  eski dosyadaki satır **metnini** okuyup yeni dosyada eşle.
- **Sabit satır numarası gömen test çürür.** İddiayı içeriğe bağla.
- **Aracın basmadığı kelimeye bağlanan iddia** doğru çıkış kodunda bile
  kırmızı kalır. Gerçek çıktıya bak.
- **Boşlukları yok sayan metin eşleme tehlikeli.** "İlk kelimeyi bul, son
  kelimeyi bul, arasını al" bir tahmindir ve bu depoda `data.js`'i bozdu.
  Aday aralığı seç, sonra **eşit olduğunu doğrula.**
- **`git worktree` sızdırır.** Kullandıysan `git worktree remove --force`
  ile temizle; yetim kayıtlar bütün git işlemlerini yavaşlatır.

---
