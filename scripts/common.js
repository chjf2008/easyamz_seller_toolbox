function ajax_func(url, data, params) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: url,
            data: data,
            type: params && params.type || 'post',
            dataType: params && params.dataType || 'JSON',
            contentType: params && params.contentType || "application/json",
            timeout: params && params.timeout || 20000,
            success: function (res) {
                resolve(res)
            },
            error: function (error) {
                reject(error)
            }
        });
    });
}

function fetch_with_timeout(url, timeout, response_handle, error_handel) {
    let request = {
        method: 'GET',
        headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'referer': url,
            //'Accept': 'application/json', // This is set on request
            'Cache': 'no-cache', // This is set on request

        },
        //credentials: 'include',
        credentials: 'same-origin',


        //mode: "cors",
    }
    Promise.race([
        fetch(url, request),
        new Promise(function (resolve, reject) {
            setTimeout(() => reject({"msg": "", "url": url, "http_code": 'timeout'}), timeout)
        })])
        .then(function (response) {
                if (response.status == 200) {
                    return Promise.resolve(response)
                } else {
                    return Promise.reject({
                        "msg": response.statusText,
                        "url": response.url,
                        "http_code": response.status,
                        "error": ""
                    })
                }
            }
        )
        .then(function (res) {

            return res.text().then(function (html) {

                if (html.indexOf("captchacharacters") > -1) {
                    return Promise.reject({
                        "msg": res.statusText,
                        "url": res.url,
                        "error_code": "captcha",
                        "http_code": 200
                    })

                    //process_captcha({"msg": "", "url": response.url, "http_code": 'captcha'})
                } else {
                    return {"html": html, "url": res.url}
                }
            });

        })
        .then(response_handle)
        .catch((error) => {
            if (error) {
                error_handel({
                    "msg": error.message,
                    "url": url,
                    "http_code": error.http_code,
                    "error_code": error.error_code
                })

            } else {
                error_handel({
                    "msg": error,
                    "url": url,
                    "http_code": error.http_code,
                    "error_code": error.error_code
                })
            }
        });

}


var ajaxManager = {
    requests: [],
    addReq: function (opt) {
        this.requests.push(opt);

        if (this.requests.length == 1) {
            this.run();
        }
    },
    removeReq: function (opt) {
        if ($.inArray(opt, requests) > -1)
            this.requests.splice($.inArray(opt, requests), 1);
    },
    run: function () {
        // original complete callback
        oricomplete = this.requests[0].complete;

        // override complete callback
        var ajxmgr = this;
        ajxmgr.requests[0].complete = function () {
            if (typeof oricomplete === 'function')
                oricomplete();

            ajxmgr.requests.shift();
            if (ajxmgr.requests.length > 0) {
                ajxmgr.run();
            }
        };

        $.ajax(this.requests[0]);
    },
    stop: function () {
        this.requests = [];
    },
}


var ajaxQueue = {
    queuedRequests: [],
    addRequest: function (req) {
        this.queuedRequests.push(req);
        // if it's the first request, start execution
        if (this.queuedRequests.length === 1) {
            this.executeNextRequest();
        }
    },
    clearQueue: function () {
        this.queuedRequests = [];
    },
    executeNextRequest: function () {
        var queuedRequests = this.queuedRequests;
        console.log("request started");
        queuedRequests[0]().then(function (data) {
            console.log("request complete", data);
            // remove completed request from queue
            queuedRequests.shift();
            // if there are more requests, execute the next in line
            if (queuedRequests.length) {
                ajaxQueue.executeNextRequest();
            }
        });
    }
};


