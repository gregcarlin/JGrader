// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var confirmDelete = function(assignmentID, testID) {
  $('.modal .btn-danger').click(function() {
    document.location = '/teacher/assignment/' + assignmentID + '/testCase/delete/' + testID;
  });

  $('.modal').modal({}); // show modal
  $('.modal-dialog').css('z-index', '1500'); // move above backdrop
};
