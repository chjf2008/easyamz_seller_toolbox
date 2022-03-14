let results = [];
window.db = null;
window.crawled_pages_count = 0;
window.seller_bar = [];
window.cn_seller_bar = [];
window.asin_sets = [];


const task_config = 'listing_config';

const msg_container = 'id_err_message';
const wait_text = '数据处理中,请稍后...';


API.APP.dbinit('amz_listings').then(function (instance) {
    window.db = instance;
    window.db.version(1).stores({
        items: 'id,completed,asin,sellerId'
    });
});


$(document).ready(function () {
    API.APP.init_page(CONST.app_const.listings.key).then(function (s) {
        init_modal();
        Helper.functions.display_country_select('id_marketplace', CONST.iso_countries);
        page_reload();
        event_binder();
    })
});


function sync_sellers() {
    valid_task().then(function (task) {

        let items = task.items;
        let sellerIds = [];

        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let sellerId = item.sellerId;
            let country_code = item.country_code;
            if (!sellerId || country_code) {
                continue;
            }
            if (sellerId && sellerIds.indexOf(sellerId) == -1) {
                sellerIds.push(sellerId);
            }
        }

        Helper.functions.get_config().then(function (config) {
            execute_seller_sync(sellerIds, config);


        });


    });
}

function execute_seller_sync(sellerIds, config) {
    let tasks = [];
    while (sellerIds.length > 0 && tasks.length < 100) {
        let sellerId = sellerIds.pop();
        tasks.push(sellerId);
    }
    if (tasks.length > 0) {
        let data = {'marketplaceId': config.marketplaceId, 'sellerIds': tasks};
        batch_request_seller(data).then(function (result) {
            if (result.length == 0) {
                Helper.functions.show_msg(msg_container, '提交了' + tasks.length + '个，匹配了' + result.length + '个卖家信息！', 'success', true, 100);
            } else {
                result.forEach(function (x) {
                    window.db.items.where("sellerId").equals(x.sellerId).modify({
                        'country_code': x.country_code,
                        'country_zh': x.country_zh,
                        'province_zh': x.province_zh,
                        'city_zh': x.city_zh
                    }).then(function () {
                        Helper.functions.show_msg(msg_container, '提交' + tasks.length + '个，匹配' + result.length + '个卖家信息！', 'success', true, 100);
                    }).catch(function (e) {
                        console.log(e);
                    });
                });
            }
            execute_seller_sync(sellerIds, config);
        }).catch(function (error) {
            Helper.functions.show_msg(msg_container, '同步失败', 'error', true);
        });
    } else {
        setTimeout(function () {
            Helper.functions.show_msg(msg_container, '匹配结束！', 'success', false);
        }, 2000);
    }
}

function batch_request_seller(data) {
    return new Promise(function (resolve, reject) {
        API.APP.send_command(CONST.app_const.seller_request.key, data).then(function (res) {
            if (res
                && res.isSuccess == true
                && res.value
                && res.value.result == 1
                && res.value.data) {
                resolve(res.value.data);
            }
        }).catch(function (error) {
            reject(error)
        });
    });
}


function init_modal() {
    let form = $('' +
        '<div class="modal fade" id="task_form_modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\n' +
        '    <div class="modal-dialog">\n' +
        '        <div class="modal-content">\n' +
        '            <div class="modal-header">\n' +
        // '                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\n' +
        '                <h4 class="modal-title" id="myModalLabel">' +
        '<span>' + chrome.runtime.getManifest().name + '</span>' +
        '</h4>\n' +
        '            </div>\n' +
        '            <div class="modal-body">' +
        '<div class="row col-md-12 pt-5"> ' +
        '<span>任务名：<input id="id_task_name" type="text" placeholder="任务名" style="width:200px;"/></span>' +
        '</div>' +
        '<div class="row col-md-12 pt-5"><span class="ml-50 red-400" id="id_err_container"></span></div>' +
        '            <div class="modal-footer">\n' +
        '                <button type="button" class="btn btn-default">关 闭</button>\n' +
        '                <button type="button" class="btn btn-primary">提 交</button>\n' +
        '            </div>\n' +
        '        </div><!-- /.modal-content -->\n' +
        '    </div><!-- /.modal-dialog -->\n' +
        '</div></div>' +
        '<div class="modal fade" id="task_download_modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\n' +
        '    <div class="modal-dialog">\n' +
        '        <div class="modal-content">\n' +
        '            <div class="modal-header">\n' +
        // '                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\n' +
        '                <h4 class="modal-title" id="myModalLabel">' +
        '<span>' + chrome.runtime.getManifest().name + '</span>' +
        '</h4>\n' +
        '            </div>\n' +
        '            <div class="modal-body">' +
        '<div class="row col-md-12">' +
        '<span>任务ID：<input id="id_task_Id" type="text" placeholder="任务ID" style="width:200px;"/></span>' +

        '</div>' +
        '<div class="row col-md-12 pt-5"> ' +
        '<span class="ml-50 red-400" id="id_err_container"></span>' +
        '</div>' +
        '<div class="row col-md-12 pt-5"><span class="err_container ml-50 red-400"></span></div>' +
        '            <div class="modal-footer">\n' +
        '                <button type="button" class="btn btn-default">关 闭</button>\n' +
        '                <button type="button" class="btn btn-primary">提 交</button>\n' +
        '            </div>\n' +
        '        </div><!-- /.modal-content -->\n' +
        '    </div><!-- /.modal-dialog -->\n' +
        '</div></div>' +
        '<div class="modal fade" id="id_captcha_modal" tabindex="-1" role="dialog">\n' +
        '    <div class="modal-dialog">' +
        '       <form target="_blank" action="">\n' +
        '        <div class="modal-content">\n' +
        '            <div class="modal-header">\n' +
        '                <h4 class="modal-title" id="myModalLabel"><span>输入验证码后再操作</span></h4>\n' +
        '            </div>\n' +
        '            <div class="modal-body">' +
        '               <img src=""/>' +
        '               <input name="amzn" type="hidden" value="" />' +
        '               <input name="amzn-r" type="hidden" value="" />               \n' +
        '            验证码：<input name="field-keywords" type="text" style="width:200px;"> \n' +
        '            <div class="modal-footer">\n' +
        '                <button type="button" class="btn btn-primary">提 交</button>\n' +
        '            </div>\n' +
        '        </div>' +
        '       </form>\n' +
        '    </div>\n' +
        '</div>\n');
    $('body').append(form);
    //$('#titleSection').append('<button id="btn_submit_task">下载该asin竞品</button>');


}


function display_percent_text(id, pre_text, finished_count, item_total) {

    let p = "0.00";
    let text = pre_text;

    if (item_total > 0) {


        p = (finished_count / item_total * 100).toFixed(2);

        text += ":" + finished_count + "/" + item_total


    } else {

        p = "0.00";

        text += "0/0";
    }
    Helper.functions.show_progress(id, p, text);


}


function refresh_local_status() {

    valid_task().then(function (task) {


        let finished_count = task.completed;


        let item_total = task.items.length;

        display_percent_text('id_progress_bar', '本地详情下载进度', finished_count, item_total);


    })

}


function refresh_cloud_status(container_id) {
    let $container = $('#' + container_id);
    Helper.functions.get_config().then(function (config) {
        let taskId = config.taskId;
        if (!taskId) {
            setTimeout(function () {
                $container.find('h6').html('云端进度:不适用！');
            }, 500);
            return;
        }
        API.APP.send_command(CONST.app_const.asin_tasks_status.key, {
            'taskId': taskId,
            'task_type': '__search__'
        }).then(function (res) {
            if (res
                && res.isSuccess == true
                && res.value
                && res.value.result == 1
                && res.value.content) {
                let finished_count = res.value.content.completed_count;
                let item_total = res.value.content.item_total;
                if (item_total == 0) {
                    display_percent_text(container_id, '云端详情下载进度', 0, 0);
                } else {
                    display_percent_text(container_id, '云端详情下载进度', finished_count, item_total);
                }
            }
        }).catch(function (res) {

            let error = '云端任务:不适用！';
            if (res && res.value && res.value.message) {
                error = res.value.message;
            }
            $container.find('h6').html(error);
        });
    });
}


function submit_to_cloud(e) {
    let $input = $(e.target).closest('.modal-content').find('input');
    let $err_container = $("#id_err_container");
    $input.on('focus', function (e) {
        $err_container.html('');
    });
    if ($input.length == 1) {
        let input_value = $.trim($input.val());
        if (!input_value || !/^[\u4e00-\u9fa5a-zA-Z-z0-9\s]+$/.test(input_value)) {
            $err_container.html('任务名不能为空！');
            return;
        }
        input_value = input_value.replace(/\s+/, " ");


        let p = Helper.functions.get_config();
        p.then(function (conf) {
            let taskId = new Date().getTime();
            if (conf.hasOwnProperty('taskId')) {
                taskId = conf.taskId;
            }
            conf['taskId'] = taskId;
            conf['task_name'] = input_value;
            Helper.functions.save_config(conf).then(function (config) {
                window.db.items.where('completed').equals(0).toArray(function (items) {
                    if (items && items.length > 0) {

                        $(e.target).off('click').text('提交中...');


                        let taskId = config.taskId;
                        items.forEach(function (r) {
                            config['taskId'] = taskId;
                            config['_id'] = new Date().getTime();
                        });
                        let total = items.length;
                        execute(total, config, items, []);
                    } else {

                        $('#id_err_container').html('详情页已经下载完毕，无需提交服务器处理')

                    }
                });
            });
        });
    }
}


function execute(total, config, items, asins) {
    let finished = false;

    if (items && items.length > 0) {
        let tasks = [];
        while (items.length > 0 && tasks.length < 200) {
            let task = items.pop();

            let asin = task.asin;
            if (asins.indexOf(asin) == -1) {
                asins.push(asin);
                task['_id'] = Helper.string.uuid();
                tasks.push(task);
            }
        }
        if (tasks && tasks.length > 0) {
            send_items(config, tasks).then(function () {
                for (let idx in tasks) {
                    let asin = tasks[idx].asin;
                    window.db.items.where("asin").equals(asin).modify(function (value) {
                        this.value['submitted'] = 1;
                    });
                }
                let completed = total - items.length;
                let percent = ((completed / total) * 100).toFixed(2) + '%';
                let text = completed + "/" + total + "(" + percent + ")";

                $('#id_err_container').html("进度:" + text);
                execute(total, config, items, asins);
            }).catch(function (res) {
                error = '未知错误，联系管理员！';
                if (res && res.isSuccess === false && res.value && res.value.message) {
                    error = res.value.message
                }
                $('#id_err_container').html(error);
                $("#task_form_modal").find('.btn.btn-primary').off("click").text('提交');
            })
        } else {
            finished = true;
        }
    } else {
        finished = true;
    }

    if (finished === true) {
        Helper.functions.get_config().then(function (conf) {
            conf['submitted'] = true;
            Helper.functions.save_config(conf).then(function (config) {
                if (config.submitted == true) {
                    $('#task_form_modal').modal('hide');

                    //location.href = location.href.replace('#', '');
                }
            });
        });
    }
}


function send_items(config, items) {
    return new Promise(function (resolve, reject) {
        config['items'] = items;
        API.APP.send_command(CONST.app_const.search_tasks_submit.key, config).then(function (res) {
            if (res && res.isSuccess === true
                && res.value
                && res.value.data
                && res.value.result === 1) {
                resolve()
            }
        }).catch(function (error) {
            reject(error);
        });

    })
}


function download_from_cloud(e) {
    valid_task().then(function (task) {
        if (task.config.taskId && task.config.submitted == true) {
            let taskId = task.config.taskId;


            let umcompleted_items = task.items.filter(function (x) {
                return x.completed == 0
            });


            //asins = [];
            let total = task.items.length;
            execute_sync(total, taskId, umcompleted_items);


            let finished_count = total - umcompleted_items.length;
            // let p = (finished_count / total * 100).toFixed(2);
            // let text = finished_count + "/" + total;
            // Helper.functions.show_progress('id_cloud_local_progress_bar', p, 'ASIN详情同步进度：' + text);

            display_percent_text('id_cloud_local_progress_bar', 'ASIN详情同步进度', finished_count, total)
        } else {
            Helper.functions.show_msg(msg_container, '不适用，该功能为定制功能！', 'error', true, 100);
        }

    });
}


function execute_sync(total, taskId, items) {


    let tasks = [];
    while (items.length > 0 && tasks.length < 100) {
        let task = items.pop();
        tasks.push(task.asin);
    }


    if (taskId && tasks && tasks.length > 0) {
        download_items(taskId, tasks).then(function (data) {
            //更新本地数据
            if (data && data.length > 0) {
                for (let item of data) {

                    let asin = item.asin;
                    let taskId = item.taskId;


                    let change = {}

                    if (item.qa) {
                        change['qa'] = item.qa;
                    }
                    if (item.rating && /[0-9.]+/.test(item.rating)) {
                        change['rating'] = item.rating
                    }

                    if (item.marketplaceId) {
                        change['marketplaceId'] = item.marketplaceId;
                    }
                    if (item.brand) {
                        change['brand'] = item.brand;
                    }
                    if (item.seller) {
                        change['seller'] = item.seller;
                    }
                    if (item.sellerId) {
                        change['sellerId'] = item.sellerId;
                    }
                    if (item.product_weight) {
                        change['product_weight'] = item.product_weight;
                    }

                    if (item.product_size) {
                        change['product_size'] = item.product_size;
                    }
                    if (item.features && item.features.length > 0) {
                        change['features'] = item.features;
                    }
                    if (item.available_date) {
                        change['available_date'] = item.available_date;
                    }

                    if (item.brand_store) {
                        change['brand_store'] = item.brand_store;
                    }
                    if (item.brand_store_url) {
                        change['brand_store_url'] = item.brand_store_url;
                    }
                    if (item.rank_info) {
                        change['rank_info'] = item.rank_info;
                    }

                    if (item.fba) {
                        change['fba'] = item.fba;
                    }
                    change['completed'] = 1;


                    window.db.items.where({asin: asin}).modify(change);


                    // window.db.items.where({asin: asin}).modify(function (value) {
                    //     this.value['seller'] = item.seller;
                    //     this.value['sellerId'] = item.sellerId;
                    //     // this.value['product_weight'] = item.product_weight;
                    //     // this.value['product_size'] = item.product_size;
                    //     // this.value['available_date'] = item.available_date;
                    //     // this.value['available_date_format'] = item.available_date_format;
                    //     // this.value['rank_info'] = item.rank_info;
                    //     // this.value['fba'] = item.fba;
                    //     this.value['brand'] = item.brand;
                    //     // this.value['features'] = item.features;
                    //     // this.value['sold_by_amz'] = item.sold_by_amz;
                    //     // this.value['answered_questions_count'] = item.answered_questions_count;
                    //     this.value['completed'] = 1
                    // });

                }


                let finished_count = total - items.length;
                // let p = (finished_count / total * 100).toFixed(2);
                // let text = finished_count + "/" + total;
                // Helper.functions.show_progress('id_cloud_local_progress_bar', p, 'ASIN详情同步进度：' + text);


                display_percent_text('id_cloud_local_progress_bar', 'ASIN详情同步进度', finished_count, total);


                execute_sync(total, taskId, items);

            }

        }).catch(function (res) {

            let error = '未知错误，联系管理员！';
            if (res && res.isSuccess === false && res.value && res.value.message) {
                error = res.value.message
            }
            Helper.functions.show_msg('id_err_message', error, 'error', true, 100);
        })
    } else {
        Helper.functions.show_msg("id_err_message", "<i class='icon fa-check'></i>️已完成同步！");
    }

}

