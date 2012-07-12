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
var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);
var spawn = require('child_process').spawn;

// Authorize
function authorize(username, password) {
  return 'sys' === username & 'foo2' === password;
}

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

app.get('/s/*', express.basicAuth(authorize), function(req, res) {
  var statement = req.params[0];
  spawn('say', [statement]);
  res.json({'result': 'success', 'string': statement});
});

app.get('/v/:volume', express.basicAuth(authorize), function(req, res) {
  var string = "set Volume " + req.params.volume;
  console.log(string);

  spawn('osascript', ['-e', string]);
  res.json({'result': 'success', 'volume': req.params.volume});
});

app.get('/k/', express.basicAuth(authorize), function(req, res) {
  if (player != null) {
    player.kill();
    res.json({'result': 'success'});
  }

  else {
    res.json({'result': 'no player playing'});
  }
});

app.get('/y/*', express.basicAuth(authorize), function(req, gresp) {
  var search = req.params[0];

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
      
      var queueObject = {
        'url': response.feed.entry[0].link[0].href,
        'title': response.feed.entry[0].media$group.media$title.$t,
        'length': response.feed.entry[0].media$group.yt$duration.seconds,
      }

      gresp.json(queueObject);
      processYoutube(queueObject);
    });
  });
});

app.get('/queue', function(req, res) {
  res.json(global_queue);
});

// Playback functions
function processYoutube(q) {
  var youtube = spawn('youtube-dl', ['--extract-audio', q.url]);
  var fileID = "";

  youtube.stdout.on('data', function(data) {
    data = String(data);
    io.sockets.emit('download', data);
    if (data.indexOf('ffmpeg') != -1) {
      data = data.split(':');
      fileID = data[data.length-1].replace(' ', '');
    }
  });

  youtube.on('exit', function(code) {
    console.log("File ID is: "+fileID);
    var path = __dirname + "/" + fileID.replace('\n', '');
    q.path = path;
    addSong(q);
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
    console.log("starting next song");
    nextSong();
  });
};

function addSong(q) {
  global_queue.push(q);
  console.log('Adding song to queue:');
  console.log(global_queue);

  if (global_queue.length == 1) {
    if (player == null) {
      global_queue.shift();
      io.sockets.emit('play', q)
      playSong(q.path);
    }
  }
};

function nextSong() {
  console.log("Playing next song");
  player = null;
  var q = global_queue.shift();
  console.log(global_queue);
  
  if (q == undefined) {
    console.log("queue is empty, stopping!");
  }

  else {
    io.sockets.emit('play', q);
    playSong(q.path);
  }
};

app.listen(8000, function() {
  console.log("express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
