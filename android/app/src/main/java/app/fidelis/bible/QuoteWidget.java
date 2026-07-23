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

import org.json.JSONObject;

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
            refreshAll(context);
        }
    }

    @Override
    public void onDisabled(Context context) {
        cancelMidnight(context);
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName self = new ComponentName(context, QuoteWidget.class);
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
        String text = context.getString(R.string.widget_update_required);
        String author = "";
        boolean available = false;
        try {
            JSONObject quote = loadDay(context).optJSONObject("quote");
            if (quote == null) throw new IllegalStateException("Calendar day has no quote.");
            String candidateText = quote.optString("text", "").trim();
            String candidateAuthor = quote.optString("author", "").trim();
            if (candidateText.isEmpty() || candidateAuthor.isEmpty()) {
                throw new IllegalStateException("Calendar quote is incomplete.");
            }
            text = candidateText;
            author = candidateAuthor;
            available = true;
        } catch (Exception ignored) {
            // Fail closed. Never show a plausible but unverified daily quote.
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quote);
        String q1 = String.valueOf((char) 0x201C); // U+201C left double quote
        String q2 = String.valueOf((char) 0x201D); // U+201D right double quote
        views.setTextViewText(R.id.quote_text, available ? q1 + text + q2 : text);
        views.setTextViewText(R.id.quote_author, author);
        views.setContentDescription(R.id.quote_root, available
                ? context.getString(R.string.widget_quote_accessibility, text, author)
                : context.getString(R.string.widget_update_accessibility));
        WidgetAppearance.apply(
                context,
                views,
                R.id.quote_root,
                R.id.quote_cross,
                R.id.quote_label,
                R.id.quote_text,
                R.id.quote_author
        );

        // FID-NATIVE-002: the Quote card lives on Today; open it there, scrolled
        // to the card, via fidelis://quote (Capacitor appUrlOpen → src/App.tsx routes it).
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("fidelis://quote"),
                context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, RC_OPEN, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quote_root, pi);

        manager.updateAppWidget(id, views);
    }

    private static String todayKey() {
        Calendar cal = new GregorianCalendar();
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
        next.set(Calendar.SECOND, 4);
        next.set(Calendar.MILLISECOND, 0);
        am.set(AlarmManager.RTC, next.getTimeInMillis(), midnightIntent(context));
    }

    private static PendingIntent midnightIntent(Context context) {
        Intent intent = new Intent(context, QuoteWidget.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(context, RC_MIDNIGHT, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
