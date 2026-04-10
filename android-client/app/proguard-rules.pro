# Preserve annotations and signatures used by Gson/Retrofit.
-keepattributes Signature
-keepattributes *Annotation*

# Keep Retrofit interfaces.
-keep interface com.kovix.client.network.** { *; }

# Keep API model classes and their fields to avoid JSON fields becoming null in release.
-keep class com.kovix.client.network.** { *; }
