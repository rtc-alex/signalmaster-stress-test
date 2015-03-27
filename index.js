var io = require('socket.io-client');
var uuid = require('uuid');

var server = process.argv[2];
var maxClients = parseInt(process.argv[3]);
var maxClientsPerRoom = parseInt(process.argv[4]);

var connects = 0;
var disconnects = 0;

var currentRoom = uuid.v4();

var socketOptions = {
	transports: ['websocket'],
	'force new connection': true,
	"secure": 0
};

setTimeout(function() {
	if (connects === 0) {
		console.log('Can not connect.');
		process.exit(1);
	}
}, 4000);

function Timer() {
	this.start = process.hrtime();
}
Timer.prototype.elapsed = function () {
	return process.hrtime(this.start)[1] / 1000000; // returns miliseconds.
};

var sendMsgs = function(socket, to, nrOfMessages, delay, callback) {
	if (nrOfMessages === 0) return callback();

	var payload = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

	socket.emit('message', {
		to: to,
		payload: payload
	});

	nrOfMessages--;
	setTimeout(function() {
		sendMsgs(socket, to, nrOfMessages, delay, callback);
	}, delay);
}

var startClient = function () {

	var socket = io.connect(server, socketOptions);
	var turnserversTimer;

	socket.on('connect', function () {
		connects += 1;
		console.log('connects: ', connects);
		stunserversTimer = new Timer();
		turnserversTimer = new Timer();

		joinTimer = new Timer();
		socket.emit('join', currentRoom, function (err, roomDescription) {
			console.log('join ms', joinTimer.elapsed());
			//console.log(roomDescription);
			if (Object.keys(roomDescription.clients).length >= maxClientsPerRoom + 2) { // + 2 to cover for prototype junk...
				currentRoom = uuid.v4();
			}
			Object.keys(roomDescription.clients).forEach(function(name) {
				var initialPayloadTimer = new Timer();
				sendMsgs(socket, name, 50, 10, function() {
					console.log('initial payload ms', initialPayloadTimer.elapsed());
				});
				setInterval(function() {
					var intervalTimer = new Timer();
					sendMsgs(socket, name, 0, 1, function() {
						console.log('interval ms', intervalTimer.elapsed());
					});
				}, 5000);
			});
			setTimeout(startClient, 500);
		});
	});

	socket.on('stunservers', function (data) {
		console.log('stunservers ms', turnserversTimer.elapsed());
	});
	socket.on('turnservers', function (data) {
		console.log('turnservers ms', turnserversTimer.elapsed());
	});
	socket.on('message', function (data) {
		if (data.payload) {
			socket.emit('message', {
				to: data.from,
				ack: data.payload
			});
		}
	});
	socket.on('event', function() {
		console.log(arguments);
	});

	socket.on('disconnect', function () {
		disconnects += 1;
		console.log('disconnects: ', disconnects);
	});

};

startClient();
