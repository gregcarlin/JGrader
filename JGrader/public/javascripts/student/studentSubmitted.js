// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

$("#resubmit").attr("href", document.URL + "/resubmit");
var response = localStorage.getItem("response");
if(response != null) {
  if(response != 'success') {
    $(".page-header").after('<div class="alert alert-danger"> \
      <a href="#" class="close" data-dismiss="alert">&times;</a> \
      <strong>There was an error compiling the program!</strong> ' + response + '\
      </div>');
  }
}
