/**
 * @file
 * Javascript for Yandex Maps integration.
 */

(function ($, Drupal) {
  'use strict';

  /* global ymaps */

  /**
   * GeolocationYandexMap element.
   *
   * @constructor
   * @augments {GeolocationMapBase}
   * @implements {GeolocationMapInterface}
   * @inheritDoc
   *
   * @prop {Object} settings.yandex_settings - Yandex Maps specific settings.
   * @prop {ymaps} yandexMap
   */
  function GeolocationYandexMap(mapSettings) {
    if (typeof ymaps === 'undefined') {
      console.error('Yandex Maps library not loaded. Bailing out.'); // eslint-disable-line no-console.
      return;
    }

    this.type = 'yandex';

    Drupal.geolocation.GeolocationMapBase.call(this, mapSettings);

    var defaultYandexSettings = {
      zoom: 10
    };

    // Add any missing settings.
    this.settings.yandex_settings = $.extend(defaultYandexSettings, this.settings.yandex_settings);

    // Set the container size.
    this.container.css({
      height: this.settings.yandex_settings.height,
      width: this.settings.yandex_settings.width
    });

    var that = this;

    ymaps.ready(function () {
      // Instantiate (and display) a map object:
      that.yandexMap = new ymaps.Map(
        that.container.get(0), {
          center: [that.lng, that.lat],
          zoom: that.settings.yandex_settings.zoom,
          controls: []
        }
      );

      that.addPopulatedCallback(function (map) {
        map.yandexMap.events.add('click', function (e) {
          var coords = e.get('coords');
          map.clickCallback({lat: coords[1], lng: coords[0]});
        });

        map.yandexMap.events.add('contextmenu', /** @param {IEvent} e */ function (e) {
          var coords = e.get('coords');
          map.contextClickCallback({lat: coords[1], lng: coords[0]});
        });

        map.yandexMap.events.add('boundschange', /** @param {IEvent} e */ function (e) {
          map.boundsChangedCallback(e.get('newBounds'));
        });
      });

      that.initializedCallback();
      that.populatedCallback();
    });
  }
  GeolocationYandexMap.prototype = Object.create(Drupal.geolocation.GeolocationMapBase.prototype);
  GeolocationYandexMap.prototype.constructor = GeolocationYandexMap;
  GeolocationYandexMap.prototype.getZoom = function () {
    var that = this;
    return new Promise(function (resolve, reject) {
      resolve(that.yandexMap.getZoom());
    });
  };
  GeolocationYandexMap.prototype.setZoom = function (zoom, defer) {
    if (typeof zoom === 'undefined') {
      zoom = this.settings.yandex_settings.zoom;
    }
    zoom = parseInt(zoom);
    this.yandexMap.setZoom(zoom);
  };
  GeolocationYandexMap.prototype.setCenterByCoordinates = function (coordinates, accuracy, identifier) {
    Drupal.geolocation.GeolocationMapBase.prototype.setCenterByCoordinates.call(this, coordinates, accuracy, identifier);
    this.yandexMap.setCenter([coordinates.lng, coordinates.lat]);
  };
  GeolocationYandexMap.prototype.setMapMarker = function (markerSettings) {
    var yandexMarkerSettings = {
      hintContent: markerSettings.title,
      iconContent: markerSettings.label
    };

    var currentMarker = new ymaps.Placemark([parseFloat(markerSettings.position.lng), parseFloat(markerSettings.position.lat)], yandexMarkerSettings);

    this.yandexMap.geoObjects.add(currentMarker);

    currentMarker.locationWrapper = markerSettings.locationWrapper;

    Drupal.geolocation.GeolocationMapBase.prototype.setMapMarker.call(this, currentMarker);

    return currentMarker;
  };
  GeolocationYandexMap.prototype.removeMapMarker = function (marker) {
    Drupal.geolocation.GeolocationMapBase.prototype.removeMapMarker.call(this, marker);
    this.yandexMap.geoObjects.remove(marker);
  };
  GeolocationYandexMap.prototype.addShape = function (shapeSettings) {
    if (typeof shapeSettings === 'undefined') {
      return;
    }

    var coordinates = [];

    $.each(shapeSettings.coordinates, function (index, coordinate) {
      coordinates.push([coordinate.lng, coordinate.lat]);
    });

    var shape;

    switch (shapeSettings.shape) {
      case 'line':
        shape = new ymaps.Polyline(coordinates, {
          balloonContent: shapeSettings.title
        }, {
          balloonCloseButton: false,
          strokeColor: shapeSettings.strokeColor,
          strokeWidth: shapeSettings.strokeWidth,
          strokeOpacity: shapeSettings.strokeOpacity
        });
        break;

      case 'polygon':
        shape = new ymaps.Polygon([coordinates], {
          hintContent: shapeSettings.title
        }, {
          strokeColor: shapeSettings.strokeColor,
          strokeWidth: shapeSettings.strokeWidth,
          strokeOpacity: shapeSettings.strokeOpacity,
          fillColor: shapeSettings.fillColor,
          fillOpacity: shapeSettings.fillOpacity
        });
        break;
    }

    this.yandexMap.geoObjects.add(shape);

    Drupal.geolocation.GeolocationMapBase.prototype.addShape.call(this, shape);

    return shape;

  };
  GeolocationYandexMap.prototype.removeShape = function (shape) {
    if (typeof shape === 'undefined') {
      return;
    }
    Drupal.geolocation.GeolocationMapBase.prototype.removeShape.call(this, shape);
    this.yandexMap.geoObjects.remove(shape);
  };
  GeolocationYandexMap.prototype.getCenter = function () {
    return this.yandexMap.getCenter();
  };
  GeolocationYandexMap.prototype.normalizeBoundaries = function (boundaries) {
    if (
      typeof boundaries[0] === 'object'
      && typeof boundaries[0][0] === 'number'
      && typeof boundaries[0][1] === 'number'
      && typeof boundaries[1] === 'object'
      && typeof boundaries[1][0] === 'number'
      && typeof boundaries[1][1] === 'number'
    ) {
      return {
        north: boundaries[1][0],
        east: boundaries[1][1],
        south: boundaries[0][0],
        west: boundaries[0][1]
      };
    }

    return false;
  };
  GeolocationYandexMap.prototype.denormalizeBoundaries = function (boundaries) {
    if (typeof boundaries === 'undefined') {
      return false;
    }

    if (
      typeof boundaries[0] === 'object'
      && typeof boundaries[0][0] === 'number'
      && typeof boundaries[0][1] === 'number'
      && typeof boundaries[1] === 'object'
      && typeof boundaries[1][0] === 'number'
      && typeof boundaries[1][1] === 'number'
    ) {
      return boundaries;
    }

    if (Drupal.geolocation.GeolocationMapBase.prototype.boundariesNormalized.call(this, boundaries)) {
      return [
        [boundaries.west, boundaries.south],
        [boundaries.east, boundaries.north]
      ];
    }
    else {
      boundaries = Drupal.geolocation.GeolocationMapBase.prototype.normalizeBoundaries.call(this, boundaries);
      if (boundaries) {
        return [
          [boundaries.west, boundaries.south],
          [boundaries.east, boundaries.north]
        ];
      }
    }

    return false;
  };
  GeolocationYandexMap.prototype.fitBoundaries = function (boundaries, identifier) {
    boundaries = this.denormalizeBoundaries(boundaries);
    if (!boundaries) {
      return;
    }

    this.yandexMap.setBounds(boundaries);
    Drupal.geolocation.GeolocationMapBase.prototype.fitBoundaries.call(this, boundaries, identifier);
  };
  GeolocationYandexMap.prototype.getMarkerBoundaries = function (locations) {
    locations = locations || this.mapMarkers;
    if (locations.length === 0) {
      return;
    }

    return this.yandexMap.geoObjects.getBounds();
  };

  Drupal.geolocation.GeolocationYandexMap = GeolocationYandexMap;
  Drupal.geolocation.addMapProvider('yandex', 'GeolocationYandexMap');

})(jQuery, Drupal);
;
/**
 * @file
 * Control geolocation.
 */

