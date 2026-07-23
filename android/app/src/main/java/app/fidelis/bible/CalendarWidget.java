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

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;

/**
 * "Today at Mass" home-screen widget (Android App Widget): the day's liturgical
 * title and the Mass-reading citations.
 *
 * Like VotdWidget, it ports no engine logic. It reads the bundled
 * res/raw/calendar.json — produced by scripts/build-calendar-widget.ts from the
 * same resolveReadings()/liturgicalDay() the web app uses — which is an object
 * keyed by local ISO date (YYYY-MM-DD). The widget looks up the device's local
 * date and renders that entry; past the pre-resolved window it shows a calm
 * fallback. Refresh is an inexact local-midnight AlarmManager; tap opens the app.
 */
public class CalendarWidget extends AppWidgetProvider {

    private static final String ACTION_MIDNIGHT = "app.fidelis.bible.CALENDAR_MIDNIGHT";
    // Distinct PendingIntent request codes so this widget's intents never collide
    // with VotdWidget's or QuoteWidget's.
    private static final int RC_OPEN = 2;
    private static final int RC_MIDNIGHT = 3;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) updateWidget(context, manager, id);
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
        cancelMidnight(context);
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName self = new ComponentName(context, CalendarWidget.class);
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
        String dayLabel = context.getString(R.string.widget_update_required);
        String readingsText = "";
        boolean available = false;
        try {
            JSONObject d = loadDay(context);
            if (CalendarData.hasUnavailableGoverningFormulary(d)) {
                dayLabel = context.getString(R.string.widget_proper_readings_required);
                throw new IllegalStateException("Selected celebration proper is unavailable.");
            }
            String celebration = d.optString("celebration", "").trim();
            String season = d.optString("seasonLabel", "").trim();
            if (celebration.isEmpty() && season.isEmpty()) {
                throw new IllegalStateException("Calendar day has no title.");
            }
            JSONArray readings = d.optJSONArray("readings");
            if (readings == null || readings.length() == 0) {
                throw new IllegalStateException("Calendar day has no readings.");
            }
            StringBuilder citations = new StringBuilder();
            for (int i = 0; i < readings.length(); i++) {
                String citation = readings.getJSONObject(i).optString("cite", "").trim();
                if (citation.isEmpty()) {
                    throw new IllegalStateException("Calendar reading has no citation.");
                }
                if (i > 0) citations.append('\n');
                citations.append(citation);
            }
            dayLabel = !celebration.isEmpty() ? celebration : season;
            readingsText = citations.toString();
            available = true;
        } catch (Exception ignored) {
            // Fail closed. Never show a plausible but unverified liturgical day.
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        views.setTextViewText(R.id.cal_day, dayLabel);
        views.setTextViewText(R.id.cal_readings, readingsText);
        views.setContentDescription(R.id.cal_root, available
                ? context.getString(R.string.widget_calendar_accessibility, dayLabel, readingsText)
                : context.getString(R.string.widget_update_accessibility));
        WidgetAppearance.apply(
                context,
                views,
                R.id.cal_root,
                R.id.cal_cross,
                R.id.cal_label,
                R.id.cal_day,
                R.id.cal_readings
        );

        // FID-NATIVE-002: open the Mass readings, not just Today. Capacitor reads
        // the fidelis:// data URI (appUrlOpen) and src/App.tsx routes it to /readings.
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("fidelis://mass"),
                context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, RC_OPEN, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.cal_root, pi);

        manager.updateAppWidget(id, views);
    }

    private static String todayKey() {
        Calendar cal = new GregorianCalendar(); // device time zone, Gregorian
        return String.format(Locale.US, "%04d-%02d-%02d",
                cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH));
    }

    private static JSONObject loadDay(Context context) throws Exception {
        // FID-PERF-004: shared, process-local memoized decode (see CalendarData).
        return CalendarData.selectedDay(context, CalendarData.load(context), todayKey());
    }

    private static void scheduleNextMidnight(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Calendar next = new GregorianCalendar();
        next.add(Calendar.DAY_OF_YEAR, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 3);
        next.set(Calendar.MILLISECOND, 0);
        am.set(AlarmManager.RTC, next.getTimeInMillis(), midnightIntent(context));
    }

    private static PendingIntent midnightIntent(Context context) {
        Intent intent = new Intent(context, CalendarWidget.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(context, RC_MIDNIGHT, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
