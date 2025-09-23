YouTube PubSubHubbub (PuSH) integration
======================================

Overview
--------
This project switched from polling the YouTube Data API for live status to using YouTube's PubSubHubbub (PuSH) push notifications. The server subscribes to a channel's XML feed and receives notifications when a channel goes live.

Required environment variables
------------------------------
- NEXT_PUBLIC_APP_URL - the public base URL for your site (used as the default callback URL). Example: https://teamamw.jajliardo.com
- YOUTUBE_PUSH_SECRET - (optional but recommended) a secret string that will be used to request signed notifications from the hub and to verify incoming callbacks. If not set explicitly, the code will default YOUTUBE_PUSH_SECRET to the value of `NEXT_PUBLIC_FIREBASE_API_KEY`.
- YOUTUBE_API_KEY - required for resolving channel details and fetching video data.

Firebase credentials
--------------------
The app uses Firebase Admin for certain server-side operations. The admin SDK in this repo is initialized using the service account pieces provided via env vars in the current `.env`:

- FIREBASE_CLIENT_EMAIL (the service account client email)
- FIREBASE_PRIVATE_KEY (the service account private key)

If you already have those two values set and valid, you do not need an additional API key - the service account credentials are sufficient for admin operations (list users, etc.). Keep the private key secure and do not commit it to source control.

How to test
-----------
1. Start the app with the correct `NEXT_PUBLIC_APP_URL` value reachable by YouTube (ngrok or a real public URL).  
2. Add a YouTube streamer in the admin UI — the server will attempt a PuSH subscription for the channel.  
3. Check logs for the verification handshake and later incoming notifications.  

Notes
-----
- The push callback route is at `/api/youtube/push`. It handles verification (GET) and notifications (POST with XML body).  
- When a notification arrives, the server attempts to match it to a streamer record by resolving stored platform URLs to channel IDs. If matched, it marks the streamer live and stores a media row for the live video.
