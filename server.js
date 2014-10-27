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
sessionRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
io = require('socket.io').listen(server);

server.listen(8000);

app.use(express.static(path.join(__dirname, 'app')));
app.use(bodyParser.json());

app.get('/', function(req, res) {
	res.send('./index.html');
});

app.post('/recover-session', function(req, res) {
	var sessionData = req.body.data;
	client.hgetall("session:" + sessionData.user.id, function(err, session) {
		if (session && (session.id === sessionData.token))
			res.json({sessionOK: true});
		else
			res.json({sessionOK: false});
	});
});

app.post('/logout', function(req, res) {
	var sessionData = req.body.data;
	client.hgetall("session:" + sessionData.user.id, function(err, session) {
		if (session && (session.id === sessionData.token)) {
			client.del("session:" + sessionData.user.id, function(err, reply) {
				if (reply)
					res.json({sessionDestroyed: true})
				else
					res.json({sessionDestroyed: false});
			});
		}
	});
});

app.post('/login', function(req, res) {
	var userInfo = req.body.data;
	client.hgetall(userInfo.userName, function(err, obj) {
		if (obj) {
			var userId = obj.id,
			userObject = obj;
			userObject.name = userInfo.userName;
			
			client.hgetall("users:" + userId, function(err, user) {
				var password = salt.substring(0, salt.length/2) + userInfo.userPassword + salt.substring(salt.length/2, salt.length);
				if (password === key.decrypt(user.password, "utf8")) {
					var token = uuid.v1();
					client.hmset("session:" + user.id, "id", token, function(err, reply1) {
						if (reply1) {
							client.expire("session:" + user.id, 18000, function(err, reply2) {
								if (reply2)
									res.json({id: token, user: userObject});
							});
						}
					});
				}
				else res.json({error: "Invalid username/password combination."});
			});
		}
		else res.json({error: "Invalid username/password combination."});
	});
});

app.post('/new-user', function(req, res) {
	var userInfo = req.body.data;
	if (userInfo.userPassword != userInfo.userPasswordConfirmation)
		res.json({error: "Password and password confirmation don't match."});
	else {
		client.hgetall(userInfo.userName, function(err, user) {
			if (!user) {
				client.hgetall(userInfo.userEmail, function(err, email) {
					if(!email) {
						client.incr("userId", function(err, reply) {
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
						});
					}
					else
						res.json({error: "Email already taken."});
				});
			}
			else
				res.json({error: "Username already taken."});
		});
	}
});

io.sockets.on('connection', function(socket) {
	socket.on('saveDocument', function(data, fn) {
		var docId = data.title.replace(/\s+/g, '');
		if (sessionRegex.test(data.sessionId)) {
			client.hmset(data.owner + "-" + docId, "title", data.title, "body", data.body, "owner", data.owner, function(err, reply) {
				if (reply) {
					socket.join(data.owner + "-" + docId);
					fn();
				}
			});
		}
	});

	socket.on('getDocument', function(data, fn) {
		client.hgetall(data.user, function(err, info) {
			if (info) {
				client.hgetall(data.user + "-" + data.docId, function(err, doc) {
					if (doc) {
						client.smembers(data.user + "-" + data.docId + "-collaborators", function(err, collaborators) {
							doc.collaborators = collaborators;
							fn(doc);
							socket.join(data.user + "-" + data.docId);
						});
					}
				});
			}
		});
	});

	socket.on('updateDocument', function(data) {
		if (sessionRegex.test(data.sessionId)) {
			docId = data.docId,
			newDocId = data.title.replace(/\s+/g, '');
			client.hmset(data.owner + "-" + newDocId, "title", data.title, "body", data.body, "owner", data.owner, function(err, reply) {
				if (reply)
					io.to(data.owner + "-" + docId).emit('documentChanged', data);
			});
		}
	});

	socket.on('addCollaborator', function(data) {
		if (sessionRegex.test(data.sessionId)) {
			client.sadd(data.document + "-collaborators", data.user, function(err, reply) {
				if (reply)
					io.to(data.document).emit('collaboratorAdded', data);
			});
		}
	});

	socket.on('searchUsers', function(data) {
		if (sessionRegex.test(data.sessionId)) {
			client.smembers("users:" + data.query + ":index", function(err, ids) {
				var results = [];
				for (var i = 0, length = ids.length; i < length; i++) {
					client.hgetall("users:" + ids[i], function(err, user) {
						if ((user.name != data.user.name) && (data.collaborators.indexOf(user.name) == -1)) {
							results.push(user.name);
							io.to(data.document).emit('displaySearch', results);
						}
					});
				}
			});
		}
	});
});

