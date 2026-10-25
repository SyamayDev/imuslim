package io.github.syamaydev.imuslim.adzan;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import io.github.syamaydev.imuslim.MainActivity;
import java.util.List;

/**
 * Jembatan JavaScript ↔ alarm adzan native (dipakai src/native/adzan.js).
 *  configure({enabled, adzan, imsak, cityId, cityName, tz, offsetHours, events[]})
 *  getStatus(), requestNotifications(), openSettings({target}), test({seconds, key}), stop(),
 *  getLaunchRoute(); event "state" (adzan mulai/berhenti) & "route" (notifikasi diketuk).
 */
@CapacitorPlugin(name = "AdzanAlarm", permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) })
public class AdzanAlarmPlugin extends Plugin {

    private static volatile AdzanAlarmPlugin instance;

    @Override
    public void load() {
        instance = this;
        Notifications.ensureChannels(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
    }

    static void emitState() {
        AdzanAlarmPlugin p = instance;
        if (p != null) p.notifyListeners("state", new JSObject().put("playing", AdzanService.playingKey), true);
    }

    public static void emitRoute(String route) {
        AdzanAlarmPlugin p = instance;
        if (p != null && route != null) p.notifyListeners("route", new JSObject().put("route", route), true);
    }

    @PluginMethod
    public void configure(PluginCall call) {
        Context ctx = getContext();
        AdzanStore.Config c = AdzanStore.load(ctx);
        String cityId = call.getString("cityId", "");
        String tz = call.getString("tz", "WIB");
        int offset = call.getInt("offsetHours", 7);
        if (!cityId.isEmpty() && !AdzanStore.CITY_RE.matcher(cityId).matches()) {
            call.reject("ID kota tidak valid");
            return;
        }
        if (offset < 7 || offset > 9) {
            call.reject("Zona waktu tidak valid");
            return;
        }
        boolean cityChanged = !cityId.equals(c.cityId) || offset != c.offsetHours;
        c.enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false)) && !cityId.isEmpty();
        c.adzan = Boolean.TRUE.equals(call.getBoolean("adzan", false));
        c.imsak = Boolean.TRUE.equals(call.getBoolean("imsak", false));
        c.cityName = call.getString("cityName", "");
        c.tz = tz;
        c.offsetHours = offset;
        c.cityId = cityId;
        List<AdzanStore.Event> incoming = AdzanStore.parseEvents(call.getArray("events"));
        if (cityChanged) {
            c.events.clear();
            c.lastRefreshAttempt = 0;
        }
        c.merge(incoming, System.currentTimeMillis());
        AdzanStore.save(ctx, c);
        if (c.enabled) AdzanScheduler.scheduleNext(ctx);
        else AdzanScheduler.cancelAll(ctx);
        call.resolve(status());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsCallback");
        } else {
            call.resolve(status());
        }
    }

    @PermissionCallback
    private void notificationsCallback(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Context ctx = getContext();
        String pkg = ctx.getPackageName();
        String target = call.getString("target", "app");
        Intent intent;
        switch (target) {
            case "exactAlarm":
                intent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                    ? new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + pkg))
                    : appDetails(pkg);
                break;
            case "battery":
                intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + pkg));
                break;
            case "notifications":
                intent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg)
                    : appDetails(pkg);
                break;
            default:
                intent = appDetails(pkg);
        }
        try {
            getActivity().startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException e) {
            try {
                getActivity().startActivity(appDetails(pkg));
            } catch (RuntimeException ignored) {
                call.reject("Pengaturan tidak dapat dibuka di perangkat ini");
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void test(PluginCall call) {
        int seconds = Math.max(3, Math.min(300, call.getInt("seconds", 10)));
        long at = AdzanScheduler.scheduleTest(getContext(), seconds, call.getString("key", "dzuhur"));
        call.resolve(new JSObject().put("at", at));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        AdzanService.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getLaunchRoute(PluginCall call) {
        call.resolve(new JSObject().put("route", MainActivity.consumeRoute()));
    }

    private static Intent appDetails(String pkg) {
        return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
    }

    private JSObject status() {
        Context ctx = getContext();
        AdzanStore.Config c = AdzanStore.load(ctx);
        JSObject o = new JSObject();
        o.put("enabled", c.enabled);
        o.put("adzan", c.adzan);
        o.put("imsak", c.imsak);
        o.put("cityId", c.cityId);
        o.put("cityName", c.cityName);
        o.put("tz", c.tz);
        o.put("notifications", NotificationManagerCompat.from(ctx).areNotificationsEnabled() && channelEnabled(ctx));
        o.put("exactAlarm", AdzanScheduler.canExact(ctx));
        PowerManager pm = ctx.getSystemService(PowerManager.class);
        o.put("batteryUnrestricted", pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
        AdzanStore.Event next = c.next(System.currentTimeMillis());
        if (next != null) o.put("next", new JSObject().put("key", next.key).put("date", next.date).put("time", next.time).put("at", next.at));
        o.put("eventsUntil", c.lastEventAt());
        o.put("playing", AdzanService.playingKey);
        o.put("sdk", Build.VERSION.SDK_INT);
        o.put("manufacturer", Build.MANUFACTURER);
        return o;
    }

    private static boolean channelEnabled(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        NotificationChannel ch = nm == null ? null : nm.getNotificationChannel(Notifications.CH_ADZAN);
        return ch == null || ch.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }
}
