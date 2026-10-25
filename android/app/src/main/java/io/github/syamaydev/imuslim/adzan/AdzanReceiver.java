package io.github.syamaydev.imuslim.adzan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Menerima alarm waktu sholat (dari AdzanScheduler) dan siaran sistem yang menghapus/menggeser
 * alarm: HP selesai dinyalakan ulang, aplikasi diperbarui, jam/zona waktu diubah, atau izin
 * alarm tepat waktu berubah. Tidak diekspor: aplikasi lain tidak bisa memicu adzan.
 */
public class AdzanReceiver extends BroadcastReceiver {

    private static final String TAG = "iMuslimAdzan";
    /** Alarm yang terlambat lebih dari ini (mis. HP mati saat waktunya) tidak memutar adzan. */
    private static final long LATE_MS = 10 * 60 * 1000L;

    @Override
    public void onReceive(Context context, Intent intent) {
        Context ctx = context.getApplicationContext();
        String action = intent.getAction();
        if (AdzanScheduler.ACTION_FIRE.equals(action)) {
            onFire(ctx, intent);
            return;
        }
        // Siaran sistem: pasang ulang rantai alarm (+ perbarui jadwal bila hampir habis).
        PendingResult pending = goAsync();
        new Thread(() -> {
            try {
                AdzanScheduler.scheduleNext(ctx);
                if (ScheduleRefresher.refreshIfNeeded(ctx)) AdzanScheduler.scheduleNext(ctx);
            } catch (Exception e) {
                Log.e(TAG, "Gagal memasang ulang alarm", e);
            } finally {
                pending.finish();
            }
        }).start();
    }

    private void onFire(Context ctx, Intent intent) {
        boolean test = intent.getBooleanExtra(AdzanScheduler.EXTRA_TEST, false);
        String key = intent.getStringExtra(AdzanScheduler.EXTRA_KEY);
        long at = intent.getLongExtra(AdzanScheduler.EXTRA_AT, 0);
        // Pasang alarm berikutnya lebih dulu agar rantai tidak putus walau pemutaran gagal.
        if (!test) AdzanScheduler.scheduleNextAfter(ctx, at);
        long late = System.currentTimeMillis() - at;
        if (late > LATE_MS) {
            Log.i(TAG, "Alarm " + key + " terlambat " + (late / 1000) + " dtk, dilewati");
            return;
        }
        AdzanStore.Config c = AdzanStore.load(ctx);
        if (!test && !c.wants(key)) return;
        AdzanService.start(ctx, intent.getExtras());
    }
}
