// run on load via jquery
$(document).ready(function() {

  // attach listener to .faux-player
  $('.audio-overlay').click(function() {
    console.log('faux-player clicked')
    // roll up the .player but permanent not a toggle
    $('.player').slideUp();
  });

});

