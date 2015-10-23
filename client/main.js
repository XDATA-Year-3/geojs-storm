/* globals geo */

var color20 = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00', '#b82e2e', '#316395', '#994499', '#22aa99', '#aaaa11', '#6633cc', '#e67300', '#8b0707', '#651067', '#329262', '#5574a6', '#3b3eac'];

/* Once we have loaded our CSV file, plot it on our map.
 *
 * @param map: the reference to our geojs map object.
 * @param data: the decoded CSV file.  The first element is the headers.
 */
function plotData(map, data) {
    /* create a feature layer on the map.  The renderer can either be 'vgl' to
     * use webGL and GPU acceleration or 'd3' to be more cross-compatible and
     * much slower. */
    var layer = map.createLayer('feature', {
        renderer: 'vgl'
    });
    /* create a point feature */
    var feature = layer.createFeature('point', {selectionAPI: true});

    /* Remove the header row from the data, then use the data as the source of
     * our points.  Make a column object with the number of the column for each
     * header. */
    var header = data[0];
    var columns = {};
    $.each(header, function (idx, value) {
        columns[value] = idx;
    });
    data = data.slice(1);
    feature.data(data);
    /* Set a function to use the beginning latitude and longitude from the
     * CSV for the data.  The position function is called with the data
     * element, which is a row from our csv file. */
    var latCol = columns.BEGIN_LAT,
        lonCol = columns.BEGIN_LON;
    feature.position(function (d) {
            return {x: d[lonCol], y: d[latCol]};
        });
    /* We have a lot of types of events.  Color each differently using fill
     * and stroke color for unique combinations.  */
    var catCol = columns.EVENT_TYPE;
    var catStyle = {};
    $.each(data, function (idx, d) {
        if (!catStyle[d[catCol]]) {
            var pos = Object.keys(catStyle).length;
            catStyle[d[catCol]] = {
                fillColor: color20[pos % 20],
                strokeColor: color20[(pos  * 3 + 1) % 20]
            };
        }
    });
    /* Now that we have computed a bunch of style colors for different event
     * types, apply them to the data points. */
    feature.style({
        fillColor: function (d) {
            return catStyle[d[catCol]].fillColor;
        },
        strokeColor: function (d) {
            return catStyle[d[catCol]].strokeColor;
        },
        /* Use opacity so that we can a heat-map sort of effect when zoomed
         * out. */
        fillOpacity: 0.25,
        strokeOpacity: 0.25
    });
    /* We probably want to add map interaction (tool tips with the data
     * description), a legend, and size points based on damage value. */
    map.draw();
}

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
    $.ajax({
        /* This is a copy of ftp://ftp.ncdc.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2015_c20151021.csv.gz that has been gunziped for convenience */
        url: 'https://data.kitware.com/api/v1/file/562a3aa18d777f7522dbeebf/download',
        success: function (csvd) {
            var data = $.csv2Array(csvd);
            plotData(map, data);
        },
        dataType: 'text'
    });
});
