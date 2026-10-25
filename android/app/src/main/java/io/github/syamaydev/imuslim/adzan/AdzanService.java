package io.github.syamaydev.imuslim.adzan;

import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import io.github.syamaydev.imuslim.R;

/**
 * Layanan latar depan yang memutar adzan saat waktu sholat masuk — juga ketika iMuslim
 * ditutup atau HP terkunci. Notifikasinya punya tombol "Hentikan"; menggeser notifikasi juga
 * menghentikan adzan. Mengikuti mode HP: senyap → tanpa suara, getar → hanya getar.
 */
public class AdzanService extends Service {

    private static final String TAG = "iMuslimAdzan";
    static final String ACTION_PLAY = "io.github.syamaydev.imuslim.action.ADZAN_PLAY";
    static final String ACTION_STOP = "io.github.syamaydev.imuslim.action.ADZAN_STOP";
    static final String ACTION_DISMISS = "io.github.syamaydev.imuslim.action.ADZAN_DISMISS";
    private static final long MAX_PLAY_MS = 8 * 60 * 1000L;
    private static final long QUIET_MS = 6000L;

    /** Kunci waktu sholat yang sedang diputar (null = tidak ada). Dibaca plugin untuk UI. */
    static volatile String playingKey;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private AudioManager audio;
    private AudioFocusRequest focusRequest;
    private AudioManager.OnAudioFocusChangeListener focusListener;
    private String key;
    private String title;
    private String body;
    private boolean test;

    static void start(Context ctx, Bundle extras) {
        Intent i = new Intent(ctx, AdzanService.class).setAction(ACTION_PLAY);
        if (extras != null) i.putExtras(extras);
        try {
            ContextCompat.startForegroundService(ctx, i);
        } catch (RuntimeException e) {
            // mis. ForegroundServiceStartNotAllowedException: tetap beri tahu dengan bunyi notifikasi.
            Log.w(TAG, "Layanan adzan tidak bisa dimulai", e);
            Notifications.showFallback(ctx, extras);
        }
    }

    static void stop(Context ctx) {
        if (playingKey == null) return;
        try {
            ctx.startService(new Intent(ctx, AdzanService.class).setAction(ACTION_STOP));
        } catch (RuntimeException e) {
            Log.w(TAG, "Gagal menghentikan adzan", e);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action) || ACTION_DISMISS.equals(action)) {
            finish(ACTION_STOP.equals(action));
            return START_NOT_STICKY;
        }
        if (intent == null || !ACTION_PLAY.equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        releasePlayer();
        Notifications.ensureChannels(this);
        AdzanStore.Config c = AdzanStore.load(this);
        test = intent.getBooleanExtra(AdzanScheduler.EXTRA_TEST, false);
        key = intent.getStringExtra(AdzanScheduler.EXTRA_KEY);
        title = Labels.title(key, test);
        body = Labels.body(intent.getStringExtra(AdzanScheduler.EXTRA_TIME), c.tz, c.cityName, test);

        audio = getSystemService(AudioManager.class);
        int ringer = audio == null ? AudioManager.RINGER_MODE_NORMAL : audio.getRingerMode();
        int mode = audio == null ? AudioManager.MODE_NORMAL : audio.getMode();
        boolean inCall = mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION;
        boolean withSound = ringer == AudioManager.RINGER_MODE_NORMAL && !inCall;

        try {
            ServiceCompat.startForeground(this, Notifications.ID_PRAYER, buildNotification(withSound, ringer, inCall).build(), foregroundType());
        } catch (RuntimeException e) {
            Log.w(TAG, "startForeground ditolak", e);
            Notifications.showFallback(this, intent.getExtras());
            stopSelf();
            return START_NOT_STICKY;
        }
        playingKey = key == null ? "test" : key;
        AdzanAlarmPlugin.emitState();

        if (withSound && startPlayer()) {
            handler.postDelayed(() -> finish(true), MAX_PLAY_MS);
        } else {
            if (ringer == AudioManager.RINGER_MODE_VIBRATE && !inCall) vibrate();
            handler.postDelayed(() -> finish(true), QUIET_MS);
        }

        // Sambil berjalan: perbarui jadwal dari myQuran bila tinggal sedikit.
        new Thread(() -> {
            try {
                if (ScheduleRefresher.refreshIfNeeded(getApplicationContext())) AdzanScheduler.scheduleNext(getApplicationContext());
                ScheduleRefresher.noticeIfStale(getApplicationContext());
            } catch (Exception e) {
                Log.w(TAG, "Pembaruan jadwal gagal", e);
            }
        }).start();
        return START_NOT_STICKY;
    }

