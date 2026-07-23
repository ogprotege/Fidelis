package app.fidelis.bible;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Restores every widget's date-sensitive state after system clock, time-zone,
 * reboot, and package-replacement events. Each provider owns its rendering and
 * alarm, while this receiver gives those lifecycle events one audited entrypoint.
 */
public class WidgetRefreshCoordinator extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !isRefreshAction(intent.getAction())) return;
        refreshAll(context);
    }

    static boolean isRefreshAction(String action) {
        return Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
    }

    static void refreshAll(Context context) {
        VotdWidget.refreshAll(context);
        CalendarWidget.refreshAll(context);
        QuoteWidget.refreshAll(context);
    }
}
