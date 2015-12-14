"use strict";

// DEBUGGING STRANGE EXITS
var SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler();

var _ = require('lodash');
var OS = require('os');
var DNS = require('dns');

var express = require('express');
var cors = require('cors');
var app = express();
app.use(cors());

var http = require('http').Server(app);
var io = require('socket.io')(http);

var PCAP = require("pcap");

app.get("/rdns/:ip", (request, result) => {
  DNS.reverse(request.params.ip, (error, names) => {
    if (error) {
      return result.status(500).send(error);
    }

    result.status(200).send(names);
  });
});

var server = http.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('SURVEILLOR listening at http://%s:%s', host, port);
});

io.on('connection', function(socket){
  var active = false;
  var pcap_session;
  var stats;
  console.log('A user connected');

  let ownIpAddresses = [];
  _.forIn(OS.networkInterfaces(), (identities, deviceName) => {
    if (deviceName !== 'lo') {
      identities.forEach((identity) => {
        //if (identity.family === 'IPv4') {
          ownIpAddresses.push(identity.address);
        //}
      })
    }
  });
  socket.emit('ip-addresses', ownIpAddresses);

  socket.on('capture-start', function () {
    console.log('Starting capture...');
    start_capture();
  });

  socket.on('snapshot', function () {
    let size = 100;
    console.log(`Starting snapshot (${ size })...`);
    start_capture(size);
  });

  function start_capture(limit) {
    active = true;

    let hasLimit = !!limit;
    stats = {
      packageCount: 0,
      startTime: Date.now()
    };

    pcap_session = PCAP.createSession("", "");

    var tcp_tracker = new PCAP.TCPTracker();
    tcp_tracker.on('session', function (session) {
      console.log("Start of session between " + session.src_name + " and " + session.dst_name);
      session.on('end', function (session) {
        console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
      });
    });

    pcap_session.on('packet', function (raw_packet) {
      if (!active) {
        return;
      }

      let packet = PCAP.decode.packet(raw_packet);
      // console.dir(packet);
      let data = packet.payload.payload;
      if (_.isObject(data)) {
        data.time = new Date();
        data._id = Math.random();
        socket.emit("packet", JSON.stringify(data));
        stats.packageCount += 1;

        if (hasLimit && stats.packageCount >= limit) {
          console.log("Snapshot complete.");
          stop_capture();
        }

        if ([packet.payload.sport, packet.payload.dport].indexOf(53)) {
          console.dir(packet);
          console.log(`DNS - ${ packet.payload.payload.saddr.toString() } - ${ packet.payload.payload.daddr.toString() }`);

          // console.dir(packet.payload.payload);
          let r = _.get(packet, "payload.payload.payload.data");
          if (r) {
            // console.log(r.toString('ascii'));
          }
        }

        // console.log(_.get(packet, "link.ip.tcp.data"));

        // IPv6 + TCP = _.get(packet, "payload.payload.payload.constructor.name") == "TCP"
        if (data.protocol === 6) {
          tcp_tracker.track_packet(packet);
        }
      }
    });
  }

  function stop_capture() {
    if (active) {
      console.log('Stopping capture.');
      active = false;
      pcap_session.close();
      pcap_session = null;
      stats.endTime = Date.now();
      socket.emit('capture-over', stats);
      console.log(stats);
    }
  }

  socket.on('disconnect', () => {
    console.log("Conneciton lost.");
    stop_capture();
  });

  socket.on('capture-stop', stop_capture);

});