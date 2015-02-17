// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

$(document).ready(function() {
  $('#due').datetimepicker();
});

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var makeEditable = function(text) {
  text = text.replace('st','').replace('nd','').replace('rd','').replace('th','').replace(' at','').replace(',','');
  // text should be in format mon dd yyyy hh:mm
  var sections = text.split(' ');
  var timeSection = sections[3].split(':');
  var date = new Date(sections[2], months.indexOf(sections[0]), sections[1], timeSection[0], timeSection[1]);
  return strftime('%Y/%m/%d %H:%M', date);
}

var makeReadable = function(text) {
  // text should be in format yyyy-mm-dd hh:mm
  var sections = text.split(' ');
  var dateSection = sections[0].split('-');
  var timeSection = sections[1].split(':');
  var date = new Date(dateSection[0], dateSection[1] - 1, dateSection[2], timeSection[0], timeSection[1]);
  return strftime('%b %o, %Y at %H:%M', date);
}