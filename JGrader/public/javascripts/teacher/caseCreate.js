var index = 0;

var addRow = function() {
  $('form#caseCreate div').append('<input type="text" class="form-control input" placeholder="Test Input" name="in_case[]" /><input type="text" class="form-control output" placeholder="Expected Output" name="out_case[]" />');
  index++;
};

$(document).ready(function() {
  addRow(); // initially have one row available
});

