package com.sanad.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {

    private static final String PLATFORM_URL = "https://sanad-red.vercel.app";
    private static final String BASE_HOST = "sanad-red.vercel.app";
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1002;

    private WebView webView;
    private ProgressBar progressBar;
    private View layoutOffline;
    private Button btnRetry;
    private FrameLayout fullscreenContainer;

    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private ValueCallback<Uri[]> fileUploadCallback;

    private NetworkHelper networkHelper;
    private long backPressedTime = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(0xFF064E3B);
            window.setNavigationBarColor(0xFF064E3B);
        }

        setContentView(R.layout.activity_main);

        initViews();
        initNotifications();
        checkAndRequestNotificationPermission();
        setupNetworkListener();
        setupWebView();

        if (getIntent() != null && getIntent().hasExtra("TARGET_URL")) {
            handleIntentUrl(getIntent());
        } else {
            loadPlatform();
        }
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        layoutOffline = findViewById(R.id.layoutOffline);
        btnRetry = findViewById(R.id.btnRetry);
        fullscreenContainer = findViewById(R.id.fullscreenContainer);

        btnRetry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (networkHelper != null && networkHelper.isNetworkAvailable()) {
                    showOfflineView(false);
                    webView.reload();
                } else {
                    Toast.makeText(MainActivity.this, getString(R.string.offline_title), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void initNotifications() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "sanad_main_channel",
                    getString(R.string.notification_channel_name),
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(getString(R.string.notification_channel_desc));
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 150, 250});
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void checkAndRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
            }
        }
    }

    private void setupNetworkListener() {
        networkHelper = new NetworkHelper(this, new NetworkHelper.NetworkChangeListener() {
            @Override
            public void onNetworkChanged(final boolean isAvailable) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (isAvailable) {
                            if (layoutOffline.getVisibility() == View.VISIBLE) {
                                showOfflineView(false);
                                webView.reload();
                            }
                        } else {
                            if (webView.getUrl() == null || "about:blank".equals(webView.getUrl())) {
                                showOfflineView(true);
                            }
                        }
                    }
                });
            }
        });
        networkHelper.startListening();
    }

    private void setupWebView() {
        webView.setBackgroundColor(0xFFFDFBF7);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        // Custom User-Agent identifying Sanad Android App
        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " SanadApp/2.4 (Android Native; Mobile)");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Native Notification Bridge to JavaScript
        webView.addJavascriptInterface(new SanadNativeInterface(this), "SanadNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                Uri uri = request.getUrl();
                String urlString = uri.toString();
                String host = uri.getHost() != null ? uri.getHost() : "";

                // External protocols (WhatsApp, Telegram, Phone, Mail)
                if (urlString.startsWith("tel:") ||
                    urlString.startsWith("mailto:") ||
                    urlString.startsWith("whatsapp:") ||
                    urlString.startsWith("tg:") ||
                    urlString.startsWith("intent:")) {
                    try {
                        Intent intent = Intent.parseUri(urlString, Intent.URI_INTENT_SCHEME);
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {
                        return true;
                    }
                }

                // Internal Sanad platform pages
                if (host.contains(BASE_HOST) || host.contains("vercel.app") || host.isEmpty()) {
                    return false;
                }

                // External links open in device browser
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                CookieManager.getInstance().flush();

                if (networkHelper != null && networkHelper.isNetworkAvailable()) {
                    showOfflineView(false);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    progressBar.setVisibility(View.GONE);
                    if (networkHelper != null && !networkHelper.isNetworkAvailable()) {
                        showOfflineView(true);
                    }
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress >= 100) {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = fileChooserParams != null ? fileChooserParams.createIntent() : null;
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileUploadCallback = null;
                    return false;
                }
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }

                customView = view;
                customViewCallback = callback;

                fullscreenContainer.addView(view, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                ));
                fullscreenContainer.setVisibility(View.VISIBLE);
                webView.setVisibility(View.GONE);

                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;

                fullscreenContainer.removeView(customView);
                fullscreenContainer.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);

                customView = null;
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }

                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            }
        });

        // Setup PDF & Certificate download listener
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimetype);
                    request.addRequestHeader("User-Agent", userAgent);
                    request.setDescription("تحميل من منصة سَنَد التأصيلية");
                    request.setTitle(filename);
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(request);
                        Toast.makeText(MainActivity.this, "جاري التحميل: " + filename, Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
            }
        });
    }

    public void displaySystemNotification(String title, String message, String targetUrl) {
        try {
            initNotifications();

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            if (targetUrl != null && !targetUrl.isEmpty()) {
                intent.putExtra("TARGET_URL", targetUrl);
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            int reqCode = (int) (System.currentTimeMillis() & 0xfffffff);
            PendingIntent pendingIntent = PendingIntent.getActivity(this, reqCode, intent, flags);

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(this, "sanad_main_channel");
            } else {
                builder = new Notification.Builder(this);
            }

            String displayTitle = (title != null && !title.isEmpty()) ? title : getString(R.string.app_name);

            builder.setContentTitle(displayTitle)
                   .setContentText(message)
                   .setStyle(new Notification.BigTextStyle().bigText(message).setSummaryText(getString(R.string.app_name)))
                   .setSmallIcon(R.mipmap.ic_launcher)
                   .setAutoCancel(true)
                   .setContentIntent(pendingIntent)
                   .setPriority(Notification.PRIORITY_HIGH)
                   .setVibrate(new long[]{0, 250, 150, 250})
                   .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));

            try {
                Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
                if (largeIcon != null) {
                    builder.setLargeIcon(largeIcon);
                }
            } catch (Throwable ignored) {}

            int notificationId = (int) (System.currentTimeMillis() % 100000);
            manager.notify(notificationId, builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public class SanadNativeInterface {
        private final Context mContext;

        public SanadNativeInterface(Context context) {
            this.mContext = context;
        }

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                return checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    checkAndRequestNotificationPermission();
                }
            });
        }

        @JavascriptInterface
        public void showNotification(final String title, final String message, final String targetUrl) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    displaySystemNotification(title, message, targetUrl);
                }
            });
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntentUrl(intent);
    }

    private void handleIntentUrl(Intent intent) {
        if (intent != null && intent.hasExtra("TARGET_URL")) {
            String targetUrl = intent.getStringExtra("TARGET_URL");
            if (targetUrl != null && !targetUrl.isEmpty() && webView != null) {
                if (targetUrl.startsWith("/")) {
                    webView.loadUrl(PLATFORM_URL + targetUrl);
                } else if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
                    webView.loadUrl(targetUrl);
                }
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileUploadCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            if (webView.getWebChromeClient() != null) {
                webView.getWebChromeClient().onHideCustomView();
            }
            return;
        }

        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }

        if (backPressedTime + 2000 > System.currentTimeMillis()) {
            super.onBackPressed();
        } else {
            Toast.makeText(this, getString(R.string.exit_prompt), Toast.LENGTH_SHORT).show();
            backPressedTime = System.currentTimeMillis();
        }
    }

    private void loadPlatform() {
        if (networkHelper != null && networkHelper.isNetworkAvailable()) {
            showOfflineView(false);
            webView.loadUrl(PLATFORM_URL);
        } else {
            showOfflineView(true);
        }
    }

    private void showOfflineView(boolean show) {
        layoutOffline.setVisibility(show ? View.VISIBLE : View.GONE);
        webView.setVisibility(show ? View.GONE : View.VISIBLE);
    }

    @Override
    protected void onDestroy() {
        if (networkHelper != null) {
            networkHelper.stopListening();
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
