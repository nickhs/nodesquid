var YOUTUBE = "http://www.youtube.com"
var WATCH_PREFIX = "/watch?v="
var API_KEY = 'AI39si7F0AW5Kquldiu-w0E2K7QrTx8h1QSsd7tdWD-FTgsbxhRzYTnvreH5k56h7UXt8-c4vZ2lmFAo5a23PfNwJ7TsUjBXUQ'

var querystring = require('querystring')
var https = require('https')
var fs = require('fs')

var app = require('express').createServer();
var io = require('socket.io').listen(app);
var spawn = require('child_process').spawn;

app.get('/', function(req, res) {
    res.send('Hey there (: ');
});

app.get('/test/', function(req, res) {
    var f = fs.readFileSync('client.html');
    res.writeHead(200, {'Content-Type': 'text/html' });
    res.end(f);
});

app.get('/youtube/*', function(req, res) {
    var search = req.params[0];
    res.send('You asked for ' + search);

    var qoptions = {
            'q': search,
            'orderby': 'relevance',
            'max-results': 1,
            'key': API_KEY,
            'alt': 'json'
        };

    var query = querystring.stringify(qoptions);

    var options = {
        host: "gdata.youtube.com",
        path: "/feeds/api/videos?" + query
    }

    var req = https.get(options, function(res) {
        var pageData = "";
        res.on('data', function(chunk) {
            pageData += chunk;
        });

        res.on('end', function() {
            var response = JSON.parse(pageData);
            var url = response.feed.entry[0].link[0].href;
            processYoutube(url)
        });
    });
});

function processYoutube(url) {
    var youtube = spawn('youtube-dl', ['--extract-audio', url]);
    
    var fileID = "";

    youtube.stdout.on('data', function(data) {
        data = String(data)
        console.log(data);
        io.sockets.emit('news', data);
        if (data.indexOf('ffmpeg') != -1) {
            data = data.split(':');
            fileID = data[data.length-1].replace(' ', '');
        }
    });

    youtube.on('exit', function(code) {
        console.log("Finished!");
        console.log("File ID is: "+fileID);
        var path = __dirname + "/" + fileID.replace('\n', '');
        console.log(path);
        var player = spawn('afplay', [path]);

        player.stdout.on('data', function(data) {
          console.log('stdout: ' + data);
        });

        player.stderr.on('data', function(data) {
          console.log('stderr: ' + data);
        });

        player.on('exit', function(code) {
          console.log('child process existed with code: ' + code);
        });
    });

    youtube.stderr.on('data', function(data) {
        console.log("MAN DOWN!");
        console.log(data);
    });
}

io.sockets.on('connection', function(socket) {
    console.log("Client connected!");
});

app.listen(8000);
