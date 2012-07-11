/** 
 * Static variables.
 */

var YOUTUBE = "http://www.youtube.com"
var WATCH_PREFIX = "/watch?v="
var API_KEY = 'AI39si7F0AW5Kquldiu-w0E2K7QrTx8h1QSsd7tdWD-FTgsbxhRzYTnvreH5k56h7UXt8-c4vZ2lmFAo5a23PfNwJ7TsUjBXUQ'

/**
 * Global variables.
 */

var global_queue = [];
var player = null;

// Dependencies
var querystring = require('querystring')
var https = require('https')
var fs = require('fs')
var express= require('express')
var io = require('socket.io').listen(app);
var spawn = require('child_process').spawn;
var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes and logic

app.get('/', function(req, res) {
  res.send('Hey there (: ');
});

app.get('/test/', function(req, res) {
  var f = fs.readFileSync('client.html');
  res.writeHead(200, {'Content-Type': 'text/html' });
  res.end(f);
});

app.get('/say/*', function(req, res) {
  var statement = req.params[0];
  res.send('You wanted' + statement);

  spawn('say', [statement]);
  res.send('ok');
});

app.get('/volume/:volume', function(req, res) {
  var string = "set Volume " + req.params.volume;
  console.log(string);

  spawn('osascript', ['-e', string]);
  res.send('ok');
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
      processYoutube(url);
    });
  });
});


// Playback functions
function processYoutube(url) {
  var youtube = spawn('youtube-dl', ['--extract-audio', url]);
  var fileID = "";

  youtube.stdout.on('data', function(data) {
    data = String(data);
    io.sockets.emit('news', data);
    if (data.indexOf('ffmpeg') != -1) {
      data = data.split(':');
      fileID = data[data.length-1].replace(' ', '');
    }
  });

  youtube.on('exit', function(code) {
    console.log("File ID is: "+fileID);
    var path = __dirname + "/" + fileID.replace('\n', '');
    console.log(path);
    addSong(path)
  });

  youtube.stderr.on('data', function(data) {
    console.log("MAN DOWN!");
    console.log(data);
  });
};

function playSong(path) {
  console.log("Playing " + path);
  player = spawn('afplay', [path]);

  player.stdout.on('data', function(data) {
    console.log('stdout: ' + data);
  });

  player.stderr.on('data', function(data) {
    console.log('stderr: ' + data);
  });

  player.on('exit', function(code) {
    console.log('afplay stopped with code: ' + code);
    player = null;
    var new_path = global_queue.shift();
    console.log(global_queue);
    
    if (new_path == undefined) {
      console.log("queue is empty, stopping!");
    }

    else {
      playSong(new_path);
    }
  });
}

io.sockets.on('connection', function(socket) {
  console.log("Client connected!");
});

function addSong(path) {
  global_queue.push(path);
  console.log('Adding song to queue:');
  console.log(global_queue);

  if (global_queue.length == 1) {
    console.log("restarting queue");
    if (player == null) {
      global_queue.shift()
      playSong(path);
    }
  }
};

app.listen(8000, function() {
  console.log("express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
