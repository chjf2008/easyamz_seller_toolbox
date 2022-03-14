/**
 * Process the events of the Login page. Store login details and check if they are valid.
 */

var LoginHandler = function () {

    function login(resolve, reject, credentials) {
        API.login.post('/v2/login/', credentials).then(function (res) {

            if (res.status == 200 && res.msg == 'success' && res.data) {
                let username = res.data.username;
                let token = res.data.token;
                let level = res.data.level;


                if (username && token && level>=0) {
                    let auth = {'username': username, 'token': token, 'level': level};
                    chrome.storage.sync.set({"auth": auth}, function () {
                        chrome.storage.sync.get('auth', function (result) {

                            __user__ = result;

                            resolve(Response.success(result));
                        });
                    })

                } else {
                    reject(Response.failure(res))
                }
            } else {
                reject(Response.failure(res));
            }
        }).catch(function (error) {
            reject(Response.failure(error));

        })

    }


    function refresh(resolve, reject, request) {


        API.login.refreshToken('/v2/refresh/', {"token": request.auth.token}).then(function (res) {


            if (res &&
                res.data
                && res.msg == 'success'
                && res.status == 200) {

                let username = res.data.username;
                let level = res.data.level;
                let token = res.data.token;


                if (username && token && level>=0) {
                    let auth = {'username': username, 'token': token,'level':level};
                    chrome.storage.sync.set({"auth": auth}, function () {
                        chrome.storage.sync.get('auth', function (result) {
                            __user__ = result;
                            resolve(Response.success(result));
                        });
                    });
                } else {
                    reject(Response.failure({}));
                }
            } else {
                reject(Response.failure({}));
            }


            // if (res
            //     && res.value
            //     && res.value.auth
            //     && res.value.auth.token
            //     && res.value.auth.username) {
            //     resolve(Response.success(res));
            // } else {
            //     reject(Response.failure(res));
            // }

        });


    }

    function isDateExpired(authDate) {
        const diff = new Date().getTime() - authDate;
        return diff > 24 * 60 * 60 * 1000;
    }

    return {
        login: function (resolve, reject, request) {
            var credentials = request.value.credentials;
            login(resolve, reject, credentials);
        },


        refresh: function (resolve, reject, request) {

            chrome.storage.sync.get(['auth'], function (result) {
                if (result
                    && result.auth
                    && result.auth.username
                    && result.auth.token) {
                    //resolve(Response.success(result.auth));


                    refresh(resolve, reject, result);


                    //resolve(Response.success(result));


                } else {
                    reject(Response.failure({}));
                }

            });


        },
        authenticate: function (resolve, reject, request) {
            chrome.storage.sync.get(['auth'], function (result) {
                if (result
                    && result.auth
                    && result.auth.username
                    && result.token) {
                    resolve(Response.success(result));
                } else {
                    login(resolve, reject, result.auth);
                }
            });
        },


        query: function (resolve, reject, request) {
            chrome.storage.sync.get(['auth'], function (result) {
                if (result
                    && result.auth
                    && result.auth.username
                    && result.auth.token) {
                    __user__ = result.auth;
                    resolve(Response.success(result));
                } else {
                    reject(Response.failure(result))
                }
            });
        },


        logout: function (resolve, reject) {
            chrome.storage.sync.remove(['auth'], function () {
                __user__ = null;
                resolve(Response.success());
            });
        }
    }
}();
