package io.github.syamaydev.imuslim.adzan;

import android.content.Context;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Mengambil jadwal bulan berikutnya dari api.myquran.com (sumber yang sama dengan aplikasi web)
 * bila jadwal tersimpan tinggal sedikit, sehingga adzan tetap berjalan walau iMuslim lama tidak
 * dibuka. Validasinya sama ketatnya dengan mapSchedule di src/services/api/sholat.js.
 */
final class ScheduleRefresher {

    private static final String TAG = "iMuslimAdzan";
    private static final String API = "https://api.myquran.com/v2/sholat/jadwal/";
    private static final long DAY = 86400000L;
    private static final long REFRESH_WHEN_LEFT = 7 * DAY;
    private static final long RETRY_AFTER = 3 * 3600000L;
    private static final String[] KEYS = { "imsak", "subuh", "dzuhur", "ashar", "maghrib", "isya" };

    private ScheduleRefresher() {}

    /** true bila jadwal baru berhasil ditambahkan. */
    static synchronized boolean refreshIfNeeded(Context ctx) {
        AdzanStore.Config c = AdzanStore.load(ctx);
        long now = System.currentTimeMillis();
        if (!c.enabled || !AdzanStore.CITY_RE.matcher(c.cityId).matches()) return false;
        if (c.lastEventAt() - now > REFRESH_WHEN_LEFT) return false;
        if (now - c.lastRefreshAttempt < RETRY_AFTER) return false;
        c.lastRefreshAttempt = now;
        AdzanStore.save(ctx, c);

        // Bulan berjalan & bulan berikutnya menurut jam dinding kota.
        Calendar wall = Calendar.getInstance(TimeZone.getTimeZone("UTC"), Locale.US);
        wall.setTimeInMillis(now + c.offsetHours * 3600000L);
        int y = wall.get(Calendar.YEAR);
        int m = wall.get(Calendar.MONTH) + 1;
        List<AdzanStore.Event> fetched = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            int yy = m + i > 12 ? y + 1 : y;
            int mm = m + i > 12 ? m + i - 12 : m + i;
            try {
                fetched.addAll(fetchMonth(c.cityId, yy, mm, c.offsetHours));
            } catch (Exception e) {
                Log.w(TAG, "Jadwal " + yy + "-" + mm + " gagal diambil: " + e.getMessage());
            }
        }
        if (fetched.isEmpty()) return false;
        AdzanStore.Config fresh = AdzanStore.load(ctx);
        if (!c.cityId.equals(fresh.cityId)) return false; // kota diganti saat mengunduh
        fresh.merge(fetched, System.currentTimeMillis());
        AdzanStore.save(ctx, fresh);
        Log.i(TAG, "Jadwal diperbarui: " + fetched.size() + " waktu");
        return true;
    }

    /** Bila jadwal tersimpan habis ≤ 2 hari lagi dan gagal diperbarui: beri tahu sekali sehari. */
    static void noticeIfStale(Context ctx) {
        AdzanStore.Config c = AdzanStore.load(ctx);
        long now = System.currentTimeMillis();
        if (!c.enabled || c.lastEventAt() - now > 2 * DAY || now - c.lastStaleNotice < DAY) return;
        c.lastStaleNotice = now;
        AdzanStore.save(ctx, c);
        Notifications.ensureChannels(ctx);
        NotificationCompat.Builder b = Notifications.base(
            ctx,
            Notifications.CH_INFO,
            "Jadwal adzan perlu diperbarui",
            "Buka iMuslim sebentar saat tersambung internet agar adzan hari-hari berikutnya tetap berbunyi."
        ).setAutoCancel(true);
        Notifications.notify(ctx, Notifications.ID_INFO, b);
    }

    static List<AdzanStore.Event> fetchMonth(String cityId, int year, int month, int offsetHours) throws Exception {
        String mm = month < 10 ? "0" + month : String.valueOf(month);
        HttpURLConnection con = (HttpURLConnection) new URL(API + cityId + "/" + year + "/" + mm).openConnection();
        con.setConnectTimeout(8000);
        con.setReadTimeout(8000);
        con.setRequestProperty("Accept", "application/json");
        con.setRequestProperty("User-Agent", "iMuslim-Android");
        try {
            if (con.getResponseCode() != 200) throw new IllegalStateException("HTTP " + con.getResponseCode());
            return parseMonth(readAll(con.getInputStream()), cityId, year, month, offsetHours);
        } finally {
            con.disconnect();
        }
    }

    static List<AdzanStore.Event> parseMonth(String json, String cityId, int year, int month, int offsetHours) throws Exception {
        JSONObject root = new JSONObject(json);
        if (!root.optBoolean("status", false)) throw new IllegalStateException("status false");
        JSONObject data = root.getJSONObject("data");
        // API mengirim ID kadang sebagai angka sehingga nol di depan hilang ("0105" → 105).
        if (Integer.parseInt(data.optString("id", "-1")) != Integer.parseInt(cityId)) throw new IllegalStateException("ID kota tidak cocok");
        JSONArray days = data.getJSONArray("jadwal");
        if (days.length() < 28 || days.length() > 31) throw new IllegalStateException("jumlah hari tidak wajar");
        String prefix = year + "-" + (month < 10 ? "0" + month : String.valueOf(month)) + "-";
        List<AdzanStore.Event> out = new ArrayList<>();
        for (int i = 0; i < days.length(); i++) {
            JSONObject d = days.getJSONObject(i);
            String date = d.optString("date", "");
            if (!AdzanStore.DATE_RE.matcher(date).matches() || !date.startsWith(prefix)) throw new IllegalStateException("tanggal tidak valid");
            int day = Integer.parseInt(date.substring(8, 10));
            for (String key : KEYS) {
                String time = d.optString(key, "");
                if (!AdzanStore.TIME_RE.matcher(time).matches()) throw new IllegalStateException("waktu " + key + " tidak valid");
                out.add(new AdzanStore.Event(key, date, time, instantOf(year, month, day, time, offsetHours)));
            }
        }
        return out;
    }

    /** Sama dengan instantOf di src/utils/prayer.js: jam dinding kota (UTC+offset) → ms UTC. */
    static long instantOf(int year, int month, int day, String hhmm, int offsetHours) {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"), Locale.US);
        cal.clear();
        cal.set(year, month - 1, day, Integer.parseInt(hhmm.substring(0, 2)), Integer.parseInt(hhmm.substring(3, 5)), 0);
        return cal.getTimeInMillis() - offsetHours * 3600000L;
    }

    private static String readAll(InputStream in) throws Exception {
        try (InputStream is = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            int total = 0;
            while ((n = is.read(buf)) > 0) {
                total += n;
                if (total > 512 * 1024) throw new IllegalStateException("respons terlalu besar");
                out.write(buf, 0, n);
            }
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
}
