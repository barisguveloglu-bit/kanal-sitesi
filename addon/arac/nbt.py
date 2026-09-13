"""Bedrock level.dat icin KUCUK SONLU (little-endian) NBT.

   ---- NEDEN ELLE YAZILIYOR ----
   Bu depoda paket yoneticisi yok (bkz. CLAUDE.md). Disaridan
   bir NBT kutuphanesi cekmek, "derleme adimi yok" kuralini
   tek satirda bozardi. Ihtiyac duyulan sey de kucuk: bir
   sozluk yaz, geri oku.

   ---- NEDEN GERI OKUYUCU DA VAR ----
   level.dat'i OYUNDA deneyemiyorum. Yazdigimin dogru oldugunu
   gosterebilecegim tek sey, yazdigimi geri okuyup ayni
   sozlugu elde etmek. `dogrula()` tam bunu yapiyor ve
   uretim onun gecmesine bagli -- gecmezse dosya yazilmiyor.

   Bedrock bicimi Java'dan uc yerde ayriliyor:
     1. Sayilar KUCUK SONLU (Java buyuk sonlu)
     2. Dosyanin basinda 8 baytlik baslik: surum + govde boyu
     3. Kok etiket adsiz degil, bos adli bir TAG_Compound
"""
import struct

BAYT, KISA, TAM, UZUN, KESIR, CIFT = 1, 2, 3, 4, 5, 6
BAYT_DIZI, YAZI, LISTE, BILESIK, TAM_DIZI = 7, 8, 9, 10, 11


class Etiket:
    """Turu kendiliginden anlasilmayan degerler icin sarmalayici.

       Python'da 1 hem TAM hem BAYT olabilir; level.dat'ta ikisi
       AYNI SEY DEGIL. Oyun `commandsEnabled`i BAYT bekliyor;
       TAM yazilirsa alani okumuyor. Bu yuzden tur tahmin
       edilmiyor, YAZILIYOR.                                  """
    __slots__ = ("tur", "deger")

    def __init__(self, tur, deger):
        self.tur = tur
        self.deger = deger

    def __eq__(self, o):
        return isinstance(o, Etiket) and o.tur == self.tur and o.deger == self.deger

    def __repr__(self):
        return "Etiket(%d, %r)" % (self.tur, self.deger)


def B(v):  return Etiket(BAYT, int(v))
def T(v):  return Etiket(TAM, int(v))
def U(v):  return Etiket(UZUN, int(v))
def C(v):  return Etiket(CIFT, float(v))
def Y(v):  return Etiket(YAZI, str(v))
def TL(v): return Etiket(LISTE, [Etiket(TAM, int(x)) for x in v])


# ------------------------------------------------------------------ yazma
def _yazi_yaz(s):
    ham = s.encode("utf-8")
    return struct.pack("<H", len(ham)) + ham


def _deger_yaz(e):
    t, v = e.tur, e.deger
    if t == BAYT:  return struct.pack("<b", v)
    if t == KISA:  return struct.pack("<h", v)
    if t == TAM:   return struct.pack("<i", v)
    if t == UZUN:  return struct.pack("<q", v)
    if t == KESIR: return struct.pack("<f", v)
    if t == CIFT:  return struct.pack("<d", v)
    if t == YAZI:  return _yazi_yaz(v)
    if t == LISTE:
        ic = v[0].tur if v else BAYT
        p = struct.pack("<b", ic) + struct.pack("<i", len(v))
        for x in v:
            if x.tur != ic:
                raise ValueError("liste karisik turlu: %d != %d" % (x.tur, ic))
            p += _deger_yaz(x)
        return p
    if t == BILESIK:
        p = b""
        for ad, x in v.items():
            p += struct.pack("<b", x.tur) + _yazi_yaz(ad) + _deger_yaz(x)
        return p + struct.pack("<b", 0)
    raise ValueError("bilinmeyen tur %r" % t)


def govde_yaz(sozluk):
    """Kok bilesik etiketi (adi bos) govde baytlarina cevirir."""
    kok = Etiket(BILESIK, sozluk)
    return struct.pack("<b", BILESIK) + _yazi_yaz("") + _deger_yaz(kok)


def level_dat_yaz(sozluk, surum=10):
    """8 baytlik baslik + govde. Baslik: surum, govde uzunlugu."""
    govde = govde_yaz(sozluk)
    return struct.pack("<ii", surum, len(govde)) + govde


# ------------------------------------------------------------------ okuma
class _Okur:
    def __init__(self, ham):
        self.h = ham
        self.i = 0

    def al(self, n):
        if self.i + n > len(self.h):
            raise EOFError("govde erken bitti")
        p = self.h[self.i:self.i + n]
        self.i += n
        return p

    def paket(self, b, n):
        return struct.unpack(b, self.al(n))[0]

    def yazi(self):
        n = self.paket("<H", 2)
        return self.al(n).decode("utf-8")

    def deger(self, t):
        if t == BAYT:  return Etiket(t, self.paket("<b", 1))
        if t == KISA:  return Etiket(t, self.paket("<h", 2))
        if t == TAM:   return Etiket(t, self.paket("<i", 4))
        if t == UZUN:  return Etiket(t, self.paket("<q", 8))
        if t == KESIR: return Etiket(t, self.paket("<f", 4))
        if t == CIFT:  return Etiket(t, self.paket("<d", 8))
        if t == YAZI:  return Etiket(t, self.yazi())
        if t == LISTE:
            ic = self.paket("<b", 1)
            n = self.paket("<i", 4)
            return Etiket(t, [self.deger(ic) for _ in range(n)])
        if t == BILESIK:
            d = {}
            while True:
                it = self.paket("<b", 1)
                if it == 0:
                    return Etiket(t, d)
                ad = self.yazi()
                d[ad] = self.deger(it)
        raise ValueError("bilinmeyen tur %r" % t)


def level_dat_oku(ham):
    """Yazilan dosyayi geri okur: (surum, sozluk) doner."""
    surum, boy = struct.unpack("<ii", ham[:8])
    govde = ham[8:8 + boy]
    o = _Okur(govde)
    if o.paket("<b", 1) != BILESIK:
        raise ValueError("kok bilesik degil")
    o.yazi()                      # kokun adi: bos
    return surum, o.deger(BILESIK).deger


def dogrula(sozluk, surum=10):
    """Yaz -> oku -> karsilastir. Uretim buna bagli.

       Sadece "catlamadi" demiyor: geri okunan sozlugun yazilana
       BIREBIR esit oldugunu soyluyor. Tur de karsilastiriliyor
       (Etiket.__eq__ turu de bakiyor), cunku bu bicimde en sinsi
       hata TAM yerine BAYT yazmak ve oyun o alani sessizce
       atliyor.                                               """
    ham = level_dat_yaz(sozluk, surum)
    s2, d2 = level_dat_oku(ham)
    if s2 != surum:
        raise AssertionError("surum bozuldu: %r != %r" % (s2, surum))
    if set(d2) != set(sozluk):
        eksik = set(sozluk) - set(d2)
        fazla = set(d2) - set(sozluk)
        raise AssertionError("anahtarlar tutmuyor. eksik=%s fazla=%s" % (eksik, fazla))
    for ad in sozluk:
        if d2[ad] != sozluk[ad]:
            raise AssertionError("'%s' geri okunmadi: %r != %r" % (ad, d2[ad], sozluk[ad]))
    return ham
