// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var confirmDelete = function(id, section) {
  $('.modal .btn-danger').click(function() {
    document.location = '/teacher/student/' + id + '/' + section + '/delete';
  });

  $('.modal').modal({}); // show modal
  $('.modal-dialog').css('z-index', '1500'); // move above backdrop
};

$(document).ready(function() {
  $('table').stupidtable();
});
var rows = $('table tbody tr');
var elements = [];
var lastSort = -1;
$('thead .fa-sort').each(function(index, element) {
  elements[index] = element;
  $(element).parent().click(function() {
    var me = $('.fa', this);
    var next = me.hasClass('fa-sort-asc') ? 'fa-sort-desc' : 'fa-sort-asc';
    me.removeClass(); // removes all classes
    me.addClass('fa');
    me.addClass(next);

    // clean up button from last sort
    if(lastSort >= 0 && lastSort != index) {
      var last = $(elements[lastSort]);
      last.removeClass();
      last.addClass('fa');
      last.addClass('fa-sort');
    }
    lastSort = index;
  });
});
