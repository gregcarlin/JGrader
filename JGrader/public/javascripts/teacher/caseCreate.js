var addRow = function() {
  $('form#caseCreate div').append('<input type="text" class="form-control input" placeholder="Test Input" /><input type="text" class="form-control output" placeholder="Expected Output" />');
};

$(document).ready(function() {
  addRow(); // initially have one row available
});

