Helper.functions = function () {


    return {


        lazyload: function (selector) {
            $(selector).lazyload({
                threshold: 200,
                effect: 'fadeIn',
                placeholder: CONST.loading_gif
            }).popover({
                html: true,
                trigger: 'hover',
                boundary: 'window',
                placement: 'right',


                content: function () {

                    let imgsrc = $(this).data("original");
                    imgsrc = imgsrc.replace(/200/g, '400');
                    imgsrc = imgsrc.replace(/160/g, '400');
                    imgsrc = imgsrc.replace(/320/g, '400');


                    return '<img src="' + imgsrc + '" />';
                }
            });
        }, allSettled: function (funcArr, urls) {

            return new Promise((resolve) => {
                let sttled = 0
                let result = []
                for (let index = 0; index < funcArr.length; index++) {
                    const element = funcArr[index]
                    element
                        .then(res => {
                            result[index] = {
                                status: 'fulfilled',
                                url: urls[index],
                                value: res,
                                code: 200
                            }
                        })
                        .catch(err => {
                            result[index] = {
                                status: 'rejected',
                                url: urls[index],
                                reason: err,
                                code: err.status
                            }
                        })
                        .finally(() => {
                            ++sttled === funcArr.length && resolve(result)
                        })
                }
            });
        },
        display_country_select: function (id, iso_countries) {
            $("#" + id).select2({
                placeholder: "亚马逊市场",
                language: "zh-CN",
                templateResult: function (country) {
                    if (!country.id) {
                        return country.text;
                    }

                    let country_code = country.countrycode;
                    let country_text = country.text;
                    if (country_code) {
                        country_code = country_code.toLowerCase();
                    }

                    console.log(country_code)


                    var $country = $(
                        '<span class="flag-icon flag-icon-' + country_code + '"></span>' +
                        '&nbsp;<span class="flag-text">' + country_text + "</span>"
                    );
                    return $country;
                },
                data: iso_countries
            });

        },
        get_domain_by_marketplaceId: function (iso_countries, marketplaceId) {
            let domain = '';

            for (let i = 0; i < iso_countries.length; i++) {
                if (iso_countries[i].id == marketplaceId) {

                    domain = iso_countries[i].domain;
                    break;
                }
            }

            return domain;
        },
        get_marketplaceId_by_domain: function (domain) {
            let marketplaceId = '';

            for (let i = 0; i < CONST.iso_countries.length; i++) {
                if (CONST.iso_countries[i].domain == domain) {

                    marketplaceId = CONST.iso_countries[i].id;
                    break;
                }
            }

            return marketplaceId;
        },
        get_marketplace_code_by_marketplaceId: function (marketplaceId) {
            let marketplace_code = '';

            for (let i = 0; i < CONST.iso_countries.length; i++) {
                if (CONST.iso_countries[i].id == marketplaceId) {

                    marketplace_code = CONST.iso_countries[i].countrycode;
                    break;
                }
            }

            return marketplace_code;
        },
        get_marketplace_by_marketplaceId: function (marketplaceId) {

            let marketplace = null;

            for (let i = 0; i < CONST.iso_countries.length; i++) {
                if (CONST.iso_countries[i].id == marketplaceId) {

                    marketplace = CONST.iso_countries[i];
                    break;
                }
            }

            return marketplace;


        },
        swich_zipcode: function (id, marketplaceId) {
            let marketplace = Helper.functions.get_marketplace_by_marketplaceId(marketplaceId);
            if (null != marketplace) {
                let zipcodes = [];
                let zip_mapping = CONST.MARKETPLACE_ZIPCODE_MAPPING[marketplace.countrycode];
                if (zip_mapping) {
                    $.each(zip_mapping.key, function (e, item) {
                        if (marketplace.countrycode == 'AU') {
                            zipcodes.push("邮编:" + item.zipcode + ",城市:" + item.city);

                        } else if (['SA', 'AE', 'NL'].indexOf(marketplace.countrycode) == -1) {
                            zipcodes.push(item);
                        } else if (['SA', 'AE', 'NL'].indexOf(marketplace.countrycode) > -1) {

                        }
                    });
                }
                let text = '';
                if (zipcodes && zipcodes.length > 0) {
                    text = "<i class='icon fa-microphone blue-600'></i> <a href='https://" + marketplace.domain + "' target='_blank'> " + marketplace.text + "</a>本土有效邮编:(" + zipcodes.join(" ； ") + ")";
                }
                $("#" + id).html(text).animate({fontSize: '1em'});
            }
        },
        countDown: function (id, duration) {
            var timer = setInterval(function () {
                if (--duration <= 0) {
                    clearInterval(timer);
                }
                $('#' + id).html(duration);
            }, 1000);
        },
        sync_sellers: function (task) {

            let items = task.items;
            let sellerIds = [];

            let total_completed = 0;
            for (let i = 0; i < items.length; i++) {
                let item = items[i];

                total_completed += item.completed;
                let sellerId = item.sellerId;
                let country_code = item.country_code;
                if (!sellerId || country_code) {
                    continue;
                }
                if (sellerId && sellerIds.indexOf(sellerId) == -1) {
                    sellerIds.push(sellerId);
                }
            }

            if (total_completed == 0) {

                display_tips('id_err_message', '请先下载产品详情页！', 'error', 500);


            } else {
                if (sellerIds.length > 0) {
                    display_tips('id_err_message', '正在同步' + sellerIds.length + '个卖家信息,请稍后...', 'loading', 100);
                    chrome.storage.sync.get(task_config, function (v) {
                        if (v) {
                            let data = {'marketplaceId': v[task_config].marketplaceId, 'sellerIds': sellerIds};
                            API.APP.send_command(CONST.app_const.seller_request.key, data).then(function (res) {
                                if (res
                                    && res.isSuccess == true
                                    && res.value
                                    && res.value.result == 1
                                    && res.value.data) {
                                    res.value.data.forEach(function (x) {
                                        window.db.items.where("sellerId").equals(x.sellerId).modify({
                                            'country_code': x.country_code,
                                            'country_zh': x.country_zh,
                                            'province_zh': x.province_zh,
                                            'city_zh': x.city_zh
                                        }).catch(function (e) {
                                            console.log(e);
                                        });
                                    });
                                    display_tips('id_err_message', '成功同步' + res.value.data.length + '个卖家信息！', 'loading', 500);
                                }
                            }).catch(function (error) {
                                display_tips('id_err_message', '同步失败！', 'error', 100);
                            });
                        }
                    });

                } else {
                    display_tips('id_err_message', '已知的卖家信息已经同步完成！', 'loading', 500);
                }


            }
        },
        task_download: function (task, file_prefix) {

            let fileName = file_prefix + "_" + Date.now() + '.cxf';
            Helper.export.toJSON(task, fileName);

        },
        set_config_value: function (key, value) {
            chrome.storage.sync.get(task_config, function (v) {
                if (v && v.hasOwnProperty(task_config)) {
                    v[task_config][key] = value;
                    chrome.storage.sync.set(v, function () {
                    });
                }
            });

        },
        get_config: function () {
            return new Promise(function (resolve, reject) {

                chrome.storage.sync.get(task_config, function (v) {
                    if (v && v.hasOwnProperty(task_config)) {
                        resolve(v[task_config]);
                    } else {
                        resolve({})
                    }

                });
            });

        },
        save_config: function (config) {
            return new Promise(function (resolve, reject) {
                let obj = {};
                obj[task_config] = config;
                chrome.storage.sync.set(obj, function () {
                    var error = chrome.runtime.lastError;
                    if (error) {
                        reject();
                    }
                    chrome.storage.sync.get(task_config, function (v) {
                        if (v && v.hasOwnProperty(task_config)) {
                            resolve(v[task_config]);
                        } else {
                            reject()
                        }
                    });
                });
            });
        },
        remove_one: function (table_id, e, data) {
            window.db.items.bulkDelete(data).then(function () {
                $(e.target).closest("tr").remove();
            });

        },
        remove_many: function (table_id) {
            var selRows = $("#" + table_id).bootstrapTable("getSelections");
            if (selRows.length == 0) {
                return;
            }
            var data = [];
            $.each(selRows, function (i) {
                data.push(this.id);
            });
            if (!data) {
                return;
            }
            window.db.items.bulkDelete(data).then(function () {
                $("td.bs-checkbox input").each(function (i, ele) {
                    $this = $(ele);
                    if ($this.prop("checked")) {
                        $this.closest("tr").remove();
                    }
                });
            });
        }, db_clear: function () {
            chrome.storage.sync.remove(task_config, function () {
                db.delete().then(() => {
                    location.href = location.href.replace('#', '');
                }).catch((err) => {
                    console.error(err);
                });
            });
        },
        show_progress: function (id, percent, text, delay) {

            delay = delay || 500;

            $("#" + id).show(delay).find(".progress-bar").css("width", percent + "%");
            $("#" + id).find("h6").text(text + "(" + percent + "%)");

        },
        show_msg: function (id, msg, msg_type, focus, delay) {

            _msg_type = msg_type || 'success';

            _delay = delay || 500;

            _focus = focus === true ? true : false;


            let $target = $("#" + id)
            $target.show(_delay)
                .removeClass('alert')
                .removeClass('alert-success')
                .removeClass('alert-danger');
            if (_msg_type == 'error') {
                $target
                    .addClass('alert')
                    .addClass('alert-danger')
            } else if (_msg_type == 'success') {
                $target
                    .addClass('alert')
                    .addClass('alert-success')
            } else if (_msg_type == 'loading') {

                $target
                    .addClass('alert')
                    .addClass('alert-success')
            }

            if (_focus) {
                $('body,html').animate({'scrollTop': 0}, 500);
            }


            $target.html(msg);
        },
        hide_msg: function (id) {
            $('#' + id).html('').hide();

        },
        get_data_count: function () {
            return new Promise(function (resolve, reject) {
                window.db.items.count(function (count) {
                    resolve(count);
                });
            });

        },
        to_csv: function (task) {
            return new Promise(function (resolve) {
                let fileName = Date.now();
                if (task.config.task_name) {
                    fileName = task.config.task_name;
                } else if (task.config.taskId) {
                    fileName = task.config.taskId;
                }
                fileName = fileName + ".csv";
                let index = 0;
                let items = [];
                $.each(task.items, function (i, item) {
                    index++;
                    let categories = [];
                    $.each(item.tree, function (j, obj) {
                        categories.push(obj.category);
                    });
                    let v = {};
                    v['asin'] = item.asin;
                    v['title'] = item.title ? item.title : '-';
                    v['price'] = item.price ? item.price : '0';
                    v['rating'] = item.rating ? item.rating : '0';
                    v['reviews_nb'] = item.reviews_nb ? item.reviews_nb : '0';
                    v['fba'] = item.fba == true ? "✔" : '';
                    v['sponsored'] = item.sponsored ? item.sponsored : '-';
                    v['item_type'] = item.item_type ? item.item_type : '-';
                    v['tree'] = categories.length > 0 ? categories.join(" > ") : '-';
                    v['img_url'] = item.img_url ? item.img_url : '-';
                    v['offerCount'] = item.offerCount ? item.offerCount : '0';
                    v['coupon'] = item.coupon ? item.coupon : '';
                    v['badge'] = item.badge ? item.badge : '';
                    v['brand'] = item.brand ? item.brand : '-';

                    v['qa'] = item.answered_questions_count ? item.answered_questions_count : '0';
                    v['seller'] = item.seller ? item.seller : '-';
                    v['product_weight'] = item.product_weight ? item.product_weight : '-';
                    v['product_size'] = item.product_size ? item.product_size : '-';
                    v['available_date'] = item.available_date ? item.available_date : '-';
                    v['brand_store'] = item.brand_store == true ? "✔" : '';
                    v['country_code'] = item.country_code ? item.country_code : '-';
                    v['country_zh'] = item.country_zh ? item.country_zh : '-';
                    v['province_zh'] = item.province_zh ? item.province_zh : '-';
                    v['city_zh'] = item.city_zh ? item.city_zh : '-';

                    let rank_info = item.rank_info;

                    if (rank_info && rank_info.length > 0) {
                        if (rank_info.length == 1) {
                            v['rank_number'] = rank_info[0].rank_category_number;
                            v['rank_category'] = rank_info[0].rank_category_name;
                            v['rank_number_1'] = '';
                            v['rank_category_1'] = '';
                            v['rank_number_2'] = '';
                            v['rank_category_2'] = '';
                        } else if (rank_info.length == 2) {
                            for (let idx in rank_info) {
                                let rank = rank_info[idx];
                                let rank_category_number = rank.rank_category_number;
                                let rank_category_name = rank.rank_category_name;
                                if (idx == 0) {
                                    v['rank_number'] = rank_category_number;
                                    v['rank_category'] = rank_category_name;
                                } else {
                                    v['rank_number_' + idx] = rank_category_number;
                                    v['rank_category_' + idx] = rank_category_name;
                                }
                            }
                            v['rank_number_2'] = '';
                            v['rank_category_2'] = '';
                        } else if (rank_info.length == 3) {
                            for (let idx in rank_info) {
                                let rank = rank_info[idx];
                                let rank_category_number = rank.rank_category_number;
                                let rank_category_name = rank.rank_category_name;
                                if (idx == 0) {
                                    v['rank_number'] = rank_category_number;
                                    v['rank_category'] = rank_category_name;

                                } else {
                                    v['rank_number_' + idx] = rank_category_number;
                                    v['rank_category_' + idx] = rank_category_name;
                                }
                                if (idx > 2) {
                                    break;
                                }
                            }
                        }
                    } else {
                        v['rank_number'] = '';
                        v['rank_category'] = '';
                        v['rank_number_1'] = '';
                        v['rank_category_1'] = '';
                        v['rank_number_2'] = '';
                        v['rank_category_2'] = '';
                    }
                    items.push(v);
                });
                Helper.export.toCSV(fileName, items);
                resolve();
            })
        },

        to_cxf: function (task) {

            return new Promise(function (resolve) {
                let fileName = Date.now();
                if (task.config.task_name) {
                    fileName = task.config.task_name;
                } else if (task.config.taskId) {
                    fileName = task.config.taskId;
                }
                fileName = fileName + ".cxf";
                Helper.export.toJSON(task, fileName);
                resolve();
            });
        },
        import_cxf: function (file) {


            return new Promise(function (resolve, reject) {
                let reader = new FileReader();
                reader.readAsText(file);
                reader.onload = function () {
                    if (reader.result) {
                        let t = JSON.parse(reader.result);

                        if (t && t.hasOwnProperty('items')
                            && t.hasOwnProperty('config')
                        ) {
                            let items = t.items;
                            let config = t.config;

                            if (!items || items.length == 0 || Object.keys(config).length == 0) {
                                reject('该文件是个空文件！');

                            } else {
                                Helper.functions.save_config(config).then(function (conf) {
                                    if (conf && Object.keys(conf).length > 0) {
                                        //Helper.functions.show_msg(msg_container, '数据导入中...', 'success', true);
                                        window.db.items.bulkPut(t.items).then(function () {
                                            window.db.items.count(function (count) {
                                                //page_reload();
                                                if (count > 0) {
                                                    resolve({'items': items, 'config': conf});
                                                }
                                            });
                                        }).catch(Dexie.BulkError, function (e) {
                                            console.error(e);
                                            reject(e);
                                        });
                                    }
                                });
                            }
                        }
                    }
                };
                reader.onerror = function () {
                    console.log(reader.error);
                    reject(reader.error);
                };
            })

        },

        get_asin_from_url: function (url) {
            let asin = '';
            if (url.indexOf('/product-reviews/') > -1) {

                let m = url.match(/\/product\-reviews\/(B[0-9]{2}[0-9A-Z]{7}|(97(8|9))?\d{9}(\d|X))/);
                if (m) {
                    asin = m[1];
                }
            } else if (url.indexOf('slredirect') > -1) {
                let m = url.match(/dp%2F(.*)%2F/);
                if (m) {
                    asin = m[1];
                }
            } else {
                let m = url.match(/(dp|product|asin)?\/(B[0-9]{2}[0-9A-Z]{7}|(97(8|9))?\d{9}(\d|X))/);
                if (m) {
                    asin = m[2];
                }
            }
            return asin;
        },

        display_percent_text: function (id, pre_text, finished_count, item_total) {
            let p = "0.00";
            let text = pre_text;

            if (item_total > 0) {
                p = (finished_count / item_total * 100).toFixed(2);
                text += ":" + finished_count + "/" + item_total;
            } else {
                p = "0.00";
                text += "0/0";
            }
            Helper.functions.show_progress(id, p, text);
        }
    }
}();

function display_marketplace(id, iso_countries) {
    $("#" + id).select2({
        placeholder: "亚马逊市场",
        language: "zh-CN",
        templateResult: function (country) {
            if (!country.id) {
                return country.text;
            }
            var $country = $(
                '<span class="flag-icon flag-icon-' + country.code.toLowerCase() + '"></span>' +
                '&nbsp;<span class="flag-text">' + country.text + "</span>"
            );
            return $country;
        },
        data: iso_countries
    });
}
