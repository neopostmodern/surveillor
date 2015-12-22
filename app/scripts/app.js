import React from 'react'
import ReactDOM from 'react-dom'
import ReactFragment from 'react-addons-create-fragment'
import ReactUpdate from 'react-addons-update'
import ClassNames from 'classnames'

import socket_client from 'socket.io-client'

import $ from 'jquery'
import Materialize from 'materialize'
import _ from 'lodash'

import PacketTable from './packet-table'

import Icons from './components/icons'
import Preloader from './components/preloader'
import InspectBuffer from './components/inspect-buffer'

import Packet from './util/packet'
import IdentityProvider from './util/identity-provider'
import IpTools from './ip-tools'

const SERVER = "http://localhost:3000/";

class App extends React.Component {
  constructor() {
    super();

    this.ipTools = new IpTools(SERVER);

    this.state = {
      packets: {},
      numberPacketsToDisplay: 10,
      rdns: {},
      captureStatus: 'waiting-for-socket',
      selectedHosts: [],
      hostToInspect: null
    };

    this.activeRdnsRequests = [];
  }

  componentWillMount() {
    this.connect()
  }

  connect() {
    let app = this;
    this.io = socket_client(SERVER);

    // connect to server
    this.io.on('connect', function() {
      app.socket = this;
      app.setState({captureStatus: 'off'})
    });

    this.io.on('ip-addresses', (ownIpAddresses) => {
      IdentityProvider.addUser('Surveillor', ownIpAddresses.map((address) => {
        if (IpTools.isIPv4(address)) {
          return address;
        }

        // hack to re-format IPv6 to "our style"
        return address.split(':').map((part) => '0000'.substring(0, 4 - part.length) + part).join(":");
      }));

      this.setState({ ownIpAddressesReady: true });
    });

    this.io.on('packet', (packet) => {
      if (this.state.captureStatus === 'loading') {
        this.setState({ captureStatus: 'on' });
      }
      packet = JSON.parse(packet);
      if (packet.saddr) {
        this.buildRDNS(packet.saddr);
      }
      this.buildRDNS(packet.daddr);
      if (this.state.captureStatus == 'snapshot') {
        this.snapShotBuffer.push(packet);
      } else {
        this.processPacket(packet);
      }
    });

    this.io.on('capture-over', (stats) => {
      this.endCapture(stats)
    });

    // this.io.disconnect();
  }

  processPacket(packet) {
    let wrappedPacket = new Packet(packet);
    let hostIp = IpTools.ipToString(wrappedPacket.ip);
    let newPacketState;
    if (this.state.packets[hostIp]) {
      newPacketState = ReactUpdate(this.state.packets, {
        [hostIp]: { $push: [ wrappedPacket ] }
      });
    } else {
      newPacketState = ReactUpdate(this.state.packets, {
        $merge: { [hostIp]: [ wrappedPacket ]}
      })
    }
    this.setState({packets: newPacketState});
  }

  buildRDNS(ip) {
    if (!ip) {
      return;
    }
    //if (!IpTools.isIPv4(ip)) {
    //  return;
    //}

    if (ip.addr && Array.isArray(ip.addr)) {
      ip = IpTools.ipToString(ip)
    }

    if (!this.state.rdns.hasOwnProperty(ip) && this.activeRdnsRequests.indexOf(ip) === -1) {
      this.activeRdnsRequests.push(ip);
      this.ipTools.rdns(ip)
        .then((result) => {
          this.activeRdnsRequests.splice(this.activeRdnsRequests.indexOf(ip), 1);
          let newRdns = $.extend({}, this.state.rdns, {[ip]: result});
          this.setState({ rdns: newRdns });
        })
        .catch((error) => {
          // console.error(ip, error);
          let newRdns = $.extend({}, this.state.rdns, {[ip]: null});
          this.setState({ rdns: newRdns });
        });
    }
  }

  requestCapture() {
    if (this.socket) {
      this.socket.emit('capture-start');
      this.setState({ captureStatus: 'loading' });
    } else {
      alert("Please wait until we can connect.\n[No socket]");
    }
  }

  requestSnapshot() {
    if (this.socket) {
      this.clear();
      this.snapShotBuffer = [];
      this.socket.emit('snapshot');
      this.setState({ captureStatus: 'snapshot' });
    } else {
      alert("Please wait until we can connect.\n[No socket]");
    }
  }

  releaseCapture() {
    if (this.socket) {
      this.socket.emit('capture-stop');
      this.setState({ captureStatus: 'terminating' });
    } else {
      alert("Please wait until we can connect.\n[No socket]");
    }
  }

  endCapture(stats) {
    if (this.state.captureStatus == 'snapshot') {
      this.setState({ packets: this.snapShotBuffer });
    }
    this.setState({ captureStatus: 'off' });
    this.stats = stats;
  }

  abortCapture() {
    if (this.state.captureStatus == 'on') {
      this.releaseCapture();
    }

    this.endCapture({ 'error': "Capture was exited preliminarily by user."});
  }

  clear() {
    this.setState({
      packets: []
    });
  }

  showStats() {
    this.inspectJson(this.stats);
  }

  inspectJson(json) {
    this.setState({ jsonToInspect: json });
    $('#json-modal').openModal();
  }

  inspectBuffer(buffer) {
    this.setState({ bufferToInspect: buffer });
    $('#buffer-modal').openModal();
  }

  toggleHostSelected(host) {
    let hostIndex = this.state.selectedHosts.indexOf(host);
    if (hostIndex === -1) {
      this.setState({ selectedHosts: ReactUpdate(this.state.selectedHosts, { $push: [ host ] }) });
    } else {
      this.setState({ selectedHosts: ReactUpdate(this.state.selectedHosts, { $splice: [ [ hostIndex, 1 ] ] }) });
    }
  }

