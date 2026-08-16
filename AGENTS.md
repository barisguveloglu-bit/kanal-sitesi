# AGENTS.md — dış ajanlar için talimat

Bu dosya **Codex ve benzeri dış ajanlar** içindir. Claude Code `CLAUDE.md`
okur; sen bunu okuyorsan bu dosya senin.

Depo bir **hikaye lore sitesi** — Türkçe bir kurgu evreninin arşivi.
Statik site: HTML + CSS + vanilla JS. **Derleme adımı yok, paket yöneticisi
yok, backend yok, veritabanı yok, dış servis yok.**

---

## 1. Sen kimsin, ne değilsin

Bu depoda bir **orkestra** çalışıyor: 15 denetçi + 2 üretici Claude ajanı,
bir şef (Claude Opus 5) ve sen. Sen **uzmansın, şef değilsin.**

**Yapabildiğin:** kod yazmak, dosya düzenlemek, hata bulmak, öneri
getirmek, denetlemek.

**Yapamadığın:** canon'a kural koymak, açık uçları kapatmak, `.claude/`
altındaki ölçüm katmanına dokunmak, PR'ı merge etmek.

Son madde önemli: **`.claude/` altına dokunan dal reddedilir.** Ölçüm
katmanını ölçtüğü şeyin değiştirmesi, sınavı kendi kendine not vermeye
çevirir. İstisna yok.

---

## 2. Bu evren hakkında hiçbir şey bilmiyorsun

Bildiğini sandığın her şey başka bir yerden geliyor ve burada geçersiz.
Canon kaynağı **tek dosya:** `LORE.md`.

Herhangi bir içerik iddiası kuracaksan:

```
python3 .claude/ara.py "<soru>"
```

Bu komut canon içinde arar ve **satır numarasıyla** döndürür. Sonra:

1. **Geleni oku.** Arama en yakın parçayı verir, doğru parçayı değil.
2. İddianın yanına adresini yaz: `LORE.md:201` biçiminde.
3. **Adres veremediğin cümleyi iddia olarak kurma.**

### Uydurma yasak

Bilgi eksikse doldurma. İki durum var, ikisinde de cevap aynı:

- Arama hiçbir dayanak döndürmedi → konu bu evrenle ilgili değil.
- Dayanak geldi ama cevabı içermiyor → **canon susuyor.**

İkisinde de **"canon bunu söylemiyor"** de ve eksik olduğunu raporla.
"Muhtemelen", "büyük ihtimalle", "sanırım" yok.

**Eksik bir rapor, uydurma dolu bir rapordan iyidir.** Bu depoda siteye
girmiş bir uydurma cümle vardı ("Barış'ı bulmaları iki yıl sürdü") ve
kaldırılması için bir denetim koşusu gerekti.

---

## 3. Değişmez kurallar

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

## 4. Kapı — işin nasıl ölçülür

Dalın dört denetimden geçecek. Hepsi saf Python, dış bağımlılığı yok:

```
python3 .claude/dogrula.py      # kuralları denetler
python3 .claude/butunluk.py     # canon ↔ veri ↔ site gerçeklerini denetler
python3 .claude/sinav.py        # denetleyicinin kendisini ölçer
python3 .claude/arac-sinavi.py  # araçları ölçer
```

### Çıkış kodu sözleşmesi

| Kod | Anlamı | Ne yapacaksın |
|---|---|---|
| `0` | temiz | devam |
| `1` | kural ihlali | **düzelt** |
| `3` | **insan kapısı** | **düzeltme** — raporunda söyle, karar Barış'ın |
| başkası | araç çalışmadı | **"geçti" sayma** — bunu bildir |

Son satır ciddi: bu depoda bir kapı, koşmayan bir denetimi bir kez
"geçti" saydı. Çalışmayan sınav, geçen sınav gibi görünür.

Aynı denetimler **GitHub Actions'ta da** koşuyor
(`.github/workflows/denetim.yml`), yani PR'ın altında yeşil tik ya da
kırmızı çarpı olarak görünür. Yerelde geçmesi yetmez, orada da geçmeli.

---

## 5. Dal ve teslim

```
git checkout -b codex/<kısa-ad>
…çalış…
python3 .claude/dogrula.py        # 0 almadan push etme
git push -u origin codex/<kısa-ad>
```

**PR aç, merge ETME.** Merge kararı insanın.

Dal adı `codex/` ile başlamalı — köprü (`.claude/disajan.py`) dalı buna
göre tanıyor.

### Commit mesajı

Türkçe yaz. **Ne yaptığını değil neden yaptığını** anlat; diff zaten ne
yaptığını gösteriyor. Bir şeyi denedin ve olmadıysa onu da yaz — bir
sonraki kişi aynı duvara toslamasın.

---

## 6. Raporunu şöyle bitir

Her görevin sonunda üç başlık:

- **Ne buldun** — atıflarıyla (`LORE.md:201`, `assets/js/app.js:234`)
- **Neyi bulamadın** — bunu atlama, çoğu zaman en değerli kısmı bu
- **Neye dokunmadın ve neden**

Raporun `python3 .claude/gorev.py dogrula` ile makine tarafından
denetlenecek: her atıf gerçekten o satırı gösteriyor mu diye bakılacak.
**Uydurma atıf, atıfsız iddiadan daha kötüdür.**

Bir uyarı: o denetleyici kelime örtüşmesiyle çalışıyor ve "bu bölüm şunu
gösteriyor" tarzı **betimleme** cümlelerinde yanlış kusur verebiliyor.
Atfın doğruysa itiraz et — kapı mükemmel değil, bunu biliyoruz.

---

## 7. "KUSUR YOK" demek serbest — ama gerekçesiz değil

Denetim yaptıysan ve gerçekten kusur bulamadıysan **"KUSUR YOK" de.**
Uydurma bulgu, bulgu bulamamaktan kötüdür.

Ama gerekçelendir: hangi kontrolü yaptın, neye baktın, ne ölçtün.
Gerekçesiz onay **lastik damga** sayılır ve reddedilir
(`.claude/elestirmen.py` bunu mekanik olarak denetliyor).

---

## 8. Şu an açık olan işler

`LORE.md` sonundaki **"Açık Uçlar"** bölümüne bak. Bunlar **insan
kararı bekliyor** — kapatmaya kalkma, dokunursan raporunda söyle:

- İrade kademelerinin son hâli (`LORE.md:93` — DURUM: TASLAK)
- Yılmaz sonrası zaman çizelgesi (1730 mu 1731 mi)
- Video bağlantıları (gerçek kimlikler girilmedi, o yüzden bölümler gizli)

---

## 9. Bilmen gereken birkaç tuzak

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

## 10. Kısa hâli

1. `LORE.md` canon, hafızan değil.
2. Adres veremediğin cümleyi kurma.
3. Bilmiyorsan "bilmiyorum" de.
4. `.claude/` altına dokunma.
5. Kapı `0` vermeden push etme.
6. Merge etme.
