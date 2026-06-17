package app.fidelis.bible;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;

/**
 * "Quote of the Day" home-screen widget (Android App Widget): the day's saying
 * from the Fathers, Doctors, and saints.
 *
 * Reads the same bundled res/raw/calendar.json as CalendarWidget (object keyed
 * by local ISO date), produced by scripts/build-calendar-widget.ts from the web
 * app's quoteOfTheDay() — feast-aware and seasonally aware, no engine ported.
 * Refresh is an inexact local-midnight AlarmManager; tap opens the app.
 */
public class QuoteWidget extends AppWidgetProvider {

    private static final String ACTION_MIDNIGHT = "app.fidelis.bible.QUOTE_MIDNIGHT";
    private static final int RC_OPEN = 4;
    private static final int RC_MIDNIGHT = 5;

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
            ComponentName self = new ComponentName(context, QuoteWidget.class);
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
        String text = "Be still, and see that I am God.";
        String author = "Psalm 45:11";
        try {
            JSONObject all = loadDays(context);
            JSONObject d = all.optJSONObject(todayKey());
            JSONObject q = d != null ? d.optJSONObject("quote") : null;
            if (q != null) {
                text = q.optString("text", text);
                author = q.optString("author", author);
            }
        } catch (Exception ignored) {
            // keep the fallback
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quote);
        String q1 = String.valueOf((char) 0x201C); // U+201C left double quote
        String q2 = String.valueOf((char) 0x201D); // U+201D right double quote
        views.setTextViewText(R.id.quote_text, q1 + text + q2);
        views.setTextViewText(R.id.quote_author, author);

        Intent open = new Intent(context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, RC_OPEN, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quote_root, pi);

        manager.updateAppWidget(id, views);
    }

    private String todayKey() {
        Calendar cal = new GregorianCalendar();
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
        next.set(Calendar.SECOND, 4);
        next.set(Calendar.MILLISECOND, 0);
        am.set(AlarmManager.RTC, next.getTimeInMillis(), midnightIntent(context));
    }

    private PendingIntent midnightIntent(Context context) {
        Intent intent = new Intent(context, QuoteWidget.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(context, RC_MIDNIGHT, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