  inspectHost(host) {
    this.setState({ hostToInspect: host });
  }
  uninspectHost() {
    this.setState({ hostToInspect: null });
  }

  render() {
    let capture_button;
    switch (this.state.captureStatus) {
      case 'off':
        capture_button = [
          <i key="snapshot" className="material-icons capture-actions" onClick={this.requestSnapshot.bind(this)}>query_builder</i>,
          <i key="capture" className="material-icons capture-actions" onClick={this.requestCapture.bind(this)}>play_circle_outline</i>
        ];
        break;
      case 'on':
        capture_button = <i className="material-icons capture-actions" onClick={this.releaseCapture.bind(this)}>pause_circle_outline</i>;
        break;
      case 'snapshot':
        capture_button = <i className="material-icons capture-actions">more_horiz</i>;
        break;
      default:
        capture_button = <div className="capture-actions"><Preloader key="preloader capture" /></div>;
    }

    let selectedPacketGroups = this.state.selectedHosts.map((host) => this.state.packets[host]);
    let selectedPacketsAnalysis;
    if (selectedPacketGroups.length > 0) {
      let count = selectedPacketGroups.map((group) => group.length).reduce((a, b) => a + b, 0);
      let ports = [];
      selectedPacketGroups.forEach((group) => group.forEach((packet) => {
        if (ports.indexOf(packet.port) === -1) {
          ports.push(packet.port);
        }
      }));

      selectedPacketsAnalysis =
        <div className={ClassNames("col", "l3", "card", { hide: this.state.selectedHosts.length === 0 })}>
          <div className="card-action">
            <span className="card-title">Details {this.state.selectedHosts.length > 1 ? `(${ this.state.selectedHosts.length })` : ''}</span>
            <table>
              <tbody>
              <tr>
                <td>Packets</td>
                <td>{count}</td>
              </tr>
              <tr>
                <td>Ports</td>
                <td>{ports.join(", ")}</td>
              </tr>
              </tbody>
            </table>
          </div>
          <div className="card-action">
            <a href="#" onClick={this.inspectHost.bind(this, this.state.selectedHosts[0])}>inspect</a>
          </div>
        </div>
    }

    let content;
    if (this.state && this.state.packets && this.state.ownIpAddressesReady) {
      if (this.state.hostToInspect) {
        let selectedPackets = this.state.packets[this.state.hostToInspect];
        content = <PacketTable packets={selectedPackets}
                       rdns={this.state.rdns}
                       inspectJson={this.inspectJson.bind(this)}
                       inspectBuffer={this.inspectBuffer.bind(this)}/>
      } else {
        content = <div className="host-list--wrapper row">
          <div className={ClassNames("col", "l" + (this.state.selectedHosts.length === 0 ? 12 : 9), "host-list" )}>
            {_.map(this.state.packets, (packets, host) => {
              let hostName = this.state.rdns[host];
              if (hostName) {
                hostName = hostName[0].split('.').slice(-2).join('.');
              } else {
                hostName = host;
              }
              return <div className={ClassNames("host-list--item", { selected: this.state.selectedHosts.indexOf(host) !== -1 })}
                          key={host}
                          onClick={this.toggleHostSelected.bind(this, host)}
                          onDoubleClick={this.inspectHost.bind(this, host)}>{hostName}</div>;
            })}
          </div>
          {selectedPacketsAnalysis}
        </div>;
      }
    } else {
      content = "Loading...";
    }

    return <div>
      <div className="row">
        <div className="l12 col">
          <header>
            <i className={ClassNames("material-icons", "navigation", { hide: !this.state.hostToInspect})}
               onClick={this.uninspectHost.bind(this)}>arrow_back</i>
            <h1>The Price of Free WiFi - Surveillor</h1>
            {capture_button}
          </header>
          <div className="action-bar">
            <a className={ClassNames('btn', {'disabled': this.state.packets.length === 0})}
               onClick={this.clear.bind(this)}>
              <i className="material-icons">delete</i>
            </a>

            <a className={ClassNames('btn', {'disabled': !this.stats})}
               onClick={this.showStats.bind(this)}>
              <i className="material-icons">trending_up</i>
            </a>

            <a className={ClassNames('btn', {'disabled': this.state.captureStatus == 'off'})}
               onClick={this.abortCapture.bind(this)}>
              <i className="material-icons">call_end</i>
            </a>
          </div>
          {content}
        </div>
      </div>
      <div id="json-modal" className="modal modal-fixed-footer">
        <div className="modal-content">
          <h4>Inspect package</h4>
          <pre>
            {JSON.stringify(this.state.jsonToInspect, null, 4)}
          </pre>
        </div>
        <div className="modal-footer">
          <a href="#!" className=" modal-action modal-close waves-effect waves-green btn-flat">Done</a>
        </div>
      </div>
      <div id="buffer-modal" className="modal modal-fixed-footer">
        <div className="modal-content">
          <h4>Inspect buffer</h4>
          <InspectBuffer buffer={this.state.bufferToInspect} />
        </div>
        <div className="modal-footer">
          <a href="#!" className=" modal-action modal-close waves-effect waves-green btn-flat">Done</a>
        </div>
      </div>
    </div>;
  }

  componentDidUpdate() {
    if (this.state.captureStatus == 'off') {
      // don't update tooltips in live-capture since it slows us down too much
      $('.tooltipped').tooltip({delay: 50});
    }
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
