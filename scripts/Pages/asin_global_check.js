window.auto_set_zipcode = false;
$(document).ready(function () {


    API.APP.init_page(CONST.app_const.asincheck.key).then(function (s) {
        Helper.functions.display_country_select('id_marketplace', CONST.iso_countries);
        $("#id_btn_apply").off("click").on("click", function (e) {

            API.APP.valid_user().then(function () {

                fetch_items();

            });
        });

        $('#id_marketplace').change(function (e) {
            Helper.functions.swich_zipcode('id_zipcode', e);
        });
    })
});

function fetch_items() {

    let marketplaceId = $("#id_marketplace").val();
    let asin = $.trim($("#id_asin").val());
    if (!marketplaceId) {
        $("#id_err_message").hide().show(100).html("请选择市场！");
        return;
    }
    if (!asin || !/^(B[\dA-Z]{9}|\d{9}(X|\d))$/.test(asin)) {
        $("#id_err_message").hide().show(100).html("无效的ASIN！");
        return;
    }
    $("#id_btn_apply").off("click").html('<i class="icon fa-play-circle"></i>已开始');
    let check_variants = $("#id_chk_variants").prop("checked");
    let marketplace = {};
    for (let key in CONST.iso_countries) {
        if (CONST.iso_countries[key].id == marketplaceId) {
            marketplace = CONST.iso_countries[key];
            break;
        }
    }


    let asin_url = 'https://' + marketplace.domain + '/dp/' + asin + '?th=1&psc=1';


    Helper.request.get(asin_url).then(function (html) {
        API.Amazon.detail_page_parse(html, asin_url).then(function (result) {
            let children = [];
            if (check_variants) {
                let variants = result.varaints;
                if (variants && Object.keys(variants).length > 0) {
                    for (let x in variants) {
                        children.push({"asin": x, 'param': variants[x].join(",")});
                    }
                } else {
                    children.push({"asin": asin, 'param': ''});
                }
            } else {
                children.push({"asin": asin, 'param': ''});
            }
            table_created(marketplace, children).then(function () {
                let tasks = [];
                for (let i = 0; i < CONST.iso_countries.length; i++) {
                    if (CONST.iso_countries[i].id == marketplaceId) {
                        continue;
                    }
                    for (let index in children) {
                        let child = children[index];
                        let asin_url = 'https://' + CONST.iso_countries[i].domain + '/dp/' + child.asin + '?th=1&psc=1';
                        tasks.push({
                            "url": asin_url,
                            "asin": child.asin,
                            "marketplaceId": CONST.iso_countries[i].id,
                            "url": asin_url
                        });

                    }
                }
                loop(tasks);
            });
        });
    }).catch(function (reason) {
        $("#id_err_message").removeClass('alert-success')
            .addClass('alert-danger').html('该网络资源不存在或页面受支持或未知错误，请认真检查后再试！');
        $("#id_btn_apply")
            .html("<i class='icon fa-play-circle'></i>开 始")
            .off("click").on("click", function (e) {
            $(e.target).closest('button').html("分析中...");
            fetch_items();
        });
    });


}

function loop(tasks) {
    let task = tasks.shift();
    if (task) {
        Helper.request.get(task.url).then(function (html) {
            process_result(task, html);
            loop(tasks);
        }).catch(function (error) {
            if (error.status == 404) {
                $("#" + task.asin + "_" + task.marketplaceId).html("未同步");
            } else if (error.status == 503) {
                $("#" + task.asin + "_" + task.marketplaceId).html("<a target='_blank' href='" + task.url + "'>请求频繁(自行查看)</a>");
            } else {
                console.log(error);
                $("#" + task.asin + "_" + task.marketplaceId).html("<a target='_blank' href='" + task.url + "'>未知错误(自行查看)</a>");

            }
            loop(tasks);
        });
    } else {
        $("#id_err_message").removeClass('alert-danger')
            .addClass('alert-success').html('检测完成！');
        $("#id_btn_apply")
            .html("<i class='icon fa-play-circle'></i>开 始")
            .off("click").on("click", function (e) {
            $(e.target).closest('button').html("分析中...");
            fetch_items();
        });
        tippy('[data-tippy-content]', {allowHTML: true});
    }
}