function amazon_details_parse(html) {

    this.html = html;
    //this.asin = asin;
    this.$doc = $(html);


    this.re_date_ca = /([a-zA-Z.]+)\s(\d{1,2})\s(20\d{2})/;
    this.re_date_de = /(\d{1,2}\.)\s([a-zA-Zäöüß]+)\s(20\d{2})/;
    this.re_date_fr = /(\d{1,2})\s([a-zA-Zàâçéèêëîïôœùû]+)\s(20\d{2})/;
    this.re_date_it = /(\d{1,2})\s([a-zA-Zàéèíìóòúù]+)\s(20\d{2})/;
    this.re_date_us = /([a-zA-Z.]+)\s(\d{1,2}),\s(20\d{2})/;
    this.re_date_jp = /20\d{2}\/\d{1,2}\/\d{1,2}/;
    this.re_date_es = /(\d{1,2})\sde\s([a-zA-Z]+)\sde\s(20\d{2})/; // # 6 de agosto de 2013
    this.re_date_ae = /(\d+)\s([\u0600-\u06FF\uFB8A\u067E\u0686\u06AF]+)\s(\d{1,2})/;
    this.re_data_other = /(\d{1,2})\s([a-zA-Z.]+)\s(20\d{2})/;  //17 April 2019 or  17 Aug. 2016


    this.re_date_arr = [this.re_date_ca, this.re_date_de, this.re_date_fr,
        this.re_date_it, this.re_date_us, this.re_date_jp, this.re_date_es, this.re_date_ae, this.re_data_other];


    this.re_product_size_weight = /([0-9.,]+\sx\s){2}[0-9.,]+\s(inches|cm|mm)\s;\s([0-9.,]+\s(pounds|ounces|kg|g))?/ig;


    this.re_product_size = /([0-9.,]+\sx\s){2}[0-9.,]+\s(inches|cm|mm)/ig; // 14 x 4 x 0.8 inches

    this.re_product_weight = /[0-9.,]+\s(pounds|ounces|kg|g)/ig;


    this.get_main_image_url = function () {

        let image_url = "";
        let $img = this.$doc.find("img[data-old-hires]");
        if ($img.length == 1) {
            image_url = $img.attr("data-old-hires");
        }
        if (!image_url) {
            let $target = this.$doc.find("#imgTagWrapperId>img");
            if ($target.length == 1) {
                image_url = $.trim($target.attr("src"));
            }
        }
        return image_url;
    }


    this.get_base64_image = function () {

        let $target = this.$doc.find("#imgTagWrapperId>img");
        if ($target.length == 1) {
            return $target.attr("src");
        } else {

        }


    }

    this.get_title = function () {

        let $title = this.$doc.find("h2 span,h1 span");

        if ($title.length >= 1) {
            return $.trim($title.html());
        }
        return "";

    }


    this.get_rank_info = function () {

        var rank_info = [];
        if (!this.html) {
            return rank_info;
        }
        var spliter = [" in ", " en ", "-", "في", "商品里排第"];


        var $li = this.$doc.find("#SalesRank").closest("ul").find("li");

        if ($li.length == 0) {
            $li = this.$doc.find("#SalesRank").closest("#detailBullets").find("li");
        }
        if ($li.length > 0) {
            $.each($li, function (i, ele) {
                if ($(ele).has("ul").length == 1) {

                    let rank_link = "";
                    //细分分类排名
                    var $items = $(ele).find(".zg_hrsr li");
                    $.each($items, function (i, item) {
                        var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                        //var rank_category_name = $(item).find(".zg_hrsr_ladder>a").html();
                        let $a = $(item).find(".zg_hrsr_ladder>a");
                        let rank_category_name = $a.html();
                        let link = $a.attr("href");


                        rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                        rank_info.push({
                            "rank_category_name": rank_category_name,
                            "rank_category_number": rank_category_number,
                            "rank_link": link
                        });
                    });
                    $(ele).find("b").remove();

                    $(ele).find("style").remove();
                    $(ele).find("ul").remove();


                    let $a = $(ele).find("a");
                    if ($a.length == 1) {
                        rank_link = $a.attr("href");
                    }

                    $a.remove();
                    var text = $.trim($(ele).html());
                    if (text) {
                        text = text.replace("(", "").replace(")", "");
                        text = $.trim(text);

                        for (var i = 0; i < spliter.length; i++) {
                            var arr = text.split(spliter[i]);
                            if (arr.length == 2) {

                                var rank_category_name, rank_category_number = "";

                                if (text.indexOf("位") > -1 || text.indexOf("名") > -1) {
                                    rank_category_name = arr[0];
                                    rank_category_number = arr[1];

                                } else {
                                    rank_category_name = arr[1];
                                    rank_category_number = arr[0];
                                }
                                rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                rank_info.unshift({
                                    "rank_category_name": $.trim(rank_category_name),
                                    "rank_category_number": rank_category_number,
                                    "rank_link": rank_link
                                });
                                break;
                            }
                        }
                    }
                } else {

                    if ($(ele).has("a").length == 1 && $(ele).find("a").attr("href").indexOf("bestsellers") > -1) {

                        let link = $(ele).find('a').attr("href");
                        $li.find('b').remove();
                        $li.find("a").remove();

                        text = $(ele).html();
                        text = $.trim(text.replace("(", "").replace(")", ""));

                        for (var i = 0; i < spliter.length; i++) {
                            var arr = text.split(spliter[i]);
                            if (arr.length == 2) {

                                var rank_category_name, rank_category_number = "";

                                if (text.indexOf("位") > -1 || text.indexOf("名") > -1) {
                                    rank_category_name = arr[0];
                                    rank_category_number = arr[1];

                                } else {
                                    rank_category_name = arr[1];
                                    rank_category_number = arr[0];
                                }
                                rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                rank_info.unshift({
                                    "rank_category_name": $.trim(rank_category_name),
                                    "rank_category_number": rank_category_number,
                                    "rank_category_link": link
                                });
                                break;
                            }

                        }
                    }
                }
            });

        } else {
            var $target = $(this.html).find("#SalesRank .value");


            if ($target.length == 1) {


                if ($target.find(".zg_hrsr li").length > 0) {

                    //细分分类排名
                    var $items = $target.find(".zg_hrsr li");
                    $.each($items, function (i, item) {
                        var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                        let $a = $(item).find(".zg_hrsr_ladder>a");

                        let rank_category_name = $a.html();

                        let link = $a.attr("href");

                        rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                        rank_info.push({
                            "rank_category_name": rank_category_name,
                            "rank_category_number": rank_category_number,
                            "rank_link": link
                        });
                    });

                }

                $target.find("style").remove();
                $target.find("ul").remove();
                let $a = $target.find("a");

                let rank_link = $a.attr("href");

                $a.remove();

                var text = $.trim($target.html());
                if (text) {
                    text = text.replace("(", "").replace(")", "");
                    text = $.trim(text);

                    for (var i = 0; i < spliter.length; i++) {
                        var arr = text.split(spliter[i]);
                        if (arr.length == 2) {

                            var rank_category_name, rank_category_number = "";

                            if (text.indexOf("位") > -1 || text.indexOf("名") > -1) {
                                rank_category_name = arr[0];
                                rank_category_number = arr[1];

                            } else {
                                rank_category_name = arr[1];
                                rank_category_number = arr[0];
                            }
                            rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                            rank_info.unshift({
                                "rank_category_name": $.trim(rank_category_name),
                                "rank_category_number": rank_category_number,
                                "rank_link": rank_link
                            });
                            break;
                        }
                    }
                }
            }
        }

        if (!rank_info || rank_info.length == 0) {
            var $tr = this.$doc.find("#prodDetails tr,#techSpecSoftlines tr");

            if ($tr.length >= 1) {

                $.each($tr, function (i, ele) {
                    var att_name = $(ele).find("td,th").first().html();
                    var $td = $(ele).find("td,th").eq(1);

                    var has_rank_info = $td.has("span span").length == 1 ? true : false;
                    if ($td.has("ul").length == 1) {


                        var $items = $td.find(".zg_hrsr li");
                        $.each($items, function (i, item) {
                            var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                            //var rank_category_name = $(item).find(".zg_hrsr_ladder>a").html();


                            let $a = $(item).find(".zg_hrsr_ladder>a");
                            let rank_category_name = $a.html();
                            let link = $a.attr("href");


                            rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");

                            rank_info.push({
                                "rank_category_name": rank_category_name,
                                "rank_category_number": rank_category_number,
                                "rank_link": link
                            });
                        });


                        $td.find("b").remove();
                        $td.find("style").remove();
                        $td.find("ul").remove();
                        $a = $td.find("a");
                        let rank_link = $a.attr("href");
                        $a.remove();

                        var text = $.trim($td.html());
                        if (text) {
                            text = text.replace("(", "").replace(")", "");
                            text = $.trim(text);

                            for (var i = 0; i < spliter.length; i++) {
                                var arr = text.split(spliter[i]);
                                if (arr.length == 2) {


                                    var rank_category_name, rank_category_number = "";

                                    if (text.indexOf("位") > -1 || text.indexOf("名") > -1) {
                                        rank_category_name = arr[0];
                                        rank_category_number = arr[1];

                                    } else {
                                        rank_category_name = arr[1];
                                        rank_category_number = arr[0];
                                    }

                                    rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");

                                    rank_info.unshift({
                                        "rank_category_name": $.trim(rank_category_name),
                                        "rank_category_number": rank_category_number,
                                        "rank_link": rank_link
                                    });
                                    break;
                                }
                            }
                        }
                    } else if (has_rank_info) {

                        $td.find("span span").each(function (index, ele) {

                            var $this = $(ele);


                            var rank_text = "";

                            var rank_category_name = "";

                            var rank_category_number = "";

                            var rank_link = "";


                            let $a = $this.find("a");
                            if ($a.length == 1) {
                                rank_link = $a.attr("href");
                                if (/\/[0-9]{8,15}\//.test(rank_link)) {   //子分类排名
                                    rank_category_name = $a.html();
                                    $a.remove();
                                    rank_text = $this.html();
                                    rank_text = rank_text.replace(/\(.*?\)+/, "");
                                    for (var i = 0; i < spliter.length; i++) {
                                        var arr = rank_text.split(spliter[i]);
                                        if (arr.length == 2) {
                                            rank_category_number = arr[0];
                                            rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                            rank_info.unshift({
                                                "rank_category_name": rank_category_name,
                                                "rank_category_number": rank_category_number,
                                                "rank_link": rank_link
                                            });
                                            break;
                                        }
                                    }
                                } else {
                                    $this.find("a").remove();

                                    rank_text = $this.html();

                                    rank_text = $.trim(rank_text.replace(/\(.*?\)+/, ""));

                                    for (var i = 0; i < spliter.length; i++) {
                                        var arr = rank_text.split(spliter[i]);
                                        if (arr.length == 2) {

                                            var rank_category_name, rank_category_number = "";

                                            if (rank_text.indexOf("位") > -1 || rank_text.indexOf("名") > -1) {
                                                rank_category_name = arr[0];
                                                rank_category_number = arr[1];

                                            } else {
                                                rank_category_name = arr[1];
                                                rank_category_number = arr[0];
                                            }
                                            rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                            rank_info.push({
                                                "rank_category_name": $.trim(rank_category_name),
                                                "rank_category_number": rank_category_number,
                                                "rank_link": rank_link
                                            });
                                            break;
                                        }
                                    }
                                }
                            }
                        });
                    }
                });
            }
        }
        return rank_info;
    }


    this.get_sellerId = function () {
        const $sellerId = this.$doc.find("#merchantID, #merchantId");
        if ($sellerId.length == 1) {
            return $sellerId.val();
        } else if ($sellerId.length > 1) {
            return $sellerId.eq(0).val();
        } else {
            return "";
        }
    }


    this.get_brand = function () {


        var brand = "";

        var $brand = this.$doc.find("a#bylineInfo,a#brand");
        if ($brand.length == 1) {

            var brand_url = $brand.attr("href");

            if (brand_url && brand_url.indexOf("bin=") > -1) {
                brand = brand_url.split("bin=")[1]
            } else {

                brand = $.trim($brand.html());
            }

        }
        return brand;
    }


    this.get_features = function () {

        var features = [];


        var $target = this.$doc.find("#feature-bullets");
        if ($target.length == 1) {

            var $items = $target.find(".a-list-item");

            if ($items.length > 0) {

                $.each($items, function (i, item) {
                    let text = $(item).html();
                    text = text.replace(/\s+/g, " ");
                    text = text.replace(/<[^<>]+>/g, "");
                    text = $.trim(text);
                    features.push(text);
                });
            }
        }
        return features;
    }


    this.get_marketplace = function () {

        let match = this.html.match(/ue_sn\s=\s'([a-z.]+)',/);
        if (match && match.length == 2) {
            return match[1];
        } else {
            return "";
        }
    }

    this.get_asin = function () {
        var $asin = this.$doc.find("#ASIN");
        if ($asin.length == 1) {
            return $asin.val();
        }
        //data-detailPageAsin
        return "";

    }


    this.get_answered_questions_count = function () {

        var $ele_answered_questions_count = this.$doc.find("a#askATFLink span");
        if ($ele_answered_questions_count.length == 1) {
            var answered_questions_count = $.trim($ele_answered_questions_count.html());
            answered_questions_count = answered_questions_count.replace(/[^0-9]+/, "");
            answered_questions_count = $.trim(answered_questions_count);
            return answered_questions_count;
        }
        return "0";

    }


    this.get_attrs = function () {


        var attrs = [];
        var rank_info = []
        var $tr = $(this.html).find("#prodDetails tr,#techSpecSoftlines tr");  //https://www.amazon.co.uk/s?k=Tommee&ref=nb_sb_noss

        if ($tr.length >= 1) {

            $.each($tr, function (i, ele) {
                var attr_name = $(ele).find("td,th").first().html();
                var $td = $(ele).find("td,th").eq(1);
                attr_name = attr_name.replace("&nbsp;", "");
                if (attr_name) {
                    var attr_value = $td.html();
                    if (attr_value) {
                        if ($td.has("ul").length >= 1) {
                            return true;
                        } else if ($td.has(".a-icon-star").length >= 1) {
                            return true;
                        } else if ($td.has("a").length >= 1) {
                            return true;
                        } else if (attr_value.indexOf("(") > -1) {
                            return true;
                        }
                        attr_value = $.trim(attr_value.replace(/\([^\)]*\)/g, ""));
                        if (attr_value.length > 50) {
                            return true;
                        }


                        var attr = {"name": attr_name, "value": attr_value};
                        attrs.push(attr);
                    }
                }
            });

        }

        var $lis = $(this.html).find("#SalesRank").closest("ul").find("li");
        if ($lis.length == 0) {
            $lis = $(this.html).find("#detail_bullets_id li,#detailBullets li");
        }
        if ($lis.length > 0) {

            $.each($lis, function (i, ele) {

                var attr_name = "";

                var attr_value = "";

                var $this = $(ele);

                if ($this.has(".a-icon-star").length >= 1) {
                    return true;
                } else if ($this.has("ul").length >= 1) {
                    return true;
                } else if ($this.has("b").length == 1) {

                    attr_name = $(ele).find("b").html();
                    attr_name = attr_name.replace(/[():><]+/, "");
                    attr_name = attr_name.replace("&nbsp;", "");
                    attr_name = $.trim(attr_name);
                    $this.find("b").remove();

                    var attr_value = $this.html();

                    //attr_value = $.trim(attr_value);

                    attr_value = $.trim(attr_value.replace(/\([^\)]*\)/g, ""));
                    attrs.push({"name": attr_name, "value": attr_value});

                } else if ($this.has(".a-text-bold").length == 1) {

                    let $bold_title = $(ele).find(".a-text-bold");

                    attr_name = $bold_title.html().replace(":", "");

                    attr_value = $bold_title.next("span").html()
                    attr_value = attr_value.replace(/\([^\)]*\)/g, "");


                    attrs.push({"name": attr_name, "value": attr_value});


                }


            });

        }

        ////li[@id='SalesRank']/ancestor::ul/li|//div[@id='detail_bullets_id']//li")


        let $row = $(this.html).find("#detailBullets_feature_div span.a-list-item");
        $row.each(function (i, row) {

            let attr_name = $(row).find("span:nth-child(1)").text();
            let attr_value = $(row).find("span:nth-child(2)").text();
            if (attr_name && attr_value) {
                var attr = {"name": attr_name, "value": attr_value};
                attrs.push(attr);
            }


        });


        return attrs;


    }


    this.get_seller = function () {
        var seller = this.$doc.find("#sellerProfileTriggerId").html();
        if (!seller) {
            seller = this.$doc.find("#merchant-info").html();
        }
        return seller;
    }


    this.get_category_info = function () {

        ////a[@class='a-link-normal a-color-tertiary']/text()

        let arr_categories = [];
        let arr_category_links = [];

        var $target = this.$doc.find("a[class='a-link-normal a-color-tertiary']");
        if ($target.length >= 1) {
            $.each($target, function (i, ele) {
                let link = $(ele).attr("href");
                let text = $(ele).html();
                arr_categories.push($.trim(text));
                arr_category_links.push(link);
            })
        }
        return {"categories": arr_categories, "category_links": arr_category_links};

    }

    this.get_sponsored_products_count = function () {
        var $target = this.$doc.find("#sp_detail");
        if ($target.length == 1) {
            var raw_string = $target.attr("data-a-carousel-options")
            if (raw_string) {
                var obj = $.parseJSON(raw_string);
                if (obj) {
                    return obj.set_size
                }
            }
        }
        return "0";
    }


    ////div[starts-with(@id,'desktop-dp-sims_session-similarities')]/div/@data-a-carousel-options
    this.get_view_also_viewed_products_count = function () {
        var $target = this.$doc.find("div[id^='desktop-dp-sims_session-similarities'] div:first");
        if ($target.length == 1) {
            var raw_string = $target.attr("data-a-carousel-options")
            if (raw_string) {
                var obj = $.parseJSON(raw_string);
                if (obj) {
                    return obj.set_size
                }
            }
        }
        return "0";
    }


    this.get_buy_also_buy_products_count = function () {
        var $target = this.$doc.find("div[id='desktop-dp-sims_purchase-similarities-sims-feature'] div:first");
        if ($target.length == 1) {
            var raw_string = $target.attr("data-a-carousel-options")
            if (raw_string) {
                var obj = $.parseJSON(raw_string);
                if (obj) {
                    return obj.set_size
                }
            }
        }
        return "0";
    }


    this.get_cart_info = function () {
        let $cart = this.$doc.find("#addToCart");
        if ($cart.length == 1) {
            let post_url = $cart.attr("action");
            let form_data = $cart.serialize();

            return {"form_data": form_data, "post_url": post_url}
        }
        return null;
    }


    this.get_price = function () {

        //1 span id="priceblock_ourprice" jp B01KZB82WQ

        let $target = this.$doc.find("#priceblock_ourprice");

        let text = "";
        if ($target.length == 1) {
            text = $target.html();

        } else if (this.$doc.has("#priceblock_saleprice").length == 1) {
            text = this.$doc.find("#priceblock_saleprice").html();
        } else if (this.$doc.has("#priceblock_dealprice").length == 1) {
            text = this.$doc.find("#priceblock_dealprice").html();
        }

        text = text.replace(/[^0-9.,]+/g, "");


        text = text.replace(".00", "");


        if (text.indexOf(".") > -1 && text.indexOf(",") > -1) {
            text = text.replace(".", "");
            text = text.replace(",", ".")
        } else if (text.indexOf(",") > -1) {
            text = text.replace(",", ".");
        }


        return text;


    }

    this.get_reviews_nb = function () {

        let $target = this.$doc.find("#acrCustomerReviewText:first-child");
        if ($target.length >= 1) {
            return $.trim($target[0].innerHTML.replace(/[^0-9]/g, ""))
        }
        return "0";
    }

    this.get_rating = function () {

        let $target = this.$doc.find("#averageCustomerReviews .a-icon-alt");
        if ($target.length >= 1) {
            let text = $target[0].innerHTML;


            text = text.replace("&nbsp;", " ");

            text = text.replace("5つ星のうち", "");
            text = text.replace(" 5 ", "");
            text = $.trim(text.replace(/[^0-9.,]/g, ""));

            return text;
        }

        return "";
    }

    this.get_seller_link = function () {

        let $a = this.$doc.find("#sellerProfileTriggerId");
        if ($a.length == 1) {
            return $a.attr("href");
        }
        return "";

    }

    this.get_fulfilled_By = function () {

        let text = this.$doc.find("#merchant-info, #pantry-availability-brief, #mocaBBSoldByAndShipsFrom, table .buying, #buybox_feature_div a#SSOFpopoverLink, #buybox_feature_div p, #usedbuyBox").text().trim()
        let re_sold_by_amz = /((ships|dispatched)\s+from\s+and\s+sold\s+by\s+amazon)|(sold\s+by:\s+amazon)|(Verkauf\s+und\s+Versand\s+durch\s+Amazon)/i;
        let re_fba = /(fulfilled\s+by\s+amazon)|(sold\s+by:)|(Versand\s+durch\s+Amazon)/i;
        let re_fbm = /((ships|dispatched)\s+from\s+and\s+sold\s+by)|(Sold\s+by)|(Verkauf\s+und\s+Versand\s+durch)/i;


        //var s = re_sold_by_amz.test(text) ? p = "Amazon" : re_fba.test(text) ? p = "FBA" : re_fbm.test(text) && (p = "FBM");


        if (re_sold_by_amz.test(text)) {
            return "Amazon"
        } else if (re_fba.test(text)) {
            return "FBA";
        } else if (re_fbm.test(text)) {
            return "FBM"
        } else {
            return 'N/A';
        }
    }

    this.get_variants = function () {

        var re = /"dimensionValuesDisplayData" : (\{.*(?=\})\})/ig;

        var match = this.html.match(re);
        if (match) {
            var s = match[0];
            var data = $.parseJSON("{" + match[0] + "}");

            if (data) {
                return data.dimensionValuesDisplayData;
            }
        }
        return [];
    }


    this.get_avaiable_date = function () {

        let that = this;


        var avaiable_date = "";

        var avaiable_date_formatted = "";
        let date_found = false;
        var attrs = this.get_attrs();
        for (var i = 0; i < attrs.length; i++) {
            var attr_value = attrs[i].value;
            if (!date_found) {
                $.each(that.re_date_arr, function (i, item) {
                    let _re = item;
                    if (_re.test(attr_value)) {
                        avaiable_date = attr_value;
                        let match = attr_value.match(that.re_date_us);
                        if (match) {
                            avaiable_date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
                        } else if (match = attr_value.match(that.re_date_ca)) {
                            avaiable_date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
                        } else if (match = attr_value.match(that.re_date_de)) {
                            avaiable_date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = attr_value.match(that.re_date_fr)) {
                            avaiable_date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = attr_value.match(that.re_date_it)) {
                            avaiable_date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = attr_value.match(that.re_date_es)) {
                            avaiable_date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = attr_value.match(that.re_data_other)) {
                            avaiable_date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        }
                        date_found = true;
                        return false;
                    }
                });
                if (date_found) {
                    continue;
                }
            }
        }


        return avaiable_date_formatted;

    }


    this.get_product_size = function () {
        let that = this;
        var attrs = this.get_attrs();
        let product_size = '';
        for (var i = 0; i < attrs.length; i++) {
            var attr_value = attrs[i].value;
            if (that.re_product_size.test(attr_value)) {
                product_size = attr_value;
            }
        }
        return product_size;
    }
    this.get_product_weight = function () {

        let that = this;
        var attrs = this.get_attrs();
        let product_weight = '';
        for (var i = 0; i < attrs.length; i++) {
            var attr_value = attrs[i].value;
            if (that.re_product_weight.test(attr_value)) {
                product_weight = attr_value;
            }
        }
        return product_weight;

    }
    this.product_size_weight = function () {
        let that = this;
        var attrs = this.get_attrs();
        let product_size_weight = '';
        for (var i = 0; i < attrs.length; i++) {
            var attr_value = attrs[i].value;
            if (that.re_product_size_weight.test(attr_value)) {
                product_size_weight = attr_value;
            }
        }
        return product_size_weight;
    }
}

