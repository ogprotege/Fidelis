package app.fidelis.bible;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import android.appwidget.AppWidgetManager;
import android.content.Intent;

import org.junit.Test;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Pure contract tests that run on the host without an emulator or launcher. */
public class WidgetNativeContractTest {

    @Test
    public void wireKindsMapOnlyToTheThreeDeclaredProviders() {
        assertSame(VotdWidget.class,
                WidgetPinContract.Kind.fromWireName("verse").providerClass());
        assertSame(CalendarWidget.class,
                WidgetPinContract.Kind.fromWireName("mass").providerClass());
        assertSame(QuoteWidget.class,
                WidgetPinContract.Kind.fromWireName("quote").providerClass());
        assertNull(WidgetPinContract.Kind.fromWireName("today"));
        assertNull(WidgetPinContract.Kind.fromWireName(null));
        assertEquals(3, WidgetPinContract.Kind.values().length);
    }

    @Test
    public void pinConfirmationRequiresKindTokenAndWidgetId() {
        assertTrue(WidgetPinContract.isValidConfirmation("request-1", "verse", 42));
        assertFalse(WidgetPinContract.isValidConfirmation("", "verse", 42));
        assertFalse(WidgetPinContract.isValidConfirmation(null, "verse", 42));
        assertFalse(WidgetPinContract.isValidConfirmation("request-1", "unknown", 42));
        assertFalse(WidgetPinContract.isValidConfirmation(
                "request-1", "verse", AppWidgetManager.INVALID_APPWIDGET_ID));
    }

    @Test
    public void refreshCoordinatorAcceptsExactlyTheRequiredLifecycleActions() {
        assertTrue(WidgetRefreshCoordinator.isRefreshAction(Intent.ACTION_BOOT_COMPLETED));
        assertTrue(WidgetRefreshCoordinator.isRefreshAction(Intent.ACTION_MY_PACKAGE_REPLACED));
        assertTrue(WidgetRefreshCoordinator.isRefreshAction(Intent.ACTION_DATE_CHANGED));
        assertTrue(WidgetRefreshCoordinator.isRefreshAction(Intent.ACTION_TIME_CHANGED));
        assertTrue(WidgetRefreshCoordinator.isRefreshAction(Intent.ACTION_TIMEZONE_CHANGED));
        assertFalse(WidgetRefreshCoordinator.isRefreshAction(Intent.ACTION_SCREEN_ON));
        assertFalse(WidgetRefreshCoordinator.isRefreshAction(null));
        assertTrue(WidgetAppearance.usesSystemResources(
                WidgetSharedSettings.APPEARANCE_SYSTEM));
        assertFalse(WidgetAppearance.usesSystemResources(
                WidgetSharedSettings.APPEARANCE_DAY));
        assertFalse(WidgetAppearance.usesSystemResources(
                WidgetSharedSettings.APPEARANCE_NIGHT));
    }

    @Test
    public void sharedSettingsMigrateLegacyRegionsAndRejectUnknownValues() {
        assertEquals(WidgetSharedSettings.GENERAL,
                WidgetSharedSettings.normalizeCalendarProfile("universal"));
        assertEquals(WidgetSharedSettings.US_ASCENSION_SUNDAY,
                WidgetSharedSettings.normalizeCalendarProfile("usa"));
        assertEquals(WidgetSharedSettings.US_ASCENSION_THURSDAY,
                WidgetSharedSettings.normalizeCalendarProfile(
                        WidgetSharedSettings.US_ASCENSION_THURSDAY));
        assertNull(WidgetSharedSettings.normalizeCalendarProfile("roman.unknown"));

        assertEquals(WidgetSharedSettings.APPEARANCE_SYSTEM,
                WidgetSharedSettings.normalizeAppearance("system"));
        assertEquals(WidgetSharedSettings.APPEARANCE_DAY,
                WidgetSharedSettings.normalizeAppearance("day"));
        assertEquals(WidgetSharedSettings.APPEARANCE_NIGHT,
                WidgetSharedSettings.normalizeAppearance("night"));
        assertNull(WidgetSharedSettings.normalizeAppearance("sepia"));
    }

