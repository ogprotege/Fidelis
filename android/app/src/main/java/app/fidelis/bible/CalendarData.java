package app.fidelis.bible;

import android.content.Context;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.ref.SoftReference;
import java.nio.charset.StandardCharsets;
import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Iterator;
import java.util.Locale;

/**
 * Process-local memoized loader for the bundled, versioned calendar profiles,
 * shared by CalendarWidget ("Today at Mass") and QuoteWidget ("Quote of the Day").
 *
 * FID-PERF-004: both providers decoded the whole file on every widget update — and
 * with several widget instances, once per instance. This caches the parsed object
 * so a single update burst (and the sibling widget) reuses one decode. The cache is
 * a SoftReference: the perf win holds within a burst, but the multi-profile payload is reclaimable
 * under memory pressure and simply re-parsed on the next call, so nothing is pinned
 * in the app process for the lifetime of the install. A read failure is never
 * cached, so a transient miss retries next time.
 */
final class CalendarData {
    private static final int SCHEMA_VERSION = 1;
    private static final int LOCAL_OVERLAY_SCHEMA_VERSION = 1;
    private static final int MAX_LOCAL_OVERLAY_DAYS = 24;
    private static final String EXACT_CATALOG_FROM = "2024-01-01";
    private static final String EXACT_CATALOG_THROUGH = "2031-12-31";
    private static final String LECTIONARY_PACK_FINGERPRINT =
            "roman.ordinary.derived-citation-table@tamil-catholic-lectionary-c6c9d79"
                    + "+fidelis-supplement-2026.1:sha256:"
                    + "6f7cd44d64ab72780aab09b132e24eefa98732f8df1e3d93b3c1e68e82b65973";
    /** Tolerate small build/device clock disagreement without accepting a
     * snapshot whose asserted provenance is materially in the future. */
    private static final long MAX_GENERATED_CLOCK_SKEW_MILLIS = 5L * 60L * 1000L;
    private static final String GENERAL_PROFILE_FINGERPRINT =
            "roman.general.pack@2026.02:sha256:07cfa5d519b7a345a6bff4d141300486fcb32a777d465ff77ea9367f5e516d4e";
    private static final String US_ASCENSION_SUNDAY_PROFILE_FINGERPRINT =
            "roman.general.pack@2026.02:sha256:07cfa5d519b7a345a6bff4d141300486fcb32a777d465ff77ea9367f5e516d4e"
                    + "+roman.us.pack@2026.1:sha256:15b44bda7b1180ac996bfb8a0704378a9791036a1d387055c8a9477498395ef7"
                    + "+roman.us.ascension-sunday.pack@2026.1:sha256:88299b27261647d01d3e00a3ef11ab3f473f8b75798aed9e0cbf23220511f78d";
    private static final String US_ASCENSION_THURSDAY_PROFILE_FINGERPRINT =
            "roman.general.pack@2026.02:sha256:07cfa5d519b7a345a6bff4d141300486fcb32a777d465ff77ea9367f5e516d4e"
                    + "+roman.us.pack@2026.1:sha256:15b44bda7b1180ac996bfb8a0704378a9791036a1d387055c8a9477498395ef7"
                    + "+roman.us.ascension-thursday.pack@2026.1:sha256:82acb7ea84068f729a5fde6f4d44cbd7c72c300694643dea8fb5d57f4a372382";
    private static volatile SoftReference<JSONObject> cache;

    static JSONObject load(Context context) throws Exception {
        SoftReference<JSONObject> ref = cache;
        JSONObject hit = ref != null ? ref.get() : null;
        if (hit != null) {
            validateEnvelope(hit);
            return hit;
        }
        synchronized (CalendarData.class) {
            ref = cache;
            hit = ref != null ? ref.get() : null;
            if (hit != null) {
                validateEnvelope(hit);
                return hit;
            }
            JSONObject parsed = parse(context);
            validateEnvelope(parsed);
            cache = new SoftReference<>(parsed);
            return parsed;
        }
    }

