import _ from 'lodash'

import ProtocolResolver from './ipv4-protocol-numbers'

export default {
  analyzeProtocol(packageData) {
    if (!_.isObject(packageData)) {
      console.error("PackageAnalyzer.protocolDescription called with illegal argument `packageData`: ", packageData);
      return;
    }

    // "[...] used in the Protocol field of the IPv4 header and the Next Header field of IPv6 header."
    // https://en.wikipedia.org/wiki/List_of_IP_protocol_numbers
    let protocolNumber = packageData.protocol || packageData.nextHeader;
    if (!protocolNumber) {
      if (_.get(packageData, "payload.payload.payload.constructor.name") == "TCP") {
        protocolNumber = 6;
      }
    }

    let protocol = ProtocolResolver(protocolNumber);
    protocol.version = packageData.version;
    return protocol;
    //let description = `${ protocol.number }: ${ protocol.name }`;
    //if (packageData.version) {
    //  description += ` (v${ packageData.version }) `;
    //}
    //description +=  `[${ protocol.abbreviation }]`;
    //return description;
  },

  isTcp(packageData) {
    return packageData.protocol === 6;
  },
  isUdp(packageData) {
    return packageData.protocol === 17;
  }

};