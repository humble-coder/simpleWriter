'use strict';

/* Directives */

angular.module('simpleWriter.directives', []).directive('imageUpload', ['$http', function($http) {
	return function(scope, element, attr) {
		element.on('change', function(event) {
			event.preventDefault();
			var image = element[0].files[0],
			user = scope.currentUser.name,
			reader = new FileReader();
			reader.onload = function(e) { $http.post('/image-upload', {image: e.target.result, user: user }).then(function(res) {
				if (res.status === 200) {
					scope.userImage.attr("src", res.data.image);
					scope.hasPic = true;
					scope.clearImageButton.removeClass("hide");
				}
			})};
			reader.readAsDataURL(image);
		});
	}
}]);