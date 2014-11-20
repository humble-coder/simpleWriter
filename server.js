var http = require('http'),
path = require('path'),
express = require('express'),
app = express(),
server = http.createServer(app),
redis = require('redis'),
nodeRSA = require('node-rsa'),
key = new nodeRSA();

var client, keyString, salt;
if (process.env.REDISTOGO_URL) {
  var rtg = require("url").parse(process.env.REDISTOGO_URL),
	client = redis.createClient(rtg.port, rtg.hostname);
	client.auth(rtg.auth.split(":")[1]);
	salt = process.env.SALT,
	keyString = process.env.KEYSTRING;
	key.loadFromPEM(keyString);
} 
else {
  client = redis.createClient(),
  keyString = require('./keystring.js'),
  salt = require('./salt.js'),
  key.loadFromPEM(keyString);
}

var uuid = require('node-uuid'),
bodyParser = require('body-parser'),
sessionRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
io = require('socket.io').listen(server);

server.listen(process.env.PORT || 8000);

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
			client.sadd(data.owner + "-documents", data.title, function(err1, reply1) {
				if (reply1) {
					client.hmset(data.owner + "-" + docId, "title", data.title, "body", data.body, "owner", data.owner, "id", docId, function(err2, reply2) {
						if (reply2) {
							socket.join(data.owner + "-" + docId);
							fn();
						}
					});
				}
			});
		}
	});

	socket.on('getDocument', function(data, fn) {
		client.hgetall(data.owner, function(err1, info) {
			if (info) {
				var docChannel = data.owner + "-" + data.docId,
				docCollaborators = docChannel + "-collaborators",
				chatKey = docChannel + "-messages";
				client.hgetall(docChannel, function(err2, doc) {
					if (doc) {
						client.smembers(docCollaborators, function(err3, collaborators) {
							doc.collaborators = collaborators || [],
							client.lrange(chatKey, 0, -1, function(err4, messages) {
								doc.messages = messages;
								fn(doc);
								socket.join(docChannel);
							});
						});
					}
					else {
						fn(null);
					}
				});
			}
		});
	});

	socket.on('getDocuments', function(data, fn) {
		client.smembers(data.user + "-documents", function(err, documents) {
			if (documents)
				fn(documents);
		});
	});

	socket.on('updateDocument', function(data) {
		if (sessionRegex.test(data.sessionId)) {
			docId = data.docId,
			newDocId = data.title.replace(/\s+/g, '');
			if (docId === newDocId) {
				client.hmset(data.owner + "-" + docId, "body", data.body, function(err, reply) {
					if (reply)
						io.to(data.owner + "-" + docId).emit('documentChanged', data);
				});
			}
			else {
				client.sadd(data.owner + "-documents", data.title, function(err1, reply1) {
					if (reply1) {
						client.hmset(data.owner + "-" + newDocId, "title", data.title, "body", data.body, "owner", data.owner, "id", newDocId, function(err2, reply2) {
							if (reply2)
								io.to(data.owner + "-" + docId).emit('documentChanged', data);
						});
					}
				});
			}
		}
	});

	socket.on('addCollaborator', function(data) {
		if (sessionRegex.test(data.sessionId)) {
			client.sadd(data.owner + "-" + data.docId + "-collaborators", data.user, function(err, reply) {
				if (reply)
					io.to(data.owner + "-" + data.docId).emit('collaboratorAdded', data);
			});
		}
	});

	socket.on('searchUsers', function(data) {
		if (sessionRegex.test(data.sessionId)) {
			var docChannel = data.owner + "-" + data.docId;
			client.smembers("users:" + data.query + ":index", function(err, ids) {
				var results = [];
				if (ids.length >= 1) {
					for (var i = 0, length = ids.length; i < length; i++) {
						client.hgetall("users:" + ids[i], function(err, user) {
							if ((user.name != data.user) && (data.collaborators.indexOf(user.name) == -1)) {
								results.push(user.name);
								io.to(docChannel).emit('displaySearch', results);
							}
						});
					}
				}
				else
					io.to(docChannel).emit('displaySearch', results);
			});
		}
	});

	socket.on('newMessage', function(data, fn) {
		var docChannel = data.owner + "-" + data.docId,
		chatKey = docChannel + "-messages";

		client.rpush(chatKey, data.message, function(err, reply) {
			if (reply) {
				client.lrange(chatKey, 0, -1, function(err, messages) {
					if (messages.length > 9)
						client.ltrim(chatKey, 1, -1);
					fn();
					io.to(docChannel).emit('messageAdded', data.message);
				});
			}
		});
	});
});

