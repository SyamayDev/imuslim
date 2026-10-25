package io.github.syamaydev.imuslim.adzan;

/** Teks notifikasi (sama dengan aplikasi web: PRAYER_LABELS & payloadFor). */
final class Labels {

    private Labels() {}

    static String prayer(String key) {
        switch (key == null ? "" : key) {
            case "imsak":
                return "Imsak";
            case "subuh":
                return "Subuh";
            case "dzuhur":
                return "Dzuhur";
            case "ashar":
                return "Ashar";
            case "maghrib":
                return "Maghrib";
            case "isya":
                return "Isya";
            default:
                return "Sholat";
        }
    }

    static String title(String key, boolean test) {
        if (test) return "Uji adzan iMuslim";
        if ("imsak".equals(key)) return "Waktu imsak telah tiba";
        return "Waktu " + prayer(key) + " telah tiba";
    }

    static String body(String time, String tz, String city, boolean test) {
        if (test) return "Begini adzan akan berbunyi saat masuk waktu sholat, walau iMuslim ditutup.";
        StringBuilder b = new StringBuilder();
        if (time != null && !time.isEmpty()) b.append(time).append(' ').append(tz == null ? "" : tz);
        if (city != null && !city.isEmpty()) {
            if (b.length() > 0) b.append(" · ");
            b.append(city);
        }
        return b.toString().trim();
    }

    /** Berkas audio di aset web (public/audio, ikut terbungkus di APK). */
    static String audioAsset(String key) {
        if ("subuh".equals(key)) return "public/audio/adzan-subuh.mp3";
        if ("imsak".equals(key)) return "public/audio/imsak.mp3";
        return "public/audio/adzan.mp3";
    }
}
