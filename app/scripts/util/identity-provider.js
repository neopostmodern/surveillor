import _ from 'lodash'

import IpTools from './../ip-tools'

var Identities = [];

export default {
  whoIs(sourceIp, destinationIp) {
    if (_.keys(Identities).length === 0) {
      // todo: is this a valid error scenario?
      throw new Error("IP addresses not initalized / No identities registered.");
    }
    let requestAddresses = [
      {
        isSource: true,
        ip: sourceIp
      },
      {
        isSource: false,
        ip: destinationIp
      }
    ];

    for (let requestAddress of requestAddresses) {
      let { ip, isSource } = requestAddress;
      if (!(typeof ip == 'string')) {
        ip = IpTools.ipToString(ip);
      }

      for (let identity of Identities) {
        let addressIndex = identity.addresses.indexOf(ip);
        if (addressIndex !== -1) {
          return {
            isSource: isSource,
            isDestination: !isSource,
            identity: identity,
            matchedAddress: identity.addresses[addressIndex]
          };
          // todo: what to return? src/dst (how)? matched address? name/_id?
        }
      }
    }
  },

  addUser(name, addresses) {
    if (!name || typeof name != 'string') {
      throw new TypeError("Called without (valid) name", name);
    }
    if (!addresses) {
      throw new TypeError("Called without addresses", addresses);
    }
    if (!Array.isArray(addresses)) {
      addresses = [ addresses ];
    }
    Identities.push({name, addresses});
  }
}