function process_result(job, html) {
    if (html.indexOf("captchacharacters") == -1) {
        API.Amazon.detail_page_parse(html, job.url).then(function (data) {
            let lis = [];
            let display_key = ['title', 'brand', 'attrs', 'rank', 'seller', 'varaints', 'features', 'category'];
            for (let key in data) {
                key = $.trim(key.replace(":", ''));
                if (display_key.indexOf(key) > -1) {
                    if (key == 'attrs') {
                        if (data[key] && data[key].length > 0) {

                            data[key].forEach(function (item) {
                                lis.push("<li><b>" + item.name + "</b>:" + item.value + "</li>");
                            });
                        }

                    } else if (key == 'varaints') {
                        if (data[key]) {
                            lis.push("<li><b>" + key.replace(":", '') + "</b>:" + Object.keys(data[key]).join(",") + "</li>");
                        }
                    } else if (key == 'features') {
                        if (data[key] && data[key].length > 0) {
                            data[key].forEach(function (item) {
                                lis.push("<li><b>" + key.replace(":", '') + "</b>:" + item + "</li>");
                            })
                        }


                    } else if (key == 'category') {
                        if (data[key] && data[key].length > 0) {

                            let categories = [];

                            data[key].forEach(function (item) {
                                categories.push(item.category_name);
                            });
                            if (categories && categories.length > 0) {
                                lis.push("<li><b>" + key.replace(":", '') + "</b>:" + categories.join(" > ") + "</li>");
                            }
                        }

                    } else if (key == 'rank') {

                        data[key].forEach(function (item) {

                            lis.push("<li><b>BSR </b> # " + item.rank_category_number + "in " + item.rank_category_name + "</li>");


                        });

                    } else {
                        lis.push("<li><b>" + key.replace(":", '') + "</b>:" + data[key] + "</li>");
                    }
                }
            }
            $("#" + job.asin + "_" + job.marketplaceId)
                .html("<a target='_blank' href='" + job.url + "'>已同步</a><button class='btn btn-primary btn-xs'>详细</button>")
                .attr("data-tippy-content", "<ul>" + lis.join("") + "</ul>")
                .attr("position", 'right');
            tippy('[data-tippy-content]', {allowHTML: true, interactive: true, position: 'right'});


            $(".btn-xs").off("click").on("click", function (e) {


                let content = $(e.target).closest('td').attr("data-tippy-content");
                $("#id_content").html(content);


            });
        }).catch(function (error) {
            $("#" + job.asin + "_" + job.marketplaceId).html(error);
        });
    } else {
        $("#" + job.asin + "_" + job.marketplaceId).html("<a target='_blank' href='" + task.url + "'>验证码(自行查看)</a>");
    }

}

function table_created(marketplace, tasks) {
    return new Promise(function (resolve, reject) {
        $('#id_table').empty();
        let arr = [];
        arr.push("<tr>");
        arr.push("<th>ASIN/颜色尺寸</th>");
        CONST.iso_countries.forEach(function (item) {
            if (marketplace.id != item.id) {
                arr.push("<th><a target='_blank' href='https://" + item.domain + "'>" + item.text + "</a></th>");
            }
        });
        arr.push("</tr>");
        tasks.forEach(function (task) {
            arr.push("<tr>");
            let text = '';
            if (task.param) {
                text = task.asin + ',' + task.param
            } else {
                text = task.asin;
            }
            arr.push("<td style='width:150px;'>" + text + "</td>");
            CONST.iso_countries.forEach(function (item) {
                if (marketplace.id != item.id) {
                    arr.push("<td id='" + task.asin + "_" + item.id + "'><img height='20' src='" + CONST.loading_gif + "'></td></td>");
                }
            });
            arr.push("</tr>");
        });
        $('#id_table').append(arr.join(""));
        resolve();
    });
}
