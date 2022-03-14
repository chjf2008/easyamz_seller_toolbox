function init_task() {
    return new Promise(function (resolve, reject) {
        let data = {};
        let option_list = [];
        let attached_asins = [];
        let asin = $('#ASIN').val();
        let marketplaceId = '';
        let match = document.head.innerHTML.match(/ue_mid = '(.*?)'/);
        if (match) {
            marketplaceId = match[1];
        }
        if (asin && marketplaceId) {
            let items = [];
            $("div[data-a-carousel-options]").each(function (i, item) {
                let $this = $(item);
                let section_id = $this.attr("id");
                let data_options = $this.attr("data-a-carousel-options");
                if (data_options) {
                    //let obj = $.parseJSON(data_options);

                    let obj = JSON.parse(data_options);
                    if (obj && obj.ajax && obj.ajax.id_list) {
                        let id_list = obj.ajax.id_list;
                        if (id_list) {
                            $.each(id_list, function (i, item) {
                                let asin = JSON.parse(item).id;
                                //console.log(asin);
                                if (attached_asins.indexOf(asin) == -1) {
                                    attached_asins.push(asin);
                                }
                            });
                        }
                    }
                    if (Object.keys(obj).indexOf('initialSeenAsins') > -1) {
                        obj['id'] = section_id;
                        option_list.push(obj);
                    }
                }
                //第一页数据
                $("#" + section_id).find("li").each(function (i, row) {
                    let _asin = $(row).find("div[data-asin]").attr('data-asin');
                    let img_url = $(row).find("img.a-dynamic-image").attr("src");
                    let title = $(row).find("img.a-dynamic-image").attr("alt");
                    if (!title) {
                        return true;
                    }
                    let price = $(row).find("span.a-color-price").html();
                    //let price = API.Amazon.ValidFieldHelper.Price(text);
                    let fba = $(row).find("i.a-icon-prime").length == 1 ? 1 : 0;
                    let rating = $(row).find("i.a-icon-star").attr("class");
                    let reviews_nb = $(row).find("i.a-icon-star").next('span').html();
                    let badge = $(row).find("span.sponsored-products-deal-badge-generic").html();
                    items.push({
                        "asin": _asin,
                        "img_url": img_url,
                        "title": title,
                        'price': price,
                        "reviews_nb": !reviews_nb ? 0 : reviews_nb,
                        "badge": badge
                    });

                })
            });
            data['attached_asins'] = attached_asins;
            data['option_list'] = option_list;
            data['domain'] = window.location.host;
            data['marketplaceId'] = marketplaceId;
            data['initialSeenAsins'] = items;
            data['asin'] = asin;
            resolve(data);
        }
        reject()
    });
}

$(function () {


    let p = new Promise(function (resolve, reject) {
        chrome.runtime.sendMessage({
            "action": '__USER_VERIFY__'
        }, function (response) {
            if (response.isSuccess == true && response.value && response.value.auth) {
                resolve(response.value.auth);
            } else {
                reject()
            }
        });
    });


    p.then(function (r) {
        if (r.level < 6) {

        } else {
            let box = document.createElement("div");
            box.id = "easyamz";
            box.innerHTML = "<button class='btn btn-default' id='btn_submit_task'>下载该asin竞品</button><span id='id_result'></span>";
            $(box).appendTo($("#titleSection"));
            $("#btn_submit_task").off('click').on('click', function (e) {
                let task_name = $.trim(prompt("请输入任务名", ""));
                if (task_name && /^[\u4e00-\u9fa5a-zA-Z-z0-9\s]+$/.test(task_name)) {
                    task_name = task_name.replace(/\s+/, " ");
                    init_task().then(function (data) {
                        data['task_name'] = task_name;
                        chrome.runtime.sendMessage({
                            "action": '__CREATE_SP_TASK__',
                            'value': data
                        }, function (response) {
                            if (response.isSuccess === true) {
                                $("#id_result").html(' 恭喜，' + task_name + ' 任务提交成功！').css('color', 'red').show(5000);
                            } else {
                                $("#id_result").html(response.message).show()
                            }
                        });
                    });
                } else {
                    alert('任务名格式不正确!');
                }
            });
        }
    });








});