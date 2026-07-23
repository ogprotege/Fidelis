package app.fidelis.bible;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPinPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
