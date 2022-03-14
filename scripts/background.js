var task = {};

task['ASIN_Competitor'] = {};

task['Listing_Spider'] = {};

task['Reviews_Spider'] = {};


window.templates = [];


let __user__ = null;


chrome.browserAction.onClicked.addListener(function(tab) {
    let home_url = CONST.home_url.substring(1, CONST.home_url.length)
    chrome.tabs.create({ url: chrome.extension.getURL(home_url), selected: true });
});


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        var start = performance.now();
        var promiseResponse = new Promise(function(resolve, reject) {

            let action = request.action;

            let value = request.value;
            switch (action) {

                case CONST.app_const.login.key:
                    LoginHandler.login(resolve, reject, request);
                    break;
                case CONST.app_const.logout.key:
                    LoginHandler.logout(resolve, reject, request);
                    break;
                case CONST.app_const.create_sp_task.key:
                    TaskHandler.create_sp_task(resolve, reject, request);
                    break;
                case CONST.app_const.seller_request.key:
                    SellerHandler.seller_request(resolve, reject, request);
                    break;
                case CONST.app_const.query.key:
                    LoginHandler.query(resolve, reject);
                    break;
                case CONST.app_const.refresh.key:
                    LoginHandler.refresh(resolve, reject, request);
                    break;

                case CONST.app_const.modules.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.modules.url);
                    break;
                case CONST.app_const.competitor.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.competitor.url);
                    break;
                case CONST.app_const.listings.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.listings.url);
                    break;


                case CONST.app_const.reviews.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.reviews.url);
                    break;

                case CONST.app_const.qa.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.qa.url);
                    break;

                case CONST.app_const.keywordsIndex.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.keywordsIndex.url);
                    break;

                case CONST.app_const.asin_keywords.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.asin_keywords.url);
                    break;

                case CONST.app_const.top100.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.top100.url);
                    break;
                case CONST.app_const.asincheck.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.asincheck.url);
                    break;


                case CONST.app_const.create_listings_task.key:
                    TaskHandler.create_listings_task(resolve, reject, request);
                    break;

                case CONST.app_const.append_listings_items.key:
                    TaskHandler.append_listing_items(resolve, reject, request);
                    break;

                case CONST.app_const.search_asin_keywords.key:
                    KeywordsHandler.search_asin_keywords(resolve, reject, request);
                    break;


                case CONST.app_const.search_tasks_submit.key:
                    TaskHandler.submit_search_tasks(resolve, reject, request);
                    break;


                case CONST.app_const.bsr_tasks_submit.key:
                    TaskHandler.submit_bsr_tasks(resolve, reject, request);
                    break;


                case CONST.app_const.download_items_from_cloud.key:
                    TaskHandler.download_items_from_cloud(resolve, reject, request);

                    break;
                case CONST.app_const.asin_tasks_status.key:
                    TaskHandler.asin_tasks_status(resolve, reject, request);
                    break;

                case CONST.app_const.tutorial.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.tutorial.url);
                    break;

                case CONST.app_const.asin_display_tool.key:
                    ModuleHandler.init_modules(resolve, reject, CONST.app_const.asin_display_tool.url);
                    break;

                case CONST.app_const.download_bsr_task.key:
                    TaskHandler.download_bsr_task(resolve, reject, request);


            }
        });

        promiseResponse.then(function(response) {
            //respond(true, sendResponse, start, response);
            sendResponse(response)
        }).catch(function(reason) {
            //respond(false, sendResponse, start, reason);
            sendResponse(reason)
        });

        return true; //async response

    }
);


function respond(success, sendResponse, start, response) {

    // // If event is defined then it is either tracked or logged
    // if (null != response.event) {
    //
    //     var event = response.event;
    //     if (null == event.value) {
    //         event.value = (performance.now() - start) | 0; // Default eventValue is duration in milis
    //     }
    //
    //     switch (event.type) {
    //         case "log":
    //             Helper.logger.log(event);
    //             break;
    //         case "track":
    //             Helper.analytics.track(event);
    //             break;
    //         case "pageView":
    //             Helper.analytics.trackPageView(event);
    //             break;
    //     }
    // }

    if (true === success) {
        sendResponse(Response.success(response));
    } else {
        sendResponse(Response.failure(response));
    }
}

let KeywordsHandler = function() {

    return {
        search_asin_keywords: function(resolve, reject, request) {

            API.login.post(CONST.app_const.search_asin_keywords.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    resolve(Response.failure(x))
                }
            });

        }


    }

}();


let ModuleHandler = function() {
    return {
        init_modules: function(resolve, reject, endpoint) {
            API.login.post(endpoint, { 'extension_id': chrome.runtime.id }).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    resolve(Response.failure(x))
                }
            });
        }
    }
}();


