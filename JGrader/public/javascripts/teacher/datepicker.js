$('#due').datetimepicker();

var makeEditable = function(text) {
  text = text.replace('st','').replace('nd','').replace('rd','').replace('th','');
  if(text.indexOf(', 20') < 0) text += ', 2015';
  var date = new Date(Date.parse(text));
  return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var makeReadable = function(text) {
  var date = new Date(Date.parse(text));
  var formatted = months[date.getMonth()] + ' ' + date.getDate();
  switch(date.getDate()) {
    case 1:
      formatted += 'st'; break;
    case 2:
      formatted += 'nd'; break;
    case 3:
      formatted += 'rd'; break;
    default:
      formatted += 'th'; break;
  }
  if(date.getYear() != new Date(Date.now()).getYear()) { // if date is not in current year
    formatted += ', ' + date.getFullYear();
  }
  return formatted;
}