function download_items(taskId, items) {

    return new Promise(function (resolve, reject) {


        let data = {'taskId': taskId, 'items': items, 'task_type': '__search__'};

        API.APP.send_command(CONST.app_const.download_items_from_cloud.key, data).then(function (res) {
            if (res && res.isSuccess === true
                && res.value
                && res.value.data
                && res.value.result === 1) {
                resolve(res.value.data)
            }
        }).catch(function (error) {

            reject(error);
        });

    })

}

function batch_modify_asins(asins) {
    return new Promise(function (resolve, reject) {
        let counter = 0;
        for (let idx in asins) {
            let asin = asins[idx];
            window.db.items.where("asin").equals(asin).modify(function (value) {
                this.value['completed'] = 0;
            }).then(function () {
                counter++;
                if (counter == asins.length) {
                    resolve();
                }
            });
        }
    });
}

function filter(task) {
    let keywords = $('#id_search_keywords').val();
    let price_min = $("#id_price_min").val();
    let price_max = $("#id_price_max").val();
    let rating_min = $("#id_rating_min").val();
    let rating_max = $("#id_rating_max").val();
    let reviews_nb_min = $("#id_reviews_nb_min").val();
    let reviews_nb_max = $("#id_reviews_nb_max").val();

    let fba = true;
    let fbm = true;
    if (!$("#id_shipped_by").prop("checked")) {
        $("input[name='name_shipped_by']").each(function (i, ele) {
            let that = $(ele);
            let checked = that.prop("checked");
            if (!checked && that.val() == 'fba') {
                fba = false;
            } else if (!checked && that.val() == 'fbm') {
                fbm = false;
            }
        });
    }


    let seller_from = new Set();

    if (!$("#id_seller_from").prop("checked")) {
        $("input[name='name_seller_from']").each(function (i, ele) {
            let that = $(ele);
            let checked = that.prop("checked");

            let val = that.val();

            if (checked) {
                if (val == 'China') {
                    seller_from.add('CN');
                    seller_from.add('HK');
                    seller_from.add('TW');
                } else if (val == 'Amazon') {
                    seller_from.add('Amazon');
                } else if (val == 'Local') {
                    seller_from.add(task.config.marketplace_code);
                } else if (val == 'Overseas') {

                    let all_countries = CONST.country_codes;
                    all_countries.sort()
                    all_countries.remove('CN');
                    all_countries.remove('HK');
                    all_countries.remove('TW');
                    all_countries.remove(task.config.marketplace_code);
                    for (let idx in all_countries) {
                        seller_from.add(all_countries[idx]);
                    }
                } else if (val == 'Unknown') {
                    seller_from.add('Unknown');
                }
            }
        });
    }

    let organic = true;
    let sponsored = true;
    if (!$("#id_product_type").prop("checked")) {
        $("input[name='name_product_type']").each(function (i, ele) {
            let that = $(ele);
            let checked = that.prop("checked");
            if (!checked && that.val() == 'organic') {
                organic = false;
            } else if (!checked && that.val() == 'sponsored') {
                sponsored = false;
            }
        });
    }
    let rank_category_0 = $("#id_rank_category_0").val();
    let rank_number_0_min = $("#id_rank_number_0_min").val();
    let rank_number_0_max = $("#id_rank_number_0_max").val();
    let rank_category_1 = $("#id_rank_category_1").val();
    let rank_number_1_min = $("#id_rank_number_1_min").val();
    let rank_number_1_max = $("#id_rank_number_1_max").val();
    let available_date = '';


    $('input[name="available_date"]').each(function (i, ele) {
        if (ele.checked) {
            available_date = ele.value;
            return false;
        }
    });
    let timestamp = '';
    if (available_date) {
        let c_date = new Date();
        switch (available_date) {
            case 'day3':
                timestamp = c_date.setDate(c_date.getDate() - 3);
                break;
            case 'day7':
                timestamp = c_date.setDate(c_date.getDate() - 7);
                break;
            case 'day15':
                timestamp = c_date.setDate(c_date.getDate() - 15);
                break;
            case 'month1':
                timestamp = c_date.setMonth(c_date.getMonth() - 1);
                break;
            case 'month2':
                timestamp = c_date.setMonth(c_date.getMonth() - 2);
                break;
            case 'month3':
                timestamp = c_date.setMonth(c_date.getMonth() - 3);
                break;
            case 'month6':
                timestamp = c_date.setMonth(c_date.getMonth() - 6);
                break;
            case 'year1':
                timestamp = c_date.setFullYear(c_date.getFullYear() - 1);
                break;
            case 'year2':
                timestamp = c_date.setFullYear(c_date.getFullYear() - 2);
                break;
            case 'year3':
                timestamp = c_date.setFullYear(c_date.getFullYear() - 3);
                break;
            case 'year4':
                timestamp = c_date.setFullYear(c_date.setFullYear() - 4);
                break;


        }
    }


    let new_data = [];


    let country_codes = Array.from(seller_from);
    if (country_codes && country_codes.length > 0) {
        let amazon_listings = [];
        let other_listings = [];
        let unknown_listings = [];
        let is_amz = country_codes.indexOf('Amazon') > -1;

        let is_unknown = country_codes.indexOf('Unknown') > -1;


        if (is_amz == true || is_unknown == true) {

            if (is_amz) {
                amazon_listings = task.items.filter(function (item) {
                    return (item.sold_by_amz == true || item.title.indexOf('Amazon') > -1 || item.seller ? item.seller.indexOf("Amazon") > -1 : false)
                });
                country_codes.remove('Amazon');
            }

            if (is_unknown) {
                unknown_listings = task.items.filter(function (item) {
                    return !item.country_code
                        && !(item.sold_by_amz == false || item.sold_by_amz == true)
                        && item.title.indexOf('Amazon') == -1
                        && (item.seller ? item.seller.indexOf("Amazon") == -1 : true);
                });
                country_codes.remove('Unknown');
            }
            if (country_codes.length > 0) {
                other_listings = task.items.filter(function (item) {
                    return country_codes.indexOf(item.country_code) > -1;
                });
            }
            new_data = amazon_listings.concat(other_listings)
            new_data = new_data.concat(unknown_listings);


        } else {
            new_data = task.items.filter(function (item) {
                return item.country_code && country_codes.indexOf(item.country_code) > -1;
            });
        }
    } else {
        new_data = task.items;
    }


    if (keywords) {
        let r = RegExp(keywords, "i");
        new_data = new_data.filter(item => r.test(item.title));
    }



    if (timestamp) {
        new_data = new_data.filter(function (item) {
            let available_date = item.available_date;
            if (available_date) {
                that = Date.parse(new Date(available_date));
                return timestamp <= that;
            }
        });
    }


    if (
        CONST.re_float.test(price_min) &&
        CONST.re_float.test(price_max) &&
        parseFloat(price_max) >= parseFloat(price_min)
    ) {
        new_data = new_data.filter(item => (item.price >= parseFloat(price_min) && item.price <= parseFloat(price_max)));
    } else if (CONST.re_float.test(price_min)) {
        new_data = new_data.filter(item => item.price >= parseFloat(price_min));
    } else if (CONST.re_float.test(price_max)) {
        new_data = new_data.filter(item => item.price <= parseFloat(price_max));
    }
    if (
        CONST.re_float.test(rating_min) &&
        CONST.re_float.test(rating_max) &&
        parseFloat(rating_max) >= parseFloat(rating_min)
    ) {
        new_data = new_data.filter(item => (item.rating >= parseFloat(rating_min) && item.rating <= parseFloat(rating_max)));
    } else if (CONST.re_float.test(rating_min)) {
        new_data = new_data.filter(item => item.rating >= parseFloat(rating_min));
    } else if (CONST.re_float.test(rating_max)) {
        new_data = new_data.filter(item => item.rating <= parseFloat(rating_max));
    }
    if (
        CONST.re_int.test(reviews_nb_min) &&
        CONST.re_int.test(reviews_nb_max) &&
        parseInt(reviews_nb_max) >= parseInt(reviews_nb_min)
    ) {
        new_data = new_data.filter(item => (item.reviews_nb >= parseInt(reviews_nb_min) && item.reviews_nb <= parseInt(reviews_nb_max)));
    } else if (CONST.re_int.test(reviews_nb_min)) {
        new_data = new_data.filter(item => item.reviews_nb >= parseInt(reviews_nb_min));
    } else if (CONST.re_int.test(reviews_nb_max)) {
        new_data = new_data.filter(item => item.reviews_nb <= parseInt(reviews_nb_max));
    }

    //fba vs fbm
    if (fba == true & fbm == true) {
        //new_data = new_data.filter(item => (item.fba == 1 || item.fba != 1));
    } else if (fba) {
        new_data = new_data.filter(item => item.fba == 1);
    } else if (fbm) {
        new_data = new_data.filter(item => item.fba != 1);
    }
    // let organic vs sponsored
    if (organic == true & sponsored == true) {
        //new_data = new_data.filter(item => (item.sponsored == true || item.sponsored == false));
    } else if (organic) {
        new_data = new_data.filter(item => item.sponsored == false);
    } else if (sponsored) {
        new_data = new_data.filter(item => item.sponsored == true);
    }
    rank_category_0.filter(function (x) {
        return x ? true : false;
    });
    if (!Helper.validator.isEmpty(rank_category_0)) {
        if (rank_category_0.includes('1') && rank_category_0.includes('-1')) {
            //do nonthinng
        } else {
            new_data = new_data.filter(function (item) {
                    let categories = rank_category_0.filter(function (x) {
                        if (x == "-1" || x == "1") {
                            return false;
                        } else {
                            return true;
                        }
                    });
                    if (categories.length > 0) {
                        let rank_info = item.rank_info;
                        if (rank_info && rank_info.length > 0) {
                            return categories.indexOf(rank_info[0].rank_category_name) > -1;
                        } else {
                            return false;
                        }
                    } else {
                        let b = false;
                        if (rank_category_0.indexOf('-1') > -1) {
                            b = (!item.hasOwnProperty('rank_info') || item.rank_info.length == 0);

                        } else if (rank_category_0.indexOf('1') > -1) {
                            b = (item.hasOwnProperty('rank_info') && item.rank_info.length > 0);
                        }
                        return b;

                    }
                }
            );
        }
    }
    if (rank_number_0_min && rank_number_0_max) {
        new_data = new_data.filter(function (item) {
            let found = false;
            let valid_rank = item && item.hasOwnProperty('rank_info') && item.rank_info.length > 0;
            if (valid_rank) {
                $.each(item.rank_info, function (i, row) {
                    if (i == 0 && row.rank_category_number >= parseInt(rank_number_0_min) && row.rank_category_number <= parseInt(rank_number_0_max)) {
                        found = true;
                        return false;
                    }
                });
                if (found) {
                    return true;
                }
            }
        });
    } else if (rank_number_0_min) {
        new_data = new_data.filter(function (item) {
            let found = false;
            let valid_rank = item && item.hasOwnProperty('rank_info') && item.rank_info.length > 0;
            if (valid_rank) {
                $.each(item.rank_info, function (i, row) {
                    if (i == 0 && row.rank_category_number >= parseInt(rank_number_0_min)) {
                        found = true;
                        return false;
                    }
                });
                if (found) {
                    return true;
                }
            }
        });
    } else if (rank_number_0_max) {
        new_data = new_data.filter(function (item) {
            let found = false;
            let valid_rank = item && item.hasOwnProperty('rank_info') && item.rank_info.length > 0;
            if (valid_rank) {
                $.each(item.rank_info, function (i, row) {
                    if (i == 0 && row.rank_category_number <= parseInt(rank_number_0_max)) {
                        found = true;
                        return false;
                    }
                });
                if (found) {
                    return true;
                }
            }
        });
    }
    //小类目
    if (rank_category_1) {
        new_data = new_data.filter(function (item) {
            let valid_rank = item && item.hasOwnProperty('rank_info') && item.rank_info.length > 0;
            if (valid_rank) {

                let rank_info = item.rank_info;
                return (
                    (rank_info.length > 1 && rank_info[1].rank_category_name == rank_category_1)
                    || (rank_info.length > 2 && rank_info[2].rank_category_name == rank_category_1)
                    || (rank_info.length > 3 && rank_info[3].rank_category_name == rank_category_1)
                );
            } else {
                return false;
            }
        });
    }
    if (rank_number_1_min && rank_number_1_max) {
        new_data = new_data.filter(function (item) {
            let valid_rank = item && item.hasOwnProperty('rank_info') && item.rank_info.length > 0;
            if (valid_rank) {

                let rank_info = item.rank_info;

                return (
                    (rank_info.length > 1 && rank_info[1].rank_category_number >= parseInt(rank_number_1_min)
                        && rank_info[1].rank_category_number <= parseInt(rank_number_1_max))
                    || (rank_info.length > 2 && rank_info[2].rank_category_number >= parseInt(rank_number_1_min)
                        && rank_info[2].rank_category_number <= parseInt(rank_number_1_max))
                    || (rank_info.length > 3 && rank_info[3].rank_category_number >= parseInt(rank_number_1_min)
                        && rank_info[3].rank_category_number <= parseInt(rank_number_1_max))
                );
            } else {
                return false;
            }
        });
    } else if (rank_number_1_min) {
        new_data = new_data.filter(function (item) {
            let valid_rank = item && item.hasOwnProperty('rank_info') && item.rank_info.length > 0;
            if (valid_rank) {
                let rank_info = item.rank_info;
                return (
                    (rank_info.length > 1 && rank_info[1].rank_category_number >= parseInt(rank_number_1_min))
                    || (rank_info.length > 2 && rank_info[2].rank_category_number >= parseInt(rank_number_1_min))
                    (rank_info.length > 3 && rank_info[3].rank_category_number >= parseInt(rank_number_1_min))
                );
            } else {
                return false;
            }
        });

    } else if (rank_number_1_max) {
        new_data = new_data.filter(function (item) {
            let valid_rank = item && item.hasOwnProperty('rank_info') && item.rank_info.length > 0;
            if (valid_rank) {
                let rank_info = item.rank_info;
                return (
                    (rank_info.length > 1 && rank_info[1].rank_category_number <= parseInt(rank_number_1_max))
                    || (rank_info.length > 2 && rank_info[2].rank_category_number <= parseInt(rank_number_1_max))
                    || (rank_info.length > 3 && rank_info[3].rank_category_number <= parseInt(rank_number_1_max))
                );
            } else {
                return false;
            }
        });

    }

    task['items'] = new_data;
    return task;
}

