import IdentityProvider from './identity-provider'

export default class Packet {
  constructor (packet) {
    this.packet = packet;

    let identityInformation = IdentityProvider.whoIs(packet.saddr, packet.daddr);
    if (!identityInformation) {
      this.unidentified = true;
    } else {
      this.isSourceRemote = identityInformation.isDestination; // if the identity is the destination...
      this.ip = this.isSourceRemote ? packet.saddr : packet.daddr;
      this.port = packet.payload && (this.isSourceRemote ? packet.payload.sport : packet.payload.dport);
      this.user = {
        name: identityInformation.identity.name,
        matchedAddress: identityInformation.matchedAddress
      };
    }
  }
}