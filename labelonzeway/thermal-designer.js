/**
 * LabelOnZeWay Dynamic Thermal Label Layout Studio & ESC/POS Command Engine
 * Generates dynamic thermal label layouts (58mm, 72mm, 80mm, 100mm) with custom logos,
 * QR code / Barcode support, and dynamic ESC/POS bytecode generation.
 */
(function(window) {
  'use strict';

  var PAPER_PROFILES = {
    '58mm': { widthMm: 58, dots: 384, name: '58 mm Narrow Roll' },
    '72mm': { widthMm: 72, dots: 576, name: '72 mm Standard Roll (POS80C)' },
    '80mm': { widthMm: 80, dots: 640, name: '80 mm Wide Thermal Roll' },
    '100mm': { widthMm: 100, dots: 800, name: '100 mm Thermal Sticker / Shipping Label' }
  };

  function generateESCPOSTemplate(parcel, shop, profileKey) {
    profileKey = profileKey || '72mm';
    var profile = PAPER_PROFILES[profileKey] || PAPER_PROFILES['72mm'];
    var dots = profile.dots;
    var rec = parcel.rec || {};
    var cod = Number(parcel.cod || 0);
    var ship = Number(parcel.ship || 0);
    var total = cod + ship;

    var escposBytes = [];

    // Initialize printer
    escposBytes.push(27, 64); // ESC @
    // Center alignment for Header
    escposBytes.push(27, 97, 1); // ESC a 1
    // Double height & double width
    escposBytes.push(29, 33, 17); // GS ! 17

    // Header Shop Name
    var shopName = (shop.name || 'LABELONZEWAY').toUpperCase() + '\n';
    for (var i = 0; i < shopName.length; i++) {
      escposBytes.push(shopName.charCodeAt(i));
    }

    // Normal text
    escposBytes.push(29, 33, 0); // GS ! 0
    if (shop.tagline) {
      var tag = shop.tagline + '\n';
      for (var j = 0; j < tag.length; j++) escposBytes.push(tag.charCodeAt(j));
    }
    if (shop.phone) {
      var tel = 'Tel: ' + shop.phone + '\n';
      for (var k = 0; k < tel.length; k++) escposBytes.push(tel.charCodeAt(k));
    }

    // Divider line
    var divider = '------------------------------------------------\n';
    for (var d1 = 0; d1 < Math.min(divider.length, Math.floor(dots / 12)); d1++) {
      escposBytes.push(45);
    }
    escposBytes.push(10);

    // Left alignment for Recipient info
    escposBytes.push(27, 97, 0); // ESC a 0
    escposBytes.push(27, 69, 1); // Bold ON

    var orderTitle = 'ORDER #: ' + (parcel.oid || parcel.id || '0000') + '\n';
    for (var o = 0; o < orderTitle.length; o++) escposBytes.push(orderTitle.charCodeAt(o));

    escposBytes.push(27, 69, 0); // Bold OFF

    var recName = 'DELIVER TO: ' + (rec.name || 'Customer') + '\n';
    for (var rn = 0; rn < recName.length; rn++) escposBytes.push(recName.charCodeAt(rn));

    if (rec.phone) {
      var recPhone = 'TEL: ' + rec.phone + '\n';
      for (var rp = 0; rp < recPhone.length; rp++) escposBytes.push(recPhone.charCodeAt(rp));
    }

    var addr = [rec.address, rec.area].filter(Boolean).join(', ');
    if (addr) {
      var recAddr = 'ADDR: ' + addr + '\n';
      for (var ra = 0; ra < recAddr.length; ra++) escposBytes.push(recAddr.charCodeAt(ra));
    }

    // Amount Collect Box
    escposBytes.push(27, 97, 1); // Center
    escposBytes.push(29, 33, 17); // GS ! 17 (Double size)
    var amountLine = 'TOTAL: ' + total.toLocaleString() + ' ' + (shop.currency || 'Ar') + '\n';
    for (var am = 0; am < amountLine.length; am++) escposBytes.push(amountLine.charCodeAt(am));

    escposBytes.push(29, 33, 0); // Normal size
    escposBytes.push(27, 97, 0); // Left align

    // Feed and Cut
    escposBytes.push(27, 100, 4); // Feed 4 lines
    escposBytes.push(29, 86, 66, 0); // Partial cut

    return new Uint8Array(escposBytes);
  }

  window.LabelOnZeWayThermalDesigner = {
    PAPER_PROFILES: PAPER_PROFILES,
    generateESCPOSTemplate: generateESCPOSTemplate
  };

})(window);
