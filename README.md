# Jump In

A picture-based conversation app prototype for teens who use AAC. Every button is a pictograph plus a word.

Six conversation moves help a teen jump into everyday talk at school, at lunch and with friends.
It runs in the phone's browser, talks out loud with the phone's own voice, and can be added to the iPhone home screen.

## What's in it

- **Talk**: six conversation moves (Hi, React, My news, Ask, More, Bye) that fill in from the place, the friend and the day. The next move glows. Each move has a **more** button that opens a full page of choices, and the teen can add their own phrases there.
- **Yes / No / Maybe / Say again?** quick answers, **Hold on**, and **Show friends** (big pictures to turn the phone around).
- **Group**: pick what friends are talking about, then react or join in.
- **News**: photos from the teen's day with a sentence and pictographs. Claude can suggest the words from the photo.
- **Setup**: name, voice and speed, friends and their interests, topics, and a talk card for new friends.

Everything the teen sets up is saved on that phone (browser storage). Nothing is sent anywhere except a photo or topic name when someone taps **Suggest with Claude**.

## Project layout

| Path | What it is |
| --- | --- |
| `src/app.html` | The whole app: layout, styles and code. Edit this. |
| `src/pictographs/` | The pictograph SVGs (placeholder set). |
| `build.js` | Puts the pictographs into the app and writes `public/index.html`. |
| `public/` | What the server sends to phones: the built app, home-screen icons, offline support. |
| `server.js` | A small Node server with no dependencies. Serves `public/` and the `/api/suggest` route that calls Claude. |
| `render.yaml` | Tells Render how to build and run the app. |

## Run it on your computer

Needs Node 20 or newer.

```
npm run dev
```

Then open http://localhost:3000. Claude suggestions stay hidden unless you set `ANTHROPIC_API_KEY` first.

## Put it on Render

1. In Render, click **New +** and choose **Blueprint**.
2. Connect your GitHub account if asked, then pick the **jump-in** repo. Render reads `render.yaml` and sets up a web service called jump-in.
3. Render asks for **ANTHROPIC_API_KEY**. Paste a key from https://console.anthropic.com (Settings, API keys) to turn on Claude suggestions, or leave it blank to run without them.
4. Click **Apply**. The first build takes a few minutes. Your link will look like `https://jump-in.onrender.com`.

Every push to the main branch redeploys automatically.

The free Render plan goes to sleep after about 15 minutes with no visitors, so the first visit after a break can take close to a minute. Once a phone has loaded the app, it opens from the home screen even with no signal.

### Settings you can change in Render (Environment tab)

| Name | What it does | Default |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Turns on Claude suggestions | not set (off) |
| `ANTHROPIC_MODEL` | Model for photo and topic suggestions | `claude-sonnet-5-5` |
| `ANTHROPIC_QUICK_MODEL` | Model for quick topic phrases | `claude-haiku-5-5` |
| `SUGGEST_LIMIT_PER_HOUR` | Suggestions allowed per visitor per hour, so a shared link can't run up your bill | `40` |

## Put it on an iPhone

1. Open the Render link in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open Jump In from the home screen. It runs full screen like an app.
4. If you hear nothing, flip the silent switch on the side of the phone off.

## What it can't do yet

Listening to friends and captioning them live, a lock-screen widget, and the Action button all need a native iOS app.
