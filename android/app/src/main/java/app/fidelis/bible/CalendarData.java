package app.fidelis.bible;

import android.content.Context;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.ref.SoftReference;
import java.nio.charset.StandardCharsets;

/**
 * Process-local memoized loader for the bundled res/raw/calendar.json (400 kB+),
 * shared by CalendarWidget ("Today at Mass") and QuoteWidget ("Quote of the Day").
 *
 * FID-PERF-004: both providers decoded the whole file on every widget update — and
 * with several widget instances, once per instance. This caches the parsed object
 * so a single update burst (and the sibling widget) reuses one decode. The cache is
 * a SoftReference: the perf win holds within a burst, but the ~400 kB is reclaimable
 * under memory pressure and simply re-parsed on the next call, so nothing is pinned
 * in the app process for the lifetime of the install. A read failure is never
 * cached, so a transient miss retries next time.
 */
final class CalendarData {
    private static volatile SoftReference<JSONObject> cache;

    static JSONObject load(Context context) throws Exception {
        SoftReference<JSONObject> ref = cache;
        JSONObject hit = ref != null ? ref.get() : null;
        if (hit != null) return hit;
        synchronized (CalendarData.class) {
            ref = cache;
            hit = ref != null ? ref.get() : null;
            if (hit != null) return hit;
            JSONObject parsed = parse(context);
            cache = new SoftReference<>(parsed);
            return parsed;
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

    private CalendarData() {}
}