function amazon_page_asins(html) {
    this.html = html;
    //this.asin = asin;
    this.$doc = $(html);


    let current_page = 1;
    let $current_page = this.$doc.find("li.a-selected a");
    if ($current_page.length == 1) {
        current_page = $current_page.html();
    }

    let page_asins = [];

    let items = this.$doc.find("span[data-component-type='s-search-results'] div[data-asin]");
    //console.log(items)
    $.each(items, function (i, item) {
        let $a = $(item).find("h2 a");
        if ($a.length == 1) {
            let product_url = $a.attr("href")
            let asin = get_asin_from_url(product_url)
            let sponsored = product_url.indexOf("/gp/slredirect/") == -1 ? false : true;
            page_asins.push({"asin": asin, "sponsored": sponsored});
        }
    });
    let next_page_url = '';
    let $next_page_url = this.$doc.find("li.a-last a");
    if ($next_page_url.length == 1) {
        next_page_url = $next_page_url.attr("href");
    }
    let host = '';
    let host_match = html.match(/ue_sn = '(.*?)',/);
    if (host_match) {
        host = host_match[1]
    }
    if (host && next_page_url) {
        next_page_url = 'https://' + host + next_page_url;
    }

    console.log(this.$doc.find("span#glow-ingress-line2").html());


    let records = 0;

    if (current_page == "1") {
        let match = html.match(/"totalResultCount":(\d+),/);
        if (match) {
            records = match[1];
        }
    }
    return {"page": current_page, "records": records, "next_page_url": next_page_url, "page_asins": page_asins};


}

