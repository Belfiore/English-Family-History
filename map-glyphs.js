/* Family map: the glyphs for each kind of event, drawn as line engravings to sit beside the crest page.
 * Each type has its own shape, so meaning never depends on colour alone. 24 x 24 view box, stroked. */
(function () {
    'use strict';
    var FM = window.FM = window.FM || {};
    var G = {
        // a sprouting sprig
        'born': '<path d="M12 21V10"/><path d="M12 13c-3.5 0-6-2.2-6.5-6 3.6 0 6.2 2 6.5 6z"/><path d="M12 11c.4-3.6 2.9-5.8 6.5-6-.4 3.8-2.9 6-6.5 6z"/><path d="M8.5 21h7"/>',
        // a scallop shell, the old sign of baptism
        'baptised': '<path d="M12 20 4.5 9.5C6.5 6 9 4.5 12 4.5S17.5 6 19.5 9.5z"/><path d="M12 20V5M12 20 8 6.5M12 20l4-13.5M12 20 5.8 8M12 20l6.2-12"/><path d="M10 20.5h4"/>',
        // a house with a door
        'lived': '<path d="M4 11.5 12 4.5l8 7"/><path d="M6 10v9.5h12V10"/><path d="M10.2 19.5v-5h3.6v5"/><path d="M15.5 6.5v2.4"/>',
        // two rings
        'married': '<circle cx="9.3" cy="13.5" r="5"/><circle cx="14.7" cy="13.5" r="5"/><path d="M8 7.2 9.3 5.5l1.3 1.7"/>',
        // a quill over a line of writing
        'worked': '<path d="M5 19.5c3-1 6.5-4.5 9.5-9.2 1.5-2.4 2.8-4.6 4.5-5.8-.3 2.2-1.5 4.6-3 6.8-2.8 4-6.4 7-11 8.2z"/><path d="M8.4 16.3 6 15.6"/><path d="M4 21h10"/>',
        // a shield with a chevron
        'served': '<path d="M12 3.8 5.5 6.2v5.6c0 4.2 2.8 7 6.5 8.4 3.7-1.4 6.5-4.2 6.5-8.4V6.2z"/><path d="M8.5 13.2 12 9.8l3.5 3.4"/>',
        // a ship under sail
        'sailed': '<path d="M3.5 16.5h17l-2.5 3.5H6z"/><path d="M12 4v12.5"/><path d="M12 5.5c3.3 2.3 4.8 5.6 5 9H12"/><path d="M12 7.5c-2.6 1.8-3.8 4.2-4 7h4"/>',
        // scales
        'civil case': '<path d="M12 4v16M8 20h8M6 7h12"/><path d="M6 7 3.5 13h5zM18 7l-2.5 6h5z"/><path d="M3.5 13a2.5 1.4 0 0 0 5 0M15.5 13a2.5 1.4 0 0 0 5 0"/>',
        // a bellows camera on its stand
        'photographed': '<rect x="4" y="8" width="11" height="8" rx="1"/><path d="M15 9.5l4.5-2v9l-4.5-2"/><circle cx="9.5" cy="12" r="2.2"/><path d="M7 16l-1.5 4.5M12 16l1.5 4.5"/>',
        // a laurel wreath
        'celebrated': '<path d="M12 19.5c-4.8 0-7.5-3.6-7.5-8 0-2 .6-3.8 1.6-5.2"/><path d="M12 19.5c4.8 0 7.5-3.6 7.5-8 0-2-.6-3.8-1.6-5.2"/><path d="M5.4 9.4c1.4.2 2.3 1.1 2.4 2.4M5 13.4c1.4-.1 2.5.6 2.9 1.9M7 17c1-.8 2.4-.9 3.4-.1"/><path d="M18.6 9.4c-1.4.2-2.3 1.1-2.4 2.4M19 13.4c-1.4-.1-2.5.6-2.9 1.9M17 17c-1-.8-2.4-.9-3.4-.1"/>',
        // a plain cross
        'died': '<path d="M12 3.5v17M7.5 8.5h9"/><path d="M9.5 20.5h5"/>',
        // a headstone
        'buried': '<path d="M7 20.5V9.5a5 5 0 0 1 10 0v11"/><path d="M5 20.5h14"/><path d="M12 9v6M9.8 11.2h4.4"/>'
    };
    G['area'] = '<circle cx="12" cy="12" r="7.5" stroke-dasharray="2.2 2.2"/><circle cx="12" cy="12" r="1.6"/>';
    G['streetview'] = '<circle cx="12" cy="5.4" r="2.2"/><path d="M9 20.5v-6.2L7.6 13V9.6a2 2 0 0 1 2-2h4.8a2 2 0 0 1 2 2V13L15 14.3v6.2"/><path d="M12 13.5v7"/>';
    function svg(type, cls) {
        var body = G[type] || G['lived'];
        return '<svg class="gl ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + '</svg>';
    }
    FM.glyph = svg;
    FM.GLYPHS = G;
})();
