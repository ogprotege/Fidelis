package app.fidelis.bible;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;

/**
 * Receives the one positive result Android exposes for requestPinAppWidget().
 * A declined request deliberately produces no callback. The tiny confirmation
 * is persisted before the process can be reclaimed, then relayed to a live
 * WidgetPinPlugin instance when one exists.
 */
public class WidgetPinResultReceiver extends BroadcastReceiver {

    static final String ACTION_CONFIRMATION = "app.fidelis.bible.WIDGET_PIN_CONFIRMED";
    static final String EXTRA_TOKEN = "app.fidelis.bible.extra.WIDGET_PIN_TOKEN";
    static final String EXTRA_KIND = "app.fidelis.bible.extra.WIDGET_PIN_KIND";

    private static final String PREFS = "fidelis_widget_pin";
    private static final String PREF_TOKEN = "token";
    private static final String PREF_KIND = "kind";
    private static final String PREF_WIDGET_ID = "widget_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ACTION_CONFIRMATION.equals(intent.getAction())) return;
        Confirmation confirmation = confirmationFromIntent(intent);
        if (confirmation == null) return;
        WidgetPinContract.Kind kind = WidgetPinContract.Kind.fromWireName(confirmation.kind);
        AppWidgetProviderInfo info = AppWidgetManager.getInstance(context)
                .getAppWidgetInfo(confirmation.appWidgetId);
        ComponentName expectedProvider = kind == null
                ? null
                : new ComponentName(context, kind.providerClass());
        // A valid id alone is not proof that the requested Fidelis widget was
        // installed. Persist success only when Android reports that this exact
        // id belongs to the allow-listed provider tied to the one-shot request.
        if (info == null || expectedProvider == null || !expectedProvider.equals(info.provider)) {
            return;
        }

        // commit(), rather than apply(), is intentional in a short-lived receiver:
        // the result must reach disk before Android may reclaim this process.
        preferences(context).edit()
                .putString(PREF_TOKEN, confirmation.token)
                .putString(PREF_KIND, confirmation.kind)
                .putInt(PREF_WIDGET_ID, confirmation.appWidgetId)
                .commit();

        WidgetPinPlugin.publishConfirmation(confirmation);
    }

    static synchronized Confirmation consume(Context context) {
        SharedPreferences prefs = preferences(context);
        String token = prefs.getString(PREF_TOKEN, null);
        String kind = prefs.getString(PREF_KIND, null);
        int appWidgetId = prefs.getInt(PREF_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (!WidgetPinContract.isValidConfirmation(token, kind, appWidgetId)) {
            prefs.edit().clear().commit();
            return null;
        }
        prefs.edit().clear().commit();
        return new Confirmation(token, kind, appWidgetId);
    }

    static Confirmation confirmationFromIntent(Intent intent) {
        String token = intent.getStringExtra(EXTRA_TOKEN);
        String kind = intent.getStringExtra(EXTRA_KIND);
        int appWidgetId = intent.getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
        );
        if (!WidgetPinContract.isValidConfirmation(token, kind, appWidgetId)) return null;
        return new Confirmation(token, kind, appWidgetId);
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static final class Confirmation {
        final String token;
        final String kind;
        final int appWidgetId;

        Confirmation(String token, String kind, int appWidgetId) {
            this.token = token;
            this.kind = kind;
            this.appWidgetId = appWidgetId;
        }

        JSObject toJSObject() {
            return new JSObject()
                    .put("token", token)
                    .put("kind", kind)
                    .put("appWidgetId", appWidgetId);
        }

    }
}
