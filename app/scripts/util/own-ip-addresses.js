import IpTools from './../ip-tools'

var ownIpAddresses = [];

export default {
  isOwnIpAddress(ip) {
    if (ownIpAddresses.length === 0) {
      throw new Error("Own IP addresses not initalized.");
    }
    if (!(typeof ip == 'string')) {
      ip = IpTools.ipToString(ip);
    }
    return ownIpAddresses.indexOf(ip) !== -1;
  },

  setOwnIpAddresses(addresses) {
    if (!addresses) {
      throw new TypeError("Called without addresses", addresses);
    }
    if (!Array.isArray(addresses)) {
      addresses = [ addresses ];
    }
    ownIpAddresses = addresses;
  }
}