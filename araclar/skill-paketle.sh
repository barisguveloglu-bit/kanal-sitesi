#!/usr/bin/env bash
#
# .claude/skills/ altındaki her skill'i claude.ai'ye yüklenebilir zip'e çevirir.
#
# Neden gerekiyor: skill biçimi (SKILL.md + YAML başlığı) her yerde aynı, ama
# yüklemeler yüzeyler arasında SENKRONLANMIYOR. Claude Code dosya sisteminden
# okuyor; claude.ai ise zip yüklemesi istiyor. Bu betik ikisini bağlıyor.
#
# Kullanım:
#   bash araclar/skill-paketle.sh
#
# Çıktı: dist-skills/<skill-adi>.zip
# Zip'in kökünde skill klasörü olmalı (alt klasör değil) — claude.ai böyle bekliyor.

set -euo pipefail

kok="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
kaynak="$kok/.claude/skills"
hedef="$kok/dist-skills"

[ -d "$kaynak" ] || { echo "HATA: $kaynak yok"; exit 1; }

rm -rf "$hedef"
mkdir -p "$hedef"

sayi=0
for yol in "$kaynak"/*/; do
  ad="$(basename "$yol")"

  if [ ! -f "$yol/SKILL.md" ]; then
    echo "ATLANDI: $ad — SKILL.md yok"
    continue
  fi

  # Adın YAML başlığındaki name ile aynı olduğunu doğrula; tutmazsa claude.ai reddediyor.
  yazan="$(sed -n 's/^name:[[:space:]]*//p' "$yol/SKILL.md" | head -1)"
  if [ "$yazan" != "$ad" ]; then
    echo "HATA: $ad klasörü ile SKILL.md içindeki 'name: $yazan' uyuşmuyor"
    exit 1
  fi

  ( cd "$kaynak" && zip -qr "$hedef/$ad.zip" "$ad" -x '.*' )
  echo "paketlendi: dist-skills/$ad.zip"
  sayi=$((sayi + 1))
done

echo
echo "$sayi skill paketlendi."
echo "Yükleme: claude.ai → Ayarlar → Skills → zip'i yükle."
echo "Önce Ayarlar → Capabilities içinde kod çalıştırma açık olmalı."
