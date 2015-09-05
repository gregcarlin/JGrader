// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

// Smooth Scrolling javascript taken from: http://stackoverflow.com/questions/7717527/jquery-smooth-scrolling-when-clicking-an-anchor-link
var $root = $('html, body');
$('a').click(function() {
  $root.animate({
    scrollTop: $($.attr(this, 'href')).offset().top - $('.nav').height()
  }, 500);
  return false;
});

var right = $('.right');
var shouldFix = $(window).width() < 1237;
$(window).resize(function() {
  if ($(window).width() >= 1237) {
    if (shouldFix) {
      right.css('float', 'none');
      right.css('float', 'right');
      shouldFix = false;
    }
  } else if (!shouldFix) {
    shouldFix = true;
    right.css('float', 'none');
  }
});
