package io.github.syamaydev.imuslim.adzan;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import io.github.syamaydev.imuslim.MainActivity;
import io.github.syamaydev.imuslim.R;

/** Kanal & notifikasi adzan. */
final class Notifications {

    /** Notifikasi saat adzan diputar oleh iMuslim (kanal tanpa suara: suaranya dari pemutar adzan). */
    static final String CH_ADZAN = "adzan_waktu_sholat";
    /** Cadangan bila adzan tidak bisa diputar: notifikasi dengan bunyi notifikasi perangkat. */
    static final String CH_SOUND = "pengingat_cadangan";
    /** Info jadwal (mis. perlu diperbarui). */
    static final String CH_INFO = "info_jadwal";

    static final int ID_PRAYER = 2001;
    static final int ID_INFO = 2002;
    private static final int REQ_OPEN = 3001;

    private Notifications() {}

    static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel adzan = new NotificationChannel(CH_ADZAN, "Adzan waktu sholat", NotificationManager.IMPORTANCE_HIGH);
        adzan.setDescription("Muncul saat adzan diputar. Suara adzan diputar iMuslim dengan volume alarm dan mengikuti mode senyap/getar HP.");
        adzan.setSound(null, null);
        adzan.enableVibration(false);
        adzan.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        NotificationChannel sound = new NotificationChannel(CH_SOUND, "Pengingat cadangan", NotificationManager.IMPORTANCE_HIGH);
        sound.setDescription("Dipakai bila adzan tidak dapat diputar: notifikasi dengan bunyi notifikasi perangkat.");
        sound.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        NotificationChannel info = new NotificationChannel(CH_INFO, "Info jadwal", NotificationManager.IMPORTANCE_DEFAULT);
        info.setDescription("Pemberitahuan bila jadwal sholat di perangkat perlu diperbarui.");
        nm.createNotificationChannel(adzan);
        nm.createNotificationChannel(sound);
        nm.createNotificationChannel(info);
    }

    static PendingIntent openApp(Context ctx) {
        Intent open = new Intent(ctx, MainActivity.class)
            .putExtra(MainActivity.EXTRA_ROUTE, "/sholat")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, REQ_OPEN, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static NotificationCompat.Builder base(Context ctx, String channel, String title, String body) {
        return new NotificationCompat.Builder(ctx, channel)
            .setSmallIcon(R.drawable.ic_stat_imuslim)
            .setColor(0xFF0E4D3B)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(openApp(ctx))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(true);
    }

    /** Adzan tidak dapat diputar (layanan ditolak sistem/berkas gagal dibuka): tetap beri tahu dengan bunyi. */
    static void showFallback(Context ctx, Bundle extras) {
        ensureChannels(ctx);
        String key = extras == null ? null : extras.getString(AdzanScheduler.EXTRA_KEY);
        boolean test = extras != null && extras.getBoolean(AdzanScheduler.EXTRA_TEST, false);
        AdzanStore.Config c = AdzanStore.load(ctx);
        String time = extras == null ? null : extras.getString(AdzanScheduler.EXTRA_TIME);
        NotificationCompat.Builder b = base(ctx, CH_SOUND, Labels.title(key, test), Labels.body(time, c.tz, c.cityName, test))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true);
        notify(ctx, ID_PRAYER, b);
    }

    static void notify(Context ctx, int id, NotificationCompat.Builder b) {
        try {
            NotificationManagerCompat.from(ctx).notify(id, b.build());
        } catch (SecurityException ignored) {
            // izin notifikasi dicabut pengguna
        }
    }
}
