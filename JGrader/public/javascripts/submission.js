$('#input-expand').click(function() {
  var inputExpand = $('#input-expand');
  inputExpand.toggleClass('glyphicon-expand');
  inputExpand.toggleClass('glyphicon-collapse-down');
  $('#input-text').toggle();
});

$('#edit-grade').click(function() {
  $('#edit-grade').hide();
  $('#text').hide();
  var text = $('#text').html();
  if(text != 'Not graded.') {
    $('#edit').val(text);
  }
  $('#edit').show();
  $('#edit').focus();
});

$('#edit').blur(function() {
  $('#edit').hide();
  var text = $('#edit').val();
  if(text.length > 0) {
    $('#text').html(text);
    // todo send update to database
  }
  $('#text').show();
  $('#edit-grade').show();
});