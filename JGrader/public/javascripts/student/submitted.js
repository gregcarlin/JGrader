// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

$(document).ready(function() {
  $('#resubmit').click(function() {
    $('.modal').modal({}); // show modal
    $('.modal-dialog').css('z-index', '1500'); // move above backdrop
  });

  $('#myModal .btn-danger').click(function() {
    document.location = document.URL + '/resubmit';
  });
});