    @Test
    public void calendarProfileFingerprintsMatchTheGeneratedPackComposition() {
        String general =
                "roman.general.pack@2026.02:sha256:07cfa5d519b7a345a6bff4d141300486fcb32a777d465ff77ea9367f5e516d4e";
        String unitedStates = general
                + "+roman.us.pack@2026.1:sha256:15b44bda7b1180ac996bfb8a0704378a9791036a1d387055c8a9477498395ef7"
                + "+roman.us.ascension-sunday.pack@2026.1:sha256:88299b27261647d01d3e00a3ef11ab3f473f8b75798aed9e0cbf23220511f78d";
        String ascensionThursday = general
                + "+roman.us.pack@2026.1:sha256:15b44bda7b1180ac996bfb8a0704378a9791036a1d387055c8a9477498395ef7"
                + "+roman.us.ascension-thursday.pack@2026.1:sha256:82acb7ea84068f729a5fde6f4d44cbd7c72c300694643dea8fb5d57f4a372382";

        assertEquals(general, CalendarData.expectedFingerprint(WidgetSharedSettings.GENERAL));
        assertEquals(
                unitedStates,
                CalendarData.expectedFingerprint(WidgetSharedSettings.US_ASCENSION_SUNDAY));
        assertEquals(
                ascensionThursday,
                CalendarData.expectedFingerprint(WidgetSharedSettings.US_ASCENSION_THURSDAY));
        assertNull(CalendarData.expectedFingerprint("roman.unsupported"));
    }

    @Test
    public void calendarDataRejectsUnknownLectionarySelectionsWithoutALocalOverlay() {
        assertTrue(CalendarData.isSupportedLectionaryPack(
                WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY));
        assertFalse(CalendarData.isSupportedLectionaryPack("roman.unsupported"));
        assertFalse(CalendarData.isSupportedLectionaryPack(null));
    }

    @Test
    public void localOverlayRequiresTheExactCurrentLectionaryFingerprint() {
        String currentFingerprint =
                "roman.ordinary.derived-citation-table@tamil-catholic-lectionary-c6c9d79"
                        + "+fidelis-supplement-2026.2:sha256:"
                        + "7afff82803e3c7abca0fa74020c491f184edfd13dc59505837bb0e7672ec21dc";
        assertTrue(CalendarData.isExpectedLocalOverlayLectionary(
                WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY,
                WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY,
                currentFingerprint));
        assertFalse(CalendarData.isExpectedLocalOverlayLectionary(
                WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY,
                WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY,
                "roman.ordinary.derived-citation-table@stale:sha256:stale"));
        assertFalse(CalendarData.isExpectedLocalOverlayLectionary(
                WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY,
                WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY,
                ""));
        assertFalse(CalendarData.isExpectedLocalOverlayLectionary(
                WidgetSharedSettings.DERIVED_ROMAN_LECTIONARY,
                "roman.unsupported",
                currentFingerprint));
    }

    @Test
    public void calendarSnapshotRejectsMalformedOrReversedGenerationMetadata() throws Exception {
        long now = instantMillis("2026-07-23T13:19:12.064Z");
        CalendarData.validateTimestamps(
                "2026-07-23T13:23:12.064Z",
                "2032-01-01T00:00:00.000Z",
                now
        );

        assertTimestampRejected(
                "not-an-instant",
                "2032-01-01T00:00:00.000Z",
                now
        );
        assertTimestampRejected(
                "2099-01-01T00:00:00.000Z",
                "2100-01-01T00:00:00.000Z",
                now
        );
        assertTimestampRejected(
                "2026-07-23T13:25:12.065Z",
                "2032-01-01T00:00:00.000Z",
                now
        );
        assertWindowRejected("2025-02-30", "2031-12-31");
        assertWindowRejected("2031-12-31", "2025-01-01");
    }

    @Test
    public void manifestDeclaresEveryRefreshBroadcastOnTheCoordinator() throws Exception {
        String manifest = androidSource("AndroidManifest.xml");
        String receiver = fragmentBetween(
                manifest,
                "android:name=\".WidgetRefreshCoordinator\"",
                "</receiver>");
        assertTrue(receiver.contains("android.intent.action.BOOT_COMPLETED"));
        assertTrue(receiver.contains("android.intent.action.MY_PACKAGE_REPLACED"));
        assertTrue(receiver.contains("android.intent.action.DATE_CHANGED"));
        assertTrue(receiver.contains("android.intent.action.TIME_SET"));
        assertTrue(receiver.contains("android.intent.action.TIMEZONE_CHANGED"));
        assertTrue(manifest.contains("android.permission.RECEIVE_BOOT_COMPLETED"));
    }

