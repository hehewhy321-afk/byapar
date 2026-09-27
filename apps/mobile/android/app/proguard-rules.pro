# ============================================================================
# Byapar - Android ProGuard & R8 Optimization and Protection Rules
# ============================================================================

# 1. React Native Core & TurboModules
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# 2. Hermes JavaScript Engine
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# 3. WatermelonDB & SQLite JNI
-keep class com.nozbe.watermelondb.** { *; }
-dontwarn com.nozbe.watermelondb.**
-keepclassmembers class * extends com.nozbe.watermelondb.DatabaseBridge { *; }

# 4. OkHttp & Networking Security
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# 5. Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-dontwarn com.reactnativecommunity.asyncstorage.**

# 6. Expo Modules Core & Font/Asset Loaders
-keep class expo.modules.** { *; }
-keep class expo.modules.font.** { *; }
-keep class expo.modules.asset.** { *; }
-keep class com.facebook.react.common.assets.** { *; }
-keep class com.oblador.vectoricons.** { *; }
-dontwarn expo.modules.**

# 7. Code Optimization Rules
-keep class com.byapar.** { *; }
-allowaccessmodification
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose
