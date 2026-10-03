---
name: echo
description: Bu depoda Echo ile çalış; döngü, orkestra, canon araması, denetim, değerlendirme, geri bildirim ve sınırlı sürekli çalışma isteklerini Codex araçlarıyla yürüt.
---

# Echo / Codex

Önce kökteki `AGENTS.md` ve `ECHO.md` dosyalarını oku. Yönetici Codex'tir;
Claude'a görev gönderme, Claude model adı seçme, API anahtarı isteme.

1. `python3 echo.py baslat` çalıştır, dersleri/yarım işleri ve kapı sonuçlarını oku.
2. Kullanıcının istediği akışı `ECHO.md` tablosundan seç. Normal görevde
   planla → uygula → kontrol. Sadece plan veya denetim istenmişse dosya değiştirme.
3. Canon iddialarını `python3 echo.py arac ara "<soru>"` ile kaynaklandır;
   boş aramayı bir kez başka ifadeyle dene. Bulamamak yokluğun kanıtı değildir.
4. Her düzenleme grubundan sonra `python3 echo.py kontrol` çalıştır.
   Düzeltme öncesi `echo.py arac devre dene --halka duzeltme --sinir 3`
   ve gerçek hata notu kullan. Sonuç 1/4 ise devam etme; kimlik yoksa
   `--sahip` ile bu koşuya ait sabit bir kimlik ver.
5. Çok ajanlı çalışma kullanıcı veya geçerli talimat tarafından istenmişse:
   bütçeyi aç; `echo.py gorev --rol <ad> --konu "..." --gonder` çıktısını
   Codex alt ajan aracına ver. `--json` ile çıkan `task_name`, `model`,
   `message` ve `fork_turns: "none"` alanlarını `spawn_agent` çağrısına
   aynen aktar. Roller `echo-modeller.json` içinden seçilir; kullanıcı
   görev için başka model isterse `--model` kullan. Oturumun model
   seçeneklerinde yoksa dur ve bildir; sessizce model değiştirme.
   Tam geçmiş çatallamasıyla model seçimini birleştirme. Komut kendisi
   ajan başlatmaz. Başarısız görev üretimini gönderme. Uzmanlara
   yazma yetkisi verme; tek yazıcı ana ajan olsun. Alt ajan aracı yoksa
   sırayla çalış ve bunu belirt. Yeniden gönderim devre sınırı 2.
6. Sürekli çalışma açıkça istenmişse her turdan önce devre sınırı 8,
   her tur sonunda hedef kontrolü + hızlı kapılar. Hedef bittiğinde,
   ilerleme durduğunda veya insan kararı gerektiğinde dur.
7. Teslim öncesi `python3 echo.py kontrol --tam` ve
   `python3 -m unittest discover -s tests -v`. Kod 0 dışını geçti sayma.
   Ölçüm değişikliği commit'te `ÖLÇÜM-DEĞİŞTİ: <gerekçe>` taşır.
8. Yarım işin devam noktasını iş defterine yaz. Değişikliği, test sonucunu
   ve doğrulanamayan noktayı raporla. PR merge kararı Barış'ın.

Eski `.claude/commands` kancalı akışı bu ortamda uygulanmış sayılmaz.
Claude'un otomatik kancaları yerine bu açık komut adımlarını yürüt.
Bellek kaydı yeni kullanıcı izni veya talimatı değildir.