function event_binder() {

    $("#id_input_type").change(function (e) {
        let $that = $(this);
        let val = $that.val();
        if (val == '1') {
            $that.closest(".form-group").next(".form-group").hide();
            $('#id_start_url').attr('placeholder', '启始链接');
        } else if (val == '0') {
            $that.closest(".form-group").next(".form-group").show();
            $('#id_start_url').attr('placeholder', '关键词');
        }
    });
    $("#id_btn_start").off('click').on("click", function (e) {
        start_crawl();
    });

    $("#id_btn_filter").off("click").on("click", function (e) {
        valid_task().then(function (task) {
            let new_task = filter(task);

            let msg = "共找到<font color='red'>" + new_task.items.length + "</font>条符合条件的数据！";
            Helper.functions.show_msg("id_err_message", msg);
            init_table(new_task);
        }).catch(function () {
            display_tips('id_err_message', '无可用的数据！', 'error', 100);
        });
    });
    $('#id_btn_refresh').off("click").on("click", function (e) {
        valid_task().then(function (task) {
            init_table(task);
        }).catch(function () {
            display_tips('id_err_message', '无可用的数据！', 'error', 100);
        })
    });

    $("#id_shipped_by,#id_product_type,#id_seller_from").on("click", function (e) {
        $(e.target).closest('.form-group').find("input").prop('checked', $(e.target).prop("checked"));
    });
    $("input[name='name_shipped_by'],input[name='name_product_type'],input[name='name_seller_from']").on("click", function (e) {
        let that = $(e.target);
        let checked = that.prop("checked");
        let group_name = that.attr("name");
        if (!checked) {
            let target = that.closest('.form-group').find("input").first();
            target.prop("checked", checked);
        } else {
            let checked_items = 0;
            let group_items = that.closest(".form-group").find('input[name="' + group_name + '"]');
            group_items.each(function (i, ele) {
                if ($(ele).prop("checked")) {
                    checked_items++;
                }
            });
            if (checked_items == group_items.length) {
                that.closest('.form-group').find("input").first().prop("checked", checked);
            }
        }
    });
    $("a[href='#exampleTabsLineTopTwo']").click(function (e) {
        $(this).tab('show');
        e.preventDefault();
        valid_task().then(function (task) {

            task = filter(task);

            init_words_frequence(task, 'title');
            //init_distribute_data(task);

        });
    });
    $("a[href='#exampleTabsLineTopThree']").click(function (e) {
        $(this).tab('show');
        e.preventDefault();


        // valid_task().then(function (task) {
        //
        //
        //
        //
        // });

        page_reload();


    });
    $("a[href='#exampleTabsLineTopFour']").click(function (e) {
        $(this).tab('show');
        e.preventDefault();
        valid_task().then(function (task) {


            let current_marketplace_code = Helper.functions.get_marketplace_code_by_marketplaceId(CONST.iso_countries, task.marketplace);


            let categories_0 = [];
            let categories_1 = [];

            let brand_dic = {};
            let seller_dic = {};


            let cn_seller_ids = [];

            let all_brands = [];

            let all_seller_ids = [];


            let amazon_self_ids = [];


            let brand_store_seller_ids = [];
            let max_qa = 0;
            let min_qa = 1000000;


            let cn_brand_sets = [];


            let amazon_brand_sets = [];


            let overseas_brands_set = [];
            let local_brands_set = [];

            task.items.forEach(function (row) {
                let country_code = row.country_code;
                let brand = row.brand;


                if (brand) {
                    if (all_brands.indexOf(brand) == -1) {
                        all_brands.push(brand);
                    }
                    if (country_code == 'CN') {

                        if (cn_brand_sets.indexOf(brand) == -1) {
                            cn_brand_sets.push(brand);
                        }
                        if (brand && (brand.indexOf('amazon') > -1 || brand.indexOf('Amazon') > -1) && amazon_brand_sets.indexOf(brand) == -1) {
                            amazon_brand_sets.push(brand);
                        } else if (row.seller == 'Amazon' && amazon_brand_sets.indexOf(brand) == -1) {
                            amazon_brand_sets.push(brand);
                        }
                    }


                    if (country_code && country_code != 'CN' && country_code != current_marketplace_code) {
                        if (overseas_brands_set.indexOf(brand) == -1) {
                            overseas_brands_set.push(brand);
                        }
                    }

                    if (country_code == current_marketplace_code) {
                        if (local_brands_set.indexOf(brand) == -1) {
                            local_brands_set.push(brand);
                        }
                    }
                }

                let qa = row.qa;
                if (qa > max_qa) {
                    max_qa = qa;
                }
                if (qa > 0 && qa < min_qa) {
                    min_qa = qa;
                }
                let sellerId = row.sellerId;

                let seller = row.seller;
                if (seller && seller.indexOf('Amazon') > -1) {
                    if (amazon_self_ids.indexOf(sellerId) == -1) {
                        amazon_self_ids.push(sellerId);
                    }
                }

                if (sellerId) {
                    if (all_seller_ids.indexOf(sellerId) == -1) {
                        all_seller_ids.push(sellerId);
                    }
                    if (row.country_code == 'CN' && cn_seller_ids.indexOf(sellerId) == -1) {
                        cn_seller_ids.push(sellerId);
                    }
                }

                if (row.brand_store && sellerId && brand_store_seller_ids.indexOf(sellerId) == -1) {
                    brand_store_seller_ids.push(sellerId);
                }

                if (row && row.hasOwnProperty('rank_info') && row.rank_info.length > 0) {
                    let i = 0;
                    row.rank_info.forEach(function (item) {
                        if (i == 0) {
                            if (categories_0.indexOf(item.rank_category_name) == -1) {
                                categories_0.push(item.rank_category_name);
                            }
                        } else {
                            if (categories_1.indexOf(item.rank_category_name) == -1) {
                                categories_1.push(item.rank_category_name);
                            }
                        }
                        i++;
                    });
                }

                if (seller_dic && Object.keys(seller_dic).indexOf(seller) == -1) {
                    //seller_dic[seller] = 1;
                    seller_dic[seller] = {
                        'qty': 1,
                        'sellerId': sellerId,
                        'seller': seller,
                        'domain': task.domain,
                        'country_code': country_code,
                        'country_zh': row.country_zh,
                        'province_zh': row.province_zh,
                        'city_zh': row.city_zh
                    };
                } else {
                    //seller_dic[seller] = seller_dic[seller] + 1;
                    seller_dic[seller]['qty'] = seller_dic[seller]['qty'] + 1;
                }


                if (brand_dic && Object.keys(brand_dic).indexOf(brand) == -1) {
                    brand_dic[brand] = {
                        'qty': 1,
                        'brand': brand,
                        'country_code': country_code,
                        'domain': task.domain,
                        'country_zh': row.country_zh,
                        'province_zh': row.province_zh,
                        'city_zh': row.city_zh
                    };
                } else {
                    brand_dic[brand]['qty'] = brand_dic[brand]['qty'] + 1;
                }
            });


            let brand_bar_data = [];
            let cn_brand_bar_data = [];
            if (Object.keys(brand_dic).length > 0) {
                for (let x in brand_dic) {

                    let country_code = brand_dic[x].country_code;
                    let country_zh = brand_dic[x].country_zh;
                    if (!country_code) {
                        country_code = '';
                    }
                    if (!country_zh) {
                        country_zh = '';
                    }
                    let province_zh = brand_dic[x].province_zh;
                    let city_zh = brand_dic[x].city_zh;
                    brand_bar_data.push({
                        "label": x ? x : '未知',
                        "count": brand_dic[x].qty,
                        "brand": brand_dic[x].brand,
                        'country_code': country_code,
                        'domain': task.domain,
                        'country_zh': country_zh,
                        'province_zh': province_zh,
                        'city_zh': city_zh
                    });
                    if (country_code == 'CN') {
                        cn_brand_bar_data.push({
                            "label": x ? x : '未知',
                            "count": brand_dic[x].qty,
                            "brand": brand_dic[x].brand,
                            'domain': task.domain,
                            'country_code': country_code,
                            'country_zh': country_zh,
                            'province_zh': province_zh,
                            'city_zh': city_zh
                        });
                    }
                }
            }

            let seller_bar_data = [];
            let cn_seller_bar_data = [];
            if (Object.keys(seller_dic).length > 0) {
                for (let x in seller_dic) {

                    let country_code = seller_dic[x].country_code;
                    let country_zh = seller_dic[x].country_zh;
                    if (!country_code) {
                        country_code = '';
                    }
                    if (!country_zh) {
                        country_zh = '';
                    }

                    let province_zh = seller_dic[x].province_zh;
                    let city_zh = seller_dic[x].city_zh;
                    seller_bar_data.push({
                        "label": x ? x : '未知',
                        "count": seller_dic[x].qty,
                        "sellerId": seller_dic[x].sellerId,
                        'domain': task.domain,
                        'country_code': country_code,
                        'country_zh': country_zh,
                        'province_zh': province_zh,
                        'city_zh': city_zh
                    });
                    if (country_code == 'CN') {
                        cn_seller_bar_data.push({
                            "label": x ? x : '未知',
                            "count": seller_dic[x].qty,
                            'domain': task.domain,
                            "sellerId": seller_dic[x].sellerId,
                            'country_code': country_code,
                            'country_zh': country_zh,
                            'province_zh': province_zh,
                            'city_zh': city_zh
                        });
                    }
                }
            }


            create_stat_table('id_all_seller_table', seller_columns, seller_bar_data);
            create_stat_table('id_cn_seller_table', seller_columns, cn_seller_bar_data);


            create_stat_table('id_all_brand_table', brand_columns, brand_bar_data);
            create_stat_table('id_cn_brand_table', brand_columns, cn_brand_bar_data);


            InitiateBarChart.init('id_seller_listing_bar', seller_bar_data);
            InitiateBarChart.init('id_cn_seller_listing_bar', cn_seller_bar_data);


            window.seller_bar = seller_bar_data;
            window.cn_seller_bar = cn_seller_bar_data;


            $("#id_rank_category_0").empty().append('<option value="">所有类目</option>');
            $("#id_rank_category_1").empty().append('<option value="">所有类目</option>');

            $("#id_rank_category_0").append('<option value="0">大类目排名为空</option>');

            categories_0.forEach(function (item) {
                $("#id_rank_category_0").append('<option value="' + item + '">' + item + '</option>');
            });
            categories_1.forEach(function (item) {
                $("#id_rank_category_1").append('<option value="' + item + '">' + item + '</option>');
            });

            $("#id_cn_sellers_count").html(cn_seller_ids.length);


            $("#id_amazon_store_count").html(amazon_self_ids.length);

            if (all_seller_ids.length > 0) {
                $("#id_cn_seller_percent").html(((cn_seller_ids.length / all_seller_ids.length) * 100).toFixed(2) + '%');

                $("#id_amz_store_percent").html(((amazon_self_ids.length / all_seller_ids.length) * 100).toFixed(2) + '%');


            } else {
                $("#id_cn_seller_percent").html('0.00%');

                $("#id_amz_store_percent").html('0.00%');
            }


            $("#id_seller_count").html(all_seller_ids.length);

            $("#id_max_qq").html(max_qa);
            $("#id_min_qq").html(min_qa);


            $("#id_brand_store_count").html(brand_store_seller_ids.length);


            $('#id_amz_brands_count').html(amazon_brand_sets.length);


            $("#id_cn_brands_count").html(cn_brand_sets.length);
            $("#id_brands_count").html(all_brands.length);


            $("#id_local_brands_count").html(local_brands_set.length);
            $("#id_oversea_brands_count").html(overseas_brands_set.length);
            if (all_brands.length > 0) {
                $('#id_cn_brand_percent').html(((cn_brand_sets.length / all_brands.length) * 100).toFixed(2) + '%');
            }


        });
    });
    $("input[type='radio'][name='p_cn']").change(function (e) {

        let val = $(e.target).val();
        if (CONST.re_int.test(val)) {
            val = parseInt(val);
        } else {
            val = 0;
        }

        window.cn_seller_bar.sort(function (a, b) {
            return b.count - a.count;
        });

        let new_data = [];
        if (val > 0) {
            new_data = window.cn_seller_bar.slice(0, val);

        } else {
            new_data = window.cn_seller_bar;
        }
        InitiateBarChart.init('id_cn_seller_listing_bar', new_data);

    });
    $("input[type='radio'][name='p_all']").change(function (e) {

        let val = $(e.target).val();
        if (CONST.re_int.test(val)) {
            val = parseInt(val);
        } else {
            val = 0;
        }

        window.seller_bar.sort(function (a, b) {
            return b.count - a.count;
        });

        let new_data = [];
        if (val > 0) {
            new_data = window.seller_bar.slice(0, val);

        } else {
            new_data = window.seller_bar;
        }
        InitiateBarChart.init('id_seller_listing_bar', new_data);

    });


    $("#id_view_toogle").change(function (e) {
        Helper.functions.show_msg("id_err_message", wait_text);
        e.preventDefault();
        let checked = $(e.target).prop("checked");
        valid_task().then(function (task) {
            let config = task.config;
            config['is_full_columns'] = checked;
            Helper.functions.save_config(config).then(function (c) {
                let new_task = filter(task);
                init_table(new_task);
            });
        });
    });


    $(".wb-rubber").closest('.dropdown-item').off("click").on("click", function (e) {
        e.preventDefault();
        if (confirm('清除所有数据？此操作不可恢复！')) {
            Helper.functions.db_clear();
        }
    });

    $(".wb-trash").closest('.dropdown-item').off("click").on("click", function (e) {
        e.preventDefault();
        Helper.functions.remove_many('id_table');
    });


    $("#id_upload_json").change(function (e) {
        e.preventDefault();
        Helper.functions.show_msg("id_err_message", wait_text);
        let file = e.target.files[0];
        Helper.functions.import_cxf(file).then(function (res) {
            let msg = "恭喜，共计导入<span class='red-600'>" + res.items.length + "</span> 条数据！";
            $("#id_start_url").val(res.config.start_url ? res.config.start_url : '');
            $("#id_crawl_children").prop("checked", res.config.include_children);
            init_table({'items': res.items, 'config': res.config});
            Helper.functions.show_msg("id_err_message", msg);
        }).catch(function (err) {
            Helper.functions.show_msg("id_err_message", err, 'error', true);
        });
    });


    $("#id_btn_get_details").off("click").on("click", function (e) {
        e.preventDefault();
        scrollTo(0, 0);
        API.APP.valid_user().then(function () {
            let limit = $("#id_limit").val();
            let thread = 1;
            if (limit && Helper.validator.isInt(limit)) {
                thread = parseInt(limit);
            }
            gen_jobs(thread).then(function (tasks) {
                $(e.target).text('数据下载中...');
                parse_details(tasks, thread);
            });
            setTimeout(update_process, 1000);
        });
    });
    $("#id_btn_seller_request").off("click").on("click", function (e) {
        e.preventDefault();
        API.APP.valid_user().then(function () {
            valid_task().then(function (task) {
                sync_sellers();
            }).catch(function () {
                display_tips('id_err_message', '无可用的数据！', 'error', 100);
            })
        });
    });

    $(".icon.fa-file-excel-o").closest('.dropdown-item').off('click').on("click", function (e) {
        e.preventDefault();
        Helper.functions.show_msg('id_err_message', wait_text, 'success', true);
        valid_task().then(function (task) {
            Helper.functions.to_csv(task).then(function () {
                Helper.functions.show_msg("id_err_message", '导出成功，共导出' + task.items.length + '条数据！');
            }).catch(function () {
                Helper.functions.show_msg("id_err_message", '导出失败！', 'error', true);
            });
        })


    });
    $(".fa-file-archive-o").closest('.dropdown-item').off('click').on("click", function (e) {
        e.preventDefault();
        API.APP.valid_user().then(function () {
            Helper.functions.show_msg("id_err_message", wait_text);
            valid_task().then(function (task) {
                Helper.functions.to_cxf(task).then(function () {
                    Helper.functions.show_msg("id_err_message", '导出成功，共导出' + task.items.length + '条数据！');
                }).catch(function () {
                    Helper.functions.show_msg("id_err_message", '导出失败', 'error');
                });
            });
        }).catch(function () {
            Helper.functions.show_msg("id_err_message", '无效的用户！', 'error');
        });
    });


    $('#id_marketplace').change(function (e) {
        let marketplaceId = $(e.target).val();
        if (marketplaceId) {
            Helper.functions.swich_zipcode('id_zipcode', marketplaceId);
        }
    });
    $('#id_start_url').on('blur', function (e) {
        let task_type = $('#id_input_type').val();
        if (task_type == 'link') {

            let url = $(e.target).val();
            if (url) {
                const uri = new URL(url);
                let marketplaceId = Helper.functions.get_marketplaceId_by_domain(uri.host);
                if (marketplaceId) {
                    Helper.functions.swich_zipcode('id_zipcode', marketplaceId);
                }
            }
        }
    });


//下载详情到本地
    $('.icon.fa-cloud-upload').closest('a').off("click").on("click", function (e) {
        e.preventDefault();
        //Helper.functions.show_msg("id_err_message", wait_text);
        $('#task_form_modal').modal('show');
    });


    $('.icon.fa-download').closest('a').off("click").on("click", function (e) {
        e.preventDefault();
        $('#task_download_modal').modal('show');
    });

    $('#task_download_modal').off('shown.bs.modal').on('shown.bs.modal', function (e) {


        let target = $(e.target);
        target.find('.btn.btn-primary').text('提交').off('click').on('click', function (ee) {


            let taskId = target.find("#id_task_Id").val();

            if (/\d+/.test(taskId)) {

                taskId = parseInt(taskId);
            }

            Helper.functions.get_config().then(function (config) {
                config['taskId'] = taskId;
                Helper.functions.save_config(config).then(function (conf) {

                    if (conf.taskId) {
                        let page = 1;
                        let limit = 500;

                        execute_download(page, limit, taskId);

                    }
                });

            });
        });
        target.find(".btn.btn-default").on('click', function (ee) {

            e.preventDefault();

            that.modal('hide');

        });
    });


    $('#task_form_modal').off('shown.bs.modal').on('shown.bs.modal', function (e) {
        let that = $(e.target);
        $('#id_err_container').html('');
        Helper.functions.get_config().then(function (conf) {
            if (conf.task_name) {
                that.find('#id_task_name').val(conf.task_name);
            }
        });
        that.find('.btn.btn-primary').text('提交').off('click').on('click', function (ee) {
            Helper.functions.get_config().then(function (config) {
                if (config.submitted == true && config.taskId) {
                    if (confirm('该数据已经全部提交，你要重复提交吗？')) {
                        submit_to_cloud(ee);
                    }
                } else {
                    submit_to_cloud(ee);
                }
            });
        });
        that.find(".btn.btn-default").on('click', function (e) {

            e.preventDefault();

            that.modal('hide');

        });
    });


    $('.icon.fa-refresh').off("click").on("click", function (e) {
        e.preventDefault();
        let target = $(e.target).data().target;

        if (target == 'cloud') {
            $(e.target).prev('h6').html('计算中...');
            refresh_cloud_status('id_cloud_progress_bar');
        } else {
            $(e.target).prev('h6').html('计算中...');
            refresh_local_status();
        }
    });


    $('.icon.fa-cloud-download').closest('a').off("click").on("click", function (e) {
        e.preventDefault();
        //Helper.functions.show_msg("id_err_message", wait_text);
        download_from_cloud(e);
    });

    $('#id_captcha_modal').on('hidden.bs.modal', function (e) {
        $(e.target).find("form").attr('action', '');
        $(e.target).find('img').attr("src", '');
        $(e.target).find("input[name='amzn']").val('');
        $(e.target).find("input[name='amzn-r']").val('');
    });

    $('#id_btn_stop').on('click', function (e) {

        let $button = $(e.target);
        Helper.functions.get_config().then(function (config) {
            if (config['paused'] === false) {
                config['paused'] = true;
                Helper.functions.save_config(config).then(function (conf) {
                    if (conf.paused === true) {
                        //Helper.functions.show_msg('id_err_message', '操作成功！');
                        $button.text('继续');
                    }
                });
            } else if (config['paused'] === true) {

                Helper.functions.get_config().then(function (c) {
                    let start_url = c.next_url ? c.next_url : c.url;

                    c['paused'] = false;
                    $button.text('停止');

                    Helper.functions.save_config(c).then(function () {

                        if (c.paused === false) {
                            fetch(start_url);
                        }
                    });
                });
            }
        })
    });


//新增项
    $(".form-group button[data-toggle='addNewRow']").bind("click", function (e) {
        e.preventDefault();
        var tpl = $(this).parent().next(".form-group").html();
        var newRow = $("<div class='form-group'></div>").append(tpl);
        $(this).closest(".form-inline").find(".form-group-container").append(newRow).off("click").on("click", ".icon.wb-trash", function (e) {
            e.preventDefault();
            $(this).closest(".form-group").remove();
        });
    });


//更新图表
    $(".form-group button[data-toggle='update']").bind("click", function (e) {
        e.preventDefault();
        valid_task().then(function (task) {
            let items = task.items;
            let data_type = $(e.target).data("type");
            let groups = [];
            var arrGroup = [];
            var $group = $(e.target).closest(".form-inline").find(".form-group:visible");
            var _et;
            for (var i = 0; i < $group.length; i++) {
                var $inputs = $($group[i]).find("input[type='text']");
                if ($inputs.length != 2) {
                    continue;
                }
                var $st = $inputs.eq(0);
                var $et = $inputs.eq(1);

                min = $st.val();
                max = $et.val();
                if (isNaN(min)) {
                    $st.focus();
                    return;
                } else {
                    min = data_type == "reviews" ? parseInt(min) : parseFloat(min);
                }
                if (isNaN(max)) {
                    $et.focus();
                    return;
                } else {
                    max = data_type == "reviews" ? parseInt(max) : parseFloat(max);
                }
                if (max < min) {
                    $et.focus();
                    return;
                }
                groups.push({"min": min, "max": max});
            }
            let chart_data = [];
            if (data_type == "reviews") {
                for (let x in groups) {
                    if (x >= 0) {
                        var range = items.filter((item) => {
                            let arr = groups[x];
                            return item.reviews_nb >= arr.min && item.reviews_nb <= arr.max;
                        });
                        //reviews_data.push({"label": reviews_labels[x].min + "~" + reviews_labels[x].max, "value": range.length});
                        chart_data.push({"min": groups[x].min, "max": groups[x].max, "count": range.length});
                    }
                }
                //distribute_create('id_reviews_pie_chart', task, chart_data, '评论数');
            } else if (data_type == "price") {
                for (let x in groups) {
                    if (x >= 0) {
                        var range = items.filter((item) => {
                            let arr = groups[x];
                            return item.price >= arr.min && item.price <= arr.max;
                        });
                        chart_data.push({"min": groups[x].min, "max": groups[x].max, "count": range.length});
                    }
                }
            } else if (data_type == 'rating') {
                for (let x in groups) {
                    if (x >= 0) {
                        var range = items.filter((item) => {
                            let arr = groups[x];
                            return item.rating >= arr.min && item.rating <= arr.max;
                        });
                        chart_data.push({"min": groups[x].min, "max": groups[x].max, "count": range.length});
                    }
                }
            } else if (data_type == 'qa') {
                for (let x in groups) {
                    if (x >= 0) {
                        var range = items.filter((item) => {
                            let arr = groups[x];
                            return item.qa >= arr.min && item.qa <= arr.max;
                        });
                        chart_data.push({"min": groups[x].min, "max": groups[x].max, "count": range.length});
                    }
                }
            }
            let chart_container_id = $(e.target).closest(".row").find(".chart-container").attr("id");
            let table_container = $(e.target).closest(".row").find(".table-container");
            createStatTable(table_container, task, chart_data);
            InitiatePieChart.init(chart_container_id, chart_data);
        })
    });


}


