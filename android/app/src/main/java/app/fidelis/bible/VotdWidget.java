package app.fidelis.bible;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.GregorianCalendar;

/**
 * Verse of the Day home-screen widget for Fidelis (Android App Widget).
 *
 * Mirrors ios/WidgetExtension/FidelisWidget.swift and src/lib/votd.ts so the
 * Android widget, the iOS widget, and the web app always show the same verse:
 *
 *     index = (dayOfYear + year) mod count        (Gregorian, device time zone)
 *
 * The cycle is the bundled res/raw/votd.json, produced by
 * scripts/build-votd-widget.mjs -- the same pre-resolved Douay-Rheims data the
 * iOS widget reads. Fully offline: no network, and the only ported logic is the
 * one-line selection formula above.
 */
public class VotdWidget extends AppWidgetProvider {

    /** Internal broadcast the local-midnight alarm fires to roll the verse over. */
    private static final String ACTION_MIDNIGHT = "app.fidelis.bible.VOTD_MIDNIGHT";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
        scheduleNextMidnight(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_MIDNIGHT.equals(intent.getAction())) {
            refreshAll(context);
        }
    }

    @Override
    public void onDisabled(Context context) {
        // Last widget removed -- stop the daily alarm.
        cancelMidnight(context);
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName self = new ComponentName(context, VotdWidget.class);
        int[] ids = manager.getAppWidgetIds(self);
        if (ids.length == 0) {
            cancelMidnight(context);
            return;
        }
        for (int id : ids) updateWidget(context, manager, id);
        scheduleNextMidnight(context);
    }

    private static void cancelMidnight(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(midnightIntent(context));
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int id) {
        String reference = "";
        String text = context.getString(R.string.widget_update_required);
        boolean available = false;
        try {
            JSONArray cycle = loadCycle(context);
            if (cycle.length() == 0) throw new IllegalStateException("Verse cycle is empty.");
            Calendar cal = new GregorianCalendar(); // device time zone, Gregorian
            int dayOfYear = cal.get(Calendar.DAY_OF_YEAR);
            int year = cal.get(Calendar.YEAR);
            int index = Math.floorMod(dayOfYear + year, cycle.length());
            JSONObject item = cycle.getJSONObject(index);
            String candidateReference = item.optString("reference", "").trim();
            String candidateText = item.optString("text", "").trim();
            if (candidateReference.isEmpty() || candidateText.isEmpty()) {
                throw new IllegalStateException("Verse cycle entry is incomplete.");
            }
            reference = candidateReference;
            text = candidateText;
            available = true;
        } catch (Exception ignored) {
            // Fail closed. A generic verse must never masquerade as today's selection.
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_votd);
        // Wrap the verse in curly quotation marks (U+201C ... U+201D) by code point,
        // so there is no non-ASCII in this source file regardless of compiler encoding.
        String q1 = String.valueOf((char) 0x201C);
        String q2 = String.valueOf((char) 0x201D);
        views.setTextViewText(R.id.votd_text, available ? q1 + text + q2 : text);
        views.setTextViewText(R.id.votd_reference, reference);
        views.setContentDescription(
                R.id.votd_root,
                available
                        ? context.getString(R.string.widget_votd_accessibility, text, reference)
                        : context.getString(R.string.widget_update_accessibility)
        );
        WidgetAppearance.apply(
                context,
                views,
                R.id.votd_root,
                R.id.votd_cross,
                R.id.votd_label,
                R.id.votd_text,
                R.id.votd_reference
        );

        // FID-NATIVE-002: tapping the widget opens Today scrolled to the verse
        // card, via the explicit fidelis://verse deep link so all three
        // widgets share one mechanism (Capacitor appUrlOpen → src/App.tsx routes it).
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("fidelis://verse"),
                context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.votd_root, pi);

        manager.updateAppWidget(id, views);
    }

    private static JSONArray loadCycle(Context context) throws Exception {
        try (InputStream in = context.getResources().openRawResource(R.raw.votd);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            return new JSONArray(out.toString(StandardCharsets.UTF_8.name()));
        }
    }

    private static void scheduleNextMidnight(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Calendar next = new GregorianCalendar();
        next.add(Calendar.DAY_OF_YEAR, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 2);
        next.set(Calendar.MILLISECOND, 0);
        // Inexact set() -- no exact-alarm permission needed; a rollover within a
        // few minutes of midnight is fine for a daily verse. RTC (not _WAKEUP) so
        // it never wakes the device just to refresh a home-screen widget.
        am.set(AlarmManager.RTC, next.getTimeInMillis(), midnightIntent(context));
    }

    private static PendingIntent midnightIntent(Context context) {
        Intent intent = new Intent(context, VotdWidget.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(context, 1, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
