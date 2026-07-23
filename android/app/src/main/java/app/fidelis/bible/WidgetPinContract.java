package app.fidelis.bible;

import android.appwidget.AppWidgetProvider;

/** Stable, allow-listed names shared by the native widget-pinning bridge. */
final class WidgetPinContract {

    enum Kind {
        VERSE("verse", VotdWidget.class),
        MASS("mass", CalendarWidget.class),
        QUOTE("quote", QuoteWidget.class);

        private final String wireName;
        private final Class<? extends AppWidgetProvider> providerClass;

        Kind(String wireName, Class<? extends AppWidgetProvider> providerClass) {
            this.wireName = wireName;
            this.providerClass = providerClass;
        }

        String wireName() {
            return wireName;
        }

        Class<? extends AppWidgetProvider> providerClass() {
            return providerClass;
        }

        static Kind fromWireName(String value) {
            if (value == null) return null;
            for (Kind kind : values()) {
                if (kind.wireName.equals(value)) return kind;
            }
            return null;
        }
    }

    private WidgetPinContract() {}

    static boolean isValidConfirmation(String token, String kind, int appWidgetId) {
        return token != null
                && !token.isEmpty()
                && token.length() <= 128
                && Kind.fromWireName(kind) != null
                && appWidgetId != android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID;
    }
}
