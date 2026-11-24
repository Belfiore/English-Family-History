/* Settings for the family map. Edit the two keys below; nothing else needs changing.
 *
 * MAPTILER_KEY: turns on the historic maps (National Library of Scotland Ordnance Survey maps, served by
 *   MapTiler). Create a free key at https://cloud.maptiler.com/account/keys/ and, in the key's settings,
 *   tick "Allowed HTTP origins" and add belfiore.github.io so it only works on this site.
 *   The free plan is for non-commercial use, up to 100,000 tiles a month.
 *
 * GOOGLE_EMBED_KEY: optional. Shows Street View inside the page (Google Maps Embed API, free to use, but
 *   every request needs a key). Create it in Google Cloud: APIs and Services, enable "Maps Embed API",
 *   create an API key, then restrict it: Application restrictions, Websites, add
 *   https://belfiore.github.io/*, and API restrictions, "Maps Embed API" only.
 *   Without it, the Street View button opens Google Maps in a new tab, which needs no key.
 *
 * Both keys end up in the public page source; that is normal for these keys once they are restricted
 * to the site's address. Never put a key without restrictions here.
 */
window.FM_CONFIG = {
    MAPTILER_KEY: '',
    GOOGLE_EMBED_KEY: ''
};