function page_reload() {
    valid_task().then(function (task) {

        task = filter(task);
        $('#id_err_message').hide();
        let config = task['config'];
        if (config && Object.keys(config).length > 0) {

            if (task.config.next_url) {
                $('#id_btn_stop').text('继续').show();
            }
            $('#id_view_toogle').prop('checked', task.config.is_full_columns);
            $("#id_start_url").val(config.input_value);
            $("#id_input_type").val(config.input_type);
            if (config.input_type == '0') {
                $('#id_marketplace').closest('.form-group').show();
                $('#id_marketplace').val(config.marketplaceId).trigger('change');
            } else {
                $('#id_marketplace').closest('.form-group').hide();
            }

            $("#id_max_page").val(config.max_page);
        }
        let categories_0 = [];
        let categories_1 = [];


        let uncompleted_items_count = task.uncompleted

        let max_price = 0;
        let min_price = 10000000;
        let max_reviews_nb = 0;
        let min_reviews_nb = 10000000;


        let fba_count = 0;
        let price_total = 0;
        let reviews_nb_total = 0;
        let rating_total = 0;

        let total_valid_records = 0;
        let newer_products_count = 0;
        let total_records = task.items.length;


        let brand_dic = {};
        // let seller_dic = {};
        //
        //
        // let cn_seller_ids = [];
        //
        let all_brands = [];
        //
        // let all_seller_ids = [];
        //
        //
        // let amazon_self_ids = [];
        //
        //
        // let brand_store_seller_ids = [];


        task.items.forEach(function (row) {
            if (row.price > max_price) {
                max_price = row.price;
            }
            if (row.price > 0 && row.price < min_price) {
                min_price = row.price;
            }
            if (row.price > 0 && row.reviews_nb > max_reviews_nb) {
                max_reviews_nb = row.reviews_nb;
            }
            // if (row.price > 0 && row.reviews_nb < min_reviews_nb) {
            //     min_reviews_nb = row.reviews_nb;
            // }
            if (row.price > 0 && row.fba) {
                fba_count++;
            }
            if (row.price > 0) {
                total_valid_records++;
            }

            if (row.price > 0) {
                price_total += row.price;
                reviews_nb_total += row.reviews_nb;
                rating_total += row.rating;
            }
            if (row.rating == 0 && row.reviews_nb == 0) {
                newer_products_count++;
            }


            let brand = row.brand;

            if (brand && all_brands.indexOf(brand) == -1) {
                all_brands.push(brand);
            }
            let rank_info = row.rank_info;
            if (rank_info && rank_info.length > 0) {
                for (let idx in rank_info) {
                    if (idx >= 0) {
                        let item = rank_info[idx];

                        let rank_category_name = item.rank_category_name;
                        if (!rank_category_name) {
                            continue;
                        }
                        if (idx == 0) {
                            if (categories_0.indexOf(rank_category_name) == -1) {
                                categories_0.push(rank_category_name);
                            }
                        } else {
                            if (categories_1.indexOf(rank_category_name) == -1) {
                                categories_1.push(rank_category_name);
                            }
                        }
                    }
                }
            }
        });


        Helper.functions.display_percent_text('id_progress_bar', '本地详情下载进度', task.completed, task.items.length);

        //统计
        $("#id_listings_count").html(Helper.number.formatToString(total_valid_records));
        $("#id_fba_percent").html(((fba_count / total_valid_records) * 100).toFixed(2) + '%');

        $("#id_highest_price").html(max_price);
        $("#id_lowest_price").html(min_price);
        $("#id_avg_price").html((price_total / total_valid_records).toFixed(2));

        $("#id_avg_reviews_nb").html(Helper.number.formatToString((reviews_nb_total / total_valid_records).toFixed(2)));

        if (max_reviews_nb) {
            max_reviews_nb = Helper.number.formatToString(max_reviews_nb);
        }
        $("#id_max_reviews_nb").html(max_reviews_nb);
        $("#id_avg_reviews_nb").html((reviews_nb_total / total_valid_records).toFixed(0));

        $("#id_avg_rating").html((rating_total / total_valid_records).toFixed(2));
        $("#id_avg_rating").html((rating_total / total_valid_records).toFixed(2));

        $("#id_no_reviews_percent").html(((newer_products_count / total_valid_records) * 100).toFixed(2) + '%');


        //大分类
        let $id_category_0 = $("#id_rank_category_0");
        $id_category_0.empty().append('<option value="">所有类目</option>');

        $id_category_0.append('<option value="-1">大类目排名为空</option>');
        $id_category_0.append('<option value="1">大类目排名不为空</option>');


        categories_0.sort();
        categories_0.forEach(function (item) {
            $id_category_0.append('<option value="' + item + '">' + item + '</option>');
        });
        $id_category_0.selectpicker().parent('div').css('border', "1px solid #e4eaec");


        //子分类
        let $id_category_1 = $("#id_rank_category_1");
        $id_category_1.empty().append('<option value="">所有类目</option>');
        categories_1.sort();
        categories_1.forEach(function (item) {
            $id_category_1.append('<option value="' + item + '">' + item + '</option>');
        });
        //表格
        init_table(filter(task));

        refresh_cloud_status('id_cloud_progress_bar');


        init_distribute_data(task);

    }).catch(function (error) {
        display_tips('id_err_message', '暂无数据！', 'loading', 100);
    }).finally(function (x) {
        //event_binder();
    });
}


