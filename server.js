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

app.get

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
	client.hgetall(userInfo.userName.toLowerCase(), function(err, obj) {
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
		var userName = userInfo.userName,
		lowercaseName = userName.toLowerCase(),
		email = userInfo.userEmail;
		client.hgetall(lowercaseName, function(err, userFound) {
			if (!userFound) {
				client.hgetall(email, function(err, emailFound) {
					if(!emailFound) {
						client.incr("userId", function(err, reply) {
							var userId = reply,
							saltLength = salt.length,
							stringToEncrypt = salt.substring(0, saltLength/2) + userInfo.userPassword + salt.substring(saltLength/2, saltLength),
							password = key.encrypt(stringToEncrypt, 'base64');

							client.hmset("users:" + userId, "name", userName, "email", email, "password", password, "id", userId, function(err, reply2) {
								client.hmset(lowercaseName, "email", email, "id", userId, function(err, reply3) {
									client.hmset(email, "name", userName, "id", userId, function(err, reply4) {
										for (var index = 0, nameLength = lowercaseName.length; index < nameLength; index++)
											client.sadd("users:" + lowercaseName.substring(0, index + 1) + ":index", userId);
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

app.post('/image-upload', function(req, res) {
	var image = req.body.image,
	user = req.body.user;
	client.hset(user + "-image", "image", image, function(err, reply) {
		if (err)
			res.status(500).json({error: "Unable to upload image: " + err + ". Please try again."});
		else
			res.status(200).json({OK: true, image: image});
	});
});

io.sockets.on('connection', function(socket) {
	socket.on('saveDocument', function(data, fn) {
		var docId = data.title.replace(/\s+/g, '');
		if (sessionRegex.test(data.sessionId)) {
			client.sadd(data.owner + "-documents", data.title, function(err1, reply1) {
				if (reply1) {
					client.hmset(data.owner + "-" + docId, "title", data.title, "body", data.body, "owner", data.owner, "id", docId, function(err2, reply2) {
						if (reply2) {
							for (var index = 0, length = docId.length; index < length; index++)
								client.sadd("documents-" + docId.substring(0, index + 1).toLowerCase(), data.owner + "-" + docId);
							socket.join(data.owner + "-" + docId);
							client.del(data.owner + "-protect");
							fn();
						}
					});
				}
			});
		}
	});

	socket.on('protectDocument', function(data) {
		if (sessionRegex.test(data.sessionId)) {
			client.hmset(data.owner + "-protect", "title", data.title, "body", data.body, "instance", data.instance, function(err, reply) {
			});
		}
	});

	socket.on('recoverDoc', function(data, fn) {
		if (sessionRegex.test(data.sessionId)) {
			client.hgetall(data.owner + "-protect", function(err, doc) {
				fn(doc);
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
		var response = {};
		client.smembers(data.owner + "-documents", function(err, documents) {
			if (documents) {
				response.documents = documents;
				if (data.owner === data.user) {
					client.hgetall(data.owner + "-protect", function(err, doc) {
						if (doc) 
							response.protectedDoc = doc;
						fn(response);
					});
				}
			}
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

	socket.on('searchCollaborators', function(data) {
		if (sessionRegex.test(data.sessionId)) {
			var docChannel = data.owner + "-" + data.docId;
			client.smembers("users:" + data.query + ":index", function(err, ids) {
				var results = [];
				if (ids.length >= 1) {
					for (var i = 0, length = ids.length; i < length; i++) {
						client.hgetall("users:" + ids[i], function(err, user) {
							if ((user.name != data.user) && (data.collaborators.indexOf(user.name) == -1)) {
								results.push(user.name);
								io.to(docChannel).emit('displayCollaborators', results);
							}
						});
					}
				}
				else
					io.to(docChannel).emit('displayCollaborators', results);
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

	socket.on('searchUsers', function(data, fn) {
		if (data.justChecking) {
			client.hgetall(data.query, function(err, user) {
				if (!user)
					fn({userNotFound: true});
				else
					fn({userNotFound: false});
			});
		}
		else {
			client.smembers("users:" + data.query.toLowerCase() + ":index", function(err, ids) {
				if (ids.length >= 1) {
					for (var i = 0, length = ids.length; i < length; i++) {
						client.hgetall("users:" + ids[i], function(err, user) {
							if (i < length - 1)
								fn(user.name);
							else
								fn({done: true, value: user.name});
						});
					}
				}
				else
					fn({value: "No Results"});
			});
		}
	});

	socket.on('searchDocs', function(data, fn) {
		client.smembers("documents-" + data.query, function(err, ids) {
			if (ids.length >= 1) {
				var owner, docId, id;
				for (var i = 0, length = ids.length; i < length; i++) {
					id = ids[i];
					user = id.substring(0, id.indexOf("-")),
					docId = id.substring(id.indexOf("-") + 1, id.length);
					client.hmget(user + "-" + docId, "title", "id", function(err, info) {
						if (i < length - 1)
							fn({user: user, title: info[0], id: info[1]});
						else
							fn({done: true, user: user, title: info[0], id: info[1]});
					});
				}
			}
			else
				fn(null);
		});
	});

	socket.on('getImage', function(data, fn) {
		client.hget(data.user + "-image", "image", function(err, image) {
			if (image)
				fn(image);
		});
	});

	socket.on('removeImage', function(data, fn) {
		client.hdel(data.user + "-image", "image", function(err, response) {
			fn(response);
		});
	});

	socket.on('getMessages', function(data, fn) {
		var user = data.user;
		client.smembers(user + "-messages", function(err1, messages) {
			if (messages.length) {
				for (var i = 0, length = messages.length; i < length; i++)
					messages[i] = messages[i].split("-");
				fn(messages);
			}
			else
			  fn(null);  
		});
	});

	socket.on('sendMessage', function(data, fn) {
		client.sadd(data.receiver + "-messages", data.sender + "-" + data.subject + "-" data.body + "-" + data.sent, function(err2, reply1) {
			if (reply1)
				client.hmset(data.receiver + ":message:" + data.sent, "sender", data.sender, "subject", data.subject, "body", data.body, "sent", data.sent, function(err3, reply2) {
					if (reply2)
						fn();
				});
		});
	});
});