function get_asin_from_url(url) {
    if (url) {
        let match = url.match(/\/dp\/([A-Z0-9]{8,15})/);
        if (match) {
            return match[1];
        }
        match = url.match(/%2Fdp%2F([A-Z0-9]{8,15})%2F/);
        if (match) {
            return match[1];
        }
    }
    return "";
}


function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}


var date_translate = {

    "Jan.": "01",
    "January": "01",
    "Feb.": "02",
    "February": "02",
    "Mar.": "03",
    "March": "03",
    "Apr.": "04",
    "May": "05",
    "Jun.": "06",
    "June": "06",
    "Jul.": "07",
    "July": "07",
    "Aug.": "08",
    "August": "08",
    "Sept.": "09",
    "Oct.": "10",
    "October": "10",
    "Nov.": "11",
    "Dec.": "12",
    "December": "12",


    "Januar": "01",
    "Februar": "02",
    "März": "03",
    "April": "04",
    "Mai": "05",
    "Juni": "06",
    "Juli": "07",
    "September": "09",
    "Oktober": "10",
    "November": "11",
    "Dezember": "12",

    "janvier": "01",
    "février": "02",
    "mars": "03",
    "avril": "04",
    "mai": "05",
    "juin": "06",
    "juillet": "07",
    "août": "08",
    "septembre": "09",
    "octobre": "10",
    "décembre": "12",
    "enero": "01",
    "febrero": "02",
    "abril": "04",
    "mayo": "05",
    "junio": "06",
    "julio": "07",
    "septiembre": "09",
    "octubre": "10",
    "noviembre": "11",
    "diciembre": "12",
    "gennaio": "01",
    "febbraio": "02",
    "marzo": "03",
    "aprile": "04",
    "maggio": "05",
    "giugno": "06",
    "luglio": "07",
    "agosto": "08",
    "settembre": "09",
    "ottobre": "10",
    "novembre": "11",
    "dicembre": "12"
};
String.prototype.format = function () {
    var values = arguments;
    return this.replace(/\{(\d+)\}/g, function (match, index) {
        if (values.length > index) {
            return values[index];
        } else {
            return "";
        }
    });
};