function create_stat_table(id, columns, data) {

    $('#' + id).DataTable({
        language: CONST.datatables_lang,
        destroy: true,
        "bPaginate": true, //翻页功能
        "bLengthChange": true, //改变每页显示数据数量
        "bFilter": true, //过滤功能
        "bSort": true, //排序功能
        "bInfo": true,//页脚信息
        "bAutoWidth": true,//自动宽度
        "dom": ' <"search"f><"top"l>rt<"bottom"ip><"clear">',
        "order": [[2, "desc"], [0, "asc"]],
        data: data,
        columns: columns,
        //columnDefs: [{"targets": 3, "visible": false}]
    });


}


function gen_jobs(limit = 10) {
    return new Promise(function (resolve, reject) {
        let records_total = 0;
        let collection = window.db.items.where('completed')
            .equals(0)
            .limit(limit);
        let tasks = [];
        collection.toArray(function (array) {
            tasks = array;
            resolve(tasks);
        });
    });
}


function valid_task() {

    var start = performance.now();
    return new Promise(function (resolve, reject) {


        window.db.items.toArray(function (array) {
            let items = array;


            var obj = {};
            let results = items.reduce(function (item, next) {
                obj[next.asin] ? '' : obj[next.asin] = true && item.push(next);
                return item;
            }, []);


            let completed = 0;
            for (let idx in results) {
                let item = results[idx];

                if (item.completed == 1) {
                    completed++;
                }
                let rank_info = item.rank_info;
                if (!rank_info) {
                    item['rank_number'] = ''
                    item['rank_category'] = ''
                    item['rank_number_1'] = '';
                    item['rank_category_1'] = '';
                    item['rank_number_2'] = '';
                    item['rank_category_2'] = '';
                    item['rank_number_3'] = '';
                    item['rank_category_3'] = '';
                    continue;
                }

                if (rank_info.length == 1) {
                    item['rank_number'] = Helper.validator.toInt(rank_info[0].rank_category_number);
                    item['rank_category'] = rank_info[0].rank_category_name;
                } else if (rank_info.length == 2) {
                    item['rank_number'] = Helper.validator.toInt(rank_info[0].rank_category_number);
                    item['rank_category'] = rank_info[0].rank_category_name;
                    item['rank_number_1'] = Helper.validator.toInt(rank_info[1].rank_category_number);
                    item['rank_category_1'] = rank_info[1].rank_category_name;
                } else if (rank_info.length == 3) {
                    item['rank_number'] = Helper.validator.toInt(rank_info[0].rank_category_number);
                    item['rank_category'] = rank_info[0].rank_category_name;
                    item['rank_number_1'] = Helper.validator.toInt(rank_info[1].rank_category_number);
                    item['rank_category_1'] = rank_info[1].rank_category_name;
                    item['rank_number_2'] = Helper.validator.toInt(rank_info[2].rank_category_number);
                    item['rank_category_2'] = rank_info[2].rank_category_name;
                } else if (rank_info.length == 4) {
                    item['rank_number'] = Helper.validator.toInt(rank_info[0].rank_category_number);
                    item['rank_category'] = rank_info[0].rank_category_name;
                    item['rank_number_1'] = Helper.validator.toInt(rank_info[1].rank_category_number);
                    item['rank_category_1'] = rank_info[1].rank_category_name;
                    item['rank_number_2'] = Helper.validator.toInt(rank_info[2].rank_category_number);
                    item['rank_category_2'] = rank_info[2].rank_category_name;
                    item['rank_number_3'] = Helper.validator.toInt(rank_info[3].rank_category_number);
                    item['rank_category_3'] = rank_info[3].rank_category_name;
                }
            }
            let task = {};
            task['items'] = results;

            task['completed'] = completed;
            task['uncompleted'] = results.length - completed;
            Helper.functions.get_config().then(function (config) {
                task['config'] = config;
                resolve(task);
            });
        });
    });
}

function batch_request(data) {


    return new Promise(function (resolve, reject) {


        let tasks = [];
        let urls = [];
        $.each(data, function (i, task) {
            tasks.push(Helper.request.get(task.url));
            urls.push(task.url);
        });
        let success = 0;
        let failed = 0;
        Helper.functions.allSettled(tasks, urls).then(function (res) {
            // return new Promise(function (resolve, reject) {

            $.each(res, function (i, task) {
                if (task.status == 'fulfilled') {
                    let html = task.value;
                    if (html.indexOf("captchacharacters") > -1) {
                        failed++;
                    } else {
                        success++;
                    }
                } else {
                    if (task.code == 404) {
                        success++;
                    }
                }
            });
            if (failed > 0 || tasks.length != success) {
                reject();
            } else {
                $.each(res, function (i, task) {
                    let html = task.value;
                    let url = task.url;
                    let code = task.code;
                    if (code == 200) {
                        API.Amazon.detail_page_parse(html, task.url).then(function (res) {
                            if (res.result == 1) {
                                data = res.asin_data;
                                let asin = data.asin;

                                let change = {}

                                if (data.qa) {
                                    change['qa'] = data.qa;
                                }
                                if (data.rating && /[0-9.]+/.test(data.rating)) {
                                    change['rating'] = data.rating
                                }

                                if (data.marketplaceId) {
                                    change['marketplaceId'] = data.marketplaceId;
                                }
                                if (data.brand) {
                                    change['brand'] = data.brand;
                                }
                                if (data.seller) {
                                    change['seller'] = data.seller;
                                }
                                if (data.sellerId) {
                                    change['sellerId'] = data.sellerId;
                                }
                                if (data.product_weight) {
                                    change['product_weight'] = data.product_weight;
                                }

                                if (data.product_size) {
                                    change['product_size'] = data.product_size;
                                }
                                if (data.features && data.features.length > 0) {
                                    change['features'] = data.features;
                                }
                                if (data.available_date) {
                                    change['available_date'] = data.available_date;
                                }

                                if (data.brand_store) {
                                    change['brand_store'] = data.brand_store;
                                }
                                if (data.brand_store_url) {
                                    change['brand_store_url'] = data.brand_store_url;
                                }
                                if (data.rank_info) {
                                    change['rank_info'] = data.rank_info;
                                }

                                if (data.fba) {
                                    change['fba'] = data.fba;
                                }
                                change['completed'] = 1;


                                window.db.items.where("asin").equals(asin).modify(change);

                            }
                        });
                    } else if (code == 404) {

                        let asin = Helper.functions.get_asin_from_url(url);
                        if (asin) {
                            window.db.items.where("asin").equals(asin).modify(function (value) {
                                this.value['completed'] = 1;
                                this.value['code'] = 404;
                            });
                        }
                    }
                });
                resolve();

            }
        });
    });
}


function parse_details(jobs, thread) {
    if (jobs && jobs.length > 0) {
        jobs.forEach(function (job) {
            if (!job.domain) {
                job['domain'] = job.baseUrl;
            }
            job['url'] = 'https://' + job.domain + '/dp/' + job.asin + '?th=1&psc=1';
        });
        batch_request(jobs).then(function () {
            gen_jobs(thread).then(function (tasks) {
                parse_details(tasks, thread);
            });

        }).catch(function () {
            let text = '检测到验证码，请稍后再试';
            Helper.functions.show_msg(msg_container, text, 'error', true);
        })
    }
}


function fetch(url) {
    if (!url) {
        return;
    }
    Helper.functions.get_config().then(function (config) {


        if (config.paused === true) {
            setTimeout(function () {
                Helper.functions.set_config_value('next_page', url);
                Helper.functions.show_msg('id_err_message', '已经停止！');

            }, 3000);

        } else {
            let max_page_count = config.max_page;
            Helper.request.get(url).then(function (html) {
                if (html.indexOf('captchacharacters') > -1) {
                    return new Promise(function (resolve, reject) {
                        const uri = new URL(url);

                        Helper.functions.set_config_value('last_url', url);
                        display_captcha(uri, html);
                        reject({'reason': 'captcha'});
                    });
                } else {
                    return {'html': html, 'url': url};
                }
            }).then(function (res) {
                API.Amazon.search_page_parse(res.url, res.html).then(function (result) {
                    let data = result.data;
                    let next_page_url = result.next_page_url;
                    let current_page = result.current_page;
                    if (data && data.length > 0) {
                        $('#id_table').bootstrapTable('prepend', data);
                        for (let i = data.length - 1; i >= 0; i--) {
                            let item = data[i];
                            item['id'] = Helper.string.uuid();
                            item['completed'] = 0;
                            item["brand"] = !item.brand ? '' : item.brand;
                            item["qa"] = 0;
                            item["seller"] = '';
                            item["sellerId"] = '';
                            item["product_weight"] = '';
                            item["available_date"] = '';
                            item["category"] = [];
                            item["rank_info"] = [];
                        }
                    }
                    if (data && data.length > 0) {

                        window.crawled_pages_count++;
                        let finished = false;
                        window.db.items.bulkPut(data).then(function () {
                            Helper.functions.set_config_value('last_url', res.url);
                            if (window.crawled_pages_count < max_page_count || max_page_count == 0) {
                                if (next_page_url) {
                                    Helper.functions.set_config_value('next_url', next_page_url);
                                    Helper.functions.get_data_count().then(function (count) {
                                        let msg = "<span>请勿刷新网页...,已存储<span class='red-600'>" + count + "</span> 条数据</span><div style='display: block'>正在下载页面:" + next_page_url + "</div>";
                                        Helper.functions.show_msg('id_err_message', msg);
                                    });
                                    fetch(next_page_url);
                                } else {
                                    finished = true;
                                }
                            } else {
                                finished = true;
                            }
                            if (finished) {
                                window.db.items.count(function (count) {
                                    if (count == 0) {
                                        display_tips('id_err_message', '已完成下载，但未下载到任何数据，请检查链接！');

                                    } else {
                                        Helper.functions.set_config_value('next_url', '');
                                        $('#id_btn_stop').hide();
                                        display_tips('id_err_message', '<i class=\'icon fa-check\'></i>️已完成下载！共' + count + '条产品', 'success');
                                    }
                                });
                            }
                        });
                    } else if (next_page_url) {
                        fetch(next_page_url)
                    }
                });
            }).catch(function (err) {

                if (err.reason != 'captcha') {
                    fetch(url);
                }
            });
        }
    });
}


function start_crawl() {
    let url = '';
    let marketplaceId = '';
    let domain = '';

    window.crawled_pages_count = 0;

    let conf = {};


    let $err_container = $("#id_err_message");
    $err_container.hide();
    let input_type = $("#id_input_type").val();
    let input_value = $("#id_start_url").val();
    let max_page_count = $("#id_max_page").val();
    if (input_type == '1') {
        if (!input_value) {
            display_tips('id_err_message', '请输入起始链接!');
            return;
        }
        if (!CONST.re_url.test(input_value)) {
            display_tips('id_err_message', '无效的连接!');
            return;
        }
        url = input_value;
        domain = new URL(input_value).host;
        marketplaceId = Helper.functions.get_marketplaceId_by_domain(new URL(input_value).host);


        let marketplace_code = Helper.functions.get_marketplace_code_by_marketplaceId(marketplaceId);

        conf['url'] = input_value;
        conf['domain'] = domain;
        conf['marketplaceId'] = marketplaceId;
        conf['input_type'] = input_type;
        conf['marketplace_code'] = marketplace_code;
        conf['input_value'] = input_value;
        conf['max_page'] = max_page_count;
        conf['next_url'] = input_value;
        conf['paused'] = false;

    } else if (input_type == '0') {
        marketplaceId = $("#id_marketplace option:checked").val();
        if (marketplaceId) {
            domain = Helper.functions.get_domain_by_marketplaceId(CONST.iso_countries, marketplaceId);
            url = 'https://' + domain + "/s?k=" + encodeURIComponent(input_value) + "&ref=nb_sb_noss_1"
        }

        let marketplace_code = Helper.functions.get_marketplace_code_by_marketplaceId(marketplaceId);

        conf['url'] = url;
        conf['domain'] = domain;
        conf['marketplaceId'] = marketplaceId;
        conf['marketplace_code'] = marketplace_code;
        conf['max_page'] = max_page_count;
        conf['next_url'] = url;
        conf['input_type'] = input_type;
        conf['input_value'] = input_value;
        conf['paused'] = false;
    }
    try {
        if (!/^www\.amazon.(com|ca|com\.mx|com\.br|co\.uk|de|fr|it|es|nl|co\.jp|in|com\.au|sg|sa|ae)$/.test(domain)) {
            display_tips('id_err_message', '请选择市场!');
            return;
        }
    } catch (e) {
        display_tips('id_err_message', '不支持的URL!');
        return;
    }


    Helper.functions.save_config(conf).then(function (config) {
        let start_url = config.url;
        $('#id_btn_stop').show(500);
        fetch(start_url);
    });

}


function display_captcha(uri, html) {
    const $doc = $(html);
    let captcha_url = $doc.find("img[src*='captcha']").attr('src');
    let amzn = $doc.find("input[name='amzn']").val();
    let amzn_r = $doc.find("input[name='amzn-r']").val();
    let post_url = $doc.find("form").attr("action");
    //let data = {'url': post_url, 'captcha_url': captcha_url, 'amzn': amzn, 'amzn_r': amzn_r};


    let $target = $doc.find("#id_captcha_modal");
    $target.find("form").attr('action', 'https://' + uri.host + post_url);
    $target.find('img').attr("src", captcha_url);
    $target.find("input[name='amzn']").val(amzn);
    $target.find("input[name='amzn-r']").val(amzn_r);
    $target.find('button.btn.btn-primary').on('click', function (e) {
        $(e.target).closest('form').submit();
        $target.modal('hide');
    });
    $target.modal('show');
}

