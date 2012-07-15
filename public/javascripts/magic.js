var URL = "http://localhost:8000"


$(document).ready(function() {
  console.log("Document ready");


  $.getJSON(URL + "/queue", function(data) {
    console.log("Data is: " + data);

    var count = 2;

    $.each(data, function(key, val) {
      console.log(val.title);

      if (count%2 == 1) {
        var li = "<li class=\"striped\">"
      }

      else {
        var li = "<li>"
      }

      var html = li + "<div class=\"play-container\"><img src=\"/images/media-player-dark.png\" class=\"play-icon\"></div> \
                  <div class=\"song-name\">" + val.title + "</div> \
                  <div class=\"queue-number\">" + val.length + " seconds</div></li>";
      
      console.log(html);
      $('#music-list').append(html);
      count++;
    });
  console.log('here');
  $('#loading-message').remove();
  
  });

  $('#add-button').colorbox({inline: true, width: "50%", height: "200px", href: "#add-song"});
});
