# Sanad ProGuard Rules
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.sanad.app.** { *; }
-dontwarn okio.**
-dontwarn javax.annotation.**