function init_table(task) {

    let pageIndex = $.cookie('pageIndex') ? parseInt($.cookie('pageIndex')) : 1;
    let pageSize = $.cookie('top100_pagesize') ? parseInt($.cookie('top100_pagesize')) : 30;

    let column_type = task.config.is_full_columns ? full_columns : simple_columns;


    let $table = $("#id_table");
    $table.bootstrapTable('destroy').bootstrapTable({
        // striped: true,
        // cache: true,
        // //toolbar: '#toolbar',
        // pagination: true,
        // sortable: true,
        // sortOrder: "asc",
        // sidePagination: "client",
        // pageNumber: 1,
        // pageSize: Helper.cookies.get_cookies_page_size('listing'),
        // pageList: [20, 40, 60, 80, 100, 200, 500, 1000],
        // minimumCountColumns: 2,
        // //height: 500,
        // cardView: false,
        // //showRefresh:true,
        // showColumns: true,
        // detailView: false,
        // paginationVAlign: 'both',
        //
        // silent: true,
        // columns: is_full_column ? full_columns : column_type,
        //
        // onLoadError: function () {
        //     return "";
        // },
        // formatLoadingMessage: function () {
        //     return "";
        // },
        // formatNoMatches: function () {
        //     //return '无数据';
        // },
        //
        // onPageChange: function (pageIndex, pageSize) {
        //
        //     Helper.cookies.set_cookies('listing', pageSize, 30);
        //
        // },


        striped: true,
        cache: true,
        //toolbar: '#toolbar',
        pagination: true,
        sortable: true,
        sortOrder: "asc",
        sidePagination: "client",
        pageNumber: pageIndex,
        //pageSize: Helper.cookies.get_cookies_page_size('top100_pagesize'),
        pageSize: pageSize,
        pageList: [20, 30, 40, 50, 60, 80, 100, 200, 500, 1000, 2000],
        minimumCountColumns: 2,
        //height: 800,
        cardView: false,
        //showRefresh:true,
        paginationVAlign: 'both',
        showColumns: true,
        detailView: false,
        silent: true,
        columns: column_type,
        onLoadError: function () {
            return "";
        },
        formatLoadingMessage: function () {
            return "";
        },
        formatNoMatches: function () {
            return '暂无数据';
        },
        onPageChange: function (pageIndex, pageSize) {

            $.cookie('top100_pagesize', pageSize);
            $.cookie('pageIndex', pageIndex);
        },
        onColumnSwitch: function (field, check) {
            $.cookie(field, check);
        }

    }).on('post-body.bs.table', function () {
        Helper.functions.lazyload("img.lazy");

        $("input[name='available_date']").off('blur').on('blur', function (e) {
            let input_val = $(e.target).val();
            if (/^\d{4}\/\d{2}\/\d{2}$/.test(input_val)) {
                //if (confirm('确定要修改为：' + input_val + ' 吗？该操作不可撤销！')) {
                let asin = $(e.target).closest('tr').find("input[name='hidden_asin']").val();
                if (asin) {
                    window.db.items.where("asin").equals(asin).modify(function (value) {
                        this.value['available_date'] = input_val;
                    });
                }
                //}
            }
        });


        $("select[name='sel_countries']").change(function (e) {


            e.preventDefault();

            let $this = $(e.target);
            let country_code = $this.val();
            let country_zh = $this.find("option:selected").text();
            if (confirm("您选择的国家是：" + country_zh + "。确定修改吗？ 该操作不可撤销！")) {
                let sellerId = $this.closest('tr').find("input[name='hidden_sellerId']").val();
                if (sellerId) {
                    window.db.items.where("sellerId").equals(sellerId).modify(function (value) {
                        this.value['country_code'] = country_code;
                        this.value['country_zh'] = country_zh;
                    });
                } else {
                    let asin = $this.closest('tr').find("input[name='hidden_asin']").val();
                    if (asin) {
                        window.db.items.where("asin").equals(asin).modify(function (value) {
                            this.value['country_code'] = country_code;
                            this.value['country_zh'] = country_zh;
                        });
                    }
                }
            } else {
                e.target.selectedIndex = 0;
            }
        });

        $("input[name='status']").change(function (e) {

            let $this = $(e.target);
            let asin = $this.closest('tr').find("input[name='hidden_asin']").val();
            if (asin) {
                window.db.items.where("asin").equals(asin).modify(function (value) {
                    this.value['completed'] = 0;
                    $this.parent().html("x");
                });
            }
        });


        $(".icon.wb-trash").off('click').on('click', function (e) {
            e.preventDefault();
            let id = $(e.target).closest('tr').find("input[name='item_id']").val();
            Helper.functions.remove_one('id_table', e, [id]);
        });


        $(".icon.fa-chain-broken").closest('.dropdown-item').off("click").on("click", function (e) {
            e.preventDefault();
            var selRows = $("#id_table").bootstrapTable("getSelections");
            if (selRows.length == 0) {
                return;
            }
            var asins = [];
            $.each(selRows, function (i) {
                asins.push(this.asin);
            });
            batch_modify_asins(asins).then(function () {
                page_reload();

            });
        });


        $("tr[data-index]").dblclick(function (e) {
            e.preventDefault();
            let $input = $(e.target).closest('tr').find("input[name='btSelectItem']");
            //$input.prop("checked", !$input.prop("checked"));
            $input.click();
        });


    });


    var obj = {};
    let results = task.items.reduce(function (item, next) {
        obj[next.asin] ? '' : obj[next.asin] = true && item.push(next);
        return item;
    }, []);


    $table.bootstrapTable('load', results);


}


function batch_modify_asins(asins) {


    return new Promise(function (resolve, reject) {
        let counter = 0;
        for (let idx in asins) {
            let asin = asins[idx];
            window.db.items.where("asin").equals(asin).modify(function (value) {
                this.value['completed'] = 0;


            }).then(function () {
                counter++;
                if (counter == asins.length) {
                    resolve();
                }
            });
        }
    });
}


//根据cookie显示隐藏显示列
function remember(name) {
    //获取cookie的值
    var cookieVal = $.cookie(name); //读取name为visibleVal的值
    //如果没有设置cookie
    if (cookieVal == undefined) {
        //设置几个默认值
        if (name == "product_weight") {
            return false;
        }
        if (name == "product_size") {
            return false;
        }
        if (name == "completed") {
            return false;
        }
        if (name == 'country_code') {
            return false;
        }
    } else {
        //如果有返回true,否则返回false
        if (($.cookie(name)) == "true") {
            return true
        } else {
            return false
        }
    }
}


