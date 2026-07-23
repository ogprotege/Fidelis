package app.fidelis.bible;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.ref.WeakReference;
import java.util.UUID;

/** Capacitor bridge for Android's user-confirmed home-screen widget pin flow. */
@CapacitorPlugin(name = "WidgetPin")
public class WidgetPinPlugin extends Plugin {

    private static final String EVENT_CONFIRMED = "pinConfirmed";
    private static final String REASON_SUPPORTED = "supported";
    private static final String REASON_ANDROID_VERSION = "android_version";
    private static final String REASON_LAUNCHER_OR_PROFILE = "launcher_or_profile";

    private static volatile WeakReference<WidgetPinPlugin> livePlugin =
            new WeakReference<>(null);

    @Override
    public void load() {
        livePlugin = new WeakReference<>(this);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        String reason = supportReason(manager);
        JSObject counts = new JSObject();
        for (WidgetPinContract.Kind kind : WidgetPinContract.Kind.values()) {
            ComponentName provider = new ComponentName(getContext(), kind.providerClass());
            counts.put(kind.wireName(), manager.getAppWidgetIds(provider).length);
        }
        call.resolve(new JSObject()
                .put("supported", REASON_SUPPORTED.equals(reason))
                .put("reason", reason)
                .put("counts", counts));
    }

    @PluginMethod
    public void requestPin(PluginCall call) {
        WidgetPinContract.Kind kind = WidgetPinContract.Kind.fromWireName(call.getString("kind"));
        if (kind == null) {
            call.reject("Unknown widget kind.", "INVALID_KIND");
            return;
        }

        // Keep the platform guard in this method so Android lint can prove the
        // requestPinAppWidget() call below is unreachable on API 24 and 25.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve(new JSObject()
                    .put("requested", false)
                    .put("reason", REASON_ANDROID_VERSION));
            return;
        }

        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        String reason = supportReason(manager);
        if (!REASON_SUPPORTED.equals(reason)) {
            call.resolve(new JSObject()
                    .put("requested", false)
                    .put("reason", reason));
            return;
        }

        String token = UUID.randomUUID().toString();
        Intent callbackIntent = new Intent(getContext(), WidgetPinResultReceiver.class)
                .setAction(WidgetPinResultReceiver.ACTION_CONFIRMATION)
                .setPackage(getContext().getPackageName())
                .setData(Uri.parse("fidelis-widget-pin://confirmed/" + token))
                .putExtra(WidgetPinResultReceiver.EXTRA_TOKEN, token)
                .putExtra(WidgetPinResultReceiver.EXTRA_KIND, kind.wireName());

        // The launcher must add EXTRA_APPWIDGET_ID, so this narrowly scoped,
        // explicit, one-shot callback is the one PendingIntent that must remain
        // mutable on Android 12+. Older releases are mutable by default.
        int flags = PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent successCallback = PendingIntent.getBroadcast(
                getContext(),
                token.hashCode(),
                callbackIntent,
                flags
        );

        try {
            boolean requested = manager.requestPinAppWidget(
                    new ComponentName(getContext(), kind.providerClass()),
                    null,
                    successCallback
            );
            if (!requested) successCallback.cancel();
            JSObject result = new JSObject()
                    .put("requested", requested)
                    .put("reason", requested ? REASON_SUPPORTED : REASON_LAUNCHER_OR_PROFILE);
            if (requested) result.put("token", token);
            call.resolve(result);
        } catch (IllegalStateException error) {
            successCallback.cancel();
            call.reject(
                    "Widget pinning requires Fidelis to be in the foreground.",
                    "NOT_FOREGROUND",
                    error
            );
        }
    }

    @PluginMethod
    public void consumePinConfirmation(PluginCall call) {
        WidgetPinResultReceiver.Confirmation confirmation =
                WidgetPinResultReceiver.consume(getContext());
        JSObject result = new JSObject();
        if (confirmation != null) result.put("confirmation", confirmation.toJSObject());
        call.resolve(result);
    }

    @PluginMethod
    public void syncSettings(PluginCall call) {
        String profile = call.getString("calendarProfile");
        String appearance = call.getString("appearance");
        String lectionaryPack = call.getString("lectionaryPackId");
        Boolean hasLocalProper = call.getBoolean("hasIndividualChurchProper");
        String localProperFingerprint = call.getString("localProperFingerprint");
        JSObject localCalendarOverlay = call.getObject("localCalendarOverlay");
        String normalizedProfile = WidgetSharedSettings.normalizeCalendarProfile(profile);
        String normalizedAppearance = WidgetSharedSettings.normalizeAppearance(appearance);
        if (normalizedProfile == null
                || normalizedAppearance == null
                || hasLocalProper == null
                || localProperFingerprint == null) {
            call.reject("Unknown widget calendar profile or appearance.", "INVALID_SETTINGS");
            return;
        }
        if (!WidgetSharedSettings.write(
                getContext(),
                normalizedProfile,
                normalizedAppearance,
                lectionaryPack,
                hasLocalProper,
                localProperFingerprint,
                localCalendarOverlay != null ? localCalendarOverlay.toString() : null)) {
            call.reject("Could not store widget settings.", "STORAGE_ERROR");
            return;
        }
        WidgetRefreshCoordinator.refreshAll(getContext());
        call.resolve(new JSObject()
                .put("stored", true)
                .put("calendarProfile", normalizedProfile)
                .put("appearance", normalizedAppearance)
                .put("lectionaryPackId", lectionaryPack));
    }

    private String supportReason(AppWidgetManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return REASON_ANDROID_VERSION;
        return manager.isRequestPinAppWidgetSupported()
                ? REASON_SUPPORTED
                : REASON_LAUNCHER_OR_PROFILE;
    }

    static void publishConfirmation(WidgetPinResultReceiver.Confirmation confirmation) {
        WidgetPinPlugin plugin = livePlugin.get();
        if (plugin != null) {
            plugin.notifyListeners(EVENT_CONFIRMED, confirmation.toJSObject(), true);
        }
    }

    @Override
    protected void handleOnDestroy() {
        WidgetPinPlugin plugin = livePlugin.get();
        if (plugin == this) livePlugin.clear();
        super.handleOnDestroy();
    }
}
