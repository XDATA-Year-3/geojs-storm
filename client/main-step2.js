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
    $.ajax({
        /* This is a copy of ftp://ftp.ncdc.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2015_c20151021.csv.gz that has been gunziped for convenience */
        // url: 'https://data.kitware.com/api/v1/file/562a3aa18d777f7522dbeebf/download',
        /* Fallback for slow wifi. Comment out the above and uncomment below. */
        url: 'storms1000.csv',
        success: function (csvd) {
            var data = $.csv2Array(csvd);
            plotData(map, data);
        },
        dataType: 'text'
    });
});

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
    map.draw();
}