var SellerHandler = function() {

    //
    return {
        //     seller_request: function (resolve, reject, request) {
        //
        //         let seller_ids = request.value;
        //
        //
        //         //let url = API.login.getUrl('/api/seller-request/');
        //
        //
        //         API.login.post('/api/v2/seller-request/', seller_ids).then(function (x) {
        //             resolve(x);
        //         });
        //
        //
        //     },

        seller_request: function(resolve, reject, request) {
            request.value['extension_id'] = chrome.runtime.id;
            API.login.post('/v2/ext/seller-request/', request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    resolve(Response.failure(x));
                }
            });

        }


    }

}();


var TaskHandler = function() {
    return {
        create_sp_task: function(resolve, reject, request) {
            request.value['extension_id'] = chrome.runtime.id;
            API.login.post(CONST.app_const.create_sp_task.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    reject(Response.failure(x));
                }
            }).catch(function(error) {
                reject(Response.failure(error));
            });
        },
        create_listings_task: function(resolve, reject, request) {
            request.value['extension_id'] = chrome.runtime.id;
            API.login.post(CONST.app_const.create_listings_task.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    reject(Response.failure(x));
                }
            }).catch(function(error) {
                reject(Response.failure(error));
            });

        },
        append_listing_items: function(resolve, reject, request) {
            request.value['extension_id'] = chrome.runtime.id;
            API.login.post(CONST.app_const.append_listings_items.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    reject(Response.failure(x));
                }
            }).catch(function(error) {
                reject(Response.failure(error));
            });


        },
        submit_search_tasks: function(resolve, reject, request) {
            request.value['extension_id'] = chrome.runtime.id;
            API.login.post(CONST.app_const.search_tasks_submit.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    reject(Response.failure(x));
                }
            }).catch(function(error) {
                reject(Response.failure(error));
            });
        },
        submit_bsr_tasks: function(resolve, reject, request) {
            request.value['extension_id'] = chrome.runtime.id;
            API.login.post(CONST.app_const.bsr_tasks_submit.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    reject(Response.failure(x));
                }
            }).catch(function(error) {
                reject(Response.failure(error));
            });
        },


        //

        download_items_from_cloud: function(resolve, reject, request) {
            request.value['extension_id'] = chrome.runtime.id;
            API.login.post(CONST.app_const.download_items_from_cloud.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    reject(Response.failure(x));
                }
            }).catch(function(error) {
                reject(Response.failure(error));
            });
        },

        asin_tasks_status: function(resolve, reject, request) {

            API.login.post(CONST.app_const.asin_tasks_status.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    reject(Response.failure(x));
                }
            }).catch(function(error) {
                reject(Response.failure(error));
            });


        },


        download_bsr_task: function(resolve, reject, request) {
            API.login.post(CONST.app_const.download_bsr_task.url, request.value).then(function(x) {
                if (x && x.result == 1) {
                    resolve(Response.success(x));
                } else {
                    reject(Response.failure(x));
                }
            }).catch(function(error) {
                reject(Response.failure(error));
            });


        },
        clear_cookies: function(request) {


            let domain = request.value.domain;

            chrome.cookies.getAll({ 'domain': domain }, function(cookie) {

                for (i = 0; i < cookie.length; i++) {

                    var prefix = "https://";

                    var url = prefix + cookie[i].domain + cookie[i].path;

                    chrome.cookies.remove({ 'url': url, 'name': cookie[i].name }, function(cookie) {


                    });
                }
            });

        }
    }
}();


var PageHandler = function() {


    return {};

}();

var ASIN_Competitor = function() {


    return {
        "config": function(resolve, reject, request) {

            task['ASIN_Competitor']['asin'] = request.value.asin;
            task['ASIN_Competitor']['domain'] = request.value.domain;
            task['ASIN_Competitor']['items'] = [];

            resolve({ "result": 1 });

        },
        "append": function(resolve, reject, request) {

            task['ASIN_Competitor']['items'].push(request.value)
            resolve({ "result": 1 });

        },
        "remove": function(resolve, reject, request) {
            let items = task.ASIN_Competitor.items;
            if (items && items.length > 0 && request.value) {
                for (let i = items.length - 1; i >= 0; i--) {
                    let item = items[i]
                    if (request.value.indexOf(item.asin) > -1) {
                        task.ASIN_Competitor.items.splice(i, 1);
                    }
                }
            }
            resolve({ "result": 1 });
        },
        "clear": function(resolve, reject, request) {
            task['ASIN_Competitor'] = [];
            resolve({ "result": 1 });
        },

        "save_asin_data": function(resolve, reject, request) {
            task['ASIN_Competitor']['ASIN_DATA'] = request.value;
            resolve({ "result": 1 });

        }
    }
}();


