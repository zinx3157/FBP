/**
 * LabelOnZeWay Web Worker for Background Thermal Canvas Rasterization and Image Preprocessing
 * Offloads pixel-by-pixel ESC/POS raster calculations and image filters from the main UI thread.
 */
self.onmessage = function(e) {
  var data = e.data || {};
  var command = data.command;

  if (command === 'rasterizeCanvas') {
    var width = data.width;
    var height = data.height;
    var threshold = data.threshold || 180;
    var imageData = data.imageData; // Uint8ClampedArray pixel buffer

    var wb = Math.ceil(width / 8);
    var out = new Uint8Array(8 + wb * height);

    // GS v 0 raster header
    out.set([29, 118, 48, 0, wb & 255, (wb >> 8) & 255, height & 255, (height >> 8) & 255], 0);
    var at = 8;

    for (var y = 0; y < height; y++) {
      for (var xb = 0; xb < wb; xb++) {
        var b = 0;
        for (var bit = 0; bit < 8; bit++) {
          var x = xb * 8 + bit;
          if (x >= width) continue;
          var i = (y * width + x) * 4;
          var alpha = imageData[i + 3] / 255;
          var lum = (0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2]) * alpha + 255 * (1 - alpha);
          if (lum < threshold) {
            b |= (128 >> bit);
          }
        }
        out[at++] = b;
      }
    }

    self.postMessage({ ok: true, command: 'rasterizeCanvas', rasterBytes: out.buffer }, [out.buffer]);
  } else if (command === 'preprocessImage') {
    // Image contrast/grayscale filter for worker
    var px = data.imageData;
    var len = px.length;
    var mn = 255, mx = 0;

    for (var j = 0; j < len; j += 4) {
      var g = 0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2];
      if (g < mn) mn = g;
      if (g > mx) mx = g;
    }
    var range = Math.max(1, mx - mn);
    for (var k = 0; k < len; k += 4) {
      var val = Math.round(((0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2]) - mn) / range * 255);
      px[k] = px[k + 1] = px[k + 2] = val;
    }

    self.postMessage({ ok: true, command: 'preprocessImage', imageData: px.buffer }, [px.buffer]);
  }
};
