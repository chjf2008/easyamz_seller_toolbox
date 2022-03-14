/**
 * Basis response for messages.
 *
 * "success" is used for when a Promise needs to be resolved.
 * "failure" is used for when a Promise needs to be rejected.
 *
 * @type {{success, failure}}
 */

var Response = function () {

    function newResponse(isSuccess, value, event, code) {

        var response = {isSuccess: isSuccess};

        if (isNested(value)) {
            response.isSuccess = value.isSuccess;
            response.value = value.value;
            response.event = value.event;
            response.code = value.code;
        } else {
            response.value = value;
            if (null != event) {
                response.event = event;
            }
            if (null != code) {
                response.code = code;
            }
        }

        return response;
    }

    function isNested(value) {
        return value && value.value;
    }

    return {
        success: function (value, event) {
            return newResponse(true, value, event);
        },
        failure: function (value, event, code) {
            return newResponse(false, value, event, code);
        }
    }
}();