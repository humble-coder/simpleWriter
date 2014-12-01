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
					scope.userPic = res.data.image,
					element.addClass("hide");
				}
			})};
			reader.readAsDataURL(image);
		});
	}
}]);