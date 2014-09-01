var http = require('http'),
path = require('path'),
express = require('express'),
app = express(),
server = http.createServer(app),
redis = require('redis'),
client = redis.createClient(),
uuid = require('node-uuid'),
bodyParser = require('body-parser'),
io = require('socket.io').listen(server);

server.listen(8000);

app.use(express.static(path.join(__dirname, 'app')));
app.use(bodyParser.json());

app.get('/', function(req, res) {
	res.send('./index.html');
});

app.post('/login', function(req, res) {
	var userInfo = req.body.data;
	client.hgetall(userInfo.userName, function(err, obj) {
		if (userInfo.userPassword === obj.password) {
			var token = uuid.v1();
			res.json({id: token, user: obj});
		}
	});
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
		client.incr("userId", function(err, reply) {
			var userId = reply;
			client.hmset(data.userName, "email", data.userEmail, "password", data.userPassword, "id", userId);
		});

		// client.get("userId", function(err, reply) {
		// 	var userId = reply;
			
		// });
	})
});

