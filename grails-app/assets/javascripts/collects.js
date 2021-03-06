//= require jquery-2.2.0.min.js
//= require webjars/openlayers/4.6.5/ol.js
//= require webjars/github-com-walkermatt-ol-layerswitcher/2.0.0/ol-layerswitcher.js
//= require_self

var CollectsView = (function() {
    'use strict';

    var baseMaps;
    var overlays;

    function init( params ) {

      if  ( params.openLayersConfig.baseMaps ) {
         baseMaps = params.openLayersConfig.baseMaps.map(function(item) {
               return new ol.layer.Tile({
                  title: item.title,
                  type: 'base',
                  source: new ol.source.TileWMS({
                    url: item.url,
                    params: item.params,
                    options: item.options
                  }),
                  extent: params.extent
                })
        });
      } else {
        baseMaps = [];
      }

      if  ( params.openLayersConfig.overlays ) {
         overlays = params.openLayersConfig.overlays.map(function(item) {
               return new ol.layer.Tile({
                  title: item.title,
                  source: new ol.source.TileWMS({
                    url: item.url,
                    params: item.params,
                    options: item.options
                  }),
                  extent: params.extent
                })
        });
      } else {
        overlays = [];
      }

      overlays.push(
         new ol.layer.Vector({
            title: 'Area of Interest',
            source: filterVectorSource,
            visible: true,
            extent: params.extent
          })
      );

      var filterVectorSource = new ol.source.Vector({
          wrapX: false
      });

      var layers = [
        new ol.layer.Group({
            title: 'Base Maps',
            layers: baseMaps
        }),
        new ol.layer.Group({
            title: 'Overlays',
            layers: overlays
        })
      ];

      var map = new ol.Map({
        controls: ol.control.defaults().extend([
          new ol.control.ScaleLine({
            units: 'degrees'
          })
        ]),
        layers: layers,
        target: 'map',
        view: new ol.View({
          center: [0, 0],
          extent: params.extent,
          projection: "EPSG:4326",
          zoom: 3,
          minZoom: 2,
          maxZoom: 20
        })
      });

      var extent = params.extent;
      map.getView().fit(extent, map.getSize());

      var layerSwitcher = new ol.control.LayerSwitcher({
            tipLabel: 'Légende' // Optional label for button
      });
      map.addControl(layerSwitcher);


        var dragBox = new ol.interaction.DragBox({
            condition: ol.events.condition.altKeyOnly,
            source: filterVectorSource,
            type: 'Circle',
            geometryFunction: ol.interaction.Draw.createBox()
        });

        map.addInteraction(dragBox);

        var filterStyle = new ol.style.Style({
          fill: new ol.style.Fill({
            color: "rgba(255, 100, 50, 0.2)"
          }),
          stroke: new ol.style.Stroke({
            width: 5.0,
            color: "rgba(255, 100, 50, 0.6)"
          })
        });

      dragBox.on("boxend", function() {
        clearLayerSource(filterVectorSource);

        var dragBoxExtent = dragBox.getGeometry().getExtent();

        var searchPolygon = new ol.Feature({
          geometry: new ol.geom.Polygon.fromExtent(dragBoxExtent)
        });

        searchPolygon.setStyle(filterStyle);
        filterVectorSource.addFeatures([searchPolygon]);

        console.log(dragBoxExtent);
      });

    }

    function clearLayerSource(layerSource) {
      if (layerSource.getFeatures().length >= 1) {
        layerSource.clear();
      }
    }

    return {
        init: init
    };
})();