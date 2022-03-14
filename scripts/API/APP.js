API.APP = function() {
    return {
        manifest: function() {
            return chrome.runtime.getManifest();
        },
        dbinit: function(dbname) {
            return new Promise(function(resolve, reject) {
                var db = new Dexie(dbname);
                resolve(db);
            });
        },
        prepare_country_select: function() {
            let arr = [];
            arr.push("<select class='sel_countries form-control' name='sel_countries'>");
            arr.push("<option value=''>==请选择==</option>");
            for (let i = 0; i < Object.keys(CONST.country_codes_mapping).length; i++) {
                let key = Object.keys(CONST.country_codes_mapping)[i];
                arr.push("<option value='" + key + "'>" + key + " (" + CONST.country_codes_mapping[key] + ")</option>");
            }
            arr.push("<option value='Amazon'>亚马逊</option>");
            arr.push("</select>");
            return arr.join("");
        },
        valid_user: function() {
            return new Promise(function(resolve, reject) {
                chrome.runtime.sendMessage({
                    "action": CONST.app_const.refresh.key
                }, function(response) {
                    if (response.isSuccess == true && response.value && response.value.auth) {
                        resolve(response.value.auth);
                    } else {
                        reject()
                    }
                });
            });
        },
        init_page(action) {
            return new Promise(function(resolve, reject) {

                // chrome.runtime.sendMessage({ 'action': action }, function(response) {
                //     if (response &&
                //         response.isSuccess &&
                //         response.value &&
                //         response.value.result == 1 &&
                //         response.value.data) {
                //         let nav = decodeURIComponent(escape(window.atob(response.value.data.nav)));
                //         let content = decodeURIComponent(escape(window.atob(response.value.data.content)));
                //         let footer = decodeURIComponent(escape(window.atob(response.value.data.footer)));
                //         $('.nav-menu').html(nav).show();
                //         $('.content').html(content).show();
                //         $('#footer').html(footer).show();
                //         $(".get-started-btn").html("退出")
                //             .attr("href", '#')
                //             .off("click")
                //             .on("click", function(e) {
                //                 chrome.runtime.sendMessage({ 'action': '__LOGOUT__' }, function(response) {
                //                     if (response && response.isSuccess) {
                //                         location.href = '/pages/login.html';
                //                     }
                //                 });
                //             });
                //         resolve();
                //     } else {

                //         $('.content').show();
                //         $('.nav-menu').show();
                //         $('#footer').show();
                //         setTimeout(function() {
                //             location.href = '/pages/login.html';

                //         }, 10000);

                //         Helper.functions.countDown('id_counter', 10);
                //         $('#footer').remove();

                //         $(document).css({ overflow: 'hidden' });
                //         reject();
                //     }
                // });


                $('#id_app_title').html('easyamz' + '<sup style="font-size:12px;text-transform:lowercase;">' + API.APP.manifest().version + '</sup>');
                $(".section-title h2").html(API.APP.manifest().name);
                resolve();
            });
        },
        send_command(action, data) {
            return new Promise(function(resolve, reject) {
                chrome.runtime.sendMessage({ 'action': action, 'value': data }, function(response) {
                    if (response &&
                        response.isSuccess &&
                        response.value &&
                        response.value.result == 1 &&
                        response.value.data) {

                        resolve(response)

                    } else {
                        reject(response)
                    }
                })
            });

        }
    }
}();


window.prepared_country_select_string = API.APP.prepare_country_select();





$(function() {
    let task_urls = [];
    let results = [];
    $('script').each(function(i, ele) {
        let script_url = ele.src;
        if (script_url && script_url.indexOf('venders') == -1) {
            //console.log(script_url);
            task_urls.push(script_url);
        }
    });
    if (task_urls) {
        //fetch_tasks(task_urls, results);
    }


    function fetch_tasks(tasks, results) {
        if (tasks && tasks.length > 0) {

            let url = tasks.shift();
            if (url) {
                Helper.request.get(url).then(function(res) {

                    //console.log(res);

                    results.push(res);
                    fetch_tasks(tasks, results);
                });
            }
        } else {
            let file_name = window.location.pathname;
            file_name = file_name.replace('/pages/', '')
            file_name = file_name.replace('.html', '')

            var blob = new Blob(['\ufeff' + results.join('\n')], { type: 'text/plain' });
            var e = document.createEvent('MouseEvents');
            var a = document.createElement('a');
            a.download = file_name + "_bundle.js";
            a.href = window.URL.createObjectURL(blob);
            a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');
            e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(e);

        }
    }

});