(function (Drupal) {

  'use strict';

  /* global ymaps */

  /**
   * Search control.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches common map geolocation functionality to relevant elements.
   */
  Drupal.behaviors.yandexControlGeolocation = {
    attach: function (context, drupalSettings) {
      Drupal.geolocation.executeFeatureOnAllMaps(
        'yandex_control_geolocation',

        /**
         * @param {GeolocationYandexMap} map - Current map.
         * @param {Object} featureSettings - Settings for current feature.
         */
        function (map, featureSettings) {
          var geolocationControl = new ymaps.control.GeolocationControl({
            options: { noPlacemark: true }
          });

          map.yandexMap.controls.add(geolocationControl);

          return true;
        },
        drupalSettings
      );
    },
    detach: function (context, drupalSettings) {}
  };

})(Drupal);
;
/**
 * @file
 * Search.
 */

(function (Drupal) {

  'use strict';

  /* global ymaps */

  /**
   * Search control.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches common map search functionality to relevant elements.
   */
  Drupal.behaviors.yandexControlSearch = {
    attach: function (context, drupalSettings) {
      Drupal.geolocation.executeFeatureOnAllMaps(
        'yandex_control_search',

        /**
         * @param {GeolocationYandexMap} map - Current map.
         * @param {Object} featureSettings - Settings for current feature.
         */
        function (map, featureSettings) {
          var searchControl = new ymaps.control.SearchControl({
            options: { noPlacemark: true }
          });
          map.yandexMap.controls.add(searchControl);

          return true;
        },
        drupalSettings
      );
    },
    detach: function (context, drupalSettings) {}
  };

})(Drupal);
;
/**
 * @file
 * Control traffic.
 */

