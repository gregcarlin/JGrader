// + function($) {
//   'use strict';
//
//   // UPLOAD CLASS DEFINITION
//   // ======================
//
//   var dropZone = document.getElementById('drop-zone');
//   var uploadForm = document.getElementById('js-upload-form');
//
//   var startUpload = function(files) {
//     console.log(files)
//   }
//
//   uploadForm.addEventListener('submit', function(e) {
//     var uploadFiles = document.getElementById('js-upload-files').files;
//     e.preventDefault()
//
//     startUpload(uploadFiles)
//   })
//
//   dropZone.ondrop = function(e) {
//     e.preventDefault();
//     this.className = 'upload-drop-zone';
//
//     startUpload(e.dataTransfer.files)
//   }
//
//   dropZone.ondragover = function() {
//     this.className = 'upload-drop-zone drop';
//     return false;
//   }
//
//   dropZone.ondragleave = function() {
//     this.className = 'upload-drop-zone';
//     return false;
//   }
//
// }(jQuery);

//
// require(['html5Upload'], function (html5Upload) {
//   'use strict';
//   html5Upload.initialize({
//     // URL that handles uploaded files
//     uploadUrl: '/assignment/:id/submit',
//
//     // HTML element on which files should be dropped (optional)
//     dropContainer: document.getElementById('drop-zone'),
//
//     // HTML file input element that allows to select files (optional)
//     inputField: document.getElementById('file-selection'),
//
//     // Key for the file data (optional, default: 'file')
//     key: 'File',
//
//     // Additional data submitted with file (optional)
//     //data: { ProjectId: 1, ProjectName: 'Demo' },
//
//     // Maximum number of simultaneous uploads
//     // Other uploads will be added to uploads queue (optional)
//     maxSimultaneousUploads: 2,
//
//     // Callback for each dropped or selected file
//     // It receives one argument, add callbacks
//     // by passing events map object: file.on({ ... })
//     onFileAdded: function (file) {
//
//       var fileModel = new models.FileViewModel(file);
//       uploadsModel.uploads.push(fileModel);
//
//       file.on({
//         // Called after received response from the server
//         onCompleted: function (response) {
//           fileModel.uploadCompleted(true);
//         },
//         // Called during upload progress, first parameter
//         // is decimal value from 0 to 100.
//         onProgress: function (progress, fileSize, uploadedBytes) {
//           fileModel.uploadProgress(parseInt(progress, 10));
//         }
//       });
//     }
//   });
// });
