package com.labelonzeway.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private static final String APP_URL =
            "https://appassets.androidplatform.net/assets/labelonzeway/index.html?v=152-personal";

    private WebView webView;
    private ValueCallback<Uri[]> pendingFiles;
    private Uri pendingCameraUri;

    private final ActivityResultLauncher<Intent> filePicker = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (pendingFiles == null) return;
                List<Uri> selected = new ArrayList<>();
                if (result.getResultCode() == Activity.RESULT_OK) {
                    Intent data = result.getData();
                    if (data == null && pendingCameraUri != null) {
                        selected.add(pendingCameraUri);
                    } else if (data != null) {
                        ClipData clip = data.getClipData();
                        if (clip != null) {
                            for (int i = 0; i < clip.getItemCount(); i++) {
                                selected.add(clip.getItemAt(i).getUri());
                            }
                        } else if (data.getData() != null) {
                            selected.add(data.getData());
                        }
                    }
                }
                pendingFiles.onReceiveValue(selected.isEmpty()
                        ? null : selected.toArray(new Uri[0]));
                pendingFiles = null;
                pendingCameraUri = null;
            });

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 23, 33));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString() + " LabelOnZeWayAndroid/152");

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
                String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();

                if (scheme.equals("sms") || scheme.equals("tel") || scheme.equals("mailto")) {
                    return openExternal(uri);
                }
                if (host.equals("wa.me") || host.endsWith("whatsapp.com")) {
                    return openExternal(uri);
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                launchFileChooser(params);
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(
                    String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, false, false);
            }
        });

        if (savedInstanceState == null) webView.loadUrl(APP_URL);
        else webView.restoreState(savedInstanceState);
    }

    private boolean openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "No compatible app is installed.", Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private void launchFileChooser(WebChromeClient.FileChooserParams params) {
        String[] accepted = params.getAcceptTypes();
        List<String> cleanTypes = new ArrayList<>();
        boolean acceptsImages = accepted == null || accepted.length == 0;
        if (accepted != null) {
            for (String type : accepted) {
                if (type == null || type.trim().isEmpty()) continue;
                String clean = type.trim().toLowerCase();
                cleanTypes.add(clean);
                if (clean.equals("*/*") || clean.startsWith("image/")) acceptsImages = true;
            }
        }

        Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
        gallery.addCategory(Intent.CATEGORY_OPENABLE);
        if (cleanTypes.size() == 1) gallery.setType(cleanTypes.get(0));
        else {
            gallery.setType("*/*");
            if (!cleanTypes.isEmpty()) {
                gallery.putExtra(Intent.EXTRA_MIME_TYPES, cleanTypes.toArray(new String[0]));
            }
        }
        gallery.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);

        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        Intent[] initial = new Intent[0];
        if (acceptsImages && camera.resolveActivity(getPackageManager()) != null) {
            try {
                File photo = File.createTempFile("labelonzeway_", ".jpg", getCacheDir());
                pendingCameraUri = FileProvider.getUriForFile(
                        this, getPackageName() + ".fileprovider", photo);
                camera.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
                camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                initial = new Intent[]{camera};
            } catch (IOException ignored) {
                pendingCameraUri = null;
            }
        }

        Intent chooser = Intent.createChooser(gallery, "Select parcel photo(s)");
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, initial);
        filePicker.launch(chooser);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }
}
