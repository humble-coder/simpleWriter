var http = require('http'),
path = require('path'),
express = require('express'),
app = express(),
server = http.createServer(app);

server.listen(3000);

app.use(express.static(path.join(__dirname, 'app')));

app.get('/', function(req, res) {
	res.send('./index.html');
});