package app.fidelis.bible;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.os.Build;

import org.json.JSONObject;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Device-side wiring checks for package identity and private native receivers. */
@RunWith(AndroidJUnit4.class)
public class NativeManifestInstrumentedTest {

    @Test
    public void nativePackageAndWidgetReceiversAreWiredPrivately() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageManager manager = context.getPackageManager();
        assertEquals("app.fidelis.bible", context.getPackageName());

        assertFalse(manager.getReceiverInfo(
                new ComponentName(context, VotdWidget.class), 0).exported);
        assertFalse(manager.getReceiverInfo(
                new ComponentName(context, CalendarWidget.class), 0).exported);
        assertFalse(manager.getReceiverInfo(
                new ComponentName(context, QuoteWidget.class), 0).exported);
        assertFalse(manager.getReceiverInfo(
                new ComponentName(context, WidgetPinResultReceiver.class), 0).exported);
        assertFalse(manager.getReceiverInfo(
                new ComponentName(context, WidgetRefreshCoordinator.class), 0).exported);

        CharSequence verse = manager.getReceiverInfo(
                new ComponentName(context, VotdWidget.class), 0).loadLabel(manager);
        CharSequence mass = manager.getReceiverInfo(
                new ComponentName(context, CalendarWidget.class), 0).loadLabel(manager);
        CharSequence quote = manager.getReceiverInfo(
                new ComponentName(context, QuoteWidget.class), 0).loadLabel(manager);
        assertNotEquals(verse.toString(), mass.toString());
        assertNotEquals(verse.toString(), quote.toString());
        assertNotEquals(mass.toString(), quote.toString());

        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        assertPickerMetadata(widgetManager, new ComponentName(context, VotdWidget.class));
        assertPickerMetadata(widgetManager, new ComponentName(context, CalendarWidget.class));
        assertPickerMetadata(widgetManager, new ComponentName(context, QuoteWidget.class));
    }

    @Test
    public void bundledCalendarEnvelopeResolvesTheSelectedProfileAndToday() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        JSONObject envelope = CalendarData.load(context);
        assertEquals(1, envelope.getInt("schemaVersion"));
        assertEquals(3, envelope.getJSONObject("profiles").length());
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        JSONObject day = CalendarData.selectedDay(context, envelope, today);
        assertFalse(day.getJSONArray("readings").length() == 0);
        assertFalse(day.getJSONObject("quote").optString("text").isEmpty());
    }

    @Test
    public void guadalupeFailsClosedInsteadOfPresentingSeasonalRowsAsItsProper() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        JSONObject envelope = CalendarData.load(context);
        JSONObject day = CalendarData.selectedDay(context, envelope, "2026-12-12");
        assertEquals("grc.our-lady-guadalupe", day.getString("celebrationId"));
        assertTrue(CalendarData.hasUnavailableGoverningFormulary(day));
        assertFalse(day.getJSONObject("formularyState")
                .optString("celebrationName").isEmpty());
    }

    private static void assertPickerMetadata(
            AppWidgetManager manager,
            ComponentName provider) {
        AppWidgetProviderInfo match = null;
        for (AppWidgetProviderInfo info : manager.getInstalledProviders()) {
            if (provider.equals(info.provider)) {
                match = info;
                break;
            }
        }
        assertNotEquals(null, match);
        assertNotEquals(0, match.label);
        assertNotEquals(0, match.previewImage);
        assertNotEquals(0, match.initialLayout);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            assertNotEquals(0, match.descriptionRes);
            assertNotEquals(0, match.previewLayout);
        }
    }
}
