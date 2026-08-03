# Capacitor bridge classes and JavaScript interfaces are resolved dynamically.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
