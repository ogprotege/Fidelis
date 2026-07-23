package app.fidelis.bible;

import android.content.Context;
import android.content.res.Configuration;
import android.widget.RemoteViews;

/** Applies the app's pinned Day/Night choice, or the current system appearance. */
final class WidgetAppearance {

    private WidgetAppearance() {}

    static void apply(
            Context context,
            RemoteViews views,
            int rootId,
            int crossId,
            int labelId,
            int primaryTextId,
            int secondaryTextId
    ) {
        String appearance = WidgetSharedSettings.appearance(context);
        if (usesSystemResources(appearance)) {
            // The XML uses values/ and values-night/ aliases for every color
            // and the background drawable. Leaving those resource references
            // intact lets the AppWidget host re-inflate them for a uiMode
            // change, including while Fidelis is not running. A manifest
            // CONFIGURATION_CHANGED receiver cannot work on modern Android.
            return;
        }
        boolean night = useNightPalette(context);
        int background = night ? R.drawable.widget_bg_night : R.drawable.widget_bg_day;
        int gold = context.getColor(night ? R.color.fidelis_night_gold : R.color.fidelis_day_gold);
        int goldText = context.getColor(
                night ? R.color.fidelis_night_gold_text : R.color.fidelis_day_gold_text
        );
        int ink = context.getColor(night ? R.color.fidelis_night_ink : R.color.fidelis_day_ink);
        int muted = context.getColor(
                night ? R.color.fidelis_night_muted : R.color.fidelis_day_muted
        );

        views.setInt(rootId, "setBackgroundResource", background);
        views.setInt(crossId, "setColorFilter", gold);
        views.setTextColor(labelId, goldText);
        views.setTextColor(primaryTextId, ink);
        views.setTextColor(secondaryTextId, muted);
    }

    static boolean useNightPalette(Context context) {
        String appearance = WidgetSharedSettings.appearance(context);
        if (WidgetSharedSettings.APPEARANCE_NIGHT.equals(appearance)) return true;
        if (WidgetSharedSettings.APPEARANCE_DAY.equals(appearance)) return false;
        int nightMode = context.getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES;
    }

    static boolean usesSystemResources(String appearance) {
        return WidgetSharedSettings.APPEARANCE_SYSTEM.equals(appearance);
    }
}
