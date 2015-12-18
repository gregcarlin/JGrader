// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var URL = function() {
  var base = location.protocol + '//' + location.host + location.pathname;
  if (base.substring(base.length - 1) != '/') base += '/';
  return base;
};

$(document).ready(function() {
  $('#resubmit').click(function() {
    $('.modal').modal({}); // show modal
    $('.modal-dialog').css('z-index', '1500'); // move above backdrop
  });

  $('#myModal .btn-danger').click(function() {
    document.location = URL() + 'resubmit';
  });
});

var chooseMain = function(fileName) {
  document.location = URL() + 'chooseMain/' + fileName;
};
