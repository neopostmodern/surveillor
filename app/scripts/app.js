import React from 'react'
import ReactDOM from 'react-dom'
import ReactFragment from 'react-addons-create-fragment'
import ClassNames from 'classnames'

import socket_client from 'socket.io-client'

import $ from 'jquery'
import Materialize from 'materialize'

import PacketTable from './packet-table'

import Icons from './components/icons'
import Preloader from './components/preloader'
import InspectBuffer from './components/inspect-buffer'

import IdentityProvider from './util/identity-provider'
import IpTools from './ip-tools'

const SERVER = "http://localhost:3000/";

class App extends React.Component {
  constructor() {
    super();

    this.ipTools = new IpTools(SERVER);

    this.state = {
      packets: [],
      numberPacketsToDisplay: 10,
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

    this.io.on('ip-addresses', (ownIpAddresses) => {
      IdentityProvider.addUser('Clemens', ownIpAddresses.map((address) => {
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
        this.setState({packets: this.state.packets.concat([packet])});
      }
    });

    this.io.on('capture-over', (stats) => {
      this.endCapture(stats)
    });

    // this.io.disconnect();
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

  render() {
    let capture_button;
    switch (this.state.captureStatus) {
      case 'off':
        capture_button = [
          <i key="snapshot" className="material-icons" onClick={this.requestSnapshot.bind(this)}>query_builder</i>,
          <i key="capture" className="material-icons" onClick={this.requestCapture.bind(this)}>play_circle_outline</i>
        ];
        break;
      case 'on':
        capture_button = <i className="material-icons" onClick={this.releaseCapture.bind(this)}>pause_circle_outline</i>;
        break;
      case 'snapshot':
        capture_button = <i className="material-icons">more_horiz</i>;
        break;
      default:
        capture_button = <Preloader key="preloader" />;
    }

    return <div>
      <div className="row">
        <div className="l12 col">
          <header>
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
          {
            (this.state && this.state.packets && this.state.ownIpAddressesReady)
              ? <PacketTable packets={this.state.packets}
                             rdns={this.state.rdns}
                             inspectJson={this.inspectJson.bind(this)}
                             inspectBuffer={this.inspectBuffer.bind(this)} />
              : "Loading..."
          }
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
