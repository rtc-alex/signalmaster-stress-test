var io = require('socket.io-client');
var uuid = require('uuid');

var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();

var server = process.argv[2];
var maxClients = parseInt(process.argv[3]);
var maxClientsPerRoom = parseInt(process.argv[4]);

var connects = 0;
var disconnects = 0;
var waitingAcks = 0;

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

	var ackTimer = new Timer();
	waitingAcks += 1;
	events.once('ack ' + payload, function () {

		waitingAcks -= 1;

		ackTimes.push(ackTimer.elapsed());

		nrOfMessages--;
		setTimeout(function() {
			sendMsgs(socket, to, nrOfMessages, delay, callback);
		}, delay);

	});
}

var ackTimes = [];
var intervalTimes = [];
setInterval(function () {
	console.log('connects/disconnects: ', connects + '/' + disconnects, '- waiting acks:', waitingAcks);

	var total = 0;
	var counter = 0;
	intervalTimes.forEach(function (time) {
		total += time;
		counter += 1;
	});
	intervalTimes = [];
	console.log('interval average ms', (total / counter), '(' + counter + ')');

	total = 0;
	counter = 0;
	ackTimes.forEach(function (time) {
		total += time;
		counter += 1;
	});
	ackTimes = [];
	console.log('ack average ms', (total / counter), '(' + counter + ')');
}, 1000);

var startClient = function () {

	var socket = io.connect(server, socketOptions);
	var turnserversTimer;

	socket.on('connect', function () {
		connects += 1;
		stunserversTimer = new Timer();
		turnserversTimer = new Timer();

		var myRoomMates = {};

		joinTimer = new Timer();
		socket.emit('join', currentRoom, function (err, roomDescription) {
			console.log('join ms', joinTimer.elapsed());
			//console.log(roomDescription);
			if (Object.keys(roomDescription.clients).length >= maxClientsPerRoom) {
				currentRoom = uuid.v4();
			}
			Object.keys(roomDescription.clients).forEach(function(name) {

				if (typeof myRoomMates[name] === 'undefined') {

					myRoomMates[name] = roomDescription.clients[name];
				}

				var initialPayloadTimer = new Timer();
				sendMsgs(socket, name, 50, 5, function() {
					console.log('initial payload ms', initialPayloadTimer.elapsed());
				});
				setInterval(function() {
					var intervalTimer = new Timer();
					sendMsgs(socket, name, 1, 0, function() {
						intervalTimes.push(intervalTimer.elapsed());
					});
				}, 1000);
			});
			if (connects < maxClients) {
				setTimeout(startClient, 100);
			}
		});
	});

	socket.on('stunservers', function (data) {
		console.log('stunservers ms', turnserversTimer.elapsed());
	});
	socket.on('turnservers', function (data) {
		console.log('turnservers ms', turnserversTimer.elapsed());
	});
	socket.on('message', function (data) {
		// console.log(data);
		if (data.payload) {
			socket.emit('message', {
				to: data.from,
				ack: data.payload
			});
		} else if (data.ack) {
			events.emit('ack ' + data.ack);
		}
	});
	socket.on('event', function() {
		console.log(arguments);
	});

	socket.on('disconnect', function () {
		disconnects += 1;
	});

};

startClient();
