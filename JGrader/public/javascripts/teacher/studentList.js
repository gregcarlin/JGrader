// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var confirmDelete = function(id, section) {
  $('.modal .btn-danger').click(function() {
    document.location = '/teacher/student/' + id + '/' + section + '/delete';
  });

  $('.modal').modal({}); // show modal
  $('.modal-dialog').css('z-index', '1500'); // move above backdrop
};

