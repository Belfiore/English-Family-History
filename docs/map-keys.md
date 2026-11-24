# Map keys for Seb

No key is in this file, and none has been put in `config.js`. The two browser keys stay empty until you create them. Do not create a Google or MapTiler account on anyone else's behalf: these are the steps to follow yourself.

Checked against the publishers' own pages on 24 November 2026.

The live site origin is `https://belfiore.github.io`.

## 1. MapTiler (needed for the old maps)

This turns on Then, the swipe, and the period maps. The free plan is for non-commercial use.

Pages used: [MapTiler, API key](https://docs.maptiler.com/guides/developer/credentials/api-key/) and the keys screen at [cloud.maptiler.com/account/keys](https://cloud.maptiler.com/account/keys/).

1. Create a free MapTiler account and sign in.
2. Open **API keys** (the address above, also linked from the account menu).
3. Click **New key**. To change a key you already have, click **Edit** next to it.
4. The guide's heading is **Secure your key by use case**. For a website it says to secure the key with **Allowed HTTP origins**.
5. In **Allowed HTTP origins**, enter the domain on its own line, as the guide's example does (`my-amazing-shop.com`, with no `https://` and no path):

   `belfiore.github.io`

6. Do not add `localhost` to the key the live site will use. The same guide says a localhost rule matches any machine.
7. Save, then copy the key into `config.js` as `MAPTILER_KEY`.

The page source will contain this key. That is expected once the origin restriction is on. Do not leave the key with no restriction.

## 2. Google Maps Embed API (optional)

With this key, Street View opens inside the page. Without it, the button opens Google Maps in a new tab, which needs no key.

Page used: [Set up the Maps Embed API](https://developers.google.com/maps/documentation/embed/get-api-key), and the restriction steps on [Google Maps Platform security guidance](https://developers.google.com/maps/api-security-best-practices).

1. Open the **Google Maps Platform > Keys & Credentials** page in the Cloud Console. If it asks, select your project. (You need a project with billing set up. The Embed API itself is described as free, but Google still asks for a billing account.)
2. Enable **Maps Embed API**. On the key screen, choosing an API does not enable it: the guide says to enable it on the **API Library** page. In the Cloud Console that library is under **APIs & Services > Library**. Search for **Maps Embed API** and click **Enable**.
3. Back on **Keys & Credentials**, create the key: **Create credentials > API key**.
4. In the **Create API key** panel, open **Select API restrictions**. Clear anything this key does not need, leave **Maps Embed API** selected, and click **Create**.
5. Restrict the websites that may use it. Open the key (**Edit API key**). Under **Key restrictions**, select **Set an application restriction**, choose **Websites**, and add this referrer, including the scheme and the star:

   `https://belfiore.github.io/*`

   The security guide says to give the full referrer, and that a star covers the paths on that host.
6. Save.
7. Paste the key into `config.js` as `GOOGLE_EMBED_KEY`.

Use a different key for the build step below. Do not add the Street View Static API to this browser key.

## 3. Build-time Street View key (optional, never committed)

`tools/streetview-viewpoints.mjs` asks Google where the nearest outdoor panorama is, and when it was taken. It does not download a picture. The key is read from the environment and must not be written into any file.

1. In the same Google Cloud project, open **APIs & Services > Library**, search for **Street View Static API**, and click **Enable**.
2. On **Google Maps Platform > Keys & Credentials**, click **Create credentials > API key** again, so this is a second key.
3. Under **Select API restrictions**, leave only **Street View Static API**.
4. Do not put a website restriction on this key. The command does not send `https://belfiore.github.io` as the referrer, so a website restriction would reject it. An IP restriction is only useful if you always run the command from one known address.
5. Do not paste it into `config.js`, and do not commit it. Run:

   `GOOGLE_STREETVIEW_KEY=your-key-here node tools/streetview-viewpoints.mjs`

The script leaves every viewpoint `checked: false`. A person still has to look at each view before it is marked checked. The look on 24 November 2026 is written up in `docs/map-audit.md` under "Street View viewpoints: checked".