function isArray(obj) {
    return (typeof obj == 'object') && obj.constructor == Array;
}

function isString(str) {
    return (typeof str == 'string') && str.constructor == String;
}


function lazy_load() {
    items = $("img.lazy");
    items.lazyload({
        threshold: 200,
        effect: 'fadeIn',
        placeholder: chrome.extension.getURL("/images/loading.gif")
    });
    //     .popover({
    //     html: true,
    //     trigger: 'hover',
    //     boundary: 'window',
    //     placement: 'right',
    //     container: 'body',
    //     content: function () {
    //         return '<img src="' + $(this).data('img') + '" style="height: 300px;" />';
    //     }
    // })
}


let Amazon = {};

Amazon.parse = function () {
    return {
        asin: function (url) {
            let asin = '';
            let match = url.match(/(dp|product|asin)?\/(B[0-9]{2}[0-9A-Z]{7}|(97(8|9))?\d{9}(\d|X))/);
            let result = '';
            if (match) {
                result = match[2];
            } else if (url.indexOf('slredirect') > -1) {
                match = url.match(/dp%2F(.*)%2F/);
                if (match) {
                    result = match[1]
                }
            }
            if (result.match(/^(B[0-9A-Z]{2}[0-9A-Z]{7}|[0-9]{9}(X|[0-9]))$/)) {
                asin = result;
            }
            return asin;

        },

        title: function (p) {

            let title = p.find("h2 span").html();
            if (!title) {
                title = p.find(".p13n-sc-truncated").attr("title")
            }
            return title;
        },

        url: function (p) {


            let href = p.find("h2 a").attr("href");

            if (!href) {
                href = p.find(".zg-item a").attr("href");
            }
            return href;
        },


        img_url: function (p) {

            let img_url = '';
            img_url = p.find("img.s-image[srcset]").attr("src");
            if (!img_url) {
                img_url = p.find(".zg-item img").attr("src");
            }

            return img_url;


        },

        brand: function (p) {
            brand = '';
            let ele_brand = p.find("h5.s-line-clamp-1 span");
            if (ele_brand.length == 1) {
                brand = ele_brand.html();
            }
            return brand;
        },

        offer_count: function (p) {

            let off_count = 0;

            let ele_a = p.find("a[href*='/offer-listing/']");
            if (ele_a.length == 1) {
                text = $.trim(ele_a.html());

                text = text.replace(/[^0-9]/, "");

                off_count = parseInt(off_count);


            }
            return off_count;

        },

        badge: function (p) {


            let badge = '';


            let ele_s = p.find("span.a-badge-text");

            if (ele_s.length == 1) {
                badge = $.trim(ele_s.html());
            } else if (ele_s.length > 1) {
                let arr = []
                $.each(ele_s, function (i, item) {
                    arr.push($(item).html());
                });
                badge = arr.join(" ");
            }
            return badge;
        },

        coupon: function (p) {

            let coupon = '';

            let text = p.find("span.s-coupon-highlight-color").html();
            if (text) {
                text = $.trim(text.replace(/[a-zA-Z&;]/g, ""));
                coupon = text;
            }
            return coupon;
        },

        reviews_nb: function (p) {

            let reviews_nb = 0;

            let text = $.trim(p.find("a[class='a-link-normal'] span.a-size-base").html());

            if (!text) {
                text = $.trim(p.find(".a-size-base>font>font").html());

            }
            if (text) {
                text = $.trim(text.replace("/[,.]/g", ""));
                if (/\d+/.test(text)) {
                    reviews_nb = parseInt(text);
                }
            }
            return reviews_nb;
        },
        price: function (marketplace_url, p) {
            let price = 0;
            marketplace_url = marketplace_url.replace("https://", "");
            let text = '';
            let ele_p = p.find("[class='a-offscreen']");
            if (ele_p.length >= 1) {
                text = ele_p.eq(0).html();
                if (text) {
                    text = text.replace(/[^0-9.,]/, "");

                    if ("www.amazon.de" == marketplace_url ||
                        "www.amazon.fr" == marketplace_url ||
                        "www.amazon.it" == marketplace_url ||
                        "www.amazon.es" == marketplace_url) {
                        text = text.replace(".", "");
                        text = text.replace(",", ".");
                    } else {
                        text = text.replace(",", "");
                    }

                    if (/[\d.]+/.test(text)) {
                        price = parseFloat(text);
                    }
                }

            }
            if (price == 0) {
                let ele_offer = p.find("a[href*='/offer-listing/']");
                if (ele_offer.length == 1) {
                    let ele_p = ele_offer.closest("div");
                    if (ele_p.length == 1) {
                        text = ele_p.find(".a-color-base").html();
                    }
                }
                text = p.find("a[href*='/offer-listing/']").closest("div").find(".a-color-base").html();
                if (text) {
                    text = text.replace(/[^0-9.,]/, "");
                    if ("www.amazon.de" == marketplace_url ||
                        "www.amazon.fr" == marketplace_url ||
                        "www.amazon.it" == marketplace_url ||
                        "www.amazon.es" == marketplace_url) {
                        text = text.replace(".", "");
                        text = text.replace(",", ".");
                    } else {
                        text = text.replace(",", "");
                    }

                    if (/[\d.]+/.test(text)) {
                        price = parseFloat(text)
                    }
                }
            }
            return price
        },
        rating: function (p) {
            let rating = 0;
            let text = p.find("span[class='a-icon-alt']").html();
            if (text) {
                $.each(text.split(" "), function (i, item) {
                    item = item.replace(",", ".");
                    if (/\d\.\d/.test(item)) {
                        rating = parseFloat(item);
                        return false;
                    }
                });
            }
            return rating;
        },

        pageIndex: function ($html) {

            let pageIndex = 1;
            //return $html.find("li.a-selected>a").html()
            let ele_result = $html.find("li.a-selected>a")
            if (ele_result.length == 1) {
                pageIndex = parseInt(ele_result.html());
            }
            return pageIndex;

        },

        category: function () {
            let value = $("#searchDropdownBox option:selected").val()
            value = value.replace("search-alias=", "");
            return value == "aps" ? "" : value;
        },

        keywords: function () {
            return $("#twotabsearchtextbox").val();
        },


        tpc: function () {
            let tpc = 0;
            let text = $("div[class='a-section a-spacing-small a-spacing-top-small']").find("span:first").html();
            text = text.replace(/\d+\-\d+/g, "");
            text = text.replace(/[^0-9]/ig, "");
            var re = /\d+/;
            if (re.test(text)) {
                tpc = text;
            }
            return tpc;
        },


        prime: function (p) {

            let prime = false;

            let ele_i = p.find("i.a-icon-prime");
            if (ele_i.length == 1) {
                prime = true;
            }
            if (!prime) {
                let items = p.find("div.s-align-children-center span");
                if (items.length > 1) {

                    items.each(function (i, ele) {
                        let text = ele.innerHTML;
                        if (text && text.toLowerCase().indexOf("amazon") > -1) {
                            prime = true;
                            return false;
                        }
                    });
                }
            }
            return prime;
        },

        marketplace_url: function (html) {
            return $(html).find("a.nav-logo-link").attr("aria-label")
        },
        sizeof: function (str, charset) {
            var total = 0,
                charCode,
                i,
                len;
            charset = charset ? charset.toLowerCase() : '';
            if (charset === 'utf-16' || charset === 'utf16') {
                for (i = 0, len = str.length; i < len; i++) {
                    charCode = str.charCodeAt(i);
                    if (charCode <= 0xffff) {
                        total += 2;
                    } else {
                        total += 4;
                    }
                }
            } else {
                for (i = 0, len = str.length; i < len; i++) {
                    charCode = str.charCodeAt(i);
                    if (charCode <= 0x007f) {
                        total += 1;
                    } else if (charCode <= 0x07ff) {
                        total += 2;
                    } else if (charCode <= 0xffff) {
                        total += 3;
                    } else {
                        total += 4;
                    }
                }
            }
            return total;
        },

        escapeHTML: function (text) {
            return text
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    }
}();


function process_search_results(html) {


    let $html = $(html);


    let data = [];

    let next_page_url = '';

    let page = Amazon.parse.pageIndex($html.find("ul.a-pagination"));
    if (!page) {
        page = 1;
    }
    let $blocks = $html.find("span[data-component-type='s-search-results'] div[data-asin^='B']");

    if ($blocks.length == 0) {
        $blocks = $html.find("li.zg-item-immersion");
    }


    let domain = '';
    let match = html.match(/ue_sn = '(.*?)'/);
    if (match) {
        domain = match[1];
    }

    //let domain=Amazon.parse.marketplace_url(html).toLowerCase();


    let index = 0;
    $.each($blocks, function (i, ele) {

        let dic = {};
        let $this = $(ele);
        let url = Amazon.parse.url($this);
        if (url) {
            let asin = Amazon.parse.asin(url);
            let title = Amazon.parse.title($this);
            //let page = page;
            let position = index + 1;
            let price = Amazon.parse.price(domain, $this);
            let rating = Amazon.parse.rating($this);
            let reviews_nb = Amazon.parse.reviews_nb($this);
            let fba = Amazon.parse.prime($this);
            let sponsored = url.indexOf("slredirect") > -1 ? true : false;
            let img_url = Amazon.parse.img_url($this);
            let offerCount = Amazon.parse.offer_count($this);
            let coupon = Amazon.parse.coupon($this);
            let badge = Amazon.parse.badge($this);
            let brand = Amazon.parse.brand($this);
            //let tpc = Amazon.parse.tpc();


            //dic["id"] = new Date().getTime();
            dic["asin"] = asin;
            dic["title"] = title;
            dic["page"] = page;
            dic["position"] = position;
            dic["price"] = price;
            dic["rating"] = rating;
            dic["reviews_nb"] = reviews_nb;
            dic["fba"] = fba;
            dic["sponsored"] = sponsored;
            dic["img_url"] = img_url;
            dic["offerCount"] = offerCount;
            dic["coupon"] = coupon;
            dic["badge"] = badge;
            dic["brand"] = brand;
            dic["domain"] = domain;
            //dic["productUrl"] = "https://www." + domain+ url;
            //dic["tpc"] = tpc;
            data.push(dic);

            index++;
        }
    });


    let current_page = "1";
    let $current_page = $html.find(".a-selected").find("a");
    if ($current_page.length == 1) {
        current_page = $current_page.html();
    }
    let $next_page = $html.find(".a-last").find("a");
    if ($next_page.length == 1) {
        let href = $next_page.attr("href");
        next_page_url = "https://" + domain + href;
    }
    return {"data": data, "next_page_url": next_page_url, "current_page": parseInt(current_page)};

}


function amazon_reviews_parse(html, url) {


    let reviews = [];

    let $doc = $(html);


    let domain = '';
    let match = html.match(/ue_sn = '(.*?)'/);
    if (match) {
        domain = match[1];
    }


    let $blocks = $doc.find("div[data-hook='review']");

    $.each($blocks, function (i, ele) {


        let review = {};


        let $this = $(ele);

        let asin = '';


        let reviewId = $this.attr("id");

        let title = $this.find("a[data-hook='review-title'] span").html();
        if (!title) {
            title = $this.find("span.cr-original-review-content").html();
        }

        let m = url.match(/\/product-reviews\/(B[0-9]{2}[0-9A-Z]{7}|(97(8|9))?\d{9}(\d|X))/);
        if (m) {
            asin = m[1]
        }


        let marketplace = '';


        let text = $this.find("span[data-hook='review-date']").html();
        let date_formatted = '';
        if (text) {
            let helper = new amazon_details_parse(html);
            let match = text.match(helper.re_date_us);
            if (match) {
                date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
            } else if (match = text.match(helper.re_date_ca)) {
                date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
            } else if (match = text.match(helper.re_date_de)) {
                date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
            } else if (match = text.match(helper.re_date_fr)) {
                date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
            } else if (match = text.match(helper.re_date_it)) {
                date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
            } else if (match = text.match(helper.re_date_es)) {
                date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
            } else if (match = text.match(helper.re_data_other)) {
                date_formatted = "{0}/{1}/{2}".format(match[3], date_translate[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
            } else if (match = text.match(helper.re_data_jp)) {
                date_formatted = "{0}/{1}/{2}".format(match[1], match[2].length == 1 ? "0" + match[2] : match[2], match[3].length == 1 ? "0" + match[3] : match[3]);
            }
            $.each(Object.keys(marketplace_mapping), function (i, key) {
                if (text.indexOf(key) > -1) {
                    marketplace = marketplace_mapping[key];
                    return false;
                }
            });
        }
        let rating = '';
        text = $this.find("i[data-hook='review-star-rating'] span[class='a-icon-alt']").html();

        if (!text) {
            text = $this.find("i[data-hook='cmps-review-star-rating'] span[class='a-icon-alt']").html();
        }

        if (text) {
            if (domain == 'www.amazon.co.jp') {
                text = text.replace(/[^0-9.]+/g, " ");
                let arr = text.split(" ");
                if (arr.length == 2) {
                    rating = arr[1];
                }
            } else {
                let arr = text.split(" ");
                if (arr && arr.length > 0) {
                    rating = arr[0];
                    rating = rating.replace(",", ".");
                }
            }
        }


        let content = $this.find("span[data-hook='review-body'] span").html();

        if (!content) {
            content = $this.find("span.cr-original-review-content").html();
        }


        let $images = $this.find("div[class='review-image-tile-section'] img");


        let images = [];
        $images.each(function (i, ele) {
            let img_url = ele.src;
            images.push(img_url);
        });


        let $videoes = $this.find("input[class='video-url']");
        let videoes = [];
        $videoes.each(function (i, ele) {
            let v_url = ele.value;
            videoes.push(v_url);
        });

        let $vp = $this.find("span[data-hook='avp-badge']");
        let vp = $vp.length == 1 ? true : false;


        let helpful_vote = $this.find("span[data-hook='helpful-vote-statement']").html();
        if (helpful_vote) {
            helpful_vote = $.trim(helpful_vote.replace(/[^0-9]+/g, ''));
        } else {
            helpful_vote = "0";
        }

        let comment_count = $this.find("span[class='review-comment-total aok-hidden']").html();


        let reviewer = $this.find("span[class='a-profile-name']").html();


        let avatar = $this.find("img").attr("data-src");

        let avatar_1 = $this.find("noscript img").attr("src");

        if (avatar.indexOf("grey-pixel.gif") > -1 && avatar_1) {
            avatar = avatar_1;
        }


        let reviewer_link = $this.find("div[data-hook='genome-widget'] a").attr("href");
        if (reviewer_link) {
            reviewer_link = "https" + "://" + domain + reviewer_link;
        }
        if (!reviewer_link) {
            console.log('none')
        }


        let reviewer_badges = [];

        let $badges = $this.find("div[class='badges-genome-widget'] span[class～='c7yTopDownDashedStrike']");
        $.each($badges, function (i, ele) {
            reviewer_badges.push(ele.innerHTML);
        });


        let $profile_descriptor = $this.find("span[class='a-profile-descriptor']");
        let profile_descriptor = $profile_descriptor.length == 1 ? $profile_descriptor.html() : "";

        let top_contribute_category = (profile_descriptor.length > 0 && profile_descriptor.indexOf(":") > -1) ? profile_descriptor.split(":")[1] : "";


        let profile_verified = $this.find("span[class='a-profile-verified-badge'] span[class='a-profile-verified-text']").length == 1 ? true : false;

        let early_reviewer_rewards = $this.find("a[class='a-size-mini a-link-normal'][href～='earlyreviewerprogram']").length == 1 ? true : false;


        let foreign_review = $(this).find("div[id^='customer_review_foreign']").length == 1 ? true : false;


        review["reviewId"] = reviewId;
        review["asin"] = asin;
        review["title"] = title;
        review["content"] = content;
        //review["review_date"] = review_date;
        review["rating"] = rating;
        review["images"] = images;
        review["videoes"] = videoes;
        review["vp"] = vp;
        review["helpful_vote"] = helpful_vote;

        review['foreign_review'] = foreign_review;
        review['marketplace']=marketplace;

        review["host"] = domain;

        review["date_formatted"] = date_formatted;

        review["comment_count"] = comment_count;
        review["reviewer"] = reviewer;
        review["avatar"] = avatar;
        review["reviewer_link"] = reviewer_link;
        review["reviewer_badges"] = reviewer_badges;
        review["profile_descriptor"] = profile_descriptor;
        review["profile_verified"] = profile_verified;
        review["early_reviewer_rewards"] = early_reviewer_rewards;


        reviews.push(review);

    });


    let next_page_url = '';
    let current_page = "1";
    match = url.match(/pageNumber=(\d+)/);
    if (match) {
        current_page = match[1];
    }
    let $next_page = $doc.find(".a-last").find("a");
    if ($next_page.length == 1) {
        let href = $next_page.attr("href");
        next_page_url = "https://" + domain + href;
    }
    return {"data": reviews, "next_page_url": next_page_url, "current_page": parseInt(current_page)};

}




let marketplace_mapping = {
    "United States": 'United States',
    "Vereinigten Staaten": 'United States',
    "États-Unis": 'United States',
    "Stati Uniti": 'United States',
    'Estados Unidos': 'United States',
    'アメリカ合衆国': 'United States',


    'United Kingdom': 'United Kingdom',
    'Vereinigten Königreich': 'United Kingdom',
    'Royaume-Uni': 'United Kingdom',
    'Regno Unito': 'United Kingdom',
    'Reino Unido': 'United Kingdom',
    '英国': 'United Kingdom',

    'Germany': 'Germany',
    'Germania': 'Germany',
    'Allemagne': 'Germany',
    'Germania': 'Germany',
    'Alemania': 'Germany',
    'ドイツ': 'Germany',

    'France': 'France',
    'Frankreich': 'France',
    'Francia': 'France',
    'フランス': 'France',

    'Italy': 'Italy',
    'Italien': 'Italy',
    'Italie': 'Italy',
    'Italia': 'Italy',
    'Spain': 'Spain',
    'Spanien': 'Spain',
    'Espagne': 'Spain',
    'Spagna': 'Spain',
    'España': 'Spain',

    'Japan': 'Japan',
    'Giappone': 'Japan'


}