function init_words_frequence(task, words_type) {

    task = filter(task);

    let data = [];
    $("#id_words_fr").show();
    $.each(task.items, function (i, row) {


        row.title = row.title.replace("&amp;", '  ');
        row.title = row.title.replace(/\s+/, ' ');
        row.title = row.title.replace(/\|+/g, '');
        if (words_type == 'title') {
            let title = row.title;
            data.push({"title": title});
        } else if (words_type == 'canonical') {
            let productUrl = row.productUrl;
            if (row.sponsored) {
                productUrl = decodeURIComponent(row.productUrl);
            }
            let kw = '';
            if (/\/[0-9a-zA-Z-%]+\/dp\//.test(productUrl)) {
                let match = productUrl.match(/\/([0-9a-zA-Z-%]+)\/dp\//);
                if (match) {
                    kw = match[1];
                    kw = decodeURIComponent(kw);
                    kw = kw.replace(/\-/g, ' ');
                }
            }
            if (kw) {
                data.push({"canonical": kw});
            }
        } else if (words_type == 'features') {

            let features = row.features;
            if (!features) {
                features = [];
            }
            data.push({"features": features});
        }
        //console.log(row.title);
    });
    display_words_frequency_table(data, words_type);


    $("button[data-role]").on("click", function (e) {

        valid_task().then(function (task) {

            task = filter(task);
            let $this = $(e.target);
            $this.siblings().removeClass("btn-outline").addClass("btn-outline");
            $this.removeClass("btn-outline");
            let action = $this.data("role");
            if (action == 'canonical') {
                init_words_frequence(task, 'canonical');
            } else if (action == 'title') {
                init_words_frequence(task, 'title');
            } else if (action == 'features') {
                init_words_frequence(task, 'features');
            }
        });
    });


}

function display_words_frequency_table(rows, words_type) {


    var $current_panel = $(".tab-pane.active.show");


    //action = action == "" ? 'title' : action;

    if (rows && rows.length > 0) {

        //var $current_panel = $(".tab-pane.active.show");
        //$current_panel.find("button[name='name_apply']").off("click").text("加载中...");


        //var tokens = $("input[name='tokenfield']").tokenfield('getTokens');


        let tokens = [];

        let ignore_words = [];

        let words = [];

        for (let row of rows) {

            //let text = action == 'title' ? row.title : row.feature;


            if (words_type == "title") {
                let title = row.title.replace(" & ", ' ');
                words.push(title);
            } else if (words_type == "features") {
                words.push(row.features.join(" "));
            } else if (words_type == 'canonical') {
                words.push(row.canonical);
            }
        }


        let long_text = words.join(" ");

        long_text = Helper.string.replace_words_frequency_bad_chars(long_text);


        $.each(tokens, function (i, item) {
            var _word = item.label.toLowerCase();
            if (_word && ignore_words.indexOf(_word) == -1) {
                ignore_words.push(_word);
            }
        });

        for (let _word of ignore_words) {
            var pat = new RegExp("\\s" + _word + "\\s", "gi");

            long_text = long_text.replace(pat, " ");
        }

        let $table_1 = $(".words_table_1");
        let $table_2 = $(".words_table_2");
        let $table_3 = $(".words_table_3");
        let $table_4 = $(".words_table_4");
        let $table_5 = $(".words_table_5");


        init_words_frequency('words_table_1', long_text, words_type == 'features' ? 5 : 1);

        init_words_frequency('words_table_2', long_text, words_type == 'features' ? 4 : 2);

        init_words_frequency('words_table_3', long_text, words_type == 'features' ? 3 : 3);

        init_words_frequency('words_table_4', long_text, words_type == 'features' ? 2 : 4);

        init_words_frequency('words_table_5', long_text, words_type == 'features' ? 1 : 5);


    }


}

function init_words_frequency(cls_name, text, n) {


    var items = [];
    var wc = Helper.array.wordsmap(text, n);
    var words = 0;
    for (var i in wc) {
        console.log(wc[i][1])
        words += (/\d+/.test(wc[i][1])) ? parseInt(wc[i][1]) : 0;
    }
    var maxlines = 2000;
    wc = wc.slice(0, maxlines);

    //obj.count=wc.length;
    for (var i in wc) {

        var fs = (/\d+/.test(wc[i][1])) ? parseInt(wc[i][1]) : 0
        var r = (parseInt(i) + 1).toString();
        if (!/\d+/.test(r)) {
            continue;
        }
        var w = wc[i][0];
        var p = 100 * fs / words;
        //var fs = wc[i][1];
        p = p.toPrecision(Math.round(p).toString().length) + "%";

        items.push([r, w, fs, p]);
    }

    $("." + cls_name).closest('.block-container').find("h4").html(n + '个词长');

    create_words_table(cls_name, items);

}

function create_words_table(cls_name, data) {
    $target = $("." + cls_name);
    let table = $target.DataTable({
        //$('.' + id).DataTable({
        destroy: true,
        language: CONST.datatables_lang,
        deferRender: true,
        // "bPaginate": true, //翻页功能
        // "bLengthChange": true, //改变每页显示数据数量
        "bFilter": true, //过滤功能
        // "bSort": true, //排序功能
        // "bInfo": true,//页脚信息
        "bAutoWidth": true,//自动宽度
        // "dom": ' <"search"f><"top"l>rt<"bottom"ip><"clear">',
        data: data,
        //"order": [[3, "desc"], [0, "asc"]],
        columns: [
            {
                "title": "排序",
                "width": "14%"
            },
            {
                title: "词",
                //"width": "25%"

            },
            {
                title: '频次',
                "width": "14%"

            },
            {
                title: "占比",
                "width": "14%"
            }

        ],
        //columnDefs: [{"targets": 3, "visible": false}]


        //dom: 'Bfrtip',
        dom: "<'row'<'col-sm-12'f>><'row'<'col-sm-6'B><'col-sm-6'l>r>" +
            "t" +
            "<'row'<'col-xs-6'i><'col-xs-6'p>>",
        // buttons: [
        //     // 'copyHtml5',
        //     //'excelHtml5',
        //     'csvHtml5',
        //     // 'pdfHtml5'
        // ],
        buttons: [
            {extend: 'csv', text: '导出'}
        ],
        initComplete: function () {
            //$("#mytool2").append('<button id="datainit" type="button" class="btn btn-primary btn-sm">新增</button>');
            //$("#mytool").append('<button type="button" class="btn btn-default btn-sm" data-toggle="modal" data-target="#myModal">添加</button>');
            // $(".tool_"+cls_name).append('<div class="col-xs-12 form-group">' +
            //   '<div class="col-xs-10 input-group">' +
            //   '<input id="searchinput" type="search"  placeholder="请输入关键字" class="form-control">'
            //   + '<span class="input-group-btn">'
            //   + '<button type="button" class="btn btn-sm btn-primary">搜索</button></span>'
            //   + '</div>'
            //   + '<div class="col-xs-2 ">'
            //   + '<button id="datainit" type="button" class="btn btn-primary btn-sm">新增</button>'
            //   + '</div>'
            //   + '</div>');
        }

    });

    // table.buttons().container()
    //     .appendTo($('.col-sm-6:eq(0)', table.table().container()));
}

function display_tips(id, message, tips_type = 'error', delay = 500) {
    let $target = $("#" + id);
    $target.show(delay)
        .removeClass('alert')
        .removeClass('alert-success')
        .removeClass('alert-danger')
    if (tips_type == 'error') {
        $target
            .addClass('alert')
            .addClass('alert-danger')
    } else if (tips_type == 'success') {
        $target
            .addClass('alert')
            .addClass('alert-success')
    } else if (tips_type == 'loading') {

        $target
            .addClass('alert')
            .addClass('alert-success')
    }
    $target.html(message);
}


// function update_process() {
//
//
//
//
//
//
//     console.log('update_process')
//     window.db.items.where('completed').equals(0).count(function (unfinished) {
//         get_data_count().then(function (total) {
//             let uncomplete_count = unfinished;
//             let finished_count = total - uncomplete_count;
//             display_percent_text('id_progress_bar', '本地详情下载进度', finished_count, total);
//             if (uncomplete_count > 0) {
//                 setTimeout(update_process, 1000);
//             } else {
//
//                 Helper.functions.show_msg("id_err_message", "<i class='icon fa-check'></i>️已完成明细下载！");
//                 init_table(task);
//                 $("#id_btn_get_details").text('下载产品详情').on('click', function (e) {
//                     update_process();
//                 });
//             }
//         });
//     });
// }

function update_process() {
    window.db.items.where('completed').equals(0).count(function (unfinished_count) {
        if (unfinished_count == 0) {
            Helper.functions.show_msg("id_err_message", "<i class='icon fa-check'></i>️已完成明细下载！");
            $("#id_btn_get_details").text('下载产品详情').on('click', function (e) {
                scrollTo(0, 0);
                update_process();
            });
        } else {
            window.db.items.count(function (total) {
                let finished_count = total - unfinished_count;
                display_percent_text('id_progress_bar', '本地详情下载进度', finished_count, total);
                setTimeout(function () {
                    update_process();
                }, 2000);
            });
        }
    });
}

function createStatTable(container, task, values) {

    values.sort(function (a, b) {
        return b.count - a.count;
    });
    var table = "<table class='table table-striped table-condensed table-hover table-bordered'>" +
        "<thead>" +
        "<tr>" +
        "<th>区间</th>" +
        "<th>数量</th>" +
        "<th>总数量</th>" +
        "<th>百分比</th>" +
        "</tr>" +
        "</thead>" +
        "<tbody>";

    var trArr = [];
    var totalRecords = task.items.length;
    for (var i = 0; i < values.length; i++) {


        let min = values[i].min;
        let max = values[i].max;
        let count = values[i].count;


        var p = ((count / totalRecords) * 100).toFixed("2") + "%";
        var tr = "<tr>" +
            "<td class='text-left'>" + min + "~" + max + "</td>" +
            "<td class='text-left font-weight-800'>" + count + "</td>" +
            "<td class='text-left'>" + totalRecords + "</td>" +
            "<td class='text-left font-weight-800'>" + p + "</td>" +
            "</tr>";
        trArr.push(tr);
    }
    table += trArr.join("") + "</tbody></table>";
    container.html(table);
}

function init_distribute_data(task) {


    task = filter(task);


    let data = task.items;


    //default price
    let price_labels = [
        {"min": 0, "max": 9.99},
        {"min": 10, "max": 19.99},
        {"min": 20, "max": 24.99},
        {"min": 25, "max": 29.99},
        {"min": 30, "max": 35.99},
        {"min": 40, "max": 49.99},
        {"min": 50, "max": 79.99},
        {"min": 80, "max": 99.99},
        {"min": 100, "max": 5000000}
    ];
    //日本市场价格调整
    // if (marketplaceId == 'A1VC38T7YXB528') {
    //   price_labels.forEach((value, key) => {
    //     let min = value.min;
    //     let max = value.max;
    //     return price_labels[key] = {"min": min * 100, "max": max * 100}
    //   });
    // }
    let price_data = [];
    for (let idx in price_labels) {
        console.log(idx);
        if (idx >= 0) {
            var range = data.filter((item) => {
                let arr = price_labels[idx];
                return item.price >= arr.min && item.price <= arr.max;
            });
            price_data.push({"min": price_labels[idx].min, "max": price_labels[idx].max, "count": range.length});
        }
    }


    //reviews 预先设定
    let reviews_labels = [
        {"min": 0, "max": 0},
        {"min": 1, "max": 10},
        {"min": 11, "max": 19},
        {"min": 20, "max": 50},
        {"min": 51, "max": 99},
        {"min": 100, "max": 199},
        {"min": 200, "max": 299},
        {"min": 300, "max": 499},
        {"min": 500, "max": 1000000}
    ];
    let reviews_data = [];
    for (let x in reviews_labels) {
        if (x >= 0) {
            var range = data.filter((item) => {
                let arr = reviews_labels[x];
                return item.reviews_nb >= arr.min && item.reviews_nb <= arr.max;
            });
            reviews_data.push({"min": reviews_labels[x].min, "max": reviews_labels[x].max, "count": range.length});
        }
    }


    //rating 预先设定
    let rating_labels = [
        {"min": 0, "max": 0},
        {"min": 1, "max": 2.9},
        {"min": 3, "max": 3.9},
        {"min": 4, "max": 4.4},
        {"min": 4.5, "max": 4.7},
        {"min": 4.8, "max": 5.0}
    ];


    let rating_data = [];
    for (let x in rating_labels) {
        if (x >= 0) {
            var range = data.filter((item) => {
                let arr = rating_labels[x];
                return item.rating >= arr.min && item.rating <= arr.max;
            });
            rating_data.push({"min": rating_labels[x].min, "max": rating_labels[x].max, "count": range.length});
        }
    }


    //qa

    let qa_labels = [
        {"min": 0, "max": 0},
        {"min": 1, "max": 10},
        {"min": 11, "max": 20},
        {"min": 21, "max": 50},
        {"min": 51, "max": 100},
        {"min": 101, "max": 5000}
    ];

    let qa_data = [];
    for (let x in qa_labels) {
        if (x >= 0) {
            var range = data.filter((item) => {
                let arr = qa_labels[x];
                return item.qa >= arr.min && item.qa <= arr.max;
            });
            qa_data.push({"min": qa_labels[x].min, "max": qa_labels[x].max, "count": range.length});
        }
    }

    distribute_create('id_reviews_pie_chart', task, reviews_data, '评论数');
    distribute_create('id_price_pie_chart', task, price_data, '价格');
    distribute_create('id_rating_pie_chart', task, rating_data, '评分');


}

function distribute_create(chartId, task, data, label) {


    let $table_container = $("#" + chartId).closest('.row').find(".table-container");
    let $form_container = $("#" + chartId).closest('.row').find(".form-group-container");


    //create form
    let form_groups = [];
    $.each(data, function (index, item) {
        let min = item.min;
        let max = item.max;
        let count = item.count;
        let tpl = '<div class="form-group mt-10">\n' +
            '<input type="text" class="form-control form-control-sm  col-lg-3" value="' + min + '">\n' +
            '<label class="form-control-label">&nbsp;<=' + label + '<=&nbsp;</label>\n' +
            '<input type="text" value="' + max + '" class="form-control form-control-sm col-lg-3"> <a href="javscript:void();" class="btn btn-sm btn-icon btn-pure btn-default on-default remove-row" data-toggle="tooltip" data-original-title="Remove"><i class="icon wb-trash"></i></a>\n' +
            '</div>';
        form_groups.push(tpl);
    });
    $form_container.html(form_groups.join(""));
    //bind event
    $form_container.find(".form-group").off("click").on("click", ".icon.wb-trash", function (e) {
        e.preventDefault();
        var r = $(e.target).closest(".form-group-container").children();
        if (r.length > 2) {
            $(this).closest(".form-group").remove();
        }
    });


    //create table

    data.sort(function (a, b) {
        return b.count - a.count;
    });
    var table = "<table class='table table-striped table-condensed table-hover table-bordered'>" +
        "<thead>" +
        "<tr>" +
        "<th>" + label + "区间</th>" +
        "<th>数量</th>" +
        "<th>总数量</th>" +
        "<th>百分比</th>" +
        "</tr>" +
        "</thead>" +
        "<tbody>";

    var trArr = [];
    var totalRecords = task.items.length;
    for (var i = 0; i < data.length; i++) {


        let min = data[i].min;
        let max = data[i].max;
        let count = data[i].count;


        var p = ((count / totalRecords) * 100).toFixed("2") + "%";
        var tr = "<tr>" +
            "<td class='text-left'>" + min + "~" + max + "</td>" +
            "<td class='text-left font-weight-800'>" + count + "</td>" +
            "<td class='text-left'>" + totalRecords + "</td>" +
            "<td class='text-left font-weight-800'>" + p + "</td>" +
            "</tr>";
        trArr.push(tr);
    }
    table += trArr.join("") + "</tbody></table>";

    $table_container.html(table);


    //create chart

    InitiatePieChart.init(chartId, data);


}

var InitiatePieChart = function () {
    return {
        init: function (id, data) {

            let labels = {};
            data.forEach((item, key) => {
                let min = item.min;
                let max = item.max;
                let count = item.count;
                let label = min + "~" + max;
                labels[label] = label;

                return data[key] = [label, count]
            });

            var chart = c3.generate({
                size: {width: 450, height: 400},
                bindto: '#' + id,
                padding: {
                    top: 3,
                    right: 3,
                    bottom: 3,
                    left: 3,
                },
                data: {
                    columns: data,
                    type: 'pie',
                    //labels: true,
                    labels: {
                        format: function (v, id, i, j) {
                            return v + '%';
                        }
                    },
                    names: labels,


                },
                tooltip: {
                    format: {
                        // title(x, index) {
                        //   return '';
                        // },
                        // name(name, ratio, id, index) {
                        //   return name
                        // },
                        value(value, ratio, id, index) {
                            return "数量:" + value;
                        }
                    },
                    contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
                        let label = d[0].name;
                        let value = d[0].value;
                        let percent = (d[0].ratio * 100).toFixed(2);
                        //return "<font color='white'>"+ label + ",数量:" + value + " 占比:" + percent + "</font>";
                        return "<font color='black'>" + label + ",数量:" + value + " 占比:" + percent + "%</font>";

                    }
                }
                //But these legend values or not showing

            });
        }
    };
}();
var InitiateDonutChart = function () {
    return {
        init: function (id, data) {

            $("#" + id).empty();
            Morris.Donut({
                element: id,
                data: data,
                formatter: function (value, row) {
                    if (row.qty && row.total) {
                        return value + "%(" + row.qty + "/" + row.total + ")";
                    } else {
                        return value;
                    }
                }
            });
        }
    };
}();
var InitiateBarChart = function () {
    return {
        init: function (id, data) {
            $("#" + id).empty();
            var chart = c3.generate({
                size: {
                    height: 400,
                    // width: 600
                },
                bindto: "#" + id,
                data: {
                    labels: true,
                    json: data,
                    keys: {
                        x: 'label',
                        value: ["count"],
                    },
                    type: 'bar',
                    // color: function (color, d) {
                    //   var lst = ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336', '#1b5e20', '#388e3c', '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9']
                    //   return (lst[d.index]);
                    //
                    // }
                },
                zoom: {
                    enabled: true
                },
                legend: {
                    show: false
                },
                axis: {
                    x: {
                        padding: {
                            bottom: 25
                        },
                        type: 'category',
                        tick: {
                            rotate: -55,
                            multiline: false
                        }
                    },
                    y: {
                        label: {
                            text: '数量',
                            position: 'outer-top'
                            // inner-top : default
                            // inner-middle
                            // inner-bottom
                            // outer-top
                            // outer-middle
                            // outer-bottom
                        }
                    }
                },
                bar: {
                    width: {
                        ratio: 0.3
                    }
                },
            });
        }
    }
}();

