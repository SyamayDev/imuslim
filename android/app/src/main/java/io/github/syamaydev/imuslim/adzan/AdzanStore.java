package io.github.syamaydev.imuslim.adzan;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Konfigurasi & jadwal adzan yang disimpan di perangkat. Jadwal berasal dari api.myquran.com
 * (dikirim oleh aplikasi web atau diambil sendiri oleh ScheduleRefresher) — tidak ada
 * perhitungan waktu sholat lokal.
 */
public final class AdzanStore {

    private static final String PREFS = "imuslim_adzan";
    private static final String KEY_CONFIG = "config";
    private static final int MAX_EVENTS = 500;

    public static final Set<String> KEYS = new HashSet<>(Arrays.asList("imsak", "subuh", "dzuhur", "ashar", "maghrib", "isya"));
    static final Pattern TIME_RE = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    static final Pattern DATE_RE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    static final Pattern CITY_RE = Pattern.compile("^\\d{4}$");

    private AdzanStore() {}

    /** Satu waktu sholat: kunci (subuh…), tanggal & jam dinding kota, serta instan UTC (ms). */
    public static final class Event {

        public final String key;
        public final String date;
        public final String time;
        public final long at;

        public Event(String key, String date, String time, long at) {
            this.key = key;
            this.date = date;
            this.time = time;
            this.at = at;
        }

        JSONObject toJson() throws JSONException {
            return new JSONObject().put("key", key).put("date", date).put("time", time).put("at", at);
        }

        /** null bila data tidak valid. */
        static Event fromJson(JSONObject o) {
            if (o == null) return null;
            String key = o.optString("key", "");
            String date = o.optString("date", "");
            String time = o.optString("time", "");
            long at = o.optLong("at", 0);
            if (!KEYS.contains(key) || !DATE_RE.matcher(date).matches() || !TIME_RE.matcher(time).matches() || at <= 0) return null;
            return new Event(key, date, time, at);
        }

        String id() {
            return date + ":" + key;
        }
    }

    public static final class Config {

        public boolean enabled;
        public boolean adzan;
        public boolean imsak;
        public String cityId = "";
        public String cityName = "";
        public String tz = "WIB";
        public int offsetHours = 7;
        public long lastRefreshAttempt;
        public long lastStaleNotice;
        public List<Event> events = new ArrayList<>();

        public boolean wants(String key) {
            if (!enabled) return false;
            return "imsak".equals(key) ? imsak : adzan;
        }

        /** Waktu berikutnya (yang diinginkan pengguna) setelah instan tertentu. */
        public Event next(long after) {
            for (Event e : events) if (e.at > after && wants(e.key)) return e;
            return null;
        }

        public long lastEventAt() {
            return events.isEmpty() ? 0 : events.get(events.size() - 1).at;
        }

        /** Gabungkan jadwal baru (per tanggal+kunci), buang yang sudah lewat > 1 hari, urutkan. */
        public void merge(List<Event> incoming, long now) {
            Map<String, Event> map = new LinkedHashMap<>();
            for (Event e : events) map.put(e.id(), e);
            for (Event e : incoming) map.put(e.id(), e);
            List<Event> list = new ArrayList<>();
            for (Event e : map.values()) if (e.at > now - 86400000L) list.add(e);
            Collections.sort(list, (a, b) -> Long.compare(a.at, b.at));
            if (list.size() > MAX_EVENTS) list = new ArrayList<>(list.subList(0, MAX_EVENTS));
            events = list;
        }
    }

    public static synchronized Config load(Context ctx) {
        Config c = new Config();
        String raw = prefs(ctx).getString(KEY_CONFIG, null);
        if (raw == null) return c;
        try {
            JSONObject o = new JSONObject(raw);
            c.enabled = o.optBoolean("enabled", false);
            c.adzan = o.optBoolean("adzan", false);
            c.imsak = o.optBoolean("imsak", false);
            c.cityId = o.optString("cityId", "");
            c.cityName = o.optString("cityName", "");
            c.tz = o.optString("tz", "WIB");
            c.offsetHours = o.optInt("offsetHours", 7);
            c.lastRefreshAttempt = o.optLong("lastRefreshAttempt", 0);
            c.lastStaleNotice = o.optLong("lastStaleNotice", 0);
            JSONArray arr = o.optJSONArray("events");
            List<Event> list = new ArrayList<>();
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    Event e = Event.fromJson(arr.optJSONObject(i));
                    if (e != null) list.add(e);
                }
            }
            c.merge(list, System.currentTimeMillis());
        } catch (JSONException e) {
            // Data rusak: mulai dari konfigurasi kosong (aplikasi akan mengirim ulang saat dibuka).
            return new Config();
        }
        return c;
    }

    public static synchronized void save(Context ctx, Config c) {
        try {
            JSONArray arr = new JSONArray();
            for (Event e : c.events) arr.put(e.toJson());
            JSONObject o = new JSONObject()
                .put("enabled", c.enabled)
                .put("adzan", c.adzan)
                .put("imsak", c.imsak)
                .put("cityId", c.cityId)
                .put("cityName", c.cityName)
                .put("tz", c.tz)
                .put("offsetHours", c.offsetHours)
                .put("lastRefreshAttempt", c.lastRefreshAttempt)
                .put("lastStaleNotice", c.lastStaleNotice)
                .put("events", arr);
            prefs(ctx).edit().putString(KEY_CONFIG, o.toString()).apply();
        } catch (JSONException ignored) {
            // tidak terjadi untuk nilai primitif
        }
    }

    public static List<Event> parseEvents(JSONArray arr) {
        List<Event> list = new ArrayList<>();
        if (arr == null) return list;
        for (int i = 0; i < arr.length(); i++) {
            Event e = Event.fromJson(arr.optJSONObject(i));
            if (e != null) list.add(e);
        }
        return list;
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
