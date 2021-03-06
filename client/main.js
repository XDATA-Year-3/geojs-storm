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
        url: 'https://data.kitware.com/api/v1/file/562a3aa18d777f7522dbeebf/download',
        /* Fallback for slow wifi. Comment out the above and uncomment below. */
        // url: 'storms1000.csv',
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

    /* We have a lot of types of events.  Color each differently using fill
     * and stroke color for unique combinations.  */
    var catCol = columns.EVENT_TYPE,
        legend = [],
        catStyle = {};
    $.each(data, function (idx, d) {
        if (!catStyle[d[catCol]]) {
            var pos = Object.keys(catStyle).length;
            catStyle[d[catCol]] = {
                fillColor: colorRange[pos % colorRange.length],
                strokeColor: colorRange[
                    (Math.floor(pos / colorRange.length) * 3 + pos) %
                    colorRange.length]
            };
            legend.push({
                name: d[catCol],
                style: catStyle[d[catCol]],
                type: 'point'
            });
        }
    });
    /* Now that we have computed a bunch of style colors for different event
     * types, apply them to the data points. */
    var style = {
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
    };
    feature.style(style);

    /* Create a legend for these */
    var ui = map.createLayer('ui');
    ui.createWidget('legend').categories(legend);

    /* Draw everything we've added */
    map.draw();

    /* Show a tooltip on any point that we hover over.  We put a bunch of our
     * values into an object so that the events can use them without passing
     * everything individually. */
    var info = {
        map: map,
        pointsFeature: feature,
        legend: legend,
        data: data,
        style: style,
        columns: columns,
        lonCol: lonCol,
        latCol: latCol,
        catCol: catCol,
        currentCategory: null
    };
    feature.geoOn(geo.event.feature.mouseover, function (evt) {
        pointInformation(evt, info, true);
    }).geoOn(geo.event.feature.mouseout, function (evt) {
        pointInformation(evt, info, false);
    });

    /* When the user clicks a point, dim all of the other categories.  If they
     * click the map in general, show everything the original amount.  We
     * capture the mousedown on the map element, and then react according to
     * what point we were hovering over.  We could instead capture both the
     * click on individual points AND on the map. */
    $(map.node()).on('mousedown', function (evt) {
        pointClick(evt, info);
    });

    $('#map').on('mouseover', '.geo-label', function (evt) {
        legendHover(evt, info, true);
    }).on('mouseout', '.geo-label', function (evt) {
        legendHover(evt, info, false);
    });
}

/* When the mouse enters or leaves a point, show or hide a div with
 * information relative to the position of the point.
 *
 * @param evt: the geojs event.
 * @param info: an object with information about our data.
 * @param over: true if we are over the point, false if we have left it.
 */
function pointInformation(evt, info, over) {
    if (!over) {
        if ($('#info').attr('index') === '' + evt.index) {
            $('#info').hide();
        }
        return;
    }
    /* If we hid the point via opacity, don't react to it. */
    if (info.currentCategory !== null && evt.data[info.catCol] !== info.currentCategory) {
        return;
    }
    var pos = info.map.gcsToDisplay({
        x: evt.data[info.lonCol],
        y: evt.data[info.latCol]
    });
    var text = evt.data[info.catCol];
    $.each(['BEGIN_DATE_TIME', 'EPISODE_NARRATIVE', 'EVENT_NARRATIVE'], function (idx, key) {
        if (evt.data[info.columns[key]]) {
            text += ' - ' + evt.data[info.columns[key]];
        }
    });
    $('#info').css({
        left: (pos.x + 10) + 'px',
        top: (pos.y + 10) + 'px'
    }).text(text).attr('index', evt.index);
    $('#info').show();
}

/* Handle clicking on the map.  If we have a point that we are hovering over,
 * then make all points of a different type transparent.  Otherwise, show all
 * points.
 *
 * @param evt: the jquery event that triggered this call.
 * @param info: an object with information about our data.
 */
function pointClick(evt, info) {
    var category = null;
    if ($('#info:visible').length > 0) {
        category = info.data[$('#info').attr('index')][info.catCol];
    }
    showCategory(category, info);
}

/* Show only a particular category of event.
 *
 * @param category: the category to show or null for all categories.
 * @param info: an object with information about our data.
 */
function showCategory(category, info) {
    if (category === info.currentCategory) {
        /* No changes, so don't do anything. */
        return;
    }
    info.currentCategory = category;
    /* We reach into some of the internals in vgl so that we can get the speed
     * of using webGl. */
    var vpf = info.pointsFeature.verticesPerFeature(),
        mapper = info.pointsFeature.actors()[0].mapper();
    /* This gets us direct access to the buffers used by webGl */
    var fillOpacityBuffer = mapper.getSourceBuffer('fillOpacity'),
        strokeOpacityBuffer = mapper.getSourceBuffer('strokeOpacity');
    var i, j, v, fillOpacity, strokeOpacity;
    for (i = 0, v = 0; i < info.data.length; i += 1) {
        if (category === null || info.data[i][info.catCol] === category) {
            fillOpacity = info.style.fillOpacity;
            strokeOpacity = info.style.strokeOpacity;
        } else {
            fillOpacity = strokeOpacity = 0;
        }
        for (j = 0; j < vpf; j += 1, v += 1) {
            fillOpacityBuffer[v] = fillOpacity;
            strokeOpacityBuffer[v] = strokeOpacity;
        }
    }
    /* Notify the mapper that these buffers have been updated */
    mapper.updateSourceBuffer('fillOpacity');
    mapper.updateSourceBuffer('strokeOpacity');
    /* Redraw the map */
    info.map.draw();
}

/* When the mouse enters or leaves a part of the legend, show just that
 * category.
 *
 * @param evt: the jquery event.
 * @param info: an object with information about our data.
 * @param over: true if we are over the point, false if we have left it.
 */
function legendHover(evt, info, over) {
    var category = null;

    if (over) {
        var pos = $(evt.target).closest('.geo-label').index() - 1;
        category = info.legend[pos].name;
    }
    showCategory(category, info);
}
