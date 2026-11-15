# KinLedger Family Finance ERP — Build & Deployment Guide

This repository contains a unified, cross-platform Family Finance ERP system where **Android**, **iOS**, and **Web** clients share the exact same **Node.js + Express + WebSocket** backend, **JWT authentication**, and **MongoDB Atlas** database.

---

## 1. Architecture Overview

- **Backend (`server.ts`, `server/*.ts`)**: Express.js REST API, JWT authentication (`bcryptjs` + `jsonwebtoken`), WebSocket real-time synchronization hub (`ws`), Expo Push Notification dispatcher, and Mongoose ODM schemas for MongoDB Atlas.
- **Responsive Web App (`src/`)**: React 19 + TypeScript + Tailwind CSS v4 with desktop sidebar, tablet grid, and native-style mobile bottom navigation bar.
- **Native Mobile App (`mobile/`)**: React Native with Expo (Android + iOS), Expo SecureStore for JWT tokens, Expo Notifications for push alerts, `react-native-svg` charts, Dark/Light mode, and real-time WebSocket sync.

---

## 2. MongoDB Atlas Cloud Database Setup

1. Create a free or dedicated cluster in [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user with `readWrite` privileges on database `kinledger_erp`.
3. Under **Network Access**, allow your server IP or `0.0.0.0/0` (for Cloud Run / Render / Railway).
4. Copy your SRV connection string and configure `.env`:

```bash
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/kinledger_erp?retryWrites=true&w=majority"
JWT_SECRET="generate-a-long-random-256-bit-secret"
PORT=3000
```

> Note: When `MONGODB_URI` is omitted in local evaluation, the server automatically persists data to `.data/kinledger-erp.json` with a seeded 20-member household (`ARDEN-2026`). Once `MONGODB_URI` is provided, the server connects to MongoDB Atlas and seeds initial collections automatically if empty.

---

## 3. Shared Backend & Web App Deployment

### Local Development
```bash
npm install
npm run dev
```
The server starts on `http://localhost:3000`, serving both `/api/*`, `/ws`, and the Vite React web app.

### Production Build & Start (Cloud Run / Railway / Render / VPS)
```bash
npm install
npm run build
NODE_ENV=production npm start
```
Ensure WebSockets (`/ws`) are enabled on your reverse proxy or load balancer (Cloud Run, Render, and Railway support WebSockets out of the box on port `3000`).

### Production Deployment on Vercel (Frontend + Serverless API)
This repository includes `vercel.json` and `api/index.ts`, which deploys the Vite React frontend (`dist/`) together with the Express API as a Vercel Serverless Function (`/api/*`).

1. **MongoDB Atlas Network Access**: In Atlas -> **Network Access**, add `0.0.0.0/0` so Vercel's dynamic serverless IP addresses can connect.
2. **Vercel Project Settings -> Environment Variables** (enable for Production, Preview, and Development):
   - `MONGODB_URI`: Your MongoDB Atlas SRV connection string (`mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/kinledger_erp?retryWrites=true&w=majority`). **Required** — Vercel has a read-only filesystem, so local JSON fallback is disabled on Vercel.
   - `JWT_SECRET`: A strong random 32+ character secret for signing and verifying JWT tokens. **Required**.
   - `VITE_API_URL`: *(Optional)* Leave unset so the web app calls same-origin `/api/*` endpoints directly.
3. Redeploy on Vercel after saving environment variables, then verify `https://<your-app>.vercel.app/api/health` returns `{"ok":true,"storage":"mongodb","mongoConnected":true}`.

---

## 4. Mobile App Setup (`mobile/`)

```bash
cd mobile
npm install
```

Set your deployed backend URL before running or building:
```bash
export EXPO_PUBLIC_API_URL="https://your-deployed-backend-url.example.com"
npx expo start
```

---

## 5. Android APK Build Instructions (Direct Install / Testing)

Using **Expo Application Services (EAS)**:

1. Install EAS CLI and log in:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure your project inside `/mobile`:
   ```bash
   cd mobile
   eas build:configure
   ```
3. Build an installable `.apk` using the `preview` profile defined in `mobile/eas.json`:
   ```bash
   EXPO_PUBLIC_API_URL="https://your-backend-url.com" eas build -p android --profile preview
   ```
4. Once complete, EAS outputs a direct download URL and QR code to install the `.apk` on any Android device.

### Optional Local Gradle APK Build
```bash
cd mobile
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# Output: mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 6. Android AAB Build Instructions (Google Play Store)

Google Play Store requires an **Android App Bundle (`.aab`)** signed with an upload keystore.

1. Run the `production` build profile (configured in `mobile/eas.json` with `"buildType": "app-bundle"`):
   ```bash
   cd mobile
   EXPO_PUBLIC_API_URL="https://your-backend-url.com" eas build -p android --profile production
   ```
   EAS automatically generates and securely manages your Android App Signing Keystore (or lets you upload your existing `.jks`).
2. Download the `.aab` artifact from EAS or submit directly to Google Play Console:
   ```bash
   eas submit -p android --latest
   ```
3. In **Google Play Console**:
   - Create an app (`KinLedger Family ERP`, package `com.kinledger.familyerp`).
   - Upload the `.aab` to an **Internal Testing** or **Production** track.
   - Complete Data Safety & Content Rating forms and publish.

---

## 7. iOS Build & App Store Submission Instructions

Building for iOS requires an **Apple Developer Program** account ($99/year). EAS performs cloud macOS builds even if you are developing on Linux or Windows.

1. Verify `ios.bundleIdentifier` in `mobile/app.json` (`com.kinledger.familyerp`).
2. Build the production `.ipa`:
   ```bash
   cd mobile
   EXPO_PUBLIC_API_URL="https://your-backend-url.com" eas build -p ios --profile production
   ```
   EAS prompts you to sign in to your Apple Developer account and automatically provisions Distribution Certificates and Provisioning Profiles.
3. Submit to **TestFlight / App Store Connect**:
   ```bash
   eas submit -p ios --latest
   ```
4. In **App Store Connect**:
   - Select the uploaded build under **TestFlight** to distribute to up to 100+ family testers immediately, or attach it to your App Store release for Apple Review.

---

## 8. Multi-Device Sync & RBAC Verification

- **20+ Family Members**: Seeded household `ARDEN-2026` includes 20 individual member logins across `admin`, `parent`, `member`, and `viewer` roles (`eleanor@ardenfamily.org`, `marcus@ardenfamily.org`, `sophia@ardenfamily.org`, `arthur@ardenfamily.org`, etc., password `Family2026!`).
- **Simultaneous Cross-Platform Sync**: Log in on Web + Android + iOS simultaneously. Adding, editing, or deleting any income, expense, budget, or savings goal immediately broadcasts a delta event over `/ws` to every connected device in the family room and triggers Expo push notifications to registered mobile tokens.
