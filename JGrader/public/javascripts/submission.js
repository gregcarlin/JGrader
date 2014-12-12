$('#input-expand').click(function() {
  var inputExpand = $('#input-expand');
  inputExpand.toggleClass('glyphicon-expand');
  inputExpand.toggleClass('glyphicon-collapse-down');
  $('#input-text').toggle();
});