$(document).ready(function() {
  $('.navbar').css('box-shadow', 'none');
});

$(document).scroll(function() {
  if($(document).scrollTop() > 0) {
    $('.navbar').css('box-shadow', '0 0 100px 5px #000');
  } else {
    $('.navbar').css('box-shadow', 'none');
  }
});
