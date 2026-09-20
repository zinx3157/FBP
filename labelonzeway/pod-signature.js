/**
 * LabelOnZeWay Proof-of-Delivery (POD) Signature Capture & Coordination Engine
 * Provides HTML5 Canvas digital signature pad, GPS timestamp overlay, and WhatsApp/SMS template dispatch.
 */
(function(window) {
  'use strict';

  function initSignaturePad(canvasElement) {
    if (!canvasElement) return null;
    var ctx = canvasElement.getContext('2d');
    var isDrawing = false;
    var lastX = 0;
    var lastY = 0;

    function resizeCanvas() {
      var rect = canvasElement.getBoundingClientRect();
      if (rect.width && rect.height) {
        canvasElement.width = rect.width;
        canvasElement.height = rect.height;
        clearCanvas();
      }
    }

    function clearCanvas() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.strokeStyle = '#071821';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    function getPos(e) {
      var rect = canvasElement.getBoundingClientRect();
      var clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function startDraw(e) {
      isDrawing = true;
      var pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
    }

    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      var pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX = pos.x;
      lastY = pos.y;
    }

    function stopDraw() {
      isDrawing = false;
    }

    canvasElement.addEventListener('mousedown', startDraw);
    canvasElement.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvasElement.addEventListener('touchstart', startDraw, { passive: false });
    canvasElement.addEventListener('touchmove', draw, { passive: false });
    canvasElement.addEventListener('touchend', stopDraw);

    resizeCanvas();

    return {
      clear: clearCanvas,
      isEmpty: function() {
        var pixelData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
        for (var i = 0; i < pixelData.length; i += 4) {
          if (pixelData[i] !== 255 || pixelData[i + 1] !== 255 || pixelData[i + 2] !== 255) {
            return false;
          }
        }
        return true;
      },
      toDataURL: function() {
        // Stamp timestamp and watermark before export
        ctx.fillStyle = '#556677';
        ctx.font = '10px monospace';
        var now = new Date().toISOString();
        ctx.fillText('POD SIGNATURE · ' + now, 8, canvasElement.height - 8);
        return canvasElement.toDataURL('image/png');
      }
    };
  }

  function generateNotificationMessage(parcel, msgType, lang, shop) {
    msgType = msgType || 'confirmation';
    lang = lang || 'mg';
    shop = shop || { name: 'LabelOnZeWay', phone: '' };

    var rec = parcel.rec || {};
    var name = rec.name || 'Mpanjifa';
    var oid = parcel.oid || parcel.id || '0000';
    var total = (Number(parcel.cod || 0) + Number(parcel.ship || 0)).toLocaleString() + ' Ar';

    var templates = {
      mg: {
        confirmation: 'Manao ahoana ' + name + ', voarain\'i ' + shop.name + ' ny kaomandinao #' + oid + ' (Totaly: ' + total + '). Misaotra betsaka amin\'ny fahatokisana!',
        ready: 'Manao ahoana ' + name + ', vonona ny kaomandinao #' + oid + ' (Totaly: ' + total + '). Hiainga tsy ho ela ny mpandefa (rider).',
        in_transit: 'Manao ahoana ' + name + ', eny an-dalana ny mpandefa aminao izao miaraka amin\'ny kaomandy #' + oid + ' (' + total + '). Mba miomana kely aza fady!',
        delivered: 'Misaotra betsaka ' + name + '! Voarainao soamantsara ny kaomandinao #' + oid + '. Misaotra amin\'ny fiaraha-miasa miaraka amin\'i ' + shop.name + '!',
        exception: 'Manao ahoana ' + name + ', nisy olana kely tamin\'ny fandefasana ny kaomandinao #' + oid + '. Mba miantsoay izahay amin\'ny ' + shop.phone + '.'
      },
      fr: {
        confirmation: 'Bonjour ' + name + ', votre commande #' + oid + ' chez ' + shop.name + ' a été confirmée (Montant: ' + total + '). Merci pour votre confiance !',
        ready: 'Bonjour ' + name + ', votre commande #' + oid + ' (' + total + ') est prête pour l\'expédition.',
        in_transit: 'Bonjour ' + name + ', notre livreur est en route avec votre commande #' + oid + ' (' + total + '). Merci de préparer le montant exact.',
        delivered: 'Merci ' + name + ' ! Votre commande #' + oid + ' a été livrée avec succès.',
        exception: 'Bonjour ' + name + ', un souci est survenu lors de la livraison de votre commande #' + oid + '. Contactez-nous au ' + shop.phone + '.'
      },
      en: {
        confirmation: 'Hello ' + name + ', your order #' + oid + ' with ' + shop.name + ' is confirmed (Total: ' + total + '). Thank you!',
        ready: 'Hello ' + name + ', your order #' + oid + ' (' + total + ') is ready for dispatch.',
        in_transit: 'Hello ' + name + ', our rider is on the way with your package #' + oid + ' (' + total + '). Please prepare exact cash.',
        delivered: 'Thank you ' + name + '! Your order #' + oid + ' has been successfully delivered.',
        exception: 'Hello ' + name + ', there was an issue delivering your order #' + oid + '. Please contact us at ' + shop.phone + '.'
      }
    };

    var dict = templates[lang] || templates.mg;
    return dict[msgType] || dict.confirmation;
  }

  function sendWhatsAppNotice(parcel, msgType, lang, shop) {
    var rec = parcel.rec || {};
    var phone = String(rec.phone || '').replace(/\D/g, '');
    if (!phone) return false;
    if (phone.length === 10 && phone.indexOf('0') === 0) {
      phone = '261' + phone.slice(1);
    }
    var text = generateNotificationMessage(parcel, msgType, lang, shop);
    var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
    return true;
  }

  function sendSMSNotice(parcel, msgType, lang, shop) {
    var rec = parcel.rec || {};
    var phone = String(rec.phone || '').replace(/\D/g, '');
    if (!phone) return false;
    var text = generateNotificationMessage(parcel, msgType, lang, shop);
    var url = 'sms:' + phone + '?body=' + encodeURIComponent(text);
    window.location.href = url;
    return true;
  }

  window.LabelOnZeWayPOD = {
    initSignaturePad: initSignaturePad,
    generateNotificationMessage: generateNotificationMessage,
    sendWhatsAppNotice: sendWhatsAppNotice,
    sendSMSNotice: sendSMSNotice
  };

})(window);
