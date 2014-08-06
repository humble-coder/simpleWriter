var http = require('http'),
path = require('path'),
express = require('express'),
app = express(),
server = http.createServer(app),
redis = require('redis'),
client = redis.createClient(),
io = require('socket.io').listen(server);

server.listen(8000);

app.use(express.static(path.join(__dirname, 'app')));

app.get('/', function(req, res) {
	res.send('./index.html');
});

io.sockets.on('connection', function(socket) {
	socket.on('saveDocument', function(data) {
		var docName = data.title.replace(/\s+/g, '');
		client.hmset(docName, "title", data.title, "body", data.body);
	});

	socket.on('getDocument', function(data, fn) {
		client.hgetall(data.name, function(err, obj) {
			fn(obj);
		});
	});

	socket.on('updateDocument', function(data, fn) {
		client.hmset(data.name, "body", data.body, function(err, obj) {
			socket.broadcast.emit('documentChanged', data);
		});
	});
});