/* globals geo */
/* jslint latedef:false */

/* Define a set of colors for different categories */
var colorRange = d3.scale.category10().range();

/* Run after we are fully loaded */
$(function () {
    'use strict';

    /* Create a map object centered on the contiguous US */
    var map = geo.map({
        node: '#map',
        center: {
            x: -98.35,
            y: 39.5
        },
        zoom: 5
    });
    /* Make a default tile layer with OpenStreetMap tiles */
    map.createLayer('osm', {
        /* We could specify a custom tile set here:
        baseUrl: 'http://otile1.mqcdn.com/tiles/1.0.0/map/'
         */
    });
    map.draw();
});
