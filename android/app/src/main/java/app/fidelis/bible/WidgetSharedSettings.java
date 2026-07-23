package app.fidelis.bible;

import android.content.Context;
import android.content.SharedPreferences;

/** Validated settings shared by the Capacitor app and Android widget providers. */
final class WidgetSharedSettings {

    static final String GENERAL = "roman.general";
    static final String US_ASCENSION_SUNDAY = "roman.us.ascension-sunday";
    static final String US_ASCENSION_THURSDAY = "roman.us.ascension-thursday";

    static final String APPEARANCE_SYSTEM = "system";
    static final String APPEARANCE_DAY = "day";
    static final String APPEARANCE_NIGHT = "night";
    static final String DERIVED_ROMAN_LECTIONARY = "roman.ordinary.derived-citation-table";

    private static final int SCHEMA_VERSION = 1;
    private static final String PREFS = "fidelis_widget_settings";
    private static final String KEY_SCHEMA = "schema_version";
    private static final String KEY_CALENDAR_PROFILE = "calendar_profile";
    private static final String KEY_APPEARANCE = "appearance";
    private static final String KEY_LECTIONARY_PACK = "lectionary_pack";
    private static final String KEY_HAS_LOCAL_PROPER = "has_local_proper";
    private static final String KEY_LOCAL_PROPER_FINGERPRINT = "local_proper_fingerprint";
    private static final String KEY_LOCAL_CALENDAR_OVERLAY = "local_calendar_overlay";
    private static final String[] LEGACY_CALENDAR_KEYS = {
            "calendar_region", "calendarRegion", "widgetCalendarRegion"
    };

    private WidgetSharedSettings() {}

    static String calendarProfile(Context context) {
        SharedPreferences prefs = preferences(context);
        String raw = prefs.getString(KEY_CALENDAR_PROFILE, null);
        if (raw == null) {
            for (String key : LEGACY_CALENDAR_KEYS) {
                raw = prefs.getString(key, null);
                if (raw != null) break;
            }
        }
        String normalized = normalizeCalendarProfile(raw);
        if (raw != null && normalized == null) {
            // Preserve an unknown/corrupt value long enough for CalendarData to
            // reject the missing profile. Silently substituting a plausible
            // jurisdiction would make the widget look authoritative when it is not.
            return raw;
        }
        if (normalized == null) normalized = US_ASCENSION_SUNDAY;

        if (!normalized.equals(raw) || prefs.getInt(KEY_SCHEMA, 0) != SCHEMA_VERSION) {
            SharedPreferences.Editor edit = prefs.edit()
                    .putInt(KEY_SCHEMA, SCHEMA_VERSION)
                    .putString(KEY_CALENDAR_PROFILE, normalized);
            for (String key : LEGACY_CALENDAR_KEYS) edit.remove(key);
            edit.apply();
        }
        return normalized;
    }

    static String appearance(Context context) {
        String normalized = normalizeAppearance(
                preferences(context).getString(KEY_APPEARANCE, null)
        );
        return normalized != null ? normalized : APPEARANCE_SYSTEM;
    }

    static String lectionaryPack(Context context) {
        return preferences(context).getString(KEY_LECTIONARY_PACK, DERIVED_ROMAN_LECTIONARY);
    }

    static boolean hasIndividualChurchProper(Context context) {
        return preferences(context).getBoolean(KEY_HAS_LOCAL_PROPER, false);
    }

    static String localProperFingerprint(Context context) {
        return preferences(context).getString(KEY_LOCAL_PROPER_FINGERPRINT, "");
    }

    static String localCalendarOverlay(Context context) {
        return preferences(context).getString(KEY_LOCAL_CALENDAR_OVERLAY, null);
    }

    static boolean write(
            Context context,
            String calendarProfile,
            String appearance,
            String lectionaryPack,
            boolean hasLocalProper,
            String localProperFingerprint,
            String localCalendarOverlay) {
        String normalizedProfile = normalizeCalendarProfile(calendarProfile);
        String normalizedAppearance = normalizeAppearance(appearance);
        if (normalizedProfile == null
                || normalizedAppearance == null
                || !DERIVED_ROMAN_LECTIONARY.equals(lectionaryPack)
                || localProperFingerprint == null
                || localProperFingerprint.isEmpty()) return false;

        SharedPreferences.Editor edit = preferences(context).edit()
                .putInt(KEY_SCHEMA, SCHEMA_VERSION)
                .putString(KEY_CALENDAR_PROFILE, normalizedProfile)
                .putString(KEY_APPEARANCE, normalizedAppearance)
                .putString(KEY_LECTIONARY_PACK, lectionaryPack)
                .putBoolean(KEY_HAS_LOCAL_PROPER, hasLocalProper)
                .putString(KEY_LOCAL_PROPER_FINGERPRINT, localProperFingerprint);
        if (localCalendarOverlay == null) edit.remove(KEY_LOCAL_CALENDAR_OVERLAY);
        else edit.putString(KEY_LOCAL_CALENDAR_OVERLAY, localCalendarOverlay);
        for (String key : LEGACY_CALENDAR_KEYS) edit.remove(key);
        return edit.commit();
    }

    static String normalizeCalendarProfile(String value) {
        if ("universal".equals(value)) return GENERAL;
        if ("usa".equals(value)) return US_ASCENSION_SUNDAY;
        if (GENERAL.equals(value)
                || US_ASCENSION_SUNDAY.equals(value)
                || US_ASCENSION_THURSDAY.equals(value)) {
            return value;
        }
        return null;
    }

    static String normalizeAppearance(String value) {
        if (APPEARANCE_SYSTEM.equals(value)
                || APPEARANCE_DAY.equals(value)
                || APPEARANCE_NIGHT.equals(value)) {
            return value;
        }
        return null;
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