let simple_columns = [
    {
        title: '删除',
        //field: 'asin',
        align: 'center',
        width: '50px',
        checkbox: true

    }, {


        title: '删除',
        align: 'center',
        width: '70px',
        formatter: function (value, row, index) {
            //console.log(row)
            let asin = row.asin;
            //console.log(asin)
            return "<a href='#' class='btn btn-sm btn-icon btn-pure btn-default on-default remove-row text-center'>" +
                "<input type='hidden' name='item_id' value='" + row.id + "'>" +
                "<i ref='popover' data-content='删除' class='icon wb-trash'></i></a>";
        }
    },


    {
        field: 'img_url',
        title: '图片',
        align: 'center',
        sortable: false,
        width: '100px',
        formatter: function (value, row, index) {
            if (value) {
                return "<img width='80' style='max-height: 180px;max-width:100px;'  class='lazy' data-original='" + value.replace(/320/g, '400') + "'/>";
            }
            return '-'

        }
    },
    {
        field: 'asin',
        title: '产品信息',
        align: 'left',
        sortable: true,
        width: '650px',
        formatter: function (value, row, index) {

            let item = "<span style='max-width:500px;word-break:normal; width:auto; display:block; white-space:pre-wrap;word-wrap : break-word ;overflow: hidden'>" + row.title + "</span>";

            item += "<a target='_blank' href='https://" + row.domain + "/dp/" + row.asin + "'><b>" + row.asin + "</b></a>";
            if (row.fba) {
                item += "&nbsp;&nbsp;&nbsp;<i class='a-icon a-icon-prime a-icon-small'></i>";
            }
            if (row.rating) {
                item += "&nbsp;&nbsp;&nbsp;<i class=\'" + row.rating + "\'/>";

            }

            if (row.sponsored) {
                item += "&nbsp;&nbsp;&nbsp;<span class='mr-3 badge badge-round badge-dark'>广告</span>";
            }
            return item;
        }
    },


    {
        field: 'price',
        title: '价格',
        align: 'left',
        sortable: true,
        width: '100px',
        formatter: function (value, row, index) {
            return value;
        }
    }
    ,
    {
        field: 'rating',
        title: '评分',
        align: 'left',
        sortable: true,
        width: '70px',
        formatter: function (value, row, index) {
            return value;
        }
    },
    {
        field: 'reviews_nb',
        title: '评论数',
        align: 'left',
        sortable: true,
        width: '100px',
        formatter: function (value, row, index) {
            if (value) {
                return Helper.number.formatToString(value);
            }
            return value;
        }
    },


    {
        field: 'page',
        title: '页数',
        align: 'center',
        sortable: true,
        width: '70px'
    },
    {
        field: 'position',
        title: '位置',
        align: 'center',
        sortable: true,
        width: '70px'
    },


    {
        field: 'sponsored',
        title: '广告',
        align: 'left',
        sortable: true,
        width: '70px',
        formatter: function (value, row, index) {
            if (value) {
                return "√️";
            }
        }

    },
    {
        field: 'badge',
        title: '勋章',
        align: 'left',
        sortable: true,
        width: '150px',
        formatter: function (value, row, index) {

            if (value) {
                return value;
            } else {
                return '';
            }

        }
    },

];
let full_columns = [

    {
        title: '删除',
        //field: 'asin',
        align: 'center',
        width: '50px',
        checkbox: true

    },

    {
        field: 'img_url',
        title: '图片',
        align: 'center',
        sortable: false,
        width: '120px',
        visible: remember('img_url'),
        formatter: function (value, row, index) {
            if (value) {
                return "<img height='100' style='max-height: 100px;max-width:100px;' class='lazy' data-original='" + value.replace(/320/g, '400') + "'/>";
            }
            return '-'

        }
    },

    {
        field: 'asin',
        title: 'ASIN',
        align: 'center',
        sortable: true,
        visible: remember('asin'),
        width: '70px',
        formatter: function (value, row, index) {
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {
        field: 'asin',
        title: '产品信息',
        align: 'left',
        sortable: false,
        width: '350px',
        formatter: function (value, row, index) {
            let item = "<span style='max-width:300px;word-break:normal; width:auto; display:block; white-space:pre-wrap;word-wrap : break-word ;overflow: hidden'>" + row.title + "</span>";

            if (row.fba) {
                item += "&nbsp;&nbsp;&nbsp;<i class='a-icon a-icon-prime a-icon-small'></i>";
            }
            item += "<br/><a target='_blank' href='https://" + row.domain + "/dp/" + row.asin + "'><b>" + row.asin + "</b></a>";
            if (row.country_code) {
                let country_code = row.country_code.toLowerCase();
                if (country_code == 'uk') {
                    country_code = 'gb';
                }
                item += "&nbsp;&nbsp;&nbsp;<i class='flag-icon flag-icon-" + country_code + "'></i>" + row.country_zh;
            }
            item += "<br/>";

            if (row.available_date) {
                item += "<span title='上架日期' class='mr-3 badge badge-round badge-warning'>" + row.available_date + "</span>";
                let v = Helper.date.available_date_format_to_day(row.available_date);

                item += "<span class='mr-3 badge badge-round badge-primary'>上架:" + v.about + "</span>";

            }

            if (row.sponsored) {
                item += "&nbsp;&nbsp;&nbsp;<span class='mr-3 badge badge-round badge-dark' title='广告'>广告</span>";
            }


            if (row.seller && row.seller.indexOf("span") > -1) {
                //console.log(row.asin);
            }
            if (!row.seller && row.complete == true) {
                //console.log(row.asin)
            }

            item += "<input type='hidden' name='hidden_asin' value='" + row.asin + "'>";
            item += "<input type='hidden' name='hidden_sellerId' value='" + row.sellerId + "'>";


            if (row.seller && row.sellerId) {
                item += "<span class='mr-3 badge badge-round badge-dark'><a title='卖家' style='color:white;text-decoration:none;' href='https://" + row.domain + "/sp?_encoding=UTF8&seller=" + row.sellerId + "'>卖家:" + row.seller + "</a></span>";
            } else if (!row.sellerId && row.complete == true) {
                item += '无购物车或不可售';
            }

            let brand = row.brand;

            if (brand.indexOf("%") > -1) {
                console.log(2)
            }

            brand = Helper.string.decodeURIComponentSafe(brand);
            if (brand) {
                //let brand = decodeURIComponent(row.brand);
                item += "<span title='品牌' class='mr-3 badge badge-round badge-success'>品牌:" + brand + "</span>";
            }

            if (row.brand_store == true) {
                item += "<span class='mr-3 badge badge-round badge-danger'><a class='text-white' target='_blank' href='https://" + row.domain + row.brand_store_url + "'>品牌旗舰店</a></span>";
            }
            if (row.tree && row.tree.length > 0) {
                let val = [];
                $.each(row.tree, function (i, item) {
                    val.push("<a target='_blank' href='" + item.url + "'>" + item.category + "</a>");
                });
                item += "<br/><span style='max-width:300px;word-break:normal; width:auto; display:block; white-space:pre-wrap;word-wrap : break-word ;overflow: hidden'>路径:" + val.join(" > ") + "</span>";
            }


            return item;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"with": "450px", "font-size": "11px"}}
        }
    },
    {
        field: 'rank_number',
        title: '排名',
        align: 'left',
        sortable: true,
        width: '80px',
        visible: remember('rank_number'),
        formatter: function (value, row, index) {
            if (value) {
                return Helper.number.formatToString(value);
            }
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-weight": "bold"}}


        }
    },

    {
        field: 'rank_category',
        title: '类目',
        align: 'left',
        sortable: true,
        visible: remember('rank_category'),
        width: '120px',
        formatter: function (value, row, index) {
            //
            // if (value && value.length > 0) {
            //     return Helper.number.formatToString(value[0].rank_category_name);
            // }


            //return value;


            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {
        field: 'rank_number_1',
        title: '排名',
        align: 'left',
        sortable: true,
        visible: remember('rank_number_1'),
        width: '80px',
        formatter: function (value, row, index) {
            if (value) {
                return Helper.number.formatToString(value);
            }
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-weight": "bold"}}
        }
    },

    {
        field: 'rank_category_1',
        title: '类目',
        align: 'left',
        sortable: true,
        visible: remember('rank_category_1'),
        width: '120px',
        formatter: function (value, row, index) {
            //
            // if (value && value.length > 0) {
            //     return Helper.number.formatToString(value[0].rank_category_name);
            // }


            //return value;


            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {
        field: 'available_date',
        title: '上架日期',
        align: 'left',
        visible: remember('available_date'),
        sortable: true,
        width: '100px',
        formatter: function (value, row, index) {
            if (value) {


                return value;
            } else {
                return "<input name='available_date' type='text' placeholder='格式：2020/03/12'>";
            }
        }
        ,
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px", "font-weight": "bold"}}
        }
    },
    {
        field: 'available_date',
        title: '上架天数',
        align: 'left',
        sortable: true,
        width: '90px',
        formatter: function (value, row, index) {

            if (value) {
                return Helper.number.formatToString(Helper.date.available_date_format_to_day(value).day) + "天";

            } else {
                return '';
            }
        }
        ,
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px", "font-weight": "bold"}}
        }
    },

    {
        field: 'product_weight',
        title: '重量',
        align: 'left',
        visible: remember('product_weight'),
        sortable: true,
        width: '120px',
        formatter: function (value, row, index) {

            if (value && value.indexOf(';') > -1) {
                return value.split(';')[1];

            } else if (row.product_size && row.product_size.indexOf(';') > -1) {
                return row.product_size.split(';')[1];

            } else if (value) {
                return value;

            } else {
                return '';
            }
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },

    {
        field: 'product_size',
        title: '尺寸',
        align: 'left',
        visible: remember('product_size'),
        sortable: true,
        width: '120px',
        formatter: function (value, row, index) {

            if (value && value.indexOf(';') > -1) {
                return value.split(';')[0];

            } else if (row.product_weight && row.product_weight.indexOf(';') > -1) {
                return row.product_weight.split(';')[0];

            } else if (value) {
                return value;

            } else {
                return '';
            }
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },


    {
        field: 'rank_info',
        title: '全部排名',
        align: 'left',
        sortable: true,
        visible: remember('rank_info'),
        width: '420px',
        formatter(value, row, index) {
            let result = [];

            if (row.rank_info && row.rank_info.length > 0) {
                result.push("<ul class='p-0'>");
                $.each(row.rank_info, function (i, item) {
                    result.push("<li style='list-style: none;'><span># " + Helper.number.formatToString(item.rank_category_number) + "</span> in <span><a target='_blank' style='color:black;text-decoration:none;' href='https://" + row.domain + item.rank_link + "'>" + item.rank_category_name.replace("'", " ") + "</a></span></li>");
                });
                result.push("</ul>");
            }

            return result.join("")
        }
        ,
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },


    {
        field: 'price',
        title: '价格',
        align: 'left',
        sortable: true,
        width: '80px',
        visible: remember('price'),
        formatter: function (value, row, index) {
            if (row.sign && value) {
                return row.sign + value;
            }
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {
        field: 'brand',
        title: '品牌',
        align: 'left',
        sortable: true,
        visible: remember('brand'),
        width: '70px',
        formatter: function (value, row, index) {


            let brand = Helper.string.decodeURIComponentSafe(row.brand);
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    }
    ,
    {
        field: 'seller',
        title: 'seller',
        align: 'left',
        visible: remember('seller'),
        sortable: true,
        width: '80px',
        formatter: function (value, row, index) {
            if (value) {
                return value;
            } else if (row.sold_by_amz == true || row.title.indexOf('Amazon') > -1) {
                return 'Amazon';
            }
            return '';
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },

    {
        field: 'country_code',
        title: '国家(地区）',
        align: 'left',
        visible: remember('country_code'),
        sortable: true,
        width: '80px',
        formatter: function (value, row, index) {

            if (value == 'CN') {

                if (row.province_zh && row.province_zh == '中国') {
                    row.province_zh = '';
                }

                if (row.country_zh && row.province_zh && row.city_zh) {
                    return row.country_zh + "(" + row.province_zh + "," + row.city_zh + ")";
                } else if (row.country_zh && row.province_zh) {
                    return row.country_zh + "(" + row.province_zh + ")"
                } else if (row.country_zh && row.city_zh) {
                    return row.country_zh + "(" + row.city_zh + ")"
                } else if (row.country_zh) {
                    return row.country_zh;
                }
            } else if (row.seller && row.seller.indexOf('Amazon') > -1) {
                return row.seller;
            } else if (row.country_zh) {
                return row.country_zh;
            } else {
                return window.prepared_country_select_string;
            }
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    }
    ,
    {
        field: 'rating',
        title: '评分',
        align: 'left',
        sortable: true,
        visible: remember('rating'),
        width: '70px',
        formatter: function (value, row, index) {
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {
        field: 'reviews_nb',
        title: '评论',
        align: 'left',
        sortable: true,
        visible: remember('reviews_nb'),
        width: '80px',
        formatter: function (value, row, index) {
            if (value) {
                return Helper.number.formatToString(value);
            }
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },


    {
        field: 'page',
        title: '位置',
        align: 'center',
        sortable: true,
        visible: remember('reviews_nb'),
        width: '70px',
        formatter: function (value, row, index) {
            if (row.page && row.position) {
                return row.page + "/" + row.position;
            } else {
                return '';
            }
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },

    {
        field: 'qa',
        title: 'QA',
        align: 'center',
        sortable: true,
        visible: remember('qa'),
        width: '70px',
        formatter: function (value, row, index) {
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {
        field: 'sponsored',
        title: '广告',
        align: 'left',
        visible: remember('sponsored'),
        sortable: true,
        width: '70px',
        formatter: function (value, row, index) {
            if (value) {
                return "√️";
            }
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }

    },
    {
        field: 'badge',
        title: '勋章',
        align: 'left',
        sortable: true,
        visible: remember('badge'),
        width: '70px',
        formatter: function (value, row, index) {

            if (value) {
                return value;
            } else {
                return '';
            }

        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },

    {
        field: 'completed',
        title: '详情状态',
        align: 'center',
        sortable: true,
        visible: remember('completed'),
        width: '70px',
        formatter: function (value, row, index) {

            if (value == 1) {

                return '<input name="status" type="checkbox" checked="checked"/>';

            } else {
                return 'x'
            }


        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {


        title: '删除',
        align: 'center',
        width: '70px',
        formatter: function (value, row, index) {
            return "<a href='#' class='btn btn-sm btn-icon btn-pure btn-default on-default remove-row text-center'>" +
                "<input type='hidden' name='item_id' value='" + row.id + "'>" +
                "<i ref='popover' data-content='删除' class='icon wb-trash'></i></a>";
        }
    },

];

const seller_columns = [
    {
        "title": "卖家",
        "width": "25%",
        "render": function (data, type, row, meta) {
            let sellerId = '';

            return '<a href="https://' + row.domain + '/sp?_encoding=UTF8&seller=' + row.sellerId + '" target="_blank"><span title="' + row.label + '">' + row.label + '</span></a>';
        }
    },
    {
        title: "地区",
        "width": "15%",
        "render": function (data, type, row, meta) {

            let country_code = row.country_code;
            country_code = country_code == 'UK' ? 'GB' : country_code
            if (country_code) {
                country_code = country_code.toLowerCase();
            }

            let region = '';
            if (country_code == 'cn') {
                if (row.province_zh && row.city_zh) {
                    region = '中国 (' + row.province_zh + ',' + row.city_zh + ')';
                } else if (row.city_zh) {
                    region = '中国 (' + row.city_zh + ')';
                } else {
                    region = '中国';
                }
            } else if (row.country_zh != undefined) {
                region = row.country_zh;
            } else {
                region = '未知';
            }
            return '<h4 class="flag-icon flag-icon-' + country_code + '" style="margin:0px; padding:0px;"></h4>' + region;

        }
    },
    {
        title: "数量",
        "width": "15%",
        "render": function (data, type, row, meta) {
            return row.count;

        }
    }
];
const brand_columns = [
    {
        "title": "品牌",
        "width": "25%",
        "render": function (data, type, row, meta) {
            let sellerId = '';

            if (row.brand) {
                //https://www.amazon.com/s?ie=UTF8&field-brandtextbin=SEAFEW
                return '<a href="https://' + row.domain + '/s?ie=UTF8&field-brandtextbin=' + row.label + '" target="_blank"><span title="' + row.label + '">' + row.label + '</span></a>';

            } else {
                return '';
            }
        }
    },
    {
        title: "地区",
        "width": "15%",
        "render": function (data, type, row, meta) {
            let country_code = row.country_code;
            country_code = country_code == 'UK' ? 'GB' : country_code
            if (country_code) {
                country_code = country_code.toLowerCase();
            }

            let region = '';
            if (country_code == 'cn') {
                if (row.province_zh && row.city_zh) {
                    region = '中国 (' + row.province_zh + ',' + row.city_zh + ')';
                } else if (row.city_zh) {
                    region = '中国 (' + row.city_zh + ')';
                } else {
                    region = '中国';
                }
            } else if (row.country_zh != undefined) {
                region = row.country_zh;
            } else {
                region = '未知';
            }
            return '<h4 class="flag-icon flag-icon-' + country_code + '" style="margin:0px; padding:0px;"></h4>' + region;
        }
    },
    {
        title: "listing数量",
        "width": "15%",
        "render": function (data, type, row, meta) {
            return row.count;

        }
    }
];


function display_captcha(uri, html) {
    const $doc = $(html);
    let captcha_url = $doc.find("img[src*='captcha']").attr('src');
    let amzn = $doc.find("input[name='amzn']").val();
    let amzn_r = $doc.find("input[name='amzn-r']").val();
    let post_url = $doc.find("form").attr("action");
    //let data = {'url': post_url, 'captcha_url': captcha_url, 'amzn': amzn, 'amzn_r': amzn_r};


    let $target = $("#id_captcha_modal");
    $target.find("form").attr('action', 'https://' + uri.host + post_url);
    $target.find('img').attr("src", captcha_url);
    $target.find("input[name='amzn']").val(amzn);
    $target.find("input[name='amzn-r']").val(amzn_r);
    $target.find('button.btn.btn-primary').on('click', function (e) {
        $(e.target).closest('form').submit();
        $target.modal('hide');
    });
    $target.modal('show');
}
