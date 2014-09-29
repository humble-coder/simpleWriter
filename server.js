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
		if (obj) {
			var userId = obj.id;
			client.hgetall("users:" + userId, function(err, user) {
				var password = salt.substring(0, salt.length/2) + userInfo.userPassword + salt.substring(salt.length/2, salt.length);
				if (password === key.decrypt(user.password, "utf8")) {
					var token = uuid.v1();
					res.json({id: token, user: user});
				}
				else res.json({error: "Invalid username/password combination."});
			});
		}
		else res.json({error: "Invalid username/password combination."});
	});
});

app.post('/new-user', function(req, res) {
	var userInfo = req.body.data;
	client.incr("userId", function(err, reply) {
		client.hgetall(userInfo.userName, function(err, user) {
			if (!user) {
				client.hgetall(userInfo.userEmail, function(err, email) {
					if(!email) {
						var userId = reply,
						saltLength = salt.length,
						stringToEncrypt = salt.substring(0, saltLength/2) + userInfo.userPassword + salt.substring(saltLength/2, saltLength),
						name = userInfo.userName,
						password = key.encrypt(stringToEncrypt, 'base64');

						client.hmset("users:" + userId, "name", userInfo.userName, "email", userInfo.userEmail, "password", password, "id", userId, function(err, reply2) {
							client.hmset(userInfo.userName, "email", userInfo.userEmail, "id", userId, function(err, reply3) {
								client.hmset(userInfo.userEmail, "name", userInfo.userName, "id", userId, function(err, reply4) {
									for (var index = 0, nameLength = name.length; index < nameLength - 1; index++) {
										client.sadd("users:" + name.substring(0, index + 2) + ":index", userId);
									}
									res.json({userName: userInfo.userName});
								});
							});
						});
					}
					else
						res.json({error: "Email already taken."});
				});
			}
			else
				res.json({error: "Username already taken."});
		});
	});
});

io.sockets.on('connection', function(socket) {
	socket.on('saveDocument', function(data) {
		var docName = data.title.replace(/\s+/g, '');
		client.hmset(docName, "title", data.title, "body", data.body, "owner", data.owner, function(err, reply) {
			if (!err)
				socket.join(docName);
		});
	});

	socket.on('getDocument', function(data, fn) {
		client.hgetall(data.name, function(err, doc) {
			if (doc) {
				client.smembers(data.name + "-collaborators", function(err, collaborators) {
					doc.collaborators = collaborators;
					fn(doc);
					socket.join(data.name);
				});
			}
		});
	});

	socket.on('updateDocument', function(data) {
		client.hmset(data.name, "body", data.body, function(err, reply) {
			if (!err)
				io.to(data.name).emit('documentChanged', data);
		});
	});

	socket.on('addCollaborator', function(data) {
		client.sadd(data.document + "-collaborators", data.user, function(err, reply) {
			if (!err)
				io.to(data.document).emit('collaboratorAdded', data);
		});
	});

	socket.on('searchUsers', function(data) {
		client.smembers("users:" + data.query + ":index", function(err, ids) {
			var results = [];
			for (var i = 0, length = ids.length; i < length; i++) {
				client.hgetall("users:" + ids[i], function(err, user) {
					results.push(user.name);
					io.to(data.document).emit('displaySearch', results);
				});
			}
		});
	});
});

