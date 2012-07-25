var URL = "http://localhost:8000";
var socket = io.connect(URL);

function genListHtml(obj, download) {
  var o = $("<li><div class=\"play-container\"><img class=\"play-icon\"></div> \
            <div class=\"song-name\"></div><div class=\"queue-number\"></div></li>");
            
  o.attr('id', obj.id);
  $('div.song-name', o).text(obj.title);

  if (download) {
    o.addClass('downloading');
    $('img', o).attr('src', '/images/Oh.png');
    $('div.queue-number', o).text(obj.state);
    o.addClass('striped');
  }

  else {
    $('img', o).attr('src', '/images/media-player-dark.png');
    $('div.queue-number', o).text(obj.length + ' seconds');
  }

  return o;
}

$(document).ready(function() {
  console.log("Document ready");

  $.getJSON(URL + "/queue", function(data) {
    console.log("Data is: " + data);

    $.each(data, function(key, val) {
      console.log(val.title);
      $('#music-list').append(genListHtml(val, false));
    });
  });

  $.getJSON(URL + '/dqueue', function(data) {
    $.each(data, function(key, val) {
      $('#music-list').append(genListHtml(val, true));
    });
  });

  $('.on_off :checkbox').iphoneStyle();
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
    var topItem = $('ul#music-list li:first')
    if (topItem.attr('id') == data.id) {
      topItem.remove();
    }
    else {
      console.log("Uhoh " + data);
    }
  });

  socket.on('download', function(data) {

    ul = $('ul#music-list li#' + data.id)

    if (ul.length) {
      ul.first().find('.queue-number').text(data.state);
    }

    else {
      console.log("New song added to download");
      $('ul#music-list').append(genListHtml(data, true));
    }
  });

  socket.on('done', function(data) {
    $('ul#music-list li#'+data.id).remove();
  });

  socket.on('add', function(data) {
    console.log("Song got added!");
    ul = $('ul#music-list li.downloading')
    if (ul.length) {
      ul.first().before(genListHtml(data, false));
    } else {
      $('ul#music-list').append(genListHtml(data, false));
    }
  });
});