    static JSONObject selectedDay(Context context, JSONObject envelope, String dayKey)
            throws Exception {
        if (!isSupportedLectionaryPack(WidgetSharedSettings.lectionaryPack(context))) {
            throw new IllegalStateException("Selected lectionary pack is unsupported.");
        }
        String profileId = WidgetSharedSettings.calendarProfile(context);
        JSONObject window = envelope.optJSONObject("window");
        JSONObject exactWindow = envelope.optJSONObject("exactCatalogWindow");
        JSONObject lectionaryPack = envelope.optJSONObject("lectionaryPack");
        if (window == null
                || exactWindow == null
                || lectionaryPack == null
                || !WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY.equals(
                        lectionaryPack.optString("id"))
                || lectionaryPack.optString("version", "").isEmpty()
                || !LECTIONARY_PACK_FINGERPRINT.equals(
                        lectionaryPack.optString("fingerprint"))
                || dayKey.compareTo(window.optString("from", "")) < 0
                || dayKey.compareTo(window.optString("through", "")) > 0
                || dayKey.compareTo(exactWindow.optString("from", "")) < 0
                || dayKey.compareTo(exactWindow.optString("through", "")) > 0) {
            throw new IllegalStateException("Selected calendar day is outside the snapshot window.");
        }
        JSONObject profiles = envelope.optJSONObject("profiles");
        JSONObject profile = profiles != null ? profiles.optJSONObject(profileId) : null;
        String expectedFingerprint = expectedFingerprint(profileId);
        if (profile == null
                || !profileId.equals(profile.optString("id"))
                || expectedFingerprint == null
                || !expectedFingerprint.equals(profile.optString("fingerprint"))) {
            throw new IllegalStateException("Selected calendar profile is missing.");
        }
        JSONObject days = profile.optJSONObject("days");
        JSONObject day = days != null ? days.optJSONObject(dayKey) : null;
        if (day == null) throw new IllegalStateException("Selected calendar day is missing.");
        return selectedLocalOverlayDay(
                context,
                dayKey,
                profileId,
                expectedFingerprint,
                window,
                day
        );
    }

    /** Seasonal fallback rows must never masquerade as a missing proper. */
    static boolean hasUnavailableGoverningFormulary(JSONObject day) {
        return day != null && day.optJSONObject("formularyState") != null;
    }

    private static JSONObject selectedLocalOverlayDay(
            Context context,
            String dayKey,
            String profileId,
            String profileFingerprint,
            JSONObject baseWindow,
            JSONObject baseDay) {
        if (!WidgetSharedSettings.hasIndividualChurchProper(context)) return baseDay;
        String raw = WidgetSharedSettings.localCalendarOverlay(context);
        if (raw == null || raw.isEmpty()) {
            throw new IllegalStateException("Individual-church overlay is missing.");
        }
        try {
            JSONObject overlay = new JSONObject(raw);
            JSONObject window = overlay.optJSONObject("window");
            JSONObject exactWindow = overlay.optJSONObject("exactCatalogWindow");
            JSONObject localLayer = overlay.optJSONObject("localLayer");
            JSONObject days = overlay.optJSONObject("days");
            if (overlay.optInt("schemaVersion", -1) != LOCAL_OVERLAY_SCHEMA_VERSION
                    || !profileId.equals(overlay.optString("baseProfileId"))
                    || !profileFingerprint.equals(overlay.optString("baseProfileFingerprint"))
                    || !WidgetSharedSettings.lectionaryPack(context).equals(
                            overlay.optString("lectionaryPackId"))
                    || localLayer == null
                    || !"local.individual-church".equals(localLayer.optString("id"))
                    || !"1".equals(localLayer.optString("version"))
                    || !WidgetSharedSettings.localProperFingerprint(context).equals(
                            localLayer.optString("fingerprint"))
                    || localLayer.optString("authority", "").isEmpty()
                    || localLayer.optString("provenance", "").isEmpty()
                    || window == null
                    || !baseWindow.optString("from").equals(window.optString("from"))
                    || !baseWindow.optString("through").equals(window.optString("through"))
                    || exactWindow == null
                    || !EXACT_CATALOG_FROM.equals(exactWindow.optString("from"))
                    || !EXACT_CATALOG_THROUGH.equals(exactWindow.optString("through"))
                    || days == null
                    || days.length() > MAX_LOCAL_OVERLAY_DAYS) {
                throw new IllegalStateException("Individual-church overlay metadata is invalid.");
            }
            validateTimestamps(
                    overlay.optString("generatedAt", ""),
                    overlay.optString("expiresAt", ""),
                    System.currentTimeMillis()
            );
            validateWindow(window.optString("from", ""), window.optString("through", ""));
            validateWindow(
                    exactWindow.optString("from", ""),
                    exactWindow.optString("through", "")
            );
            Iterator<String> dayKeys = days.keys();
            while (dayKeys.hasNext()) {
                String overlayDayKey = dayKeys.next();
                if (parseDayKey(overlayDayKey) == null
                        || overlayDayKey.compareTo(window.optString("from")) < 0
                        || overlayDayKey.compareTo(window.optString("through")) > 0
                        || !(days.opt(overlayDayKey) instanceof JSONObject)) {
                    throw new IllegalStateException(
                            "Individual-church overlay contains an invalid day."
                    );
                }
            }
            if (dayKey.compareTo(window.optString("from")) < 0
                    || dayKey.compareTo(window.optString("through")) > 0
                    || dayKey.compareTo(exactWindow.optString("from")) < 0
                    || dayKey.compareTo(exactWindow.optString("through")) > 0) {
                throw new IllegalStateException("Individual-church overlay day is out of range.");
            }
            JSONObject localDay = days.optJSONObject(dayKey);
            return localDay != null ? localDay : baseDay;
        } catch (Exception error) {
            if (error instanceof IllegalStateException) {
                throw (IllegalStateException) error;
            }
            throw new IllegalStateException("Individual-church overlay is corrupt.", error);
        }
    }

    private static JSONObject parse(Context context) throws Exception {
        try (InputStream in = context.getResources().openRawResource(R.raw.calendar);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            return new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
        }
    }

    /** Package-visible so host-side tests can prove corrupt metadata fails closed. */
    static void validateEnvelope(JSONObject envelope) {
        validateEnvelope(envelope, System.currentTimeMillis());
    }

    /** Fixed-clock seam for the host contract tests. */
    static void validateEnvelope(JSONObject envelope, long nowMillis) {
        JSONObject profiles = envelope.optJSONObject("profiles");
        JSONObject window = envelope.optJSONObject("window");
        JSONObject exactWindow = envelope.optJSONObject("exactCatalogWindow");
        JSONObject lectionaryPack = envelope.optJSONObject("lectionaryPack");
        String defaultProfile = envelope.optString("defaultProfileId", "");
        JSONObject defaultProfileObject = profiles != null
                ? profiles.optJSONObject(defaultProfile)
                : null;
        String defaultFingerprint = expectedFingerprint(defaultProfile);
        if (envelope.optInt("schemaVersion", -1) != SCHEMA_VERSION
                || envelope.optString("generatedAt", "").isEmpty()
                || profiles == null
                || window == null
                || exactWindow == null
                || lectionaryPack == null
                || !WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY.equals(
                        lectionaryPack.optString("id"))
                || lectionaryPack.optString("version", "").isEmpty()
                || !LECTIONARY_PACK_FINGERPRINT.equals(
                        lectionaryPack.optString("fingerprint"))
                || !EXACT_CATALOG_FROM.equals(exactWindow.optString("from"))
                || !EXACT_CATALOG_THROUGH.equals(exactWindow.optString("through"))
                || defaultFingerprint == null
                || defaultProfileObject == null
                || !defaultProfile.equals(defaultProfileObject.optString("id"))
                || !defaultFingerprint.equals(defaultProfileObject.optString("fingerprint"))) {
            throw new IllegalStateException("Unsupported calendar widget schema.");
        }
        validateTimestamps(
                envelope.optString("generatedAt", ""),
                envelope.optString("expiresAt", ""),
                nowMillis
        );
        validateWindow(window.optString("from", ""), window.optString("through", ""));
        validateWindow(
                exactWindow.optString("from", ""),
                exactWindow.optString("through", "")
        );
    }

    /** Pure string boundary so host tests do not depend on Android's JSONObject stub. */
    static void validateTimestamps(String rawGenerated, String rawExpiry, long nowMillis) {
        Date generated = parseInstant(rawGenerated);
        Date expiry = parseInstant(rawExpiry);
        if (generated == null
                || expiry == null
                || !generated.before(expiry)
                || generated.getTime() > nowMillis + MAX_GENERATED_CLOCK_SKEW_MILLIS) {
            throw new IllegalStateException("Unsupported calendar widget timestamps.");
        }
        if (expiry.getTime() <= nowMillis) {
            throw new IllegalStateException("Calendar widget data is expired.");
        }
    }

    /** Pure string boundary for malformed and reversed snapshot windows. */
    static void validateWindow(String rawFrom, String rawThrough) {
        Date windowFrom = parseDayKey(rawFrom);
        Date windowThrough = parseDayKey(rawThrough);
        if (windowFrom == null || windowThrough == null || windowFrom.after(windowThrough)) {
            throw new IllegalStateException("Unsupported calendar widget window.");
        }
    }

    private static Date parseInstant(String rawInstant) {
        SimpleDateFormat format = new SimpleDateFormat(
                "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                Locale.US
        );
        format.setLenient(false);
        ParsePosition position = new ParsePosition(0);
        Date parsed = format.parse(rawInstant, position);
        return parsed != null && position.getIndex() == rawInstant.length() ? parsed : null;
    }

    private static Date parseDayKey(String rawDay) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        format.setLenient(false);
        ParsePosition position = new ParsePosition(0);
        Date parsed = format.parse(rawDay, position);
        return parsed != null && position.getIndex() == rawDay.length() ? parsed : null;
    }

    /** Package-visible so host-side contract tests pin native/app digest parity. */
    static String expectedFingerprint(String profileId) {
        if (WidgetSharedSettings.GENERAL.equals(profileId)) return GENERAL_PROFILE_FINGERPRINT;
        if (WidgetSharedSettings.US_ASCENSION_SUNDAY.equals(profileId)) {
            return US_ASCENSION_SUNDAY_PROFILE_FINGERPRINT;
        }
        if (WidgetSharedSettings.US_ASCENSION_THURSDAY.equals(profileId)) {
            return US_ASCENSION_THURSDAY_PROFILE_FINGERPRINT;
        }
        return null;
    }

    /** An unknown stored selection must never silently use the bundled table. */
    static boolean isSupportedLectionaryPack(String packId) {
        return WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY.equals(packId);
    }

    private CalendarData() {}
}
