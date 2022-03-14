let asin_variants = [];
let variant = {};
let tasks = [];
let check_sponsored = false;


$(function () {
    API.APP.init_page(CONST.app_const.keywordsIndex.key).then(function () {
        Helper.functions.display_country_select('id_marketplace', CONST.iso_countries);
        $("#id_btn_apply").off("click").on("click", function (e) {
            $("#id_err_message").hide();
            tasks = [];
            let marketplaceId = $("#id_marketplace").val();
            let asin = $("#id_asin").val();
            let str_keywords = $("#id_keywords").val();
            let check_sponsored = $("#id_check_sponsored").prop("checked");
            let url_tasks = [];
            if (marketplaceId
                && asin
                && str_keywords
                && /^(B[\dA-Z]{9}|\d{9}(X|\d))$/.test(asin)) {


                let marketplace = Helper.functions.get_marketplace_by_marketplaceId(marketplaceId);

                if (marketplace && marketplace.hasOwnProperty('domain') && marketplace.hasOwnProperty('id')) {


                    let keywords = str_keywords.split("\n");
                    $("#id_result").find("tr.placeholder").remove();

                    let loading_gif = chrome.extension.getURL("/images/loading.gif");


                    let tr_counter = $("tbody tr").length;
                    $.each(keywords, function (i, item) {
                        item = $.trim(item);
                        if (item) {
                            if (!item.startsWith("B0")) {
                                item = item.toLocaleLowerCase();
                            }
                            let sid = '';
                            sid = new Date().getTime();
                            let url = 'https://' + marketplace.domain + '/s?k=' + item + '&page=1';
                            url = decodeURIComponent(url.toLowerCase());
                            url_tasks.push({"url": url, "sid": sid, 'chk_sp': check_sponsored});

                            $("#id_result").find("tbody").append("    <tr>\n" +
                                "        <td class='text-center'><span><i class='icon fa-trash'></i></span></td>\n" +
                                "        <td style='text-align: center;'>" + (tr_counter +i+ 1).toString() + "</td>\n" +
                                "        <td><span><a target='_blank' href='" + url + "'>" + item + "</a></span></td>\n" +
                                "        <td><span id='ix_" + sid + "'><img height='20' src='" + loading_gif + "'/></span></td>\n" +
                                "        <td><span id='ad_" + sid + "'><img height='20' class='text-center' src='" + loading_gif + "'/></span></td>\n" +

                                "        <td><span id='dt_" + sid + "'><img height='20' class='text-center' src='" + loading_gif + "'/></span></td>\n" +
                                "        <td><span class='text-center' id='r1_" + sid + "'><img height='20' src='" + loading_gif + "'/></span></td>\n" +
                                "        <td><span class='text-center' id='r2_" + sid + "'><img height='20' src='" + loading_gif + "'/></span></td>\n" +
                                "        <td><span class='text-center' id='p1_" + sid + "'><img height='20' src='" + loading_gif + "'/></span></td>\n" +
                                "        <td><span class='text-center' id='p2_" + sid + "'><img height='20' src='" + loading_gif + "'/></span></td>\n" +
                                "    </tr>").find('.icon.fa-trash').off('click').on('click', function (e) {
                                $(e.target).closest('tr').remove();
                            });
                        }
                    });
                    if (url_tasks) {
                        let asin_url = 'https://' + marketplace.domain + '/dp/' + asin + '?th=1&psc=1';
                        Helper.request.get(asin_url).then(function (html) {
                            let variants = API.Amazon.Detail(html).get_variants();
                            if (!(variants && Object.keys(variants).length > 0)) {
                                //variants[asin] = {};
                                variants[asin] = [];
                            }
                            $.each(url_tasks, function (i, url_task) {
                                tasks.push({
                                    "asin": asin,
                                    'domain': marketplace.domain,
                                    "req": Helper.request.get(url_task.url),
                                    'sid': url_task.sid,
                                    'chk_sp': url_task.chk_sp,
                                    'variants': variants,
                                    'url': url_task.url
                                });
                            });
                            if (tasks && tasks.length > 0) {
                                loop(tasks);
                            }
                        }).catch(function (reason) {
                            $("#id_err_message").show().html("请求失败，请检查网络!");
                            $("span[id^='r1'],span[id^='r2'],span[id^='p1'],span[id^='p2'],span[id^='ix_'],span[id^='dt_'],span[id^='ad_']").html('--');
                        });
                    }

                }
            }
        });
        $("#id_btn_reset").off("click").on("click", function (e) {
            $("#id_asin").val('');
            $("#id_keywords").val('');
            $("#id_check_sponsored").prop("checked", false);
        });
        $("#id_clear_results").off("click").on("click", function (e) {
            $("#id_result").find("tbody").html('<tr class="placeholder"><td style="text-align: center;vertical-align: middle;height:182px;" colspan="9">请设置ASIN和关键词</td></tr>');
        });
        $('#id_marketplace').change(function (e) {
            let marketplaceId = $(e.target).val();
            if (marketplaceId) {
                Helper.functions.swich_zipcode('id_zipcode', marketplaceId);
            }
        });
    });
});