var Listing_Spider = function() {


    return {
        "config": function(resolve, reject, request) {

            task['Listing_Spider']['url'] = request.value.url;
            task['Listing_Spider']['host'] = new URL(request.value.url).host;
            task['Listing_Spider']['items'] = [];


            resolve({ "result": 1 });

        },
        "append": function(resolve, reject, request) {


            let asins = task.Listing_Spider.items.map(function(item) {
                return item.asin + ":" + item.sponsored;

            });

            if (request.value) {
                $.each(request.value, function(i, row) {
                    if (asins.indexOf(row.asin + ":" + row.sponsored) == -1) {


                        row["brand"] = '';
                        //row["reviews_nb"] = reviews_nb;

                        row["qa"] = 0;
                        row["seller"] = '';
                        row["sellerId"] = '';
                        row["product_weight"] = '';
                        row["available_date"] = '';
                        row["category"] = [];
                        row["rank"] = [];
                        row['complete'] = false;


                        task.Listing_Spider.items.push(row);
                    }

                });
            }
            resolve({ "result": 1 });

        },
        "remove": function(resolve, reject, request) {

            let items = task.Listing_Spider.items;

            if (items && items.length > 0 && request.value) {
                for (let i = items.length - 1; i >= 0; i--) {
                    let item = items[i]
                    if (request.value.indexOf(item.asin + ":" + item.sponsored) > -1) {
                        task.Listing_Spider.items.splice(i, 1);
                    }
                }
            }
            resolve({ "result": 1 });

        },
        'clear': function(resolve, reject, request) {
            task['Listing_Spider'] = [];
            resolve({ "result": 1 });
        },

        'update': function(resolve, reject, request) {

            let items = task.Listing_Spider.items;
            $.each(items, function(i, item) {
                if (item.asin == request.value.asin) {
                    $.each(Object.keys(request.value), function(i, key) {
                        if (request.value[key]) {
                            item[key] = request.value[key];
                        }
                    });

                }
            });
            resolve({ "result": 1, 'row': request.value });
        }
    }
}();

var Reviews_Spider = function() {

    return {

        "config": function(resolve, reject, request) {
            task['Reviews_Spider']['asin'] = request.value.asin;
            task['Reviews_Spider']['domain'] = request.value.domain;
            task['Reviews_Spider']['status'] = 'started';
            task['Reviews_Spider']['items'] = {};

            resolve({ "result": 1 });

        },
        "append": function(resolve, reject, request) {

            for (let key in request.value) {
                task['Reviews_Spider']['items'][key] = request.value[key];
            }
            //task['Reviews_Spider']['items'] = task['Reviews_Spider']['items'].concat(request.value);
            resolve({ "result": 1 });

        },
        "remove": function(resolve, reject, request) {

        },
        "clear": function(resolve, reject, request) {

        },
        "stop": function(resolve, reject, request) {

            task['Reviews_Spider']['status'] = 'stoped';

            resolve({ "status": 'stoped' });

        },
        'status': function(resolve, reject, request) {

            resolve({ "status": task.Reviews_Spider.status });

        },
        'completed': function(resolve, reject, request) {
            task['Reviews_Spider']['status'] = 'completed';

            resolve({ "status": task.Reviews_Spider.status });
        },
        'clear': function(resolve, reject, request) {
            task['Reviews_Spider'] = [];
            resolve({ "result": 1 });
        }
    }

}();


var Top100_Spider = function() {


    return {
        "config": function(resolve, reject, request) {

            task['Top100_Spider'] = {};

            task['Top100_Spider']['url'] = request.value.url;
            task['Top100_Spider']['items'] = [];

            resolve({ "result": 1 });

        },
        "append": function(resolve, reject, request) {


            // let asins = task.Top100_Spider.items.map(function (item) {
            //     return item.asin + ":" + item.category;
            //
            // });


            task.Top100_Spider.items.push(request.value);
            // if (request.value) {
            //     $.each(request.value, function (i, row) {
            //         if (asins.indexOf(row.asin + ":" + row.category) == -1) {
            //             task.Top100_Spider.items.push(row);
            //         }
            //
            //     });
            // }
            resolve({ "result": 1 });

        },
        "remove": function(resolve, reject, request) {

            let items = task.Top100_Spider.items;

            if (items && items.length > 0 && request.value) {
                for (let i = items.length - 1; i >= 0; i--) {
                    let item = items[i]
                    if (request.value.indexOf(item.asin + ":" + item.category) > -1) {
                        task.Top100_Spider.items.splice(i, 1);
                    }
                }
            }
            resolve({ "result": 1 });

        },
        'clear': function(resolve, reject, request) {
            task['Top100_Spider'] = [];
            resolve({ "result": 1 });
        },

        'update': function(resolve, reject, request) {

            let items = task.Top100_Spider.items;
            $.each(items, function(i, item) {
                if (item.asin == request.value.asin) {
                    $.each(Object.keys(request.value), function(i, key) {

                        if (request.value[key]) {

                            item[key] = request.value[key];

                        }


                    });

                }
            });
            resolve({ "result": 1, 'row': request.value });

        }
    }
}();