    @Test
    public void pickerMetadataAndAccessibilityAreDistinctAndPopulated() throws Exception {
        String manifest = androidSource("AndroidManifest.xml");
        assertTrue(manifest.contains("android:label=\"@string/widget_votd_name\""));
        assertTrue(manifest.contains("android:label=\"@string/widget_calendar_name\""));
        assertTrue(manifest.contains("android:label=\"@string/widget_quote_name\""));

        assertPickerContract(
                "votd_widget_info.xml",
                "widget_votd_description",
                "widget_preview_votd",
                "widget_votd");
        assertPickerContract(
                "calendar_widget_info.xml",
                "widget_calendar_description",
                "widget_preview_calendar",
                "widget_calendar");
        assertPickerContract(
                "quote_widget_info.xml",
                "widget_quote_description",
                "widget_preview_quote",
                "widget_quote");

        assertRuntimeAccessibility(
                "widget_votd.xml", "widget_votd_description", "widget_votd_preview_text");
        assertRuntimeAccessibility(
                "widget_calendar.xml", "widget_calendar_description", "widget_calendar_preview_day");
        assertRuntimeAccessibility(
                "widget_quote.xml", "widget_quote_description", "widget_quote_preview_text");

        assertTrue(androidSource("java/app/fidelis/bible/VotdWidget.java")
                .contains("R.string.widget_votd_accessibility"));
        assertTrue(androidSource("java/app/fidelis/bible/CalendarWidget.java")
                .contains("R.string.widget_calendar_accessibility"));
        assertTrue(androidSource("java/app/fidelis/bible/QuoteWidget.java")
                .contains("R.string.widget_quote_accessibility"));
    }

    private static void assertPickerContract(
            String file,
            String description,
            String previewImage,
            String previewLayout) throws Exception {
        String provider = androidSource("res/xml/" + file);
        assertTrue(provider.contains("android:description=\"@string/" + description + "\""));
        assertTrue(provider.contains("android:previewImage=\"@drawable/" + previewImage + "\""));
        assertTrue(provider.contains("android:previewLayout=\"@layout/" + previewLayout + "\""));
        assertTrue(androidSource("res/drawable/" + previewImage + ".xml").contains("<vector"));
    }

    private static void assertRuntimeAccessibility(
            String file,
            String description,
            String previewText) throws Exception {
        String layout = androidSource("res/layout/" + file);
        assertTrue(layout.contains("android:contentDescription=\"@string/" + description + "\""));
        assertTrue(layout.contains("android:text=\"@string/" + previewText + "\""));
        assertTrue(layout.contains("android:screenReaderFocusable=\"true\""));
        assertTrue(layout.contains("android:importantForAccessibility=\"yes\""));
        assertTrue(layout.contains("android:importantForAccessibility=\"noHideDescendants\""));
    }

    private static String fragmentBetween(String value, String start, String end) {
        int from = value.indexOf(start);
        assertTrue("Missing start marker: " + start, from >= 0);
        int through = value.indexOf(end, from);
        assertTrue("Missing end marker: " + end, through >= 0);
        return value.substring(from, through);
    }

    private static void assertTimestampRejected(
            String generatedAt,
            String expiresAt,
            long nowMillis) {
        try {
            CalendarData.validateTimestamps(generatedAt, expiresAt, nowMillis);
        } catch (IllegalStateException expected) {
            return;
        }
        throw new AssertionError("Expected corrupt calendar timestamps to fail closed.");
    }

    private static void assertWindowRejected(String from, String through) {
        try {
            CalendarData.validateWindow(from, through);
        } catch (IllegalStateException expected) {
            return;
        }
        throw new AssertionError("Expected corrupt calendar window to fail closed.");
    }

    private static long instantMillis(String value) {
        SimpleDateFormat format = new SimpleDateFormat(
                "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                Locale.US
        );
        format.setLenient(false);
        ParsePosition position = new ParsePosition(0);
        Date parsed = format.parse(value, position);
        if (parsed == null || position.getIndex() != value.length()) {
            throw new AssertionError("Invalid test instant: " + value);
        }
        return parsed.getTime();
    }

    private static String androidSource(String relative) throws IOException {
        Path current = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
        while (current != null) {
            Path direct = current.resolve("src/main").resolve(relative);
            if (Files.isRegularFile(direct)) {
                return new String(Files.readAllBytes(direct), StandardCharsets.UTF_8);
            }
            Path module = current.resolve("app/src/main").resolve(relative);
            if (Files.isRegularFile(module)) {
                return new String(Files.readAllBytes(module), StandardCharsets.UTF_8);
            }
            current = current.getParent();
        }
        throw new IOException("Unable to locate Android source: " + relative);
    }
}
