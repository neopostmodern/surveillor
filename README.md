# Surveillor

This tool is in progress.  
It will eventually be an artistic traffick analyzer for [The Price of Free WiFi](http://neopostmodern.com/ThePriceOfFreeWifi)

### Code structure

There are two main components:

| Folder   | Language   | Framework | Description
|:---------|:----------:|:---------:|:------------
| `server` | JavaScript | node.js   | captures packages with `pcap` and sends them to the front-end with `socket.io`
| `app`    | JavaScript | React     | front-end for displaying **and analysing** the packages
