/**
 * LabelOnZeWay Cash-on-Delivery (COD) Reconciliation & Daily Financial Claims Engine
 * Reconciles expected COD amounts against physical cash, mobile money collections (MVola, Orange Money, Airtel Money),
 * and flags variances per rider or per profile.
 */
(function(window) {
  'use strict';

  function calculateCOD Ledger(manifestRows, collections) {
    collections = collections || { cash: 0, mvola: 0, orangeMoney: 0, airtelMoney: 0, bank: 0 };

    var deliveredRows = (manifestRows || []).filter(function(r) {
      return r && (r.done || r.deliveryStatus === 'delivered');
    });

    var expectedCOD = deliveredRows.reduce(function(sum, r) {
      return sum + Number(r.cod || 0);
    }, 0);

    var expectedShip = deliveredRows.reduce(function(sum, r) {
      return sum + Number(r.ship || 0);
    }, 0);

    var totalExpected = expectedCOD + expectedShip;

    var totalCollected = Number(collections.cash || 0) +
                         Number(collections.mvola || 0) +
                         Number(collections.orangeMoney || 0) +
                         Number(collections.airtelMoney || 0) +
                         Number(collections.bank || 0);

    var variance = totalCollected - totalExpected;

    return {
      parcelCount: deliveredRows.length,
      expectedCOD: expectedCOD,
      expectedShip: expectedShip,
      totalExpected: totalExpected,
      totalCollected: totalCollected,
      variance: variance,
      isBalanced: Math.abs(variance) < 0.01,
      status: variance === 0 ? 'BALANCED' : (variance > 0 ? 'SURPLUS (+' + variance.toLocaleString() + ' Ar)' : 'DEFICIT (' + variance.toLocaleString() + ' Ar)')
    };
  }

  window.LabelOnZeWayCODReconciler = {
    calculateCODLedger: calculateCODLedger
  };

})(window);
