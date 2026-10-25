package io.github.syamaydev.imuslim;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import io.github.syamaydev.imuslim.adzan.AdzanAlarmPlugin;

public class MainActivity extends BridgeActivity {

    /** Rute aplikasi yang dibuka dari notifikasi (mis. "/sholat"). */
    public static final String EXTRA_ROUTE = "io.github.syamaydev.imuslim.extra.ROUTE";
    private static String pendingRoute;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdzanAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        capture(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Aplikasi sudah terbuka: kirim langsung ke halaman (bukan disimpan untuk pembukaan berikutnya).
        if (capture(intent) != null) AdzanAlarmPlugin.emitRoute(consumeRoute());
    }

    private static synchronized String capture(Intent intent) {
        String route = intent == null ? null : intent.getStringExtra(EXTRA_ROUTE);
        // Hanya rute internal sederhana.
        if (route != null && route.matches("^/[a-z0-9/-]{0,40}$")) {
            pendingRoute = route;
            intent.removeExtra(EXTRA_ROUTE);
            return route;
        }
        return null;
    }

    public static synchronized String consumeRoute() {
        String r = pendingRoute;
        pendingRoute = null;
        return r;
    }
}
