import React from 'react'
import ReactDOM from 'react-dom'
import ReactFragment from 'react-addons-create-fragment'

import socket_client from 'socket.io-client'

import $ from 'jquery'
import materialize from 'materialize-css/dist/js/materialize.min'

import Icons from './components/icons'

import PacketAnalyzer from './analyzer'
import IpTools from './ip-tools'
import TcpPortNumbers from './util/tcp-port-numbers'

const SERVER = "http://localhost:3000/";

class App extends React.Component {
  constructor() {
    super();

    this.ipTools = new IpTools(SERVER);

    this.state = {
      packets: [],
      rdns: {},
      captureStatus: 'waiting-for-socket'
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

    this.io.on('ip-addresses', (ownIpAddresses) =>
      this.setState({
        ownIpAddresses: ownIpAddresses.map((address) => {
          if (IpTools.isIPv4(address)) {
            return address;
          }

          // hack to re-formatt IPv6 to "our style"
          return address.split(':').map((part) => '0000'.substring(0, 4 - part.length) + part).join(":");
        })
      })
    );

    this.io.on('packet', (packet) => {
      if (this.state.captureStatus === 'loading') {
        this.setState({ captureStatus: 'on' });
      }
      if (packet.saddr) {
        this.buildRDNS(packet.saddr);
      }
      this.buildRDNS(packet.daddr);
      this.setState({packets: this.state.packets.slice(-50).concat([packet])})
    });

    // this.io.disconnect();
  }

  buildRDNS(ip) {
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

  releaseCapture() {
    if (this.socket) {
      this.socket.emit('capture-stop');
      this.setState({ captureStatus: 'off' });
    } else {
      alert("Please wait until we can connect.\n[No socket]");
    }
  }

  inspectJson(packet) {
    this.setState({packetToInspect: packet});
    $('#json-modal').openModal();
  }

  render() {
    let packageInfo;
    if (this.state && this.state.packets && this.state.ownIpAddresses) {
      let analyzer = new PacketAnalyzer(this.state.ownIpAddresses);

      let app = this; // todo: scoping
      function displayIp(ip, port=null) {
        if (!ip) {
          return null;
        }

        if (ip.addr) {
          ip = IpTools.ipToString(ip);
          let ip_content = ip;

          if (analyzer.isOwnIpAddress(ip)) {
            ip_content = <i className="material-icons">person_pin</i>;
          } else if (app.state.rdns[ip]) {
            ip_content = app.state.rdns[ip].join(" / ");
          }

          if (port) {
            let portName = TcpPortNumbers.get(port);
            if (portName) {
              port = portName.name;
            }
            port = <span className="badge">{port}</span>;
          }

          return <div className="ip-address tooltipped"
                      data-position="bottom"
                      data-delay="50"
                      data-tooltip={ip}>
            {ip_content}
            {port}
          </div>;
        } else {
          return "N/A"
        }
      }
      packageInfo = <table className="highlight">
        <thead>
          <tr>
            <th>Time</th>
            <th>Protocol</th>
            <th>Source IP</th>
            <th>Target IP</th>
            <th>Flags</th>
            <th>Tools</th>
          </tr>
        </thead>
        <tbody>
          {this.state.packets.map((packet, packetIndex) => {
            let protocol = analyzer.analyzeProtocol(packet);
            let flags = [];
            // flags.map((flag, index) => <span className="chip" key="index">{flag}</span>)

            return <tr key={packet._id}>
              <td>
                {packet.time}
              </td>
              <td className="tooltipped"
                  data-position="bottom"
                  data-delay="50"
                  data-tooltip={protocol.number + ": " + protocol.name}>
                {protocol.abbreviation}v{protocol.version}
              </td>
              <td>{displayIp(packet.saddr, packet.payload && packet.payload.sport)}</td>
              <td>{displayIp(packet.daddr, packet.payload && packet.payload.dport)}</td>
              <td>{flags}</td>
              <td>
                <a className="waves-effect waves-teal btn-flat" onClick={this.inspectJson.bind(this, packet)}>
                  <i className="material-icons">code</i>
                </a>
              </td>
            </tr>
          })}
        </tbody>
      </table>;
    }
    let capture_button;
    switch (this.state.captureStatus) {
      case 'off':
        capture_button = <i className="material-icons" onClick={this.requestCapture.bind(this)}>play_circle_outline</i>;
        break;
      case 'on':
        capture_button = <i className="material-icons" onClick={this.releaseCapture.bind(this)}>pause_circle_outline</i>;
        break;
      default:
        capture_button = <div className="preloader-wrapper big active">
          <div className="spinner-layer spinner-blue-only">
            <div className="circle-clipper left">
              <div className="circle"></div>
            </div><div className="gap-patch">
            <div className="circle"></div>
          </div><div className="circle-clipper right">
            <div className="circle"></div>
          </div>
          </div>
        </div>;
    }

    return <div>
      <div className="row">
        <div className="l12 col">
          <header>
            <h1>The Price of Free WiFi - Surveillor</h1>
            {capture_button}
          </header>
          {packageInfo}
        </div>
      </div>
      <div id="json-modal" className="modal modal-fixed-footer">
        <div className="modal-content">
          <h4>Inspect package</h4>
          <pre>
            {JSON.stringify(this.state.packetToInspect, null, 4)}
          </pre>
        </div>
        <div className="modal-footer">
          <a href="#!" className=" modal-action modal-close waves-effect waves-green btn-flat">Done</a>
        </div>
      </div>
    </div>;
  }

  componentDidUpdate() {
    $('.tooltipped').tooltip({delay: 50});
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
