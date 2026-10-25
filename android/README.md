# Ivula Canopy for Android (Google Play)

The Play Store app is a Trusted Web Activity: a thin Android shell that opens
https://canopy.ivulatechnologies.com full screen in Chrome. Every web deploy updates the app too, so
a new Play upload is only needed when this folder changes.

- Package name: `com.ivulatechnologies.canopy`
- Settings: `twa-manifest.json` (name, colours, start page, icons)
- Builder: `build-project.mjs` (Bubblewrap, pinned in `package.json`)

## Build the app bundle

1. Add two repository secrets once (Settings → Secrets and variables → Actions):
   - `ANDROID_UPLOAD_KEYSTORE`: the contents of `ivula-upload.jks.base64.txt`
   - `ANDROID_UPLOAD_KEYSTORE_PASSWORD`: the upload key password
2. Actions → **Build Android App** → Run workflow on `main`.
3. Download the `android-app` artifact and upload the `.aab` in Play Console.

The version code is the workflow run number, so each run can be uploaded.
Pull requests that touch this folder build an unsigned bundle to catch breakage.

## Digital Asset Links

`/.well-known/assetlinks.json` proves the site and the app belong together, which
hides the browser bar. It always lists the upload key. After the first Play upload,
copy the **App signing key certificate SHA-256** from Play Console (Test and
release → App integrity) into the `ANDROID_SHA256_FINGERPRINTS` environment
variable in cPanel (comma-separate several), then restart the app. No rebuild needed.

## Payments inside the app

Google Play doesn't allow linking to outside payment for digital subscriptions, so
inside the app every price, plan and upgrade button is hidden
(`data-hide-in-app`, see the app-platform module). People subscribe on the website
and sign in to the app. Never commit the keystore: `*.jks` is git-ignored.
