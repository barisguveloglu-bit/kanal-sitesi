#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — `data.js` okuyucu
===============================================================
Bütünlük sınavının veriyi gerçekten okuması gerekiyor. Metinde düzenli
ifade aramak yetmez: "adı iki kez geçiyor mu" sorusu ile "aynı derebeyi
iki ile atanmış mı" sorusu farklı şeyler, ikincisi yapıyı bilmeyi gerektirir.

Node ile çalıştırıp JSON dökmek daha kolay olurdu. Yapmadım: bu deponun
kuralı **dış bağımlılık yok** ve bir sınavın, ölçtüğü şeyden daha kırılgan
olması saçma. Node'un olmadığı bir ortamda sınav "geçti" demez, hiç
çalışmaz — ve çalışmayan sınav, geçen sınav gibi görünür.

Bu yüzden burada `data.js` içindeki nesne değişmezlerini okuyan küçük bir
ayrıştırıcı var. Tam bir JavaScript ayrıştırıcısı değil; bu dosyada
kullanılan alt kümeyi okur: dizi, nesne, dizgi (`+` ile eklenenler dahil),
sayı, `true/false/null`. Fazlasıyla karşılaşırsa **sessizce geçmez, hata
verir** — sessizce geçmek en kötü seçenek olurdu.
"""

import re

BOSLUK = re.compile(r"(\s|//[^\n]*|/\*.*?\*/)+", re.S)


class Okunmadi(Exception):
    """Ayrıştırıcının bilmediği bir yapı. Sessizce atlamak yerine bağır."""


class Okuyucu:
    def __init__(self, metin, konum=0):
        self.m = metin
        self.i = konum

    # ------------------------------------------------------------- yardımcı

    def atla(self):
        e = BOSLUK.match(self.m, self.i)
        if e:
            self.i = e.end()

    def bak(self):
        self.atla()
        return self.m[self.i] if self.i < len(self.m) else ""

    def bekle(self, ch):
        if self.bak() != ch:
            raise Okunmadi(f"{ch!r} beklendi, {self.m[self.i:self.i+20]!r} bulundu")
        self.i += 1

    # --------------------------------------------------------------- değer

    def deger(self):
        c = self.bak()
        if c == "[":
            return self.dizi()
        if c == "{":
            return self.nesne()
        if c in "\"'`":
            return self.dizgi_zinciri()
        if c == "-" or c.isdigit():
            return self.sayi()
        for söz, karşılık in (("true", True), ("false", False), ("null", None)):
            if self.m.startswith(söz, self.i):
                self.i += len(söz)
                return karşılık
        raise Okunmadi(f"tanınmayan değer: {self.m[self.i:self.i+30]!r}")

    def dizi(self):
        self.bekle("[")
        cikti = []
        while True:
            if self.bak() == "]":
                self.i += 1
                return cikti
            cikti.append(self.deger())
            if self.bak() == ",":
                self.i += 1

    def nesne(self):
        self.bekle("{")
        cikti = {}
        while True:
            c = self.bak()
            if c == "}":
                self.i += 1
                return cikti
            if c in "\"'":
                anahtar = self.dizgi()
            else:
                e = re.compile(r"[A-Za-z_$][\w$]*").match(self.m, self.i)
                if not e:
                    raise Okunmadi(f"anahtar okunamadı: {self.m[self.i:self.i+30]!r}")
                anahtar = e.group(0)
                self.i = e.end()
            self.bekle(":")
            cikti[anahtar] = self.deger()
            if self.bak() == ",":
                self.i += 1

    def sayi(self):
        e = re.compile(r"-?\d+(\.\d+)?").match(self.m, self.i)
        if not e:
            raise Okunmadi("sayı okunamadı")
        self.i = e.end()
        s = e.group(0)
        return float(s) if "." in s else int(s)

    def dizgi(self):
        tirnak = self.bak()
        self.i += 1
        cikti = []
        while True:
            if self.i >= len(self.m):
                raise Okunmadi("dizgi kapanmadı")
            c = self.m[self.i]
            if c == "\\":
                sonraki = self.m[self.i + 1]
                cikti.append({"n": "\n", "t": "\t", "r": "\r"}.get(sonraki, sonraki))
                self.i += 2
                continue
            if c == tirnak:
                self.i += 1
                return "".join(cikti)
            cikti.append(c)
            self.i += 1

    def dizgi_zinciri(self):
        """`"a" + "b"` — data.js uzun metinleri böyle yazıyor."""
        parcalar = [self.dizgi()]
        while True:
            yedek = self.i
            if self.bak() == "+":
                self.i += 1
                if self.bak() in "\"'`":
                    parcalar.append(self.dizgi())
                    continue
            self.i = yedek
            return "".join(parcalar)


def sabit(metin, ad):
    """`const AD = <değer>;` içindeki değeri okur."""
    e = re.search(rf"^const\s+{re.escape(ad)}\s*=\s*", metin, re.M)
    if not e:
        raise Okunmadi(f"sabit bulunamadı: {ad}")
    return Okuyucu(metin, e.end()).deger()


def sabit_adlari(metin):
    return re.findall(r"^const\s+([A-Z_][A-Z0-9_]*)\s*=", metin, re.M)
