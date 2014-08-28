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
		//userId = data.userId;
		client.hmset(docName, "title", data.title, "body", data.body);
		socket.join(docName);

		// client.sadd(userId + ":documents", docName, function(err, obj) {
			
		// });
	});

	socket.on('getDocument', function(data, fn) {
		client.hgetall(data.name, function(err, obj) {
			fn(obj);
			socket.join(data.name);
		});
	});

	socket.on('updateDocument', function(data) {
		client.hmset(data.name, "body", data.body, function(err, obj) {
			io.to(data.name).emit('documentChanged', data);
		});
	});

	socket.on('saveUser', function(data) {
		client.incr("userId");

		client.get("userId", function(err, reply) {
			var userId = reply, 
			userKey = "user:" + reply;
			client.hmset(userKey, "name", data.userName, "email", data.userEmail);
		});
	})
});