(function (Drupal) {

  'use strict';

  /**
   * Search control.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches common map traffic functionality to relevant elements.
   */
  Drupal.behaviors.yandexControlTraffic = {
    attach: function (context, drupalSettings) {
      Drupal.geolocation.executeFeatureOnAllMaps(
        'yandex_control_traffic',

        /**
         * @param {GeolocationYandexMap} map - Current map.
         * @param {Object} featureSettings - Settings for current feature.
         */
        function (map, featureSettings) {
          map.yandexMap.controls.add('trafficControl');

          return true;
        },
        drupalSettings
      );
    },
    detach: function (context, drupalSettings) {}
  };

})(Drupal);
;
/**
 * @file
 * Control Zoom.
 */

(function (Drupal) {

  'use strict';

  /**
   * Zoom control.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches common map zoom functionality to relevant elements.
   */
  Drupal.behaviors.yandexControlZoom = {
    attach: function (context, drupalSettings) {
      Drupal.geolocation.executeFeatureOnAllMaps(
        'yandex_control_zoom',

        /**
         * @param {GeolocationYandexMap} map - Current map.
         * @param {Object} featureSettings - Settings for current feature.
         */
        function (map, featureSettings) {
          var options = {};

          switch (featureSettings["position"]) {
            case "left":
            case "top":
            case "bottom":
              // Leave the default values.
              options = {};
              break;
            case "right":
              // Size adaptivity will be disabled.
              options = {
                position: {
                  top: "108px",
                  right: "10px",
                  bottom: "auto",
                  left: "auto"
                }
              };
              break;
          }

          map.yandexMap.controls.add('zoomControl', options);

          return true;
        },
        drupalSettings
      );
    },
    detach: function (context, drupalSettings) {}
  };

})(Drupal);
;
