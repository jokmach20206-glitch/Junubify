# Google Play Android preparation

Junubify now has a Capacitor Android wrapper configured with application ID `com.junubify.app`. The web app remains the source of the UI; `npm run android:sync` builds it into `dist` and syncs those assets into the native Android project.

## Local release steps

1. Install Node.js, Android Studio, and the Android SDK required by the generated Gradle project.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the build environment. These are client settings; never put a Supabase service-role key or payment secret in a `VITE_` variable.
3. Run `npm ci` and `npm run android:sync`.
4. Open the project with `npm run android:open`, let Android Studio install/sync the required SDK components, then test on a physical Android device.
5. In Android Studio, generate a signed Android App Bundle (AAB) and upload it to a Play Console internal test track before production release. Keep the upload key and Play credentials private and backed up.

The app ID is selected for this project but must be checked against any app already created in Play Console before the first upload. Package IDs cannot be changed after publishing.

## Supabase email sign-in

Native magic-link sign-in returns through `junubify://auth/callback` and exchanges a one-time PKCE authorization code. Add that exact redirect URL in the Supabase project's Auth URL Configuration before testing sign-in from Android. The Android project registers the matching deep link. Web sign-in continues to use the current web origin.

## Items still required before submission

- Android Studio/SDK build and device testing; this workspace does not currently have a configured Android SDK/JDK or Play Console access.
- A production privacy-policy URL, accurate Play Data safety and content-rating declarations, store listing assets, support contact, and developer account details.
- Confirmation that every bundled recording, cover image, and uploaded artist release is licensed for distribution in the app.
- Signed AAB generation and internal testing through the actual Play Console account.
- If charging for applicable digital content in the Play app, an eligible Play merchant account and policy-compliant Play Billing implementation. See [Google Play's payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en) and the [merchant-country table](https://support.google.com/googleplay/android-developer/answer/9306917?hl=en). Rwanda is currently listed for developer registration but not merchant registration; recheck the official table before planning Play sales.

No checkout, subscriptions, royalties, or artist payouts are activated by this Android wrapper. Keep mobile-money web checkout separate from Play Billing unless an explicit Google Play program/policy exception applies.
