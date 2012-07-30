var URL = "http://localhost:8000";
var socket = io.connect(URL);
var permission_box = null;

function genListHtml(obj, state) {
  var o = $("<li><div class=\"play-container\"><img class=\"play-icon\"></div> \
            <div class=\"song-name\"></div><div class=\"queue-number\"></div></li>");
            
  o.attr('id', obj.id);
  $('div.song-name', o).text(obj.title);

  if (state === 'download') {
    o.addClass('downloading');
    $('img', o).attr('src', '/images/Oh.png');
    $('div.queue-number', o).text(obj.state);
    o.addClass('striped');
  }

  else {
    $('img', o).attr('src', '/images/media-player-dark.png');
    $('div.queue-number', o).text(obj.length + ' seconds');

    if (state == 'playing') {
      o.attr('class', 'playing');
    }
  }

  return o;
}

$(document).ready(function() {
  console.log("Document ready");

  $.getJSON(URL + "/play", function(data) {
    if (data.result != 'nothing playing') {
      $('#music-list').append(genListHtml(data, 'playing'))
    }
  });

  $.getJSON(URL + "/queue", function(data) {
    console.log("Data is: " + data);

    $.each(data, function(key, val) {
      console.log(val.title);
      $('#music-list').append(genListHtml(val, 'normal'));
    });
  });

  $.getJSON(URL + '/dqueue', function(data) {
    $.each(data, function(key, val) {
      $('#music-list').append(genListHtml(val, 'download'));
    });
  });

  permission_box = ($(':checkbox')).iphoneStyle({
    checkedLabel: 'It\'s free game',
    uncheckedLabel: 'SYS only',
    resizeContainer: false,
    resizeHandle: false,
  });

  $.getJSON(URL + '/allow', function(data) {
    console.log(data);
    permission_box.prop('checked', data.allow).iphoneStyle("refresh");
  });

  $(".on_off").click(function(event) {
    console.log('click happened')
    var setting = permission_box.prop('checked')
    $.getJSON(URL + '/allow/' + setting, function(data) {
      console.log(data);
    }).error(function() {
      permission_box.prop('checked', !setting).iphoneStyle("refresh");
    });
  });

  $('#loading-message').remove();

  $('#add-button').colorbox({inline: true, height: "150px", href: "#add-song"});

  $('.button.white').click(function() {
    $.colorbox.close();
  });

  $('#ajax-button').click(function() {
    var song = $("#add-song :input[type='text']:first").val();
    console.log("Adding song... "+song);
    $.colorbox.close();

    $.getJSON('y/' + song, function(data) {
      console.log(data);
    });
  });

  socket.on('play', function(data) {
    console.log("New song playing!")
    
    var topItem = $('ul#music-list li:first')
    if (topItem.hasClass('playing')) {
      topItem.remove();
    }

    else {
      console.log("Uhoh");
      console.log(topItem);
      console.log(data);
    }

    var topItem = $('ul#music-list li:first')
    if (topItem.attr('id') == data.id) {
      topItem.addClass('playing');
    }

    else {
      console.log('no bad');
      console.log(topItem);
      console.log(data);
    }
  });

  socket.on('download', function(data) {

    ul = $('ul#music-list li#' + data.id)

    if (ul.length) {
      ul.first().find('.queue-number').text(data.state);
    }

    else {
      console.log("New song added to download");
      $('ul#music-list').append(genListHtml(data, 'download'));
    }
  });

  socket.on('done', function(data) {
    $('ul#music-list li#'+data.id).remove();
  });

  socket.on('add', function(data) {
    console.log("Song got added!");
    ul = $('ul#music-list li.downloading')
    if (ul.length) {
      ul.first().before(genListHtml(data, 'normal'));
    } else {
      $('ul#music-list').append(genListHtml(data, 'normal'));
    }
  });

  socket.on('allow', function(data) {
    console.log("Socket Changing authorization to "+data.allow);
    var set = data.allow;

    permission_box.prop('checked', set).iphoneStyle("refresh")
  });

  socket.on('empty', function(data) {
    $('ul#music-list li:first').remove()
  });
});
