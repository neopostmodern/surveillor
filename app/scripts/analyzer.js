import _ from 'lodash'

import ProtocolResolver from './util/ipv4-protocol-numbers'

export default class PackageAnalyzer {
  constructor(ownIpAddresses) {
    this.ownIpAddresses = ownIpAddresses;
  }

  analyzeProtocol(packageData) {
    if (!_.isObject(packageData)) {
      console.error("PackageAnalyzer.protocolDescription called with illegal argument `packageData`: ", packageData);
      return;
    }

    let protocol = ProtocolResolver(packageData.protocol);
    protocol.version = packageData.version;
    return protocol;
    //let description = `${ protocol.number }: ${ protocol.name }`;
    //if (packageData.version) {
    //  description += ` (v${ packageData.version }) `;
    //}
    //description +=  `[${ protocol.abbreviation }]`;
    //return description;
  }
  isTcp(packageData) {
    return packageData.protocol === 6;
  }
  isUdp(packageData) {
    return packageData.protocol === 17;
  }

  isOwnIpAddress(ipv4) {
    return this.ownIpAddresses.indexOf(ipv4) !== -1;
  }
};