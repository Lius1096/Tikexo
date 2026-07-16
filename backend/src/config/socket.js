// Singleton Socket.io — permet aux services d'émettre des événements sans
// dépendre de l'instance express/http directement.
let _io = null;

module.exports = {
  setIo: (io) => { _io = io; },
  getIo: () => _io,
};
