var http = require('http'),
path = require('path'),
express = require('express'),
app = express(),
server = http.createServer(app),
redis = require('redis'),
client = redis.createClient(),
uuid = require('node-uuid'),
bodyParser = require('body-parser'),
nodeRSA = require('node-rsa'),
key = new nodeRSA({b: 512}),
salt = require('./salt.js'),
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
		var password = salt.substring(0, salt.length/2) + userInfo.userPassword + salt.substring(salt.length/2, salt.length);

		if (password === key.decrypt(obj.password, "utf8")) {
			var token = uuid.v1();
			res.json({id: token, user: obj});
		}
	});
});

io.sockets.on('connection', function(socket) {
	socket.on('saveDocument', function(data) {
		var docName = data.title.replace(/\s+/g, '');
		client.hmset(docName, "title", data.title, "body", data.body);
		socket.join(docName);
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
			var userId = reply,
			saltLength = salt.length,
			stringToEncrypt = salt.substring(0, saltLength/2) + data.userPassword + salt.substring(saltLength/2, saltLength),
			password = key.encrypt(stringToEncrypt, 'base64');

			client.hmset(data.userName, "email", data.userEmail, "password", password, "id", userId);
		});
	})
});

