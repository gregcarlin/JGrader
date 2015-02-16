// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

$(document).ready(function() {
  $('#due').datetimepicker();
});

var makeEditable = function(text) {
  text = text.replace('st','').replace('nd','').replace('rd','').replace('th','').replace('at','');
  var date = new Date(Date.parse(text));
  return strftime('%Y/%m/%d %H:%M', date);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var makeReadable = function(text) {
  var date = new Date(Date.parse(text));
  return strftime('%b %o, %Y at %H:%M', date);
}
