import $ from 'jquery'

class IpTools {
  constructor(serverAddress) {
    this.serverAddress = serverAddress;
  }


  static ipToString(ip) {
    if (!ip) {
      return null; // todo: rethink behavior for empty values
    }

    let padHex = (hex) => hex.length < 2 ? "0" + hex : hex;

    if (typeof ip === 'string') {
      return ip;
    }

    if (ip.addr && Array.isArray(ip.addr)) {
      if (ip.addr.length === 4) { // IPv4
        return ip.addr.join(".");
      } else if (ip.addr.length == 16) { // IPv6
        let parts = ip.addr.map((part) => padHex(part.toString(16)));
        let pairs = [];
        for (let i = 0; i < 8; i++) {
          pairs.push(parts[2 * i] + parts[2 * i + 1]);
        }
        return pairs.join(":");
      }
    }
    return null;
  }

  static isIPv4(ip) {
    if (typeof ip === 'string') {
      return /(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])/.test(ip)
    } else if (ip && Array.isArray(ip.addr)) {
      return ip.addr.length === 4;
    } else {
      return false;
    }
  }

  rdns(ip) {
    return new Promise((resolve, reject) => {
      $.get(this.serverAddress + "rdns/" + ip)
        .done((result) => {
          resolve(result);
        })
        .fail((error) => {
          reject(error);
        });
    })
  }
}

export default IpTools