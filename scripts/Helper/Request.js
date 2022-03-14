Helper.request = function () {
    return {
        ajaxRetry: function (settings, maxTries, interval) {
            var self = this;
            this.settings = settings;
            this.maxTries = typeof maxTries === "number" ? maxTries : 0;
            this.completedTries = 0;
            this.interval = typeof interval === "number" ? interval : 0;

            // Return a promise, so that you can chain methods
            // as you would with regular jQuery ajax calls
            return tryAjax().promise();

            function tryAjax(deferred) {
                console.log("Trying ajax #" + (self.completedTries + 1));
                var d = deferred || $.Deferred();
                $.ajax(self.settings)
                    .done(function (data) {
                        // If it succeeds, don't keep retrying
                        d.resolve(data);
                    })
                    .fail(function (error) {
                        self.completedTries++;
                        // Recursively call this function again (after a timeout)
                        // until either it succeeds or we hit the max number of tries
                        if (self.completedTries < self.maxTries) {
                            console.log("Waiting " + interval + "ms before retrying...");
                            setTimeout(function () {
                                tryAjax(d);
                            }, self.interval);
                        } else {
                            d.reject(error);
                        }
                    });
                return d;
            }
        },


        get: function (url) {


            return new Promise((resolve, reject) => {
                $.ajax({
                    type: "GET",
                    url: url,
                    success: function (data) {
                        resolve(data);
                    },
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-Requested-With', {
                            toString: function () {
                                return '';
                            }
                        })
                    },
                    error: function (response, ajaxOptions, thrownError) {
                        reject(response, ajaxOptions, thrownError);
                    }
                });
            });
        },
        get_with_cookies:function(url){
                    return new Promise((resolve, reject) => {
                $.ajax({
                    type: "GET",
                    url: url,
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function (data) {
                        resolve(data);
                    },
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-Requested-With', {
                            toString: function () {
                                return '';
                            }
                        })
                    },
                    error: function (response, ajaxOptions, thrownError) {
                        reject(response, ajaxOptions, thrownError);
                    }
                });
            });
        },
        post_json_with_cookies:function(url,data,token){
            return new Promise((resolve, reject) => {
        $.ajax({
            url:url,
            type: "POST",
            dataType: 'json',
            data: JSON.stringify(data),
            contentType: 'application/json',
            xhrFields: {
                withCredentials: true
            },
            success: function (data) {
                resolve(data);
            },
            beforeSend: function (xhr) {
                // xhr.setRequestHeader('X-Requested-With', {
                //     toString: function () {
                //         return '';
                //     }
                // });
                xhr.setRequestHeader("x-amz-acp-params",token);

            },
            error: function (response, ajaxOptions, thrownError) {
                reject(response, ajaxOptions, thrownError);
            }
        });
    });
},
        post: function (url, data) {
            return $.post({
                dataType: 'json',
                data: JSON.stringify(data),
                contentType: 'application/json',
                url: url
            });
        },
        put: function (url, data) {
            return $.ajax({
                type: 'PUT',
                dataType: 'json',
                data: JSON.stringify(data),
                contentType: 'application/json',
                url: url,
                beforeSend: function (request) {
                    addToken(request);
                }
            });
            },
        delete:function (url, data) {
                return $.ajax({
                    type: 'DELETE',
                    dataType: 'json',
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                    url: url
                });
            },

    }
}
();