    private int foregroundType() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
    }

    private NotificationCompat.Builder buildNotification(boolean playing, int ringer, boolean inCall) {
        String text = body;
        if (!playing && !test) {
            if (inCall) text = body + " · adzan tidak diputar saat panggilan";
            else if (ringer == AudioManager.RINGER_MODE_VIBRATE) text = body + " · HP dalam mode getar";
            else if (ringer == AudioManager.RINGER_MODE_SILENT) text = body + " · HP dalam mode senyap";
        }
        NotificationCompat.Builder b = Notifications.base(this, Notifications.CH_ADZAN, title, text)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOnlyAlertOnce(true);
        if (playing) {
            b.setOngoing(true)
                .addAction(R.drawable.ic_stat_stop, "Hentikan adzan", servicePending(ACTION_STOP, 1))
                .setDeleteIntent(servicePending(ACTION_DISMISS, 2));
        } else {
            b.setAutoCancel(true);
        }
        return b;
    }

    private PendingIntent servicePending(String action, int req) {
        Intent i = new Intent(this, AdzanService.class).setAction(action);
        return PendingIntent.getService(this, 4000 + req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private boolean startPlayer() {
        AudioAttributes attrs = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
        try (AssetFileDescriptor afd = getAssets().openFd(Labels.audioAsset(key))) {
            player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            player.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
            player.setOnCompletionListener((mp) -> finish(true));
            player.setOnErrorListener((mp, what, extra) -> {
                Log.w(TAG, "MediaPlayer error " + what + "/" + extra);
                finish(true);
                return true;
            });
            player.prepare();
            requestFocus(attrs);
            player.start();
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Adzan gagal diputar", e);
            releasePlayer();
            Notifications.showFallback(this, null);
            return false;
        }
    }

    private void requestFocus(AudioAttributes attrs) {
        if (audio == null) return;
        focusListener = (change) -> {
            // Panggilan masuk / aplikasi lain merebut audio: hentikan adzan.
            if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) handler.post(() -> finish(true));
        };
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attrs).setOnAudioFocusChangeListener(focusListener, handler).build();
            audio.requestAudioFocus(focusRequest);
        } else {
            audio.requestAudioFocus(focusListener, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
        }
    }

    private void abandonFocus() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) audio.abandonAudioFocusRequest(focusRequest);
        } else if (focusListener != null) {
            audio.abandonAudioFocus(focusListener);
        }
        focusRequest = null;
        focusListener = null;
    }

    private void vibrate() {
        long[] pattern = { 0, 700, 400, 700, 400, 700 };
        try {
            Vibrator v;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = getSystemService(VibratorManager.class);
                v = vm == null ? null : vm.getDefaultVibrator();
            } else {
                v = getSystemService(Vibrator.class);
            }
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            else v.vibrate(pattern, -1);
        } catch (RuntimeException ignored) {
            // perangkat tanpa penggetar
        }
    }

    private void releasePlayer() {
        handler.removeCallbacksAndMessages(null);
        if (player != null) {
            try {
                player.stop();
            } catch (IllegalStateException ignored) {
                // belum mulai
            }
            player.release();
            player = null;
        }
        abandonFocus();
    }

    /** Hentikan adzan. keepNotification = biarkan notifikasi "Waktu … telah tiba" tetap ada (tanpa tombol). */
    private void finish(boolean keepNotification) {
        releasePlayer();
        playingKey = null;
        AdzanAlarmPlugin.emitState();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH);
        if (keepNotification && title != null) {
            Notifications.notify(this, Notifications.ID_PRAYER, buildNotification(false, AudioManager.RINGER_MODE_NORMAL, false));
        } else {
            androidx.core.app.NotificationManagerCompat.from(this).cancel(Notifications.ID_PRAYER);
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        releasePlayer();
        playingKey = null;
        super.onDestroy();
    }
}