var loop = function (tasks) {
    //console.log(d)
    if (tasks.length == 1) {
        let task = tasks.pop();
        let sid = task.sid;
        let chk_sp = task.chk_sp;
        let asin = task.asin;
        let domain = task.domain;
        let variants = task.variants;
        let search_url = task.url;
        task.req.then(function (data) {
            update(asin, domain, data, sid, chk_sp, variants, task.url);
        }).catch(function (error) {
            $("span[id^='r1'],span[id^='r2'],span[id^='p1'],span[id^='p2']").html(error);
        });
    } else {

        if (tasks && tasks.length > 0) {
            let task = tasks.pop();  //从最后一个开始，依次往前
            //  arr =  d.shift();  // 从第一个开始，依次往后
            task.req.then(function (data) {
                update(task.asin, task.domain, data, task.sid, task.chk_sp, task.variants, task.url);
                loop(tasks);
            }).catch(function (error) {
                $("span[id^='r1'],span[id^='r2'],span[id^='p1'],span[id^='p2']").html(error);
            });
        }
    }
};

var update = function (asin, domain, data, sid, chk_sp, variants, search_url) {
    let url = 'https://' + domain + '/dp/' + asin;
    API.Amazon.search_page_parse(url, data).then(function (r) {
            let r_found = false;
            let p_found = false;
            if (!chk_sp) {
                $("#p1_" + sid).html("未设置").attr("id", "pc_" + sid);
                $("#p2_" + sid).html("未设置").attr("id", "pc_" + sid);
            }
            $("#dt_" + sid).html(r.records).attr("id", "dtc_" + sid);
            $("#ad_" + sid).html(r.shippping_address).attr("id", 'adc_' + sid);
            let is_continue = true;
            let search_asins = [];
            r.data.forEach(item => {
                search_asins.push(item.asin);
            });
            let variant_asins = Object.keys(variants);

            let rank_indexed = false;
            let sp_indexed = false;


            $.each(variant_asins, function (idx, ele) {
                let index = search_asins.indexOf(ele);
                if (index > -1) {
                    let position = index + 1;
                    let sponsored = r.data[index].sponsored;
                    let v = variants.hasOwnProperty(ele) ? variants[ele] : [];


                    if (sponsored == false) {
                        rank_indexed = true;
                        $("#r1_" + sid).html("<a href='" + search_url + "' target='_blank'>" + r.page + "</a>").attr("id", "rc_" + sid);
                        $("#r2_" + sid).html(position).attr("id", "rc_" + sid);
                        $("#ix_" + sid).html("<a href='https://www.amazon." + domain + "/dp/" + asin + "' target='_blank'>" + ele + "</a><br/>" + v.join(",")).attr("id", "ixc_" + sid);


                        if (chk_sp && sp_indexed) {
                            is_continue = false;
                            return false;
                        }
                    } else {
                        sp_indexed = true;
                        $("#p1_" + sid).html(r.page).attr("id", "pc_" + sid);
                        $("#p2_" + sid).html(position).attr("id", "pc_" + sid)
                        $("#ix_" + sid).html("<a href='https://www.amazon." + domain + "/dp/" + asin + "' target='_blank'>" + ele + "</a><br/>" + v.join(",")).attr("id", "ixc_" + sid);

                        if (rank_indexed) {
                            is_continue = false;
                            return false;
                        }
                    }
                    //
                    // if (chk_sp) {
                    //     if (sponsored == true) {
                    //         $("#p1_" + sid).html(r.page).attr("id", "pc_" + sid);
                    //         $("#p2_" + sid).html(position).attr("id", "pc_" + sid);
                    //         is_continue = false;
                    //         $("#ix_" + sid).html("<a href='https://www.amazon." + domain + "/dp/" + asin + "' target='_blank'>" + r.page_asins[i].asin + "</a><br/>" + v.join(",")).attr("id", "ixc_" + sid);
                    //
                    //         is_continue = false;
                    //         return false
                    //     }
                    //
                    // }


                }
            });

            /*

            for (let i = 0; i < r.page_asins.length; i++) {

                let variant_asins = variants[asin];
                let _asin = r.page_asins[i].asin;

                if (Object.keys(variants).indexOf(_asin) > -1) {
                    //if (asin_variants.indexOf(r.page_asins[i].asin) > -1) {


                    let asin_attr = [];
                    $.each(Object.keys(variants), function (i, item) {
                        if (item == _asin) {
                            asin_attr = variants[_asin];
                            return false;
                        }
                    });
                    let position = i + 1;
                    if (r.page_asins[i].sponsored) {
                        $("#p1_" + sid).html(r.page).attr("id", "pc_" + sid);
                        $("#p2_" + sid).html(position).attr("id", "pc_" + sid);
                        p_found = true;
                    } else {

                        //let url = 'https://' + domain + '/s?k=&page=1';
                        $("#r1_" + sid).html("<a href='" + search_url + "' target='_blank'>" + r.page + "</a>").attr("id", "rc_" + sid);
                        $("#r2_" + sid).html(position).attr("id", "rc_" + sid);
                        r_found = true;
                    }
                    if (asin_attr && asin_attr.length > 0) {
                        $("#ix_" + sid).html("<a href='https://www.amazon." + domain + "/dp/" + asin + "' target='_blank'>" + r.page_asins[i].asin + "</a><br/>" + asin_attr.join(",")).attr("id", "ixc_" + sid);
                    } else {
                        $("#ix_" + sid).html("<a href='https://www.amazon." + domain + "/dp/" + asin + "' target='_blank'>" + r.page_asins[i].asin + "</a>").attr("id", "ixc_" + sid);
                    }


                    if (chk_sp) {
                        if (p_found && r_found) {
                            is_continue = false;
                            break;
                        }
                    } else {
                        if (r_found) {
                            is_continue = false;
                            break;
                        }
                    }
                }
            }
            */


            if (is_continue) {
                let next_page_url = r.next_page_url;
                if (next_page_url) {
                    let chk_sp = $("#id_check_sponsored").prop("checked");

                    tasks.push({
                        "asin": asin,
                        "domain": domain,
                        "req": Helper.request.get(next_page_url),
                        'sid': sid,
                        'chk_sp': chk_sp,
                        'variants': variants,
                        'url': next_page_url
                    });
                } else {
                    $("#p1_" + sid).html("--");
                    $("#p2_" + sid).html("--");
                    $("#r1_" + sid).html("--");
                    $("#r2_" + sid).html("--");
                    $("#ix_" + sid).html("--");
                    $("#ad_" + sid).html("--");


                }
            }

            loop(tasks);
        }
    );
}








