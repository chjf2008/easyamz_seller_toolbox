API.login = function() {


    var endpoint = 'http://api.easyamz.cn';
    //endpoint = 'http://127.0.0.1:9000'
    //endpoint='http://42.192.77.227:801'


    var token = null;

    function setToken() {
        return new Promise(function(resolve, reject) {
            chrome.storage.sync.get(['auth'], function(result) {
                if (result &&
                    result.auth &&
                    result.auth.username &&
                    result.auth.token
                ) {
                    token = result.auth.token;
                    resolve();
                } else {
                    token = '';
                    resolve(); // Cookie check is implemented on the FE
                }
            });
        })
    }

    function getUrl(url) {

        return endpoint + url;

    }


    function addToken(request) {
        if (null != token) {
            request.setRequestHeader("authorization", "JWT " + token);
        }
    }

    return {

        refreshToken: function(url, data) {
            return API.login.post(url, data);
        },
        loginValid: function(url) {
            return API.login.get(url);
        },
        get: function(url) {
            return setToken().then(function() {
                return $.ajax({
                    type: "GET",
                    url: getUrl(url),
                    beforeSend: function(request) {
                        addToken(request);
                    }
                }).catch(function(XMLHttpRequest, textStatus, errorThrown) {

                    return { 'XMLHttpRequest': XMLHttpRequest, 'textStatus': textStatus, 'errorThrown': errorThrown }

                })
            }).catch(function(error) {
                //todo

                console.log(error)

            })
        },
        post: function(url, data) {
            return setToken().then(function() {
                return $.post({
                    dataType: 'json',
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                    url: getUrl(url),
                    beforeSend: function(request) {
                        addToken(request);
                    }
                }).catch(function(XMLHttpRequest, textStatus, errorThrown) {

                    return { 'XMLHttpRequest': XMLHttpRequest, 'textStatus': textStatus, 'errorThrown': errorThrown }

                })
            })
        },
        put: function(url, data) {
            return setToken().then(function() {
                return $.ajax({
                    type: 'PUT',
                    dataType: 'json',
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                    url: this.getUrl(url),
                    beforeSend: function(request) {
                        addToken(request);
                    }
                });
            })
        },
        delete: function(url, data) {
            return setToken().then(function() {
                return $.ajax({
                    type: 'DELETE',
                    dataType: 'json',
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                    url: this.getUrl(url),
                    beforeSend: function(request) {
                        addToken(request);
                    }
                });
            })
        },
    }
}();