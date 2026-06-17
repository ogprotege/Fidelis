package app.fidelis.bible;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName self = new ComponentName(context, CalendarWidget.class);
            for (int id : manager.getAppWidgetIds(self)) updateWidget(context, manager, id);
            scheduleNextMidnight(context);
        }
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(midnightIntent(context));
    }

    private void updateWidget(Context context, AppWidgetManager manager, int id) {
        String dayLabel = "Today at Mass";
        String readingsText = "Open Fidelis for today's readings.";
        try {
            JSONObject all = loadDays(context);
            String today = todayKey();
            JSONObject d = all.optJSONObject(today);
            if (d != null) {
                String celeb = d.optString("celebration", "");
                String season = d.optString("seasonLabel", "");
                dayLabel = !celeb.isEmpty() ? celeb : (!season.isEmpty() ? season : dayLabel);
                JSONArray rs = d.optJSONArray("readings");
                if (rs != null && rs.length() > 0) {
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < rs.length(); i++) {
                        JSONObject r = rs.getJSONObject(i);
                        if (i > 0) sb.append('\n');
                        sb.append(r.optString("cite"));
                    }
                    readingsText = sb.toString();
                }
            }
        } catch (Exception ignored) {
            // keep the fallback
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        views.setTextViewText(R.id.cal_day, dayLabel);
        views.setTextViewText(R.id.cal_readings, readingsText);

        Intent open = new Intent(context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, RC_OPEN, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.cal_root, pi);

        manager.updateAppWidget(id, views);
    }

    private String todayKey() {
        Calendar cal = new GregorianCalendar(); // device time zone, Gregorian
        return String.format(Locale.US, "%04d-%02d-%02d",
                cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH));
    }

    private JSONObject loadDays(Context context) throws Exception {
        try (InputStream in = context.getResources().openRawResource(R.raw.calendar);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            return new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
        }
    }

    private void scheduleNextMidnight(Context context) {
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

    private PendingIntent midnightIntent(Context context) {
        Intent intent = new Intent(context, CalendarWidget.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(context, RC_MIDNIGHT, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
