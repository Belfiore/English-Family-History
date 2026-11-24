/* Family map: the pieces shared by every mode that plays steps.
 * FM.eventCard draws one event as a card (Timeline uses it, and so will a tour).
 * FM.stepStage plays any hand-made list of steps with framing, a card, Previous, Next and Esc.
 * Nothing here knows about Timeline mode: a future tour hands FM.stepStage its steps from
 * data/tours.json (see docs/map-architecture.md). */
(function () {
    'use strict';
    var FM = window.FM = window.FM || {};
    var $ = function (id) { return document.getElementById(id); };
    var esc = FM.data.esc, glyph = FM.glyph;
    var U = function () { return FM.util; };

    // ================================================================== shared event card
    function eventCard(e, opts) {
        opts = opts || {};
        var D = FM.DATA, pl = e.placeId ? D.places[e.placeId] : null;
        // each person with how they are related to Pat or Ron, when that is close ("Reg FitzMaurice, Pat's father")
        var people = e.personIds.map(function (id) {
            var p = D.people[id], k = FM.data.kinOf(id, D.people);
            return '<button type="button" class="chip" data-person="' + esc(id) + '">' + U().avatar(p, 'av--xs') + '<span>' + esc(p.displayName) + (k ? '<span class="chip-rel">, ' + esc(k.label) + '</span>' : '') + '</span></button>';
        }).join('');
        var media = '';
        var img = pl && (pl.images || [])[0];
        if (e.recordCrops && e.recordCrops.length) media = '<a class="record-link ec-media" href="images/records/' + esc(e.recordCrops[0]) + '"><img src="images/records/' + esc(e.recordCrops[0]) + '" alt="' + esc(e.summary) + '" loading="lazy"></a>';
        else if (img) media = '<a class="record-link ec-media" href="' + esc(img.file) + '"><img src="' + esc(img.thumb || img.file) + '" alt="' + esc(img.caption) + '" loading="lazy"></a>';
        var conf = e.familyStatement ? 'family tradition' : e.confidence;
        var where = pl ? '<button type="button" class="ec-place" data-open-place="' + esc(pl.id) + '">' + esc(pl.name) + '</button>' + (pl.drawAs === 'area' ? ' <span class="ec-prec">(an area)</span>' : pl.drawAs === 'halo' ? ' <span class="ec-prec">(within ' + esc(U().metresText(pl.uncertaintyMetres)) + ')</span>' : '')
                         : '<span class="ec-place ec-place--none">Place not known</span>';
        var voyage = '';
        if (e.voyage) {
            var disp = esc(e.voyage.display || ''), ship = esc(e.voyage.ship || '');
            var line = ship && disp.indexOf(ship) >= 0 ? disp.replace(ship, '<strong>' + ship + '</strong>') : (ship ? '<strong>' + ship + '</strong>' + (disp ? ': ' + disp : '') : disp);
            voyage = '<p class="ec-ship">' + glyph('sailed') + '<span>' + line + '</span></p>';
        }
        var first = e.personIds[0];
        return '<article class="ec' + (e.noProvenLink ? ' is-orkney' : '') + (e.familyStatement ? ' is-family' : '') + '" data-event="' + esc(e.id) + '">' +
            '<p class="ec-top"><span class="ec-gl">' + glyph(e.type) + '</span><span class="ec-type">' + esc(FM.data.TYPE_LABEL[e.type]) + '</span><span class="ec-date">' + esc(U().dateLabel(e)) + '</span></p>' +
            (e.noProvenLink ? '<p class="ec-npl"><span class="badge badge--npl">No proven link to this family</span></p>' : '') +
            '<p class="ec-where">' + where + '</p>' + voyage +
            '<p class="ec-text">' + esc(e.summary) + (e.familyStatement && !/\(family/.test(e.summary) ? ' (family)' : '') + '</p>' +
            (people ? '<div class="ec-people">' + people + '</div>' : '') + media +
            (opts.noActions ? '' : '<div class="ec-actions">' + (pl ? '<button type="button" class="fm-btn fm-btn--sm" data-open-place="' + esc(pl.id) + '">Open place</button>' : '') +
                (pl && pl.streetView ? FM.sv.button(pl, { small: true }) : (pl && pl.streetViewReason && /coverage/i.test(pl.streetViewReason) ? '<span class="ec-nosv">' + esc(pl.streetViewReason) + '</span>' : '')) +
                (first ? '<a class="fm-btn fm-btn--sm fm-btn--ghost" href="family-tree.html#/person/' + esc(first) + '">Full profile</a>' : '') + '</div>') +
            '</article>';
    }
    FM.eventCard = eventCard;

    // ================================================================== step stage (shared with a future tour)
    FM.stepStage = (function () {
        var p = null, on = false, opener = null;
        function render(step, i) {
            var card = $('stepCard');
            var evs = (step.events || []).map(function (id) { return FM.DATA.byId[id]; }).filter(Boolean);
            card.innerHTML = '<div class="sc-in"><p class="fm-label">' + (i + 1) + ' of ' + p.steps.length + '</p>' +
                (step.card && step.card.title ? '<h2 class="sc-title">' + esc(step.card.title) + '</h2>' : '') +
                (step.card && step.card.text ? '<p class="sc-text">' + esc(step.card.text) + '</p>' : '') +
                evs.map(function (e) { return eventCard(e, { noActions: false }); }).join('') +
                '<div class="sc-ctl"><button type="button" class="fm-btn fm-btn--sm" data-sc="prev"' + (i === 0 ? ' disabled' : '') + '>Previous</button>' +
                '<button type="button" class="fm-btn fm-btn--sm" data-sc="next">' + (i === p.steps.length - 1 ? 'Finish' : 'Next') + '</button>' +
                '<button type="button" class="fm-x" data-sc="close" aria-label="Close">&times;</button></div></div>';
            card.hidden = false;
            var target = null;
            if (step.camera && step.camera.center) {
                FM.camera.stop();
                if (U().reduced()) FM.map.jumpTo(step.camera); else FM.map.flyTo(Object.assign({ duration: 1800, essential: true }, step.camera));
            } else {
                var pts = (step.places || []).map(function (pid) { var pl = FM.DATA.places[pid]; return pl ? [pl.lng, pl.lat] : null; }).filter(Boolean);
                if (pts.length) { FM.camera.following = true; FM.camera.frame({ points: pts, radius: 400 }, { mode: 'follow', force: true }); }
            }
            U().announce((step.card && step.card.title ? step.card.title + '. ' : '') + evs.map(function (e) { return e.summary; }).join(' '));
            var nb = card.querySelector('[data-sc="next"]'); if (nb) nb.focus({ preventScroll: true });
        }
        function run(steps, opts) {
            stop();
            opener = document.activeElement;
            on = true;
            p = new FM.Player({ dwellFor: function (s) { return s.dwell || 6000; }, transitionFor: function () { return 300; } });
            p.on('enter', function (step, i) { render(step, i); });
            p.on('end', function () { /* waits on the last card */ });
            var card = $('stepCard');
            card.onclick = function (e) {
                var b = e.target.closest('[data-sc]'); if (!b) return;
                if (b.dataset.sc === 'next') { if (p.index >= p.steps.length - 1) stop(); else p.next(); }
                if (b.dataset.sc === 'prev') p.prev();
                if (b.dataset.sc === 'close') stop();
            };
            p.setSteps(steps, 0);
            if (opts && opts.autoplay) p.play();
            return p;
        }
        function stop() {
            if (p) p.destroy();
            p = null;
            if (on) { $('stepCard').hidden = true; on = false; if (opener && document.contains(opener)) opener.focus(); }
        }
        return { run: run, stop: stop, active: function () { return on; }, player: function () { return p; } };
    })();
})();
