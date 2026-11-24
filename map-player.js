/* Family map: the general step player and the camera.
 *
 * The player knows nothing about the timeline. It plays an ordered list of steps; each step has one or
 * more places and events, optional camera framing, card content, and a dwell time or a "wait for Next"
 * flag. Timeline mode builds its steps from the event index; a future tour hands it steps from a data file.
 * See docs/map-architecture.md.
 */
(function () {
    'use strict';
    var FM = window.FM = window.FM || {};
    var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

    function Player(opts) {
        this.o = opts || {};
        this.steps = [];
        this.index = -1;
        this.playing = false;
        this.speed = this.o.speed || 1;
        this._timer = null; this._raf = null; this._phase = 'idle';
        this._remaining = 0; this._phaseStart = 0; this._phaseLen = 0;
        this._listeners = {};
    }
    Player.prototype.on = function (name, fn) { (this._listeners[name] = this._listeners[name] || []).push(fn); return this; };
    Player.prototype._emit = function (name, a, b, c) { (this._listeners[name] || []).forEach(function (f) { f(a, b, c); }); };
    Player.prototype.setSteps = function (steps, startIndex) {
        this._clear();
        this.steps = steps || [];
        this.index = -1;
        this._emit('steps', this.steps);
        if (this.steps.length) this.goTo(Math.max(0, Math.min(startIndex || 0, this.steps.length - 1)), { silentCamera: false });
        else this._state();
    };
    Player.prototype.current = function () { return this.steps[this.index] || null; };
    Player.prototype._state = function () { this._emit('state', { index: this.index, playing: this.playing, phase: this._phase, count: this.steps.length }); };
    Player.prototype._clear = function () {
        if (this._timer) clearTimeout(this._timer);
        if (this._raf) cancelAnimationFrame(this._raf);
        this._timer = null; this._raf = null;
    };
    Player.prototype.dwellFor = function (step) {
        if (this.o.dwellFor) return this.o.dwellFor(step);
        return step.dwell || 5000;
    };
    Player.prototype.goTo = function (i, opts) {
        opts = opts || {};
        if (!this.steps.length) return;
        i = Math.max(0, Math.min(i, this.steps.length - 1));
        this._clear();
        var prev = this.index;
        this.index = i;
        this._phase = 'dwell';
        this._emit('enter', this.steps[i], i, { from: prev, scrub: !!opts.scrub, silentCamera: !!opts.silentCamera });
        this._remaining = this.dwellFor(this.steps[i]) / this.speed;
        if (this.playing) this._runDwell(); else this._state();
    };
    Player.prototype._runDwell = function () {
        var self = this, step = this.steps[this.index];
        this._phase = 'dwell';
        this._state();
        if (!step || step.waitForNext) return; // a tour stop waits for the visitor
        this._phaseStart = now(); this._phaseLen = this._remaining;
        this._timer = setTimeout(function () { self._advance(); }, Math.max(0, this._remaining));
    };
    Player.prototype._advance = function () {
        var self = this;
        if (this.index >= this.steps.length - 1) { this.playing = false; this._phase = 'end'; this._emit('end'); this._state(); return; }
        var from = this.steps[this.index], to = this.steps[this.index + 1];
        var len = (this.o.transitionFor ? this.o.transitionFor(from, to) : 600) / this.speed;
        this._phase = 'transition';
        this._phaseStart = now(); this._phaseLen = len; this._remaining = len;
        this._state();
        var tick = function () {
            var p = Math.min(1, (now() - self._phaseStart) / Math.max(1, self._phaseLen));
            self._emit('transition', p, from, to);
            if (p >= 1) { self._raf = null; self.goTo(self.index + 1); return; }
            self._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
    };
    Player.prototype.play = function () {
        if (!this.steps.length || this.playing) return;
        if (this._phase === 'end') this.goTo(0);
        this.playing = true;
        if (this._phase === 'transition') {
            var self = this, from = this.steps[this.index], to = this.steps[this.index + 1];
            var done = this._phaseLen - this._remaining;
            this._phaseStart = now() - done;
            var tick = function () {
                var p = Math.min(1, (now() - self._phaseStart) / Math.max(1, self._phaseLen));
                self._emit('transition', p, from, to);
                if (p >= 1) { self._raf = null; self.goTo(self.index + 1); return; }
                self._raf = requestAnimationFrame(tick);
            };
            this._raf = requestAnimationFrame(tick);
            this._state();
        } else {
            this._runDwell();
        }
    };
    Player.prototype.pause = function () {
        if (!this.playing) return;
        this.playing = false;
        var spent = now() - this._phaseStart;
        if (this._phase === 'transition') this._remaining = Math.max(0, this._phaseLen - spent);
        else this._remaining = Math.max(0, this._phaseLen - spent);
        this._clear();
        this._state();
    };
    Player.prototype.toggle = function () { if (this.playing) this.pause(); else this.play(); };
    Player.prototype.next = function () { if (this.index < this.steps.length - 1) this.goTo(this.index + 1); };
    Player.prototype.prev = function () { if (this.index > 0) this.goTo(this.index - 1); };
    Player.prototype.restart = function () { this.goTo(0); };
    Player.prototype.setSpeed = function (s) {
        var ratio = this.speed / s;
        this.speed = s;
        if (this.playing) { this.pause(); this._remaining *= ratio; this.play(); } else { this._remaining *= ratio; }
        this._state();
    };
    Player.prototype.destroy = function () { this._clear(); this.playing = false; this.steps = []; this._listeners = {}; };
    FM.Player = Player;

    // ------------------------------------------------------------------ camera
    var R = 6371000;
    function dist(a, b) {
        var toR = Math.PI / 180, dLa = (b[1] - a[1]) * toR, dLo = (b[0] - a[0]) * toR;
        var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }
    // The camera that fits bounds inside the padded part of the map. MapLibre's own fitBounds also
    // subtracts whatever padding an earlier flight left on the map, which can make a fit impossible,
    // so this works it out directly in Web Mercator (512 pixel tiles) and returns it with its padding.
    function mercX(lng) { return (lng + 180) / 360; }
    function mercY(lat) { var s = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); }
    function fitCamera(map, bounds, pad, maxZoom) {
        var b = bounds instanceof maplibregl.LngLatBounds ? bounds : maplibregl.LngLatBounds.convert(bounds);
        var sw = b.getSouthWest(), ne = b.getNorthEast();
        var x0 = mercX(sw.lng), x1 = mercX(ne.lng), y0 = mercY(ne.lat), y1 = mercY(sw.lat);
        var c = map.getCanvas(), W = Math.max(60, c.clientWidth - pad.left - pad.right), H = Math.max(60, c.clientHeight - pad.top - pad.bottom);
        var dx = Math.max(1e-12, x1 - x0) * 512, dy = Math.max(1e-12, y1 - y0) * 512;
        var z = Math.log(Math.min(W / dx, H / dy)) / Math.LN2;
        z = Math.max(0, Math.min(z, maxZoom != null ? maxZoom : 22));
        var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        var lat = 360 / Math.PI * Math.atan(Math.exp((0.5 - cy) * 2 * Math.PI)) - 90;
        return { center: [cx * 360 - 180, lat], zoom: z, padding: pad };
    }
    function zoomForRadius(m, lat) {
        // a zoom that shows a circle of radius m comfortably on a phone-sized view
        var mpp = Math.max(1, m) / 140;
        var z = Math.log(156543.03392 * Math.cos(lat * Math.PI / 180) / mpp) / Math.LN2;
        return Math.max(2, Math.min(16.5, z));
    }
    function Camera(map, opts) {
        this.map = map; this.o = opts || {};
        this.gen = 0;
        this.mode = 'follow';
        this.following = true;
        this.overview = null;
        var self = this;
        // a hand on the map stops the camera following
        ['dragstart', 'wheel', 'touchstart', 'pitchstart', 'rotatestart'].forEach(function (ev) {
            map.on(ev, function (e) { if (e.originalEvent && self.active && self.following) { self.following = false; self.gen++; if (self.o.onUnfollow) self.o.onUnfollow(); } });
        });
    }
    Camera.prototype.reduced = function () { return this.o.reducedMotion ? this.o.reducedMotion() : false; };
    Camera.prototype.padding = function () { return this.o.padding ? this.o.padding() : { top: 60, bottom: 60, left: 60, right: 60 }; };
    Camera.prototype.stop = function () { this.gen++; try { this.map.stop(); } catch (e) { /* nothing moving */ } };
    Camera.prototype.resetOverview = function () { this.overview = null; };
    // target: { points: [[lng, lat]...], radius: metres (uncertainty or area), zoom: optional, center: optional }
    Camera.prototype.frame = function (target, opts) {
        opts = opts || {};
        if (!target || !target.points || !target.points.length) return;
        if (!this.following && !opts.force) return;
        var map = this.map, gen = ++this.gen, pad = this.padding(), reduced = this.reduced();
        var mode = opts.mode || this.mode;
        var pts = target.points;
        var b = new maplibregl.LngLatBounds(pts[0], pts[0]);
        pts.forEach(function (p) { b.extend(p); });
        if (mode === 'overview') {
            if (!this.overview) this.overview = new maplibregl.LngLatBounds(pts[0], pts[0]);
            var before = this.overview.toArray().join();
            pts.forEach(function (p) { this.overview.extend(p); }, this);
            var cur = map.getBounds();
            var inside = pts.every(function (p) { return cur.contains(p); });
            if (inside && before === this.overview.toArray().join() && !opts.force) return;
            var cam = fitCamera(map, this.overview, pad, 11);
            if (cam) this._go(cam, gen, reduced, 1400);
            return;
        }
        var lat = b.getCenter().lat;
        var single = pts.length === 1 || dist(b.getSouthWest().toArray(), b.getNorthEast().toArray()) < 300;
        var targetCam;
        if (single) {
            var z = target.zoom != null ? target.zoom : zoomForRadius(target.radius || 200, lat);
            targetCam = { center: b.getCenter(), zoom: Math.min(z, 15), padding: pad };
        } else {
            targetCam = fitCamera(map, b, pad, target.zoom != null ? target.zoom : 14);
        }
        if (mode === 'centre') {
            var inView = map.getBounds().contains(targetCam.center);
            this._go({ center: targetCam.center, zoom: inView ? map.getZoom() : Math.min(map.getZoom(), targetCam.zoom), padding: pad }, gen, reduced, 900);
            return;
        }
        // follow: for a long journey, show both ends first
        var from = map.getCenter().toArray(), to = [targetCam.center.lng, targetCam.center.lat];
        var far = dist(from, to) > 600000 && !opts.noJourney;
        if (far && !reduced) {
            var both = new maplibregl.LngLatBounds(from, from); both.extend(to);
            var wide = fitCamera(map, both, pad, 6);
            var self = this;
            map.easeTo(Object.assign({}, wide, { duration: 1600, essential: true }));
            map.once('moveend', function () { if (gen === self.gen) self._go(targetCam, gen, reduced, 2200); });
            return;
        }
        this._go(targetCam, gen, reduced, 1800);
    };
    Camera.prototype._go = function (cam, gen, reduced, duration) {
        var map = this.map;
        if (gen !== this.gen) return;
        if (reduced) {
            var el = map.getContainer();
            el.classList.add('fm-cut');
            setTimeout(function () { map.jumpTo(cam); setTimeout(function () { el.classList.remove('fm-cut'); }, 40); }, 160);
            return;
        }
        map.flyTo(Object.assign({}, cam, { duration: duration, curve: 1.3, essential: true, bearing: 0, pitch: 0 }));
    };
    FM.Camera = Camera;
    FM.geo = { dist: dist, zoomForRadius: zoomForRadius, fitCamera: fitCamera };
})();
