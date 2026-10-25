package io.github.syamaydev.imuslim.adzan;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import io.github.syamaydev.imuslim.MainActivity;

/**
 * Menjaga SATU alarm sistem untuk waktu sholat berikutnya. Saat alarm berbunyi, penerima
 * langsung memasang alarm berikutnya (berantai), dan rantai dipasang ulang setelah HP
 * dinyalakan ulang, aplikasi diperbarui, atau jam/zona waktu berubah.
 *
 * setAlarmClock dipakai karena paling andal: tidak ditunda mode Doze maupun kuota
 * "App Standby", dan boleh memulai layanan latar depan untuk memutar adzan.
 */
public final class AdzanScheduler {

    private static final String TAG = "iMuslimAdzan";
    static final String ACTION_FIRE = "io.github.syamaydev.imuslim.action.ADZAN_FIRE";
    static final String EXTRA_KEY = "key";
    static final String EXTRA_DATE = "date";
    static final String EXTRA_TIME = "time";
    static final String EXTRA_AT = "at";
    static final String EXTRA_TEST = "test";

    private static final int REQ_FIRE = 1001;
    private static final int REQ_TEST = 1002;
    private static final int REQ_SHOW = 1003;

    private AdzanScheduler() {}

    /** Pasang alarm untuk waktu berikutnya setelah sekarang. Mengembalikan event-nya (null = tidak ada). */
    public static AdzanStore.Event scheduleNext(Context ctx) {
        return scheduleNextAfter(ctx, 0);
    }

    /** Seperti scheduleNext, tetapi melewati event pada/ sebelum {@code after} (event yang sedang berbunyi). */
    public static synchronized AdzanStore.Event scheduleNextAfter(Context ctx, long after) {
        AdzanStore.Config c = AdzanStore.load(ctx);
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        PendingIntent cancel = firePending(ctx, new Intent(ctx, AdzanReceiver.class).setAction(ACTION_FIRE));
        AdzanStore.Event next = c.next(Math.max(System.currentTimeMillis() + 1000, after + 1000));
        if (am == null) return next;
        if (next == null) {
            am.cancel(cancel);
            return null;
        }
        Intent intent = new Intent(ctx, AdzanReceiver.class)
            .setAction(ACTION_FIRE)
            .putExtra(EXTRA_KEY, next.key)
            .putExtra(EXTRA_DATE, next.date)
            .putExtra(EXTRA_TIME, next.time)
            .putExtra(EXTRA_AT, next.at);
        setAlarm(ctx, am, next.at, firePending(ctx, intent), REQ_SHOW);
        return next;
    }

    public static void cancelAll(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        if (am != null) am.cancel(firePending(ctx, new Intent(ctx, AdzanReceiver.class).setAction(ACTION_FIRE)));
    }

    /** Alarm uji terpisah (tidak mengganggu rantai jadwal). */
    public static long scheduleTest(Context ctx, int seconds, String key) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        long at = System.currentTimeMillis() + seconds * 1000L;
        Intent intent = new Intent(ctx, AdzanReceiver.class)
            .setAction(ACTION_FIRE)
            .putExtra(EXTRA_KEY, AdzanStore.KEYS.contains(key) ? key : "dzuhur")
            .putExtra(EXTRA_AT, at)
            .putExtra(EXTRA_TEST, true);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, REQ_TEST, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (am != null) setAlarm(ctx, am, at, pi, REQ_SHOW + 1);
        return at;
    }

    public static boolean canExact(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        return am != null && (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms());
    }

    private static void setAlarm(Context ctx, AlarmManager am, long at, PendingIntent pi, int showReq) {
        try {
            if (canExact(ctx)) {
                Intent open = new Intent(ctx, MainActivity.class).putExtra(MainActivity.EXTRA_ROUTE, "/sholat").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                PendingIntent show = PendingIntent.getActivity(ctx, showReq, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pi);
                return;
            }
        } catch (SecurityException e) {
            Log.w(TAG, "Alarm tepat waktu ditolak sistem, memakai alarm biasa", e);
        }
        // Tanpa izin alarm tepat waktu: bisa terlambat beberapa menit saat HP lama diam.
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }

    private static PendingIntent firePending(Context ctx, Intent intent) {
        return PendingIntent.getBroadcast(ctx, REQ_FIRE, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
