/**
 * LabelOnZeWay Route Optimizer & Intelligent Delivery Dispatch Engine
 * Provides route optimization (TSP nearest-neighbor), geocoding lookup for Madagascar districts,
 * turn-by-turn navigation URL generation, and stop reordering.
 */
(function(window) {
  'use strict';

  // Area coordinates mapping for common Antananarivo and Madagascar delivery zones
  var AREA_COORDINATES = {
    'analakely': { lat: -18.9102, lng: 47.5255 },
    'anisy': { lat: -18.8821, lng: 47.5385 },
    'ankoay': { lat: -18.8950, lng: 47.5180 },
    '67ha': { lat: -18.9056, lng: 47.5089 },
    'isotry': { lat: -18.9130, lng: 47.5130 },
    'andraharo': { lat: -18.8845, lng: 47.5180 },
    'ankoatakely': { lat: -18.9000, lng: 47.5200 },
    'anatihazo': { lat: -18.9080, lng: 47.5020 },
    'mahamasina': { lat: -18.9195, lng: 47.5250 },
    'anjohy': { lat: -18.9220, lng: 47.5310 },
    'amaitso': { lat: -18.9000, lng: 47.5400 },
    'ambohijatovo': { lat: -18.9135, lng: 47.5285 },
    'faravohitra': { lat: -18.9160, lng: 47.5315 },
    'ampandrianomby': { lat: -18.9005, lng: 47.5520 },
    'alatsinainy': { lat: -18.8500, lng: 47.5600 },
    'ivato': { lat: -18.7969, lng: 47.4788 },
    'talatamaty': { lat: -18.8350, lng: 47.4880 },
    'itasi': { lat: -18.9000, lng: 47.5000 },
    'antsirabe': { lat: -19.8659, lng: 47.0333 },
    'toamasina': { lat: -18.1492, lng: 49.4023 },
    'mahajanga': { lat: -15.7167, lng: 46.3167 }
  };

  var DEFAULT_START = { lat: -18.9102, lng: 47.5255, name: 'Analakely Hub (Hub Start)' };

  function haversineDistance(coords1, coords2) {
    if (!coords1 || !coords2) return 0;
    var R = 6371; // Earth radius in km
    var dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
    var dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  function resolveCoordinates(parcel) {
    if (parcel.lat && parcel.lng) return { lat: Number(parcel.lat), lng: Number(parcel.lng) };
    var rec = parcel.rec || {};
    var text = (String(rec.area || '') + ' ' + String(rec.address || '')).toLowerCase();

    for (var key in AREA_COORDINATES) {
      if (text.indexOf(key) >= 0) {
        return AREA_COORDINATES[key];
      }
    }
    // Default fallback coordinate near Analakely center with minor deterministic jitter based on ID
    var hash = String(parcel.id || parcel.oid || '0').split('').reduce(function(acc, char) {
      return acc + char.charCodeAt(0);
    }, 0);
    var jitterLat = ((hash % 50) - 25) * 0.001;
    var jitterLng = (((hash * 7) % 50) - 25) * 0.001;
    return { lat: DEFAULT_START.lat + jitterLat, lng: DEFAULT_START.lng + jitterLng };
  }

  function optimizeRoute(parcels, startCoords) {
    if (!Array.isArray(parcels) || parcels.length <= 1) {
      return (parcels || []).slice();
    }

    var current = startCoords || DEFAULT_START;
    var unvisited = parcels.slice().map(function(p) {
      return { parcel: p, coords: resolveCoordinates(p) };
    });

    var route = [];
    var totalDistance = 0;

    while (unvisited.length > 0) {
      var nearestIdx = 0;
      var minDistance = Infinity;

      for (var i = 0; i < unvisited.length; i++) {
        var dist = haversineDistance(current, unvisited[i].coords);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      var next = unvisited.splice(nearestIdx, 1)[0];
      route.push(next.parcel);
      totalDistance += (minDistance === Infinity ? 0 : minDistance);
      current = next.coords;
    }

    return {
      optimizedParcels: route,
      estimatedDistanceKm: Math.round(totalDistance * 10) / 10,
      estimatedTimeMins: Math.round(totalDistance * 3.5) + (route.length * 8) // ~3.5 min/km urban traffic + 8 min per delivery
    };
  }

  function buildNavigationUrl(parcel) {
    var rec = parcel.rec || {};
    var coords = resolveCoordinates(parcel);
    var query = encodeURIComponent([rec.name, rec.address, rec.area, 'Madagascar'].filter(Boolean).join(', '));
    return 'https://www.google.com/maps/dir/?api=1&destination=' + coords.lat + ',' + coords.lng + '&query=' + query;
  }

  window.LabelOnZeWayRouteOptimizer = {
    optimizeRoute: optimizeRoute,
    resolveCoordinates: resolveCoordinates,
    haversineDistance: haversineDistance,
    buildNavigationUrl: buildNavigationUrl,
    AREA_COORDINATES: AREA_COORDINATES
  };

})(window);
