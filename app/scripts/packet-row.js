import React from 'react'
import ClassNames from 'classnames'

import MultiValueDisplay from './components/multi-value-display'

import ProtocolAnalyzer from './util/protocol-analyzer'
import OwnIpAddresses from './util/own-ip-addresses'
import TcpPortNumbers from './util/tcp-port-numbers'

import IpTools from './ip-tools'

export default class PacketRow extends React.Component {
  render() {
    let packet = this.props.packet;
    let RDNS = this.props.rdns;

    let isSourceRemote = [packet.saddr, packet.daddr].findIndex((address) => !OwnIpAddresses.isOwnIpAddress(address)) === 0;
    let ip = isSourceRemote ? packet.saddr : packet.daddr;
    let port = packet.payload && (isSourceRemote ? packet.payload.sport : packet.payload.dport);

    let hostname = IpTools.ipToString(ip);
    if (RDNS[hostname]) {
      hostname = RDNS[hostname].join(" / ");
    }
    let port_name = TcpPortNumbers.get(port);
    if (port_name) {
      port_name = port_name.name;
    } else {
      port_name = port;
    }

    let protocol = ProtocolAnalyzer.analyzeProtocol(packet);
    let url_flag_matchers = [
      {
        hostname_matcher: /facebook/i,
        flag: "Facebook"
      },
      {
        hostname_matcher: /dropbox/i,
        flag: "Dropbox"
      },
      {
        hostname_matcher: /yahoo/i,
        flag: "Yahoo"
      },
      {
        hostname_matcher: /owncloud/i,
        flag: "OwnCloud"
      },
      {
        hostname_matcher: /mailbox\.org/i,
        flag: "Mailbox.org"
      },
      {
        hostname_matcher: /telegram\.org/i,
        flag: "Telegram"
      },
      {
        hostname_matcher: /spotify/i,
        flag: "Spotify"
      },
      {
        hostname_matcher: /github/i,
        flag: "GitHub"
      },
      {
        ports: [17500],
        flag: "Dropbox"
      },
      {
        ports: [143, 993],
        flag: "Checking email"
      },
      {
        hostname_matcher: /1e100\.net/i,
        ports: [993],
        flag: "GMail"
      }
    ];
    let flags = [];
    url_flag_matchers.forEach(({hostname_matcher, ports, flag}) => {
      let hit = true;
      if (hostname_matcher) {
        if (!hostname_matcher.test(hostname)) {
          hit = false;
        }
      }
      if (ports) {
        if (ports.indexOf(port) === -1) {
          hit = false;
        }
      }

      if (hit) {
        flags.push(flag);
      }
    });
    flags = flags.map((flag, index) =>
      <span className="chip" key={index}>{flag}</span>
    );

    return <tr>
      <td>
        {this.props.packetIndex + 1}
      </td>
      <td>
        {packet.time}
      </td>
      <td>
        Clemens
      </td>
      <td>
        <i className={ClassNames('material-icons', isSourceRemote ? 'green-text' : 'indigo-text', 'text-darken-4')}>
          {isSourceRemote ? 'arrow_back' : 'arrow_forward'}
        </i>
      </td>
      <td>
        <MultiValueDisplay nice={protocol.abbreviation + "v" + protocol.version} real={protocol.number + ": " + protocol.name} />
      </td>
      <td>
        <MultiValueDisplay nice={hostname} real={IpTools.ipToString(ip)} />
      </td>
      <td>
        <MultiValueDisplay nice={port_name} real={port} />
      </td>
      <td>{flags}</td>
      <td>
        <a className="waves-effect waves-teal btn-flat" onClick={() => this.props.inspectJson(packet)}>
          <i className="material-icons">library_books</i>
        </a>
      </td>
    </tr>;
  }
}