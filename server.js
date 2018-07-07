/* jshint node: true */
var browserSync = require('browser-sync');
global.NA = new require("node-atlas")();

global.NA.started(function () {
	browserSync.init(null, {
		proxy: "http://localhost:7776",
		files: ["views/**", "assets/**", "variations/**"],
		port: 57776,
	});
}).start();