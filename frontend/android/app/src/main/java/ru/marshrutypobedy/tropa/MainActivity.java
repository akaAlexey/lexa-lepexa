package ru.marshrutypobedy.tropa;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Сессия входа — HttpOnly-cookie сервера api.marshrutypobedy.ru. Для WebView приложения
        // (https://localhost) это сторонний адрес, а сторонние cookie в WebView по умолчанию выключены:
        // без этого вход в приложении не держался бы. Cookie сервера — SameSite=None; Secure.
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(getBridge().getWebView(), true);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Сессия переживает закрытие приложения
        CookieManager.getInstance().flush();
    }
}
