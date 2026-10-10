# Jump In

A picture-based conversation app prototype for teens who use AAC. Every button is a pictograph plus a word.

Six conversation moves help a teen jump into everyday talk at school, at lunch and with friends.
It runs in the phone's browser, talks out loud with the phone's own voice, and can be added to the iPhone home screen.

## What's in it

- **Talk**: six conversation moves (Hi, React, My news, Ask, More, Bye) that fill in from the place, the friend and the day. The next move glows. Each move has a **more** button that opens a full page of choices, and the teen can add their own phrases there.
- **Yes / No / Maybe / Say again?** quick answers, **Hold on**, and **Show friends** (big pictures to turn the phone around).
- **Group**: pick what friends are talking about, then react or join in.
- **News**: photos from the teen's day with a sentence and pictographs. AI can suggest the words from the photo.
- **Setup**: name (starts as Rori), voice and speed, a switch to say every button out loud, text size, friends and their interests, topics, your own phrases, an editable talk card, and backup/restore.
- **Every tap is spoken**: phrase buttons say the phrase; every other button (Setup included) says its name, and switches say on or off. Text boxes say their name when tapped.

## Accessibility

Built to Apple's Human Interface Guidelines minimums and checked by automated audits at iPhone size:
- Every button is at least 44 x 44 points.
- Text contrast is at least 4.5:1 (3:1 for large text); selected states have a 3:1 border.
- Nothing is smaller than 13 pt, body text is 17 pt, and Setup > Text size goes up to 150% without sideways scrolling.
- Every button shows a pictograph and a word. Reduced motion is respected.

Everything the teen sets up is saved on that phone in the browser's local storage (cookies are too small for photos). Setup > Back up my settings saves a file you can keep in the Files app and restore on another phone. Nothing is sent anywhere except a photo or topic name when someone taps **Suggest words** or **Suggest phrases**.

## Project layout

| Path | What it is |
| --- | --- |
| `src/app.html` | The whole app: layout, styles and code. Edit this. |
| `src/pictographs/` | The pictograph SVGs (placeholder set). |
| `build.js` | Puts the pictographs into the app and writes `public/index.html`. |
| `public/` | What the server sends to phones: the built app, home-screen icons, offline support. |
| `server.js` | A small Node server with no dependencies. Serves `public/` and the `/api/suggest` route that calls the OpenAI API. |
| `render.yaml` | Tells Render how to build and run the app. |

## Run it on your computer

Needs Node 20 or newer.

```
npm run dev
```

Then open http://localhost:3000. Suggestions stay hidden unless you set `OPENAI_API_KEY` first.

## Put it on Render

1. In Render, click **New +** and choose **Blueprint**.
2. Connect your GitHub account if asked, then pick the **jump-in** repo. Render reads `render.yaml` and sets up a web service called jump-in.
3. Render asks for **OPENAI_API_KEY**. Paste a key from https://platform.openai.com/api-keys to turn on suggestions, or leave it blank to run without them.
4. Click **Apply**. The first build takes a few minutes. Your link will look like `https://jump-in.onrender.com`.

Every push to the main branch redeploys automatically.

The free Render plan goes to sleep after about 15 minutes with no visitors, so the first visit after a break can take close to a minute. Once a phone has loaded the app, it opens from the home screen even with no signal.

### Settings you can change in Render (Environment tab)

| Name | What it does | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | Turns on photo and topic suggestions | not set (off) |
| `OPENAI_MODEL` | Model for photo and topic suggestions (must accept images) | `gpt-4o-mini` |
| `OPENAI_QUICK_MODEL` | Model for quick topic phrases | same as `OPENAI_MODEL` |
| `SUGGEST_LIMIT_PER_HOUR` | Suggestions allowed per visitor per hour, so a shared link can't run up your bill | `40` |

## Put it on an iPhone

1. Open the Render link in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open Jump In from the home screen. It runs full screen like an app.
4. If you hear nothing, flip the silent switch on the side of the phone off.

## iPhone app (TestFlight)

`mobile/` wraps the same web app as a real iPhone app with [Capacitor](https://capacitorjs.com). The app carries every page and picture inside it, so it opens with no signal and no Render wake-up wait; only **Suggest** calls the Render server. Speech plays even with the silent switch on.

A GitHub Actions workflow (`.github/workflows/testflight.yml`) builds it on a cloud Mac and uploads it to TestFlight, so no Mac or Xcode is needed.

### One-time Apple setup

1. **Join the Apple Developer Program** ($99/year) at https://developer.apple.com/programs/enroll. Approval can take a day or two.
2. **Register the app ID.** At https://developer.apple.com/account/resources/identifiers/list click **+**, choose **App IDs**, then **App**. Description `Jump In`, Bundle ID **Explicit** `com.mattnupen.jumpin`. Leave the capabilities alone and click **Register**.
3. **Create the app record.** In https://appstoreconnect.apple.com go to **Apps**, click **+**, then **New App**. Platform iOS, name `Jump In` (if taken, try `Jump In AAC`), language English (U.S.), bundle ID `com.mattnupen.jumpin`, SKU `jump-in`, access Full Access.
4. **Make an API key** so GitHub can sign and upload. In App Store Connect go to **Users and Access**, then **Integrations**, then **App Store Connect API** (request access the first time). Under **Team Keys** click **+**, name it `GitHub TestFlight`, role **Admin** (needed so it can create the signing certificate), and click **Generate**. Write down the **Issuer ID** (top of the page) and the **Key ID**, then click **Download** to get the `AuthKey_XXXX.p8` file. Apple lets you download it only once.
5. **Add three GitHub secrets.** In the repo go to **Settings**, then **Secrets and variables**, then **Actions**, and click **New repository secret** for each:

| Secret name | Value |
| --- | --- |
| `ASC_KEY_ID` | Key ID from step 4 |
| `ASC_ISSUER_ID` | Issuer ID from step 4 |
| `ASC_KEY_P8` | The whole text of the `.p8` file (open it in TextEdit or Notepad and copy everything, including the BEGIN and END lines) |

The build reads your Team ID from Apple itself, so no secret is needed for it. Each run makes a one-off signing certificate and profile through the API key and removes them when it finishes; apps already on TestFlight keep working.

### Send a build to TestFlight

1. In the repo click **Actions**, then **iPhone app to TestFlight**, then **Run workflow**, then the green **Run workflow** button.
2. It takes about 15 to 25 minutes. When it is green, Apple spends another 10 to 30 minutes processing the build.
3. In App Store Connect open **Jump In**, then **TestFlight**. The first time, answer the export compliance question if asked (the app uses no special encryption).
4. Under **Internal Testing** click **+**, make a group, and add yourself and up to 100 people on your App Store Connect team. They get an email and install with the **TestFlight** app. Testers outside your team go under **External Testing**, which needs a short Apple review first.

Run the workflow again whenever you want testers to get the latest version. Each run gets a new build number automatically.

### Working on the iPhone app on a Mac (optional)

```
node build.js
cd mobile && npm install && npm run sync
npx cap open ios
```

## What it can't do yet

Listening to friends and captioning them live, a lock-screen widget, and the Action button all need a native iOS app.
