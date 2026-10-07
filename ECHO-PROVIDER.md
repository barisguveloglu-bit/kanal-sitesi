# Echo — AI ortamı bağımsız kullanım

Echo'nun görev sözleşmesi tek bir modele veya ürüne bağlı değildir. Aynı görev
ChatGPT, Claude veya Codex ile yürütülebilir.

## Ortak kaynaklar

- `ECHO.md`: çalışma döngüsü ve Echo kuralları.
- `AGENTS.md`: genel ajan/proje talimatları; Codex ve diğer ajan ortamlarında kullanılabilir.
- `CLAUDE.md`: Claude Code için ortam talimatları.
- `.claude/agents/`: Echo'nun rol tanımları. Bunlar sağlayıcıdan bağımsız görev metni
  olarak okunur; Claude'a özel kanca veya YAML izni anlamına gelmez.
- `echo.py`: görev sözleşmesi üretir, bütçeyi ve denetimleri yönetir; kendi başına
  bir model API'si çağırmaz.

## ChatGPT

ChatGPT/Work ortamında Echo görevini `echo.py gorev --ortam chatgpt ... --json`
ile üret. JSON içindeki `message` alanı görev sözleşmesidir. Model alanı verilirse
kullanıcı seçimini temsil eder; verilmezse Echo'nun ChatGPT/Codex rol tablosu
kullanılır.

ChatGPT'nin `AGENTS.md` dosyasını otomatik olarak okuyacağı varsayılmamalıdır;
görev sözleşmesi gerekli talimatları ayrıca belirtir.

## Claude

Claude/Claude Code ortamında `echo.py gorev --ortam claude ... --json` kullan.
Claude için model kimliği Echo tarafından zorunlu seçilmez; Claude tarafındaki
model seçimi korunur. İstenirse `--model <model-id>` ile çağrıya taşınabilir.

`CLAUDE.md` yalnız Claude ortamının ek talimat katmanıdır. Echo görevinin kendisi
Claude kancasına veya Claude API anahtarına ihtiyaç duymaz.

## Codex

Codex ortamında `--ortam codex` kullanılabilir. `AGENTS.md` ortam talimatları
ayrı bir katmandır; Echo sözleşmesi bunların yerine geçmez.

## Tasarım ilkesi

Echo'nun kalıcı hafızası ve kanıt kayıtları dosya tabanlıdır. ChatGPT ve Claude
aynı depoyu kullanıyorsa ortak durum dosyaları üzerinden çalışabilir; iki ortamın
ayrı sohbet/oturum hafızalarının otomatik olarak senkron olduğu varsayılmaz.

Bir sağlayıcının özel özelliği Echo'nun zorunlu parçası değildir. Sağlayıcıya özel
özellik kullanılacaksa görev çıktısında açıkça belirtilmeli ve başarısızlığı
"Echo doğrulandı" gibi genel bir başarı olarak raporlanmamalıdır.
