"use strict";

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
  var pcap_session;
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

    pcap_session = PCAP.createSession("", "");
    pcap_session.on('packet', function (raw_packet) {
      let packet = PCAP.decode.packet(raw_packet);
      // console.dir(packet);
      let data = packet.payload.payload;
      if (_.isObject(data)) {
        data.time = new Date();
        data._id = Math.random();
        socket.emit("packet", data);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log("Conneciton lost - Stopping capture.");
    if (pcap_session) {
      pcap_session.close();
    }
  });

  socket.on('capture-stop', () => {
    console.log('Stopping capture.');
    pcap_session.close();
  });

});