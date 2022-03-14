API.Amazon = function() {


    var host = '';

    var _url = '';

    var _html = ''

    var $html = ''


    function status200(html) {


        return html.indexOf('captchacharacters') > -1 ? false : true;

    }


    return {


        init_parse: function(html) {

            return new Promise(function(resolve, reject) {
                $html = $(html);
                _html = html;
                resolve();

            })

        },


        init: function(url) {


            let uri = new URL(url);
            host = uri.host;

            _url = url;


            API.Marketplace.init(url);


        },

        set_shippingaddress: function(url) {

            API.Amazon.init(url);
            var that = this;
            return new Promise(function(resolve, reject) {

                let uri = new URL(url);

                let urlParams = null;

                Helper.request.get(url).then(function(html) {

                    if (html.indexOf('sp-cc-accept') > -1) {
                        reject({
                            'status': '000',
                            'error': '无痕模式下，请先打开浏览器点击接受cookies按钮！&nbsp;<a target="_blank" href="' + url + '">点我打开</a>'
                        });
                    } else if (html.indexOf('captchacharacters') == -1) {
                        let modal = $(html).find("span.a-declarative").attr("data-a-modal");
                        if (modal) {
                            let params = JSON.parse(modal);
                            if (params && Object.keys(params).indexOf('url') > -1 && Object.keys(params).indexOf('ajaxHeaders') > -1) {

                                let req_url = params.url;
                                let ajaxHeaders = params.ajaxHeaders;
                                if (ajaxHeaders) {
                                    let csrftoken = ajaxHeaders['anti-csrftoken-a2z'];
                                    return csrftoken;


                                }

                            }
                        }

                    } else {
                        reject({ 'status': '000', 'error': '请求失败' });
                    }


                }).then(function(token) {
                    let country_code = API.Marketplace.get().country_code;
                    const headers = {
                        "Content-Type": "application/json",
                        "x-requested-with": "XMLHttpRequest",
                        "anti-csrftoken-a2z": token,
                        // "downlink":10,
                        // "ect":'4g',
                        // "rtt":300,
                        "referer": url,
                        "accept": 'text/html,*/*',
                        "origin": 'https://www.amazon.com'
                    };
                    const payloadData = new FormData();

                    //let payloadData = {}
                    let s = Helper.array.random(CONST.MARKETPLACE_ZIPCODE_MAPPING[country_code].key);

                    if (country_code == 'AU') {
                        payloadData.set('locationType', 'POSTAL_CODE_WITH_CITY');
                        payloadData.set('zipCode', $.trim(s.zipcode));
                        payloadData.set('city', $.trim(s.city));
                    } else if (country_code == 'AE' || country_code == 'SA') {
                        payloadData.set('locationType', 'CITY');
                        payloadData.set('cityName', $.trim(s.cityName));
                        payloadData.set('city', $.trim(s.city));
                    } else {
                        payloadData.set('locationType', 'LOCATION_INPUT');

                        payloadData.set('zipCode', s);


                        //payloadData['locationType'] = 'LOCATION_INPUT';
                        //payloadData['zipCode'] = s;


                    }

                    // for (let p of urlParams) {
                    //     payloadData.set(p[0], p[1]);
                    // }
                    //

                    payloadData.set('deviceType', 'web');
                    payloadData.set('pageType', 'Detail'); //Search, Detail
                    payloadData.set('actionSource', 'glow');
                    payloadData.set('almBrandId', 'undefined');
                    payloadData.set("storeContext", 'merchant-items');


                    // payloadData['deviceType'] = 'web';
                    // payloadData['pageType'] = 'Detail'; //Search, Detail
                    // payloadData['actionSource'] = 'glow';
                    // payloadData['almBrandId'] = undefined;
                    // payloadData['storeContext'] = 'merchant-items'


                    const payload = new URLSearchParams(payloadData).toString();

                    //console.log(payload)
                    return $.post({
                        url: 'https://' + host + '/gp/delivery/ajax/address-change.html',
                        //data: JSON.stringify(payloadData),
                        withCredentials: true,
                        data: payload,
                        //processData: false,
                        //headers: headers
                        beforeSend: function(request) {
                            //addToken(request);
                            request.setRequestHeader("origin", 'https://www.amazon.com');
                            request.setRequestHeader("anti-csrftoken-a2z", token);
                            request.setRequestHeader("referer", url);
                            request.setRequestHeader("accept", 'text/html,*/*');

                        }

                    });
                }).then(function(result) {
                    if (result.isValidAddress) {
                        resolve(result.address);
                    } else {
                        reject({ 'status': '000', 'error': '邮编设置失败' });
                    }
                }).catch(function(error) {
                    reject({ 'status': '000', 'error': error });
                });
            });
        },
        get_page: function(url) {
            //var url = "https://" + host + urlPath;
            return $.ajax({
                type: "GET",
                cache: false,
                url: url
            })
        },
        post_data: function(url, data) {

            return $.ajax({
                type: "POST",
                url: url,
                data: data
            })
        },


        get_page_asins: function(domain, $blocks) {


            let data = [];


            $.each($blocks, function(index, ele) {


                let dic = {};
                let $this = $(ele);
                let _url = API.Amazon.SearchResultRowParse.url($this);
                if (_url) {
                    let asin = API.Amazon.SearchResultRowParse.asin(_url);
                    let title = API.Amazon.SearchResultRowParse.title($this);
                    //let page = current_page;
                    let position = index + 1;
                    let price = API.Amazon.SearchResultRowParse.price(domain, $this);
                    let rating = API.Amazon.SearchResultRowParse.rating($this);
                    let reviews_nb = API.Amazon.SearchResultRowParse.reviews_nb($this);
                    let fba = API.Amazon.SearchResultRowParse.prime($this);
                    let sponsored = _url.indexOf("slredirect") > -1 ? true : false;
                    let img_url = API.Amazon.SearchResultRowParse.img_url($this);
                    let offerCount = API.Amazon.SearchResultRowParse.offer_count($this);
                    let coupon = API.Amazon.SearchResultRowParse.coupon($this);
                    let badge = API.Amazon.SearchResultRowParse.badge($this);
                    let brand = API.Amazon.SearchResultRowParse.brand($this);


                    //page_asins.push({"asin": asin, "sponsored": sponsored});

                    dic["asin"] = asin;
                    dic["title"] = title;
                    //dic["page"] = page;
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
                    dic['productUrl'] = _url;

                    data.push(dic);
                }

            });


            return data;


        },


        search_page_parse: function(url, html) {

            API.Amazon.init(url);
            return new Promise(function(resolve, reject) {
                let domain = host;
                let $html = $(html);
                let data = [];
                let next_page_url = '';
                let current_page = "";
                let $current_page = $html.find("span.s-pagination-selected");
                if ($current_page.length == 1) {
                    current_page = $current_page.html();
                }
                if (!current_page) {
                    current_page = $html.find('li.a-selected a').html();
                }

                current_page = current_page ? current_page : 1;


                let $next_page = $html.find("a.s-pagination-next");
                if ($next_page.length == 1) {
                    let href = $next_page.attr("href");
                    next_page_url = href;
                }
                if (!next_page_url) {
                    $next_page = $html.find('li.a-last a');
                    if ($next_page.length == 1) {
                        next_page_url = $next_page.attr("href");

                    }
                }
                if (!next_page_url) {
                    let re = /<li\sclass="a-last"><a\shref="(.*?)">/;
                    let arr = re.exec(html);
                    if (arr && arr.length > 1) {
                        next_page_url = arr[1];
                    }
                    if (!next_page_url) {
                        re = />\d+<\/(a|span)><a\s*href="([^"]*)"[^>]* class="s-pagination-item s-pagination-next s-pagination-button s-pagination-separator">/;
                        arr = re.exec(html);
                        if (arr && arr.length > 2) {
                            next_page_url = arr[2];
                        }
                    }
                }

                if (next_page_url) {
                    next_page_url = "https://" + domain + next_page_url;
                }
                let $blocks = $html.find("[data-component-type='s-search-results'] div[data-asin^='B']");
                let $blocks_2 = $html.find("[data-component-type='s-search-results']");
                let $blocks_3 = $html.find("div[data-asin^='B']");


                if ($blocks.length == 0) {
                    $blocks = $html.find("li.zg-item-immersion");
                }

                let rows = API.Amazon.get_page_asins(domain, $blocks);
                if ($html.find("noscript[data-encode-id='sp-btf-content']").length == 1) {
                    let $doc = $($html.find("noscript[data-encode-id='sp-btf-content']").html());
                    $hidden_blocks = $doc.find("[data-component-type='s-search-result']");
                    let hidden_rows = API.Amazon.get_page_asins(domain, $hidden_blocks);
                    rows = (hidden_rows && hidden_rows.length > 0) ? rows.concat(hidden_rows) : rows;
                }

                let records = 0;
                if (current_page == "1") {
                    let match = html.match(/"totalResultCount":(\d+),/);
                    if (match) {
                        records = match[1];
                    }
                }

                rows.forEach((item, idx) => {
                    item['position'] = idx;
                    item['page'] = current_page;
                });

                let shippping_address = $html.find("#glow-ingress-line2").html();
                if (shippping_address) {
                    shippping_address = $.trim(shippping_address);
                }
                let page_asins = [];
                let index = 0;
                resolve({
                    "result": 1,
                    "page": current_page,
                    "data": rows,
                    "records": records,
                    "current_page_url": url,
                    "next_page_url": next_page_url,
                    "current_page": parseInt(current_page),
                    "page_asins": page_asins,
                    "shippping_address": shippping_address
                });

            });


        },


        detail_page_parse: function(html, url) {
            this.init(url);

            return new Promise(function(resolve, reject) {
                let $html = $(html);
                if (html.indexOf('captchacharacters') > -1) {
                    let captcha_url = $(html).find("img[src*='captcha']").attr('src');
                    let amzn = $(html).find("input[name='amzn']").val();
                    let amzn_r = $(html).find("input[name='amzn-r']").val();
                    let post_url = $(html).find("form").attr("action");
                    let data = {
                        'url': post_url,
                        'captcha_url': captcha_url,
                        'amzn': amzn,
                        'amzn_r': amzn_r,
                        'domain': host
                    };
                    resolve({
                        "result": 0,
                        "reason": 'captcha',
                        "data": data
                    });
                } else {


                    let is_eu_marketplace = CONST.eu_marketplaces.indexOf(host) > -1;

                    try {
                        let asin = API.Amazon.get_asin_from_url(url);
                        let text = '';
                        //img url
                        let image_url = "";
                        let $img = $html.find("img[data-old-hires]");
                        if ($img.length == 1) {
                            image_url = $img.attr("data-old-hires");
                        }
                        if (!image_url) {
                            let $target = $html.find("#imgTagWrapperId>img");
                            if ($target.length == 1) {
                                image_url = $.trim($target.attr("src"));
                            }
                        }
                        //title

                        let title = '';
                        let $title = $html.find("h2 span,h1 span");
                        if ($title.length >= 1) {
                            title = $.trim($title.html());
                        }
                        //sellerId
                        let sellerId = ''
                        const $sellerId = $html.find("#merchantID, #merchantId");
                        if ($sellerId.length == 1) {
                            sellerId = $sellerId.val();
                        } else if ($sellerId.length > 1) {
                            sellerId = $sellerId.eq(0).val();
                        }
                        //seller
                        let seller = $html.find("#sellerProfileTriggerId").html();
                        if (!seller) {
                            seller = $html.find("#merchant-info").html();
                        }
                        seller = !seller ? '' : seller;

                        //brand
                        let brand = '';
                        let brand_store_url = '';
                        let brand_text = "";
                        const $brand = $html.find("a#bylineInfo,a#brand");
                        if ($brand.length == 1) {
                            var brand_url = $brand.attr("href");
                            if (brand_url) {
                                brand_store_url = brand_url;
                            }
                            if (brand_url && brand_url.indexOf("bin=") > -1) {
                                brand_text = brand_url.split("bin=")[1]
                            } else {
                                brand_text = $.trim($brand.html());
                            }
                        }
                        let brand_store = false;
                        if (brand_text &&
                            (brand_text.indexOf('Visit the') > -1 ||
                                brand_text.indexOf('Visiter la boutique') > -1 ||
                                brand_text.indexOf('Besuchen Sie den') > -1 ||
                                brand_text.indexOf('のストアを表示') > -1 ||
                                brand_text.indexOf('Visita lo Store di') > -1
                            )
                        ) {
                            brand_store = true;
                        }

                        if (brand_text) {
                            brand_text = brand_text.replace("Brand:", '');
                            brand_text = brand_text.replace("Visit the ", '');
                            brand_text = brand_text.replace(" Store", '');
                            //de
                            brand_text = brand_text.replace("Besuchen Sie den ", '');
                            brand_text = brand_text.replace("-Store ", '');
                            //fr
                            brand_text = brand_text.replace("Visiter la boutique ", '');
                            //it
                            brand_text = brand_text.replace("Visita lo Store di", '');
                            //es
                            brand_text = brand_text.replace("Marca:", '');

                            //jp
                            brand_text = brand_text.replace("ブランド:", '')
                            brand_text = brand_text.replace("のストアを表示", '')


                            brand = $.trim(brand_text);

                            if (brand && brand.indexOf("%") > -1) {
                                try {
                                    brand = decodeURIComponent(brand);
                                } catch (e) {}

                            }
                        }

                        //features
                        var features = [];
                        var $target = $html.find("#feature-bullets");
                        if ($target.length == 1) {
                            var $items = $target.find(".a-list-item");
                            if ($items.length > 0) {
                                $.each($items, function(i, item) {
                                    let text = $(item).html();
                                    text = text.replace(/\s+/g, " ");
                                    text = text.replace(/<[^<>]+>/g, "");
                                    text = $.trim(text);
                                    features.push(text);
                                });
                            }
                        }

                        //qa
                        let qa = 0;
                        var $ele_answered_questions_count = $html.find("a#askATFLink span");
                        if ($ele_answered_questions_count.length == 1) {
                            var answered_questions_count = $.trim($ele_answered_questions_count.html());
                            answered_questions_count = answered_questions_count.replace(/[^0-9]+/, "");
                            answered_questions_count = $.trim(answered_questions_count);
                            qa = Helper.validator.toInt(answered_questions_count);
                        }

                        //category
                        let categories = [];

                        let arr_categories = [];
                        let arr_category_links = [];

                        var $target = $html.find("a[class='a-link-normal a-color-tertiary']");
                        if ($target.length >= 1) {
                            $.each($target, function(i, ele) {
                                let link = $(ele).attr("href");
                                let text = $(ele).html();
                                arr_categories.push($.trim(text));
                                arr_category_links.push(link);
                                categories.push({ 'category_name': $.trim(text), 'category_link': link });
                            });
                        }
                        //price
                        let price = 0;
                        $target = $html.find("#priceblock_ourprice");

                        if ($target.length == 1) {
                            text = $target.html();

                        } else if ($html.find("#priceblock_saleprice").length == 1) {
                            text = $html.find("#priceblock_saleprice").html();
                        } else if ($html.find("#priceblock_dealprice").length == 1) {
                            text = $html.find("#priceblock_dealprice").html();
                        }
                        text = text.replace(/[^0-9.,]+/g, "");
                        text = text.replace(".00", "");
                        if (text.indexOf(".") > -1 && text.indexOf(",") > -1) {
                            text = text.replace(".", "");
                            text = text.replace(",", ".")
                        } else if (is_eu_marketplace && text.indexOf(",") > -1) {
                            text = text.replace(",", ".");
                        } else {
                            text = text.replace(",", "");
                        }
                        price = Helper.validator.toFloat(text);

                        //reviews_nb

                        let reviews_nb = 0;
                        $target = $html.find("#acrCustomerReviewText:first-child");
                        if ($target.length >= 1) {
                            let text = $.trim($target[0].innerHTML.replace(/[^0-9]/g, ""));
                            reviews_nb = Helper.validator.toInt(text);
                        }

                        //rating
                        let rating = 0;
                        $target = $html.find("#averageCustomerReviews .a-icon-alt");
                        $target = $html.find("#averageCustomerReviews #acrPopover")
                        if ($target.length >= 1) {
                            let text = $target[0].innerHTML;
                            text = $target[0].title;
                            text = text.replace("&nbsp;", " ");
                            text = text.replace("5つ星のうち", "");
                            text = text.replace(" 5 ", "");
                            text = $.trim(text.replace(/[^0-9,.]/g, ""));
                            rating = Helper.validator.toFloat(text);
                        }


                        //attr


                        var attrs = [];
                        var $tr = $html.find("#prodDetails tr,#techSpecSoftlines tr"); //https://www.amazon.co.uk/s?k=Tommee&ref=nb_sb_noss
                        if ($tr.length >= 1) {
                            $.each($tr, function(i, ele) {
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
                                        var attr = { "name": $.trim(attr_name), "value": attr_value };
                                        attrs.push(attr);
                                    }
                                }
                            });
                        }
                        var $lis = $html.find("#SalesRank").closest("ul").find("li");
                        if ($lis.length == 0) {
                            $lis = $html.find("#detail_bullets_id li,#detailBullets li");
                        }
                        if ($lis.length > 0) {
                            $.each($lis, function(i, ele) {
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
                                    attr_value = $.trim(attr_value.replace(/\([^\)]*\)/g, ""));
                                    attrs.push({ "name": attr_name, "value": attr_value });
                                } else if ($this.has(".a-text-bold").length == 1) {
                                    let $bold_title = $(ele).find(".a-text-bold");
                                    attr_name = $bold_title.html().replace(":", "");
                                    attr_value = $bold_title.next("span").html()
                                    attr_value = attr_value.replace(/\([^\)]*\)/g, "");
                                    attrs.push({ "name": attr_name, "value": attr_value });
                                }
                            });
                        }
                        let $row = $html.find("#detailBullets_feature_div span.a-list-item");
                        $row.each(function(i, row) {
                            let attr_name = $(row).find("span:nth-child(1)").text();
                            let attr_value = $(row).find("span:nth-child(2)").text();
                            if (attr_name && attr_value) {
                                var attr = { "name": attr_name, "value": attr_value };
                                attrs.push(attr);
                            }
                        });

                        //available_date
                        let available_date = '';
                        let date_found = false;
                        for (var i = 0; i < attrs.length; i++) {
                            var attr_value = attrs[i].value;
                            if (!date_found) {
                                $.each(CONST.re_date_arr, function(i, item) {
                                    let _re = item;
                                    if (_re.test(attr_value)) {
                                        //available_date = attr_value;
                                        let match = attr_value.match(re_date_us);
                                        if (match) {
                                            available_date = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
                                        } else if (match = attr_value.match(re_date_ca)) {
                                            available_date = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
                                        } else if (match = attr_value.match(re_date_de)) {
                                            available_date = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                                        } else if (match = attr_value.match(re_date_fr)) {
                                            available_date = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                                        } else if (match = attr_value.match(re_date_it)) {
                                            available_date = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                                        } else if (match = attr_value.match(re_date_es)) {
                                            available_date = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                                        } else if (match = attr_value.match(re_date_jp)) {
                                            available_date = "{0}-{1}-{2}".format(match[1], match[2], match[3].length == 1 ? "0" + match[3] : match[3]);
                                        } else if (match = attr_value.match(re_date_jp_r)) {
                                            available_date = "{0}-{1}-{2}".format(match[1], match[2], match[3].length == 1 ? "0" + match[3] : match[3]);
                                        } else if (match = attr_value.match(re_date_other)) {
                                            available_date = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
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
                        //seller or fba
                        let fba = false;
                        if (html.indexOf("Dispatched from and sold by Amazon") > -1 ||
                            html.indexOf("Ships from and sold by Amazon.com") > -1 ||
                            html.indexOf("Verkauf und Versand durch Amazon") > -1 ||
                            html.indexOf("Expédié et vendu par Amazon") > -1 ||
                            html.indexOf("Venduto e spedito da Amazon") > -1 ||
                            html.indexOf("Vendido y enviado por Amazon") > -1 ||
                            html.indexOf("Cloudtail India") > -1 ||
                            html.indexOf("Ships from and sold by Amazon.sa") > -1 ||
                            html.indexOf("Ships from and sold by Amazon.ca") > -1) {
                            seller = "Amazon";
                            fba = true;
                        }
                        if (!fba) {
                            fba = $html.find('#SSOFpopoverLink').length == 1 ? true : false;

                            seller = $.trim($html.find("#sellerProfileTriggerId").html());
                            if (seller.indexOf("Amazon") > -1) {
                                fba = true;
                                if (!seller) {
                                    seller = 'Amazon';
                                }
                            }
                        }
                        if (!fba) {
                            let $tds = $html.find('span[class="tabular-buybox-text"]');
                            if ($tds.length >= 2) {
                                let ships_from = $tds[0].innerHTML;
                                let soldby = $tds[1].innerHTML;
                                if (ships_from.indexOf('Amazon') > -1) {
                                    fba = true;
                                }
                                if (!seller && soldby.indexOf('Amazon') > -1) {
                                    seller = 'Amazon';
                                }
                            }
                        }
                        if (!seller) {
                            seller = $html.find("#merchant-info").html();
                        }


                        //product size
                        let product_size = '';
                        for (var i = 0; i < attrs.length; i++) {
                            var attr_value = attrs[i].value;
                            if (CONST.re_product_size.test(attr_value)) {
                                product_size = attr_value;
                            }
                        }
                        //
                        let product_weight = '';
                        for (var i = 0; i < attrs.length; i++) {
                            var attr_value = attrs[i].value;
                            if (CONST.re_product_weight.test(attr_value)) {
                                product_weight = attr_value;
                            }
                        }
                        let product_size_weight = '';
                        for (var i = 0; i < attrs.length; i++) {
                            var attr_value = attrs[i].value;
                            if (CONST.re_product_size_weight.test(attr_value)) {
                                product_size_weight = attr_value;
                            }
                        }
                        var rank_info = [];


                        $html.find("a[href^='/gp/bestsellers/']:not([class])").each(function(i, ele) {
                            let text = '';
                            let ele_span = $(ele).closest("li.zg_hrsr_item,#SalesRank");
                            if (ele_span.length == 0) {
                                ele_span = $(ele).parent('span');
                            }
                            if (ele_span.length == 0) {
                                ele_span = $(ele).closest("td");
                            }
                            ele_span.find('b').remove();
                            ele_span.find('style').remove();
                            text = $.trim(ele_span.text());
                            text = text.replace("Amazon 売れ筋ランキング:", '');
                            text = text.replace(/\(.*?\)/, '\n');
                            let arr = text.split(/\n/);
                            $.each(arr, function(n, item) {

                                if (!item) {
                                    return true;
                                }

                                item = $.trim(item);

                                if (item.indexOf("- ") == 0) {
                                    item = item.replace("- ", '')
                                } else if (item.indexOf(" - ") > -1) {
                                    item = item.replace("位", '');
                                    item = item.replace(" - ", '位')
                                } else if (item.indexOf("─") > -1) {
                                    item = item.replace("─", '');
                                }
                                item = item.replace(/\s+/, ' ');

                                //item = item.replace(",", '');


                                //item=item.replace("-",'')

                                //─&nbsp;

                                let found = false;

                                for (let j = 0; j < CONST.rank_split.length; j++) {

                                    if (!item) {
                                        continue;
                                    }

                                    let rank_number = '';
                                    let rank_category = '';
                                    let spiter = CONST.rank_split[j];
                                    let v = item.split(spiter);
                                    if (v.length == 2) {

                                        if (item.indexOf("位") > -1) {

                                            if (/\d+/.test(v[0])) {
                                                rank_number = v[0];
                                                rank_category = v[1];

                                            } else {

                                                rank_number = v[1];
                                                rank_category = v[0];
                                            }

                                        } else {
                                            rank_number = v[0];
                                            rank_category = v[1];
                                        }


                                        rank_number = Helper.validator.toInt(rank_number);
                                        rank_info.push({
                                            "rank_category_name": $.trim(rank_category),
                                            "rank_category_number": rank_number,
                                            "rank_link": ele.pathname
                                        });
                                        found = true;
                                        break;
                                    }
                                }
                                if (found) {
                                    return false;
                                }

                            });
                        });


                        if (!rank_info || rank_info.length == 0) {


                            var $li = $html.find("#SalesRank").closest("ul").find("li");

                            if ($li.length == 0) {
                                $li = $html.find("#SalesRank").closest("#detailBullets").find("li");
                            }
                            if ($li.length > 0) {
                                $.each($li, function(i, ele) {
                                    if ($(ele).has("ul").length == 1) {

                                        let rank_link = "";
                                        //细分分类排名
                                        var $items = $(ele).find(".zg_hrsr li");
                                        $.each($items, function(i, item) {
                                            var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                                            //var rank_category_name = $(item).find(".zg_hrsr_ladder>a").html();
                                            let $a = $(item).find(".zg_hrsr_ladder>a");
                                            let rank_category_name = $a.html();
                                            let link = $a.attr("href");


                                            rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                            rank_info.push({
                                                "rank_category_name": rank_category_name,
                                                "rank_category_number": Helper.validator.toInt(rank_category_number),
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

                                            for (var i = 0; i < CONST.spliter.length; i++) {
                                                var arr = text.split(CONST.spliter[i]);
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
                                                        "rank_category_number": Helper.validator.toInt(rank_category_number),
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

                                            for (var i = 0; i < CONST.spliter.length; i++) {
                                                var arr = text.split(CONST.spliter[i]);
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
                                                        "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                        "rank_category_link": link
                                                    });
                                                    break;
                                                }

                                            }
                                        }
                                    }
                                });

                            } else {
                                var $target = $html.find("#SalesRank .value");


                                if ($target.length == 1) {
                                    if ($target.find(".zg_hrsr li").length > 0) {
                                        //细分分类排名
                                        var $items = $target.find(".zg_hrsr li");
                                        $.each($items, function(i, item) {
                                            var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                                            let $a = $(item).find(".zg_hrsr_ladder>a");

                                            let rank_category_name = $a.html();

                                            let link = $a.attr("href");

                                            rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                            rank_info.push({
                                                "rank_category_name": rank_category_name,
                                                "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                "rank_link": link
                                            });
                                        });
                                    }

                                    $target.find("style").remove();
                                    $target.find("ul").remove();
                                    let $a = $target.find("a");
                                    let rank_link = $a.attr("href");
                                    $a.remove();
                                    text = $.trim($target.html());
                                    if (text) {
                                        text = text.replace("(", "").replace(")", "");
                                        text = $.trim(text);

                                        for (var i = 0; i < CONST.spliter.length; i++) {
                                            var arr = text.split(CONST.spliter[i]);
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
                                                    "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                    "rank_link": rank_link
                                                });
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (!rank_info || rank_info.length == 0) {
                            var $tr = $html.find("#prodDetails tr,#techSpecSoftlines tr");

                            if ($tr.length >= 1) {

                                $.each($tr, function(i, ele) {
                                    var att_name = $(ele).find("td,th").first().html();
                                    var $td = $(ele).find("td,th").eq(1);

                                    var has_rank_info = $td.has("span span").length == 1 ? true : false;
                                    if ($td.has("ul").length == 1) {


                                        var $items = $td.find(".zg_hrsr li");
                                        $.each($items, function(i, item) {
                                            var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                                            //var rank_category_name = $(item).find(".zg_hrsr_ladder>a").html();


                                            let $a = $(item).find(".zg_hrsr_ladder>a");
                                            let rank_category_name = $a.html();
                                            let link = $a.attr("href");


                                            rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");

                                            rank_info.push({
                                                "rank_category_name": rank_category_name,
                                                "rank_category_number": Helper.validator.toInt(rank_category_number),
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

                                            for (var i = 0; i < CONST.spliter.length; i++) {
                                                var arr = text.split(CONST.spliter[i]);
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
                                                        "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                        "rank_link": rank_link
                                                    });
                                                    break;
                                                }
                                            }
                                        }
                                    } else if (has_rank_info) {

                                        $td.find("span span").each(function(index, ele) {

                                            var $this = $(ele);


                                            var rank_text = "";

                                            var rank_category_name = "";

                                            var rank_category_number = "";

                                            var rank_link = "";


                                            let $a = $this.find("a");
                                            if ($a.length == 1) {
                                                rank_link = $a.attr("href");
                                                if (/\/[0-9]{8,15}\//.test(rank_link)) { //子分类排名
                                                    rank_category_name = $a.html();
                                                    $a.remove();
                                                    rank_text = $this.html();
                                                    rank_text = rank_text.replace(/\(.*?\)+/, "");
                                                    for (var i = 0; i < CONST.spliter.length; i++) {
                                                        var arr = rank_text.split(CONST.spliter[i]);
                                                        if (arr.length == 2) {
                                                            rank_category_number = arr[0];
                                                            rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                                            rank_info.unshift({
                                                                "rank_category_name": rank_category_name,
                                                                "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                                "rank_link": rank_link
                                                            });
                                                            break;
                                                        }
                                                    }
                                                } else {
                                                    $this.find("a").remove();

                                                    rank_text = $this.html();

                                                    rank_text = $.trim(rank_text.replace(/\(.*?\)+/, ""));

                                                    for (var i = 0; i < CONST.spliter.length; i++) {
                                                        var arr = rank_text.split(CONST.spliter[i]);
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
                                                                "rank_category_number": Helper.validator.toInt(rank_category_number),
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
                        if (!rank_info || rank_info.length == 0) {


                            if (url.indexOf('www.amazon.com.au') > -1) {


                            } else if (url.indexOf('www.amazon.com.br') > -1) {

                            } else if (url.indexOf('www.amazon.com.mx') > -1) {

                            } else if (url.indexOf('www.amazon.com') > -1) {
                                $html.find("th:contains('Best Sellers Rank')");

                            } else if (url.indexOf('www.amazon.ca') > -1) {

                            } else if (url.indexOf('www.amazon.co.uk') > -1) {

                            } else if (url.indexOf('www.amazon.de') > -1) {

                            } else if (url.indexOf('www.amazon.fr') > -1) {

                                // $th=$html.find('th:contains("Classement des meilleures ventes d\'Amazon');
                                // if($th.length==1){
                                //     if($th.next('td').length==1){
                                //         let items=$th.next('td').find('span span');
                                //         for(let idx in items){
                                //             console.log(items[idx].innerHTML)
                                //         }
                                //     }
                                // }

                            }


                        }

                        if (seller && seller.indexOf("%") > -1) {
                            try {
                                seller = decodeURIComponent(seller);
                            } catch (e) {
                                //nothing to do
                            }
                        }


                        //ue_mid = 'A1PA6795UKMFR9',

                        let marketplaceId = '';
                        let match = html.match(/ue_mid = '([0-9A-Z]+)'/);
                        if (match) {
                            marketplaceId = match[1];
                        }


                        let variants_count = 0;
                        match = html.match(/"dimensionValuesDisplayData" : (\{.*(?=\})\})/);
                        if (match && match.length == 2) {
                            try {
                                let obj = JSON.parse(match[1]);
                                variants_count = Object.keys(obj).length;
                            } catch (e) {
                                console.log(e)
                            }
                        }


                        // let domain = '';
                        // match = html.match(/ue_sn\s=\s'([a-z.]+)',/);
                        // if (match && match.length >= 2) {
                        //     domain = match[1];
                        // }


                        let asin_data = {
                            marketplaceId: marketplaceId,
                            asin: asin,
                            title: title,
                            brand: brand,
                            reviews_nb: reviews_nb,
                            fba: fba,
                            qa: qa,
                            seller: seller && seller.indexOf("</span>") > -1 ? "" : seller,
                            sellerId: sellerId,
                            rating: rating,
                            price: price,
                            sign: API.Marketplace.get().currency_sign,
                            product_weight: product_weight,
                            product_size: product_size,
                            //fulfilledBy: fulfilledBy,


                            host: host,
                            attrs: attrs,

                            features: features,
                            available_date: available_date,
                            category: categories,
                            rank_info: rank_info,
                            complete: true,
                            brand_store: brand_store,
                            brand_store_url: brand_store_url,
                            variants_count: variants_count,
                            amazon_choice: html.indexOf('amazons-choice-popover') > -1 ? true : false
                        };

                        if (image_url) {
                            asin_data['image_url'] = image_url;
                        }
                        resolve({ "result": 1, "asin_data": asin_data });
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        },

        reviews_page_parse: function(html, url) {

            this.init(url);


            return new Promise(function(resolve, reject) {
                let reviews = [];
                let $doc = $(html);
                let domain = host;
                // let match = html.match(/ue_sn = '(.*?)'/);
                // if (match) {
                //     domain = match[1];
                // }


                let R = {};


                let $blocks = $doc.find("div[data-hook='review']");

                $.each($blocks, function(i, ele) {


                    let $this = $(ele);

                    let asin = '';


                    let reviewId = $this.attr("id");

                    let title = $this.find("[data-hook='review-title'] span").html();
                    if (!title) {
                        title = $this.find("span.cr-original-review-content").html();
                    }
                    if (!title) {
                        console.log(33333)
                    }

                    let m = url.match(/\/product-reviews\/(B[0-9]{2}[0-9A-Z]{7}|(97(8|9))?\d{9}(\d|X))/);
                    if (m) {
                        asin = m[1]
                    }
                    let marketplace = '';


                    let text = $this.find("span[data-hook='review-date']").html();
                    let date_formatted = '';
                    if (text) {
                        //let helper = new amazon_details_parse(html);
                        let match = text.match(CONST.re_date_us);
                        if (match) {
                            date_formatted = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
                        } else if (match = text.match(CONST.re_date_ca)) {
                            date_formatted = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
                        } else if (match = text.match(CONST.re_date_de)) {
                            date_formatted = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = text.match(CONST.re_date_fr)) {
                            date_formatted = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = text.match(CONST.re_date_it)) {
                            date_formatted = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = text.match(CONST.re_date_es)) {
                            date_formatted = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = text.match(CONST.re_date_other)) {
                            date_formatted = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                        } else if (match = text.match(CONST.re_date_jp)) {
                            date_formatted = "{0}/{1}/{2}".format(match[1], match[2].length == 1 ? "0" + match[2] : match[2], match[3].length == 1 ? "0" + match[3] : match[3]);
                        } else if (match = text.match(CONST.re_date_jp_r)) {
                            date_formatted = "{0}/{1}/{2}".format(match[1], match[2].length == 1 ? "0" + match[2] : match[2], match[3].length == 1 ? "0" + match[3] : match[3]);

                        }
                        $.each(Object.keys(CONST.marketplace_mapping), function(i, key) {
                            if (text.indexOf(key) > -1) {
                                marketplace = CONST.marketplace_mapping[key];
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

                    rating = API.Amazon.ValidFieldHelper.Rating(rating);


                    let content = $this.find("span[data-hook='review-body'] span").html();

                    if (!content) {
                        content = $this.find("span.cr-original-review-content").html();
                    }
                    if (content) {
                        content = $.trim(content);
                    }


                    let $images = $this.find("div[class='review-image-tile-section'] img");


                    let images = [];
                    $images.each(function(i, ele) {
                        let img_url = ele.src;
                        images.push(img_url);
                    });


                    let $videoes = $this.find("input[class='video-url']");
                    let videoes = [];
                    $videoes.each(function(i, ele) {
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

                    helpful_vote = API.Amazon.ValidFieldHelper.Int(helpful_vote);

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
                    let reviewer_badges = [];

                    let $badges = $this.find("div[class='badges-genome-widget'] span[class～='c7yTopDownDashedStrike']");
                    $.each($badges, function(i, ele) {
                        reviewer_badges.push(ele.innerHTML);
                    });


                    let buy_opotion = $this.find('a[data-hook="format-strip"]').html();
                    if (buy_opotion) {
                        buy_opotion = $.trim(buy_opotion);

                        buy_opotion = buy_opotion.replace(/(<([^>]+)>)/ig, ',');
                        buy_opotion = buy_opotion.replace(",,", ',');
                        buy_opotion = buy_opotion.replace(/\s+/g, '');
                    } else {
                        buy_opotion = '';
                    }

                    console.log(buy_opotion);


                    //let top_contribute_category = (profile_descriptor.length > 0 && profile_descriptor.indexOf(":") > -1) ? profile_descriptor.split(":")[1] : "";


                    let profile_verified = $this.find("span[class='a-profile-verified-badge'] span[class='a-profile-verified-text']").length == 1 ? true : false;

                    let early_reviewer_rewards = $this.find("a[href*='earlyreviewerprogram']").length >= 1 ? true : false;


                    //let vine_voice = $this.find("a[class*='-badge-vine-voice']").length >= 1 ? true : false;

                    let foreign_review = $this.find("div[id^='customer_review_foreign']").length == 1 ? true : false;


                    let badges = [];
                    $this.find("span[class*='c7y-badge-text'],a[class*='c7y-badge-text']").each(function(i, ele) {

                        let text = $.trim($(ele).html());

                        if (text) {
                            badges.push(text);
                        }

                        // let classname = $(ele).attr("class");
                        // if (classname) {
                        //     if (classname.indexOf('top-1000-reviewer') > -1) {
                        //         badges.push("TOP 1000 REVIEWER");
                        //     } else if (classname.indexOf('top-500-reviewer') > -1) {
                        //         badges.push("TOP 500 REVIEWER");
                        //     } else if (classname.indexOf('top-100-reviewer') > -1) {
                        //         badges.push("TOP 100 REVIEWER");
                        //     } else if (classname.indexOf('top-50-reviewer') > -1) {
                        //         badges.push("TOP 50 REVIEWER");
                        //     } else if (classname.indexOf('top-10-reviewer') > -1) {
                        //         badges.push("TOP 10 REVIEWER");
                        //     } else if (classname.indexOf('top-1-reviewer') > -1) {
                        //         badges.push("TOP 1 REVIEWER");
                        //     }
                        // }


                    });

                    let $profile_descriptor = $this.find("span.a-profile-descriptor");
                    let profile_descriptor = $profile_descriptor.length == 1 ? $profile_descriptor.html() : "";
                    if (profile_descriptor) {
                        badges.push(profile_descriptor);
                    }


                    let r = {};
                    r["reviewId"] = reviewId;
                    r["asin"] = asin;
                    r["title"] = title;
                    r["content"] = content;
                    //review["review_date"] = review_date;
                    r["rating"] = rating;
                    r["images"] = images;
                    r["videoes"] = videoes;
                    r["vp"] = vp;
                    r["helpful_vote"] = helpful_vote;
                    r['foreign_review'] = foreign_review;
                    r['marketplace'] = marketplace;
                    r["host"] = domain;
                    r["date_formatted"] = date_formatted;
                    r["comment_count"] = comment_count;
                    r["reviewer"] = reviewer;
                    r["avatar"] = avatar;
                    r["reviewer_link"] = reviewer_link;
                    r["reviewer_badges"] = reviewer_badges;
                    r["profile_descriptor"] = profile_descriptor;
                    r["profile_verified"] = profile_verified;
                    r["early_reviewer_rewards"] = early_reviewer_rewards;

                    r['badges'] = badges;

                    r['buy_opotion'] = buy_opotion;


                    reviews.push(r);


                    R[reviewId] = r;

                });


                let next_page_url = '';
                let current_page = "1";
                match = url.match(/pageNumber=(\d+)/);
                if (!match) {
                    match = url.match(/page=(\d+)/);
                }
                if (match) {
                    current_page = match[1];
                }
                let $next_page = $doc.find(".a-last").find("a");
                if ($next_page.length == 1) {
                    let href = $next_page.attr("href");
                    next_page_url = "https://" + domain + href;
                }
                resolve({
                    "R": R,
                    "data": reviews,
                    "next_page_url": next_page_url,
                    "current_page": parseInt(current_page)
                });

            });

        },

        top100_page_parse: function(html, url) {


            return new Promise(function(resolve, reject) {

                let uri = new URL(url);


                let page = 1;
                let data = [];
                let $current_category = $(html).find("span.zg_selected");
                let current_category_name = $current_category.html();

                let match = url.match(/pg=(\d)/);
                if (match) {
                    page = parseInt(match[1]);
                }

                $(html).find("li.zg-item-immersion").each(function(i, ele) {
                    let title = $(ele).find("span.zg-text-center-align").next("div").html();
                    if (title) {
                        title = $.trim(title);
                    }
                    let img_url = $(ele).find("img").attr("src");
                    let rating = $(ele).find('i.a-icon-star span').html();
                    if (rating == undefined) {
                        rating = "0";
                    }

                    rating = API.Amazon.ValidFieldHelper.Rating(rating);
                    let reviews_nb = $(ele).find('i.a-icon-star span').closest("a").next("a").html();
                    if (reviews_nb == undefined) {
                        reviews_nb = '0';
                    }
                    reviews_nb = API.Amazon.ValidFieldHelper.Reviews_nb(reviews_nb)
                    let $price = $(ele).find(".p13n-sc-price");
                    let price_min = '0';
                    let price_max = '0';
                    if ($price.length == 1) {
                        price_min = $price.html();
                    } else if ($price.length == 2) {
                        price_min = $price[0].innerHTML;
                        price_max = $price[1].innerHTML;
                    }
                    price_min = API.Amazon.ValidFieldHelper.Price(price_min);
                    price_max = API.Amazon.ValidFieldHelper.Price(price_max);
                    let asin = '';
                    let item_url = $(ele).find('span.zg-item a').attr('href');

                    if (item_url) {
                        asin = API.Amazon.get_asin_from_url(item_url);

                        let item = {
                            'position': page == 1 ? i + 1 : 50 * (page - 1) + i + 1,
                            'title': title,
                            'asin': asin,
                            //'level': level,

                            'domain': uri.host,
                            'rating': rating,
                            'price_min': price_min,
                            'price_max': price_max,
                            'reviews_nb': reviews_nb,
                            'img_url': img_url,
                            'item_url': item_url,
                            'base_url': uri.host,
                            'category': current_category_name,
                            //'parent': parent,
                            'page': page,
                            //'tree': tree
                        };
                        data.push(item);
                    }


                });


                //next page

                let next_page_url = '';
                let $next_page = $(html).find("li.a-last a[href]");
                if ($next_page.length == 1) {
                    next_page_url = $next_page.attr("href");
                }

                resolve({
                    "page": page,
                    "data": data,
                    "next_page_url": next_page_url,
                    //"current_page": parseInt(current_page),
                    //"page_asins": page_asins,
                    //"shippping_address": shippping_address
                })
            })
        },


        Detail: function(html) {
            let $html = $(html);
            return {
                get_main_image_url: function() {

                    let image_url = "";
                    let $img = $html.find("img[data-old-hires]");
                    if ($img.length == 1) {
                        image_url = $img.attr("data-old-hires");
                    }
                    if (!image_url) {
                        let $target = $html.find("#imgTagWrapperId>img");
                        if ($target.length == 1) {
                            image_url = $.trim($target.attr("src"));
                        }
                    }
                    return image_url;
                },
                get_base64_image: function() {

                    let $target = $html.find("#imgTagWrapperId>img");
                    if ($target.length == 1) {
                        return $target.attr("src");
                    } else {

                    }


                },
                get_title: function() {

                    let $title = $html.find("h2 span,h1 span");

                    if ($title.length >= 1) {
                        return $.trim($title.html());
                    }
                    return "";

                },
                get_rank_info: function() {

                    var rank_info = [];
                    if (!html) {
                        return rank_info;
                    }


                    $html.find("a[href^='/gp/bestsellers/']:not([class])").each(function(i, ele) {
                        //let ele_span = $(ele).parent('span,li.zg_hrsr_item');


                        let text = '';
                        let ele_span = $(ele).closest("li.zg_hrsr_item,#SalesRank");
                        if (ele_span.length == 0) {
                            ele_span = $(ele).parent('span');
                        }
                        if (ele_span.length == 0) {
                            ele_span = $(ele).closest("td");
                        }

                        ele_span.find('b').remove();

                        ele_span.find('style').remove();


                        //ele_span.find('span').remove();


                        text = $.trim(ele_span.text());


                        text = text.replace("Amazon 売れ筋ランキング:", '');


                        text = text.replace(/\(.*?\)/, '\n');


                        let arr = text.split(/\n/);


                        $.each(arr, function(n, item) {

                            if (!item) {
                                return true;
                            }

                            item = $.trim(item);

                            if (item.indexOf("- ") == 0) {
                                item = item.replace("- ", '')
                            } else if (item.indexOf(" - ") > -1) {
                                item = item.replace("位", '');
                                item = item.replace(" - ", '位')
                            } else if (item.indexOf("─") > -1) {
                                item = item.replace("─", '');
                            }
                            item = item.replace(/\s+/, ' ');

                            //item = item.replace(",", '');


                            //item=item.replace("-",'')

                            //─&nbsp;

                            let found = false;

                            for (let j = 0; j < CONST.rank_split.length; j++) {

                                if (!item) {
                                    continue;
                                }

                                let rank_number = '';
                                let rank_category = '';


                                let spiter = CONST.rank_split[j];


                                //                                ssss = item.indexOf(spiter)


                                let v = item.split(spiter);
                                if (v.length == 2) {

                                    if (item.indexOf("位") > -1) {

                                        if (/\d+/.test(v[0])) {
                                            rank_number = v[0];
                                            rank_category = v[1];

                                        } else {

                                            rank_number = v[1];
                                            rank_category = v[0];
                                        }

                                    } else {
                                        rank_number = v[0];
                                        rank_category = v[1];
                                    }


                                    rank_number = Helper.validator.toInt(rank_number);
                                    rank_info.push({
                                        "rank_category_name": $.trim(rank_category),
                                        "rank_category_number": rank_number,
                                        "rank_link": ele.pathname
                                    });

                                    // if (CONST.chinese_character.test(CONST.rank_split[i])) {
                                    //     let rank_number = Helper.validator.toInt(v[1]);
                                    //     let rank_category = $.trim(v[0]);
                                    //
                                    //     rank_info.push({
                                    //         "rank_category_name": rank_category,
                                    //         "rank_category_number": rank_number,
                                    //         "rank_link": ele.pathname
                                    //     });
                                    // } else {
                                    //
                                    //
                                    // }


                                    //console.log(rank_number,rank_category);


                                    found = true;
                                    break;
                                }
                            }
                            if (found) {
                                return false;
                            }

                        });
                    });


                    if (!rank_info || rank_info.length == 0) {


                        var $li = $html.find("#SalesRank").closest("ul").find("li");

                        if ($li.length == 0) {
                            $li = $html.find("#SalesRank").closest("#detailBullets").find("li");
                        }
                        if ($li.length > 0) {
                            $.each($li, function(i, ele) {
                                if ($(ele).has("ul").length == 1) {

                                    let rank_link = "";
                                    //细分分类排名
                                    var $items = $(ele).find(".zg_hrsr li");
                                    $.each($items, function(i, item) {
                                        var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                                        //var rank_category_name = $(item).find(".zg_hrsr_ladder>a").html();
                                        let $a = $(item).find(".zg_hrsr_ladder>a");
                                        let rank_category_name = $a.html();
                                        let link = $a.attr("href");


                                        rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                        rank_info.push({
                                            "rank_category_name": rank_category_name,
                                            "rank_category_number": Helper.validator.toInt(rank_category_number),
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

                                        for (var i = 0; i < CONST.spliter.length; i++) {
                                            var arr = text.split(CONST.spliter[i]);
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
                                                    "rank_category_number": Helper.validator.toInt(rank_category_number),
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

                                        for (var i = 0; i < CONST.spliter.length; i++) {
                                            var arr = text.split(CONST.spliter[i]);
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
                                                    "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                    "rank_category_link": link
                                                });
                                                break;
                                            }

                                        }
                                    }
                                }
                            });

                        } else {
                            var $target = $html.find("#SalesRank .value");


                            if ($target.length == 1) {


                                if ($target.find(".zg_hrsr li").length > 0) {

                                    //细分分类排名
                                    var $items = $target.find(".zg_hrsr li");
                                    $.each($items, function(i, item) {
                                        var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                                        let $a = $(item).find(".zg_hrsr_ladder>a");

                                        let rank_category_name = $a.html();

                                        let link = $a.attr("href");

                                        rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                        rank_info.push({
                                            "rank_category_name": rank_category_name,
                                            "rank_category_number": Helper.validator.toInt(rank_category_number),
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

                                    for (var i = 0; i < CONST.spliter.length; i++) {
                                        var arr = text.split(CONST.spliter[i]);
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
                                                "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                "rank_link": rank_link
                                            });
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                    }

                    if (!rank_info || rank_info.length == 0) {
                        var $tr = $html.find("#prodDetails tr,#techSpecSoftlines tr");

                        if ($tr.length >= 1) {

                            $.each($tr, function(i, ele) {
                                var att_name = $(ele).find("td,th").first().html();
                                var $td = $(ele).find("td,th").eq(1);

                                var has_rank_info = $td.has("span span").length == 1 ? true : false;
                                if ($td.has("ul").length == 1) {


                                    var $items = $td.find(".zg_hrsr li");
                                    $.each($items, function(i, item) {
                                        var rank_category_number = $(item).find(".zg_hrsr_rank").html();
                                        //var rank_category_name = $(item).find(".zg_hrsr_ladder>a").html();


                                        let $a = $(item).find(".zg_hrsr_ladder>a");
                                        let rank_category_name = $a.html();
                                        let link = $a.attr("href");


                                        rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");

                                        rank_info.push({
                                            "rank_category_name": rank_category_name,
                                            "rank_category_number": Helper.validator.toInt(rank_category_number),
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

                                        for (var i = 0; i < CONST.spliter.length; i++) {
                                            var arr = text.split(CONST.spliter[i]);
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
                                                    "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                    "rank_link": rank_link
                                                });
                                                break;
                                            }
                                        }
                                    }
                                } else if (has_rank_info) {

                                    $td.find("span span").each(function(index, ele) {

                                        var $this = $(ele);


                                        var rank_text = "";

                                        var rank_category_name = "";

                                        var rank_category_number = "";

                                        var rank_link = "";


                                        let $a = $this.find("a");
                                        if ($a.length == 1) {
                                            rank_link = $a.attr("href");
                                            if (/\/[0-9]{8,15}\//.test(rank_link)) { //子分类排名
                                                rank_category_name = $a.html();
                                                $a.remove();
                                                rank_text = $this.html();
                                                rank_text = rank_text.replace(/\(.*?\)+/, "");
                                                for (var i = 0; i < CONST.spliter.length; i++) {
                                                    var arr = rank_text.split(CONST.spliter[i]);
                                                    if (arr.length == 2) {
                                                        rank_category_number = arr[0];
                                                        rank_category_number = rank_category_number.replace(/[^0-9]+/g, "");
                                                        rank_info.unshift({
                                                            "rank_category_name": rank_category_name,
                                                            "rank_category_number": Helper.validator.toInt(rank_category_number),
                                                            "rank_link": rank_link
                                                        });
                                                        break;
                                                    }
                                                }
                                            } else {
                                                $this.find("a").remove();

                                                rank_text = $this.html();

                                                rank_text = $.trim(rank_text.replace(/\(.*?\)+/, ""));

                                                for (var i = 0; i < CONST.spliter.length; i++) {
                                                    var arr = rank_text.split(CONST.spliter[i]);
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
                                                            "rank_category_number": Helper.validator.toInt(rank_category_number),
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

                    if (!rank_info || rank_info.length == 0) {


                    }


                    return rank_info;
                },
                get_sellerId: function() {
                    const $sellerId = $html.find("#merchantID, #merchantId");
                    if ($sellerId.length == 1) {
                        return $sellerId.val();
                    } else if ($sellerId.length > 1) {
                        return $sellerId.eq(0).val();
                    } else {
                        return "";
                    }
                },

                get_brand_text: function() {

                    var brand_text = "";

                    var $brand = $html.find("a#bylineInfo,a#brand");
                    if ($brand.length == 1) {
                        var brand_url = $brand.attr("href");
                        if (brand_url && brand_url.indexOf("bin=") > -1) {
                            brand_text = brand_url.split("bin=")[1]
                        } else {
                            brand_text = $.trim($brand.html());
                        }
                    }
                    return brand_text;

                },
                get_brand: function(brand_text) {

                    let brand = '';


                    if (brand_text) {
                        brand_text = brand_text.replace("Visit the ", '');
                        brand_text = brand_text.replace(" Store", '');

                        //de
                        brand_text = brand_text.replace("Besuchen Sie den ", '');
                        brand_text = brand_text.replace("-Store ", '');

                        //fr
                        brand_text = brand_text.replace("Visiter la boutique ", '');


                        //it
                        brand_text = brand_text.replace("Visita lo Store di", '');


                        //es
                        brand_text = brand_text.replace("Marca:", '');


                        brand_text = brand_text.replace("Brand:", '');

                        brand_text = brand_text.replace("ブランド:", '')

                        brand_text = brand_text.replace("のストアを表示", '')


                        brand = $.trim(brand_text);
                    }
                    return brand;
                },
                get_features: function() {

                    var features = [];


                    var $target = $html.find("#feature-bullets");
                    if ($target.length == 1) {

                        var $items = $target.find(".a-list-item");

                        if ($items.length > 0) {

                            $.each($items, function(i, item) {
                                let text = $(item).html();
                                text = text.replace(/\s+/g, " ");
                                text = text.replace(/<[^<>]+>/g, "");
                                text = $.trim(text);
                                features.push(text);
                            });
                        }
                    }
                    return features;
                },
                get_marketplace: function() {

                    let match = $html.match(/ue_sn\s=\s'([a-z.]+)',/);
                    if (match && match.length == 2) {
                        return match[1];
                    } else {
                        return "";
                    }
                },
                get_asin: function() {
                    var $asin = $html.find("#ASIN");
                    if ($asin.length == 1) {
                        return $asin.val();
                    }
                    //data-detailPageAsin
                    return "";

                },
                get_answered_questions_count: function() {

                    var $ele_answered_questions_count = $html.find("a#askATFLink span");
                    if ($ele_answered_questions_count.length == 1) {
                        var answered_questions_count = $.trim($ele_answered_questions_count.html());
                        answered_questions_count = answered_questions_count.replace(/[^0-9]+/, "");
                        answered_questions_count = $.trim(answered_questions_count);
                        return answered_questions_count;
                    }
                    return "0";

                },
                get_attrs: function() {


                    var attrs = [];
                    var rank_info = []
                    var $tr = $html.find("#prodDetails tr,#techSpecSoftlines tr"); //https://www.amazon.co.uk/s?k=Tommee&ref=nb_sb_noss

                    if ($tr.length >= 1) {

                        $.each($tr, function(i, ele) {
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


                                    var attr = { "name": attr_name, "value": attr_value };
                                    attrs.push(attr);
                                }
                            }
                        });

                    }

                    var $lis = $html.find("#SalesRank").closest("ul").find("li");
                    if ($lis.length == 0) {
                        $lis = $html.find("#detail_bullets_id li,#detailBullets li");
                    }
                    if ($lis.length > 0) {

                        $.each($lis, function(i, ele) {

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
                                attrs.push({ "name": attr_name, "value": attr_value });

                            } else if ($this.has(".a-text-bold").length == 1) {

                                let $bold_title = $(ele).find(".a-text-bold");

                                attr_name = $bold_title.html().replace(":", "");

                                attr_value = $bold_title.next("span").html()
                                attr_value = attr_value.replace(/\([^\)]*\)/g, "");


                                attrs.push({ "name": attr_name, "value": attr_value });


                            }


                        });

                    }

                    ////li[@id='SalesRank']/ancestor::ul/li|//div[@id='detail_bullets_id']//li")


                    let $row = $html.find("#detailBullets_feature_div span.a-list-item");
                    $row.each(function(i, row) {

                        let attr_name = $(row).find("span:nth-child(1)").text();
                        let attr_value = $(row).find("span:nth-child(2)").text();
                        if (attr_name && attr_value) {
                            var attr = { "name": attr_name, "value": attr_value };
                            attrs.push(attr);
                        }


                    });


                    return attrs;


                },
                get_seller: function() {
                    var seller = $html.find("#sellerProfileTriggerId").html();
                    if (!seller) {
                        seller = $html.find("#merchant-info").html();
                    }
                    return seller;
                },
                get_category_info: function() {

                    ////a[@class='a-link-normal a-color-tertiary']/text()


                    let categories = [];

                    let arr_categories = [];
                    let arr_category_links = [];

                    var $target = $html.find("a[class='a-link-normal a-color-tertiary']");
                    if ($target.length >= 1) {
                        $.each($target, function(i, ele) {
                            let link = $(ele).attr("href");
                            let text = $(ele).html();
                            arr_categories.push($.trim(text));
                            arr_category_links.push(link);

                            categories.push({ 'category_name': $.trim(text), 'category_link': link })

                        });
                    }
                    return categories;
                    return { "categories": arr_categories, "category_links": arr_category_links };

                },
                get_sponsored_products_count: function() {
                    var $target = $html.find("#sp_detail");
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
                },
                ////div[starts-with(@id,'desktop-dp-sims_session-similarities')]/div/@data-a-carousel-options
                get_view_also_viewed_products_count: function() {
                    var $target = $html.find("div[id^='desktop-dp-sims_session-similarities'] div:first");
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
                },
                get_buy_also_buy_products_count: function() {
                    var $target = $html.find("div[id='desktop-dp-sims_purchase-similarities-sims-feature'] div:first");
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
                },
                get_cart_info: function() {
                    let $cart = $html.find("#addToCart");
                    if ($cart.length == 1) {
                        let post_url = $cart.attr("action");
                        let form_data = $cart.serialize();

                        return { "form_data": form_data, "post_url": post_url }
                    }
                    return null;
                },
                get_price: function() {

                    //1 span id="priceblock_ourprice" jp B01KZB82WQ

                    let $target = $html.find("#priceblock_ourprice");

                    let text = "";
                    if ($target.length == 1) {
                        text = $target.html();

                    } else if ($html.find("#priceblock_saleprice").length == 1) {
                        text = $html.find("#priceblock_saleprice").html();
                    } else if ($html.find("#priceblock_dealprice").length == 1) {
                        text = $html.find("#priceblock_dealprice").html();
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


                },
                get_reviews_nb: function() {

                    let $target = $html.find("#acrCustomerReviewText:first-child");
                    if ($target.length >= 1) {
                        return $.trim($target[0].innerHTML.replace(/[^0-9]/g, ""))
                    }
                    return "0";
                },
                get_rating: function() {

                    let $target = $html.find("#averageCustomerReviews .a-icon-alt");
                    if ($target.length >= 1) {
                        let text = $target[0].innerHTML;


                        text = text.replace("&nbsp;", " ");

                        text = text.replace("5つ星のうち", "");
                        text = text.replace(" 5 ", "");
                        text = $.trim(text.replace(/[^0-9.,]/g, ""));

                        return text;
                    }

                    return "";
                },
                get_seller_link: function() {

                    let $a = $html.find("#sellerProfileTriggerId");
                    if ($a.length == 1) {
                        return $a.attr("href");
                    }
                    return "";

                },
                get_fulfilled_By: function() {

                    let text = $html.find("#merchant-info, #pantry-availability-brief, #mocaBBSoldByAndShipsFrom, table .buying, #buybox_feature_div a#SSOFpopoverLink, #buybox_feature_div p, #usedbuyBox").text().trim()
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
                },
                get_variants: function() {

                    var re = /"dimensionValuesDisplayData" : (\{.*(?=\})\})/ig;

                    var match = html.match(re);
                    if (match) {
                        var s = match[0];
                        var data = $.parseJSON("{" + match[0] + "}");

                        if (data) {
                            return data.dimensionValuesDisplayData;
                        }
                    }
                    return {};
                },
                get_available_date: function() {


                    var available_date = "";

                    var available_date_formatted = "";
                    let date_found = false;
                    var attrs = this.get_attrs();
                    for (var i = 0; i < attrs.length; i++) {
                        var attr_value = attrs[i].value;
                        if (!date_found) {
                            $.each(CONST.re_date_arr, function(i, item) {
                                let _re = item;
                                if (_re.test(attr_value)) {
                                    available_date = attr_value;
                                    let match = attr_value.match(re_date_us);
                                    if (match) {
                                        available_date_formatted = "{0}/{1}/{2}".format(match[3], CONST.DATA_TRANSLATOR[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
                                    } else if (match = attr_value.match(re_date_ca)) {
                                        available_date_formatted = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[1]], match[2].length == 1 ? "0" + match[2] : match[2]);
                                    } else if (match = attr_value.match(re_date_de)) {
                                        available_date_formatted = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                                    } else if (match = attr_value.match(re_date_fr)) {
                                        available_date_formatted = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                                    } else if (match = attr_value.match(re_date_it)) {
                                        available_date_formatted = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                                    } else if (match = attr_value.match(re_date_es)) {
                                        available_date_formatted = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
                                    } else if (match = attr_value.match(re_date_jp)) {
                                        available_date_formatted = "{0}-{1}-{2}".format(match[1], match[2], match[3].length == 1 ? "0" + match[3] : match[3]);
                                    } else if (match = attr_value.match(re_date_jp_r)) {
                                        available_date_formatted = "{0}-{1}-{2}".format(match[1], match[2], match[3].length == 1 ? "0" + match[3] : match[3]);
                                    } else if (match = attr_value.match(re_date_other)) {
                                        available_date_formatted = "{0}-{1}-{2}".format(match[3], CONST.DATA_TRANSLATOR[match[2]], match[1].length == 1 ? "0" + match[1] : match[1]);
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
                    return available_date_formatted;
                },
                get_product_size: function() {
                    var attrs = this.get_attrs();
                    let product_size = '';
                    for (var i = 0; i < attrs.length; i++) {
                        var attr_value = attrs[i].value;
                        if (CONST.re_product_size.test(attr_value)) {
                            product_size = attr_value;
                        }
                    }
                    return product_size;
                },
                get_product_weight: function() {
                    var attrs = this.get_attrs();
                    let product_weight = '';
                    for (var i = 0; i < attrs.length; i++) {
                        var attr_value = attrs[i].value;
                        if (CONST.re_product_weight.test(attr_value)) {
                            product_weight = attr_value;
                        }
                    }
                    return product_weight;

                },
                product_size_weight: function() {
                    var attrs = this.get_attrs();
                    let product_size_weight = '';
                    for (var i = 0; i < attrs.length; i++) {
                        var attr_value = attrs[i].value;
                        if (CONST.re_product_size_weight.test(attr_value)) {
                            product_size_weight = attr_value;
                        }
                    }
                    return product_size_weight;
                },
                get_fba: function() {


                    let fba = false;
                    let seller = '';
                    let data = {};
                    if (html.indexOf("Dispatched from and sold by Amazon") > -1 ||

                        html.indexOf("Verkauf und Versand durch Amazon") > -1 ||
                        html.indexOf("Expédié et vendu par Amazon") > -1 ||
                        html.indexOf("Venduto e spedito da Amazon") > -1 ||
                        html.indexOf("Vendido y enviado por Amazon") > -1 ||
                        html.indexOf("Cloudtail India") > -1 ||
                        html.indexOf("Ships from and sold by Amazon.sa") > -1 ||
                        html.indexOf("Ships from and sold by Amazon.ca") > -1) {


                        seller = "Amazon";
                        fba = true;
                    }
                    if (!fba) {
                        fba = $html.find('#SSOFpopoverLink').length == 1 ? true : false;

                        seller = $.trim($html.find("#sellerProfileTriggerId").html());
                        if (seller.indexOf("Amazon") > -1) {
                            fba = true;
                            seller = 'Amazon'
                        }
                    }
                    if (!fba) {
                        let $tds = $html.find('span[class="tabular-buybox-text"]');
                        if ($tds.length >= 2) {
                            let ships_from = $tds[0].innerHTML;
                            let soldby = $tds[1].innerHTML;
                            if (ships_from.indexOf('Amazon') > -1) {
                                fba = true;
                            }
                            if (!seller && soldby.indexOf('Amazon') > -1) {
                                seller = 'Amazon';
                            }
                        }
                    }
                    if (!seller) {
                        seller = $html.find("#merchant-info").html();
                    }

                    data["seller"] = seller;
                    data["fba"] = fba;


                    return data;


                }
            }
        },


        get_asin_from_url: function(url) {


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
        }
    }

}();

API.Amazon.PageCheck = function() {

    function getDecodedUrl(url) {
        return decodeURIComponent(url.toLowerCase());
    }

    function isDetailsPage(url) {
        return getDecodedUrl(url).indexOf("/dp/") > -1 ||
            getDecodedUrl(url).indexOf("/gp/offer-listing/") > -1 ||
            getDecodedUrl(url).indexOf("/gp/product/") > -1;
    }

    function isAmazonTopPage(url) {
        return (getDecodedUrl(url).indexOf("best-sellers") > -1 ||
                getDecodedUrl(url).indexOf("/zgbs") > -1 ||
                getDecodedUrl(url).indexOf("/gp/bestsellers") > -1 ||
                getDecodedUrl(url).indexOf("/gp/most-gifted/") > -1 ||
                getDecodedUrl(url).indexOf("/gp/most-wished-for/") > -1 ||
                getDecodedUrl(url).indexOf("/gp/new-releases/") > -1 ||
                getDecodedUrl(url).indexOf("gp/movers-and-shakers/") > -1 ||
                getDecodedUrl(url).indexOf("/gp/") > -1) &&
            (getDecodedUrl(url).indexOf("/gp/offer-listing/") === -1 &&
                getDecodedUrl(url).indexOf("/gp/deals/") === -1);
    }

    function isCategoryPage(url) {

        var urlObj = new URL(url);
        var urlParams = new URLSearchParams(urlObj.search);

        var category = urlParams.get("node");
        if (category == null) {
            category = urlParams.get("rh");
        }

        return (getDecodedUrl(url).indexOf("node=") > -1 || getDecodedUrl(url).indexOf("n:") > -1) &&
            (category != null && category.length > 0);
    }

    function isKeywordPage(url) {

        var urlObj = new URL(url);
        var urlParams = new URLSearchParams(urlObj.search);

        var keyword = urlParams.get("field-keywords");
        if (keyword == null) {
            keyword = urlParams.get("rh");
        }
        if (keyword == null) {
            keyword = urlParams.get("k");
        }

        return (getDecodedUrl(url).indexOf("field-keywords=") > -1 ||
                getDecodedUrl(url).indexOf("k:") > -1) ||
            getDecodedUrl(url).indexOf("/s") > -1 &&
            (keyword != null && keyword.length > 0);
    }

    function isSellerPage(url) {
        return getDecodedUrl(url).indexOf("me=") > -1;
    }

    function isParsableType(url) {

        var containsAmazon, isDetails, isSeller, isCategory, isKeyword, isAmazonTop;

        containsAmazon = getDecodedUrl(url).indexOf("www.amazon.") > -1;
        isDetails = isDetailsPage(url);
        isAmazonTop = isAmazonTopPage(url);
        isCategory = isCategoryPage(url);
        isKeyword = isKeywordPage(url);
        isSeller = isSellerPage(url);

        return containsAmazon && (isDetails || isAmazonTop || isCategory || isKeyword || isSeller);
    }


    function isValidListPage(url) {
        return new Promise(function(resolve, reject) {

            Helper.request.get(url).then(function(html) {
                if (html.indexOf('captchacharacters') > -1) {
                    let captcha_url = $(html).find("img[src*='captcha']").attr('src');
                    let amzn = $(html).find("input[name='amzn']").val();
                    let amzn_r = $(html).find("input[name='amzn-r']").val();
                    let post_url = $(html).find("form").attr("action");


                    let data = { 'url': post_url, 'captcha_url': captcha_url, 'amzn': amzn, 'amzn_r': amzn_r };


                    resolve({ "valid": false, 'prod_count': 0, 'page_bar': false, 'reason': 'captcha', 'data': data });
                }
                let has_page_bar = $(html).find("ul.a-pagination").length == 1 ? true : false;


                has_page_bar = $(html).find("a.s-pagination-next").length == 1 ? true : false;
                let products_count = $(html).find("div[data-asin^='B']").length;
                let has_sort_select = $(html).find('#s-result-sort-select').length == 1 ? true : false;
                if (has_sort_select) {
                    resolve({
                        "valid": true,
                        'prod_count': products_count,
                        'page_bar': has_page_bar,
                        //'current_page': current_page,
                        'reason': ''
                    });
                } else {
                    if (url.indexOf('/s?') == -1) {
                        resolve({ "valid": false, 'prod_count': 0, 'page_bar': false, 'reason': 'invalid_page' });
                    }
                }
            }).catch(function(error) {
                resolve({ "valid": false, 'prod_count': 0, 'page_bar': false, 'reason': 'error' });
            });
        });
    }

    return {
        isParsableType: function(url) {
            return isParsableType(url);
        },
        isDetailsPage: function(url) {
            return isDetailsPage(url);
        },
        isAmazonTopPage: function(url) {
            return isAmazonTopPage(url);
        },
        isCategoryPage: function(url) {
            return isCategoryPage(url);
        },
        isKeywordPage: function(url) {
            return isKeywordPage(url);
        },
        isSellerPage: function(url) {
            return isSellerPage(url);
        },
        isValidListPage: function(url, html) {
            return isValidListPage(url, html);
        }
    }
}();


API.Amazon.ValidFieldHelper = function() {

    return {
        Price: function(text) {
            let val = 0;
            if (text) {
                text = $.trim(text);
                text = text.replace(/[^0-9,.]/g, '')
                text = text.replace(".00", "");
                if (text.indexOf(".") > -1 && text.indexOf(",") > -1) {
                    text = text.replace(".", "");
                    text = text.replace(",", ".")
                } else if (text.indexOf(",") > -1) {
                    text = text.replace(",", ".");
                }
                if (CONST.re_float.test(text)) {
                    val = parseFloat(text);
                }
            }
            return val;
        },

        Reviews_nb: function(text) {

            let val = 0;
            if (text) {
                text = $.trim(text);
                text = text.replace(/[^0-9,]/g, '');
                if (text.indexOf(",") > -1) {
                    text = text.replace(",", '');
                }
                if (CONST.re_int.test(text)) {
                    val = parseInt(text);
                }
            }
            return val;
        },

        Rating: function(text) {
            let val = 0;
            if (text) {

                text = text.replace("&nbsp;", " ");
                text = text.replace("5つ星のうち", "");
                text = text.replace(" 5 ", "");
                text = $.trim(text);
                text = $.trim(text.replace(/[^0-9.,]/g, ""));
                text = text.replace(",", ".");
                if (CONST.re_float.test(text)) {
                    val = parseFloat(text);
                }
            }
            return val;
        },

        Int: function(text) {
            let val = 0;
            if (text) {
                text = $.trim(text);
                text = text.replace(/[^0-9]/g, '');
                if (CONST.re_int.test(text)) {
                    val = parseInt(text);
                }
            }
            return val;
        },

        Float: function(text) {
            if (text) {
                text = $.trim(text);
                text = text.replace(/[^0-9.]/g, '');
                text = text.replace(".00", "");
                if (text.indexOf(".") > -1 && text.indexOf(",") > -1) {
                    text = text.replace(".", "");
                    text = text.replace(",", ".")
                } else if (text.indexOf(",") > -1) {
                    text = text.replace(",", ".");
                }
                if (CONST.re_float.test(text)) {
                    return parseFloat(text);
                }
                return 0;
            }
        }
    }
}();
API.Amazon.SearchResultRowParse = function() {

    return {
        asin: function(url) {
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

        title: function(p) {

            let title = p.find("h2 span").html();
            if (!title) {
                title = p.find(".p13n-sc-truncated").attr("title")
            }
            return title;
        },

        url: function(p) {


            let href = p.find("h2 a").attr("href");

            if (!href) {
                href = p.find(".zg-item a").attr("href");
            }
            return href;
        },

        img_url: function(p) {

            let img_url = '';
            img_url = p.find("img.s-image[srcset]").attr("src");
            if (!img_url) {
                img_url = p.find(".zg-item img").attr("src");
            }

            return img_url;


        },

        host: function(html) {
            let host = '';
            let match = html.match(/ue_sn = '(.*?)'/);
            if (match) {
                host = match[1];
            }
            return host;
        },

        brand: function(p) {
            brand = '';
            let ele_brand = p.find("h5.s-line-clamp-1 span");
            if (ele_brand.length == 1) {
                brand = ele_brand.html();
            }
            return brand;
        },

        offer_count: function(p) {

            let off_count = 0;

            let ele_a = p.find("a[href*='/offer-listing/']");
            if (ele_a.length == 1) {
                text = $.trim(ele_a.html());

                text = text.replace(/[^0-9]/, "");

                off_count = parseInt(off_count);


            }
            return off_count;

        },

        badge: function(p) {


            let badge = p.find("span[data-a-badge-color='sx-cloud']").html();

            if (!badge) {
                let ele_s = p.find("span.a-badge-text");
                if (ele_s.length == 1) {
                    badge = $.trim(ele_s.html());
                    if (badge.indexOf("0") > -1) {
                        //console.log('badge', badge)
                        badge = '';
                    }
                } else if (ele_s.length > 1) {
                    let arr = []
                    $.each(ele_s, function(i, item) {
                        arr.push($(item).html());
                    });
                    badge = arr.join(" ");
                }
            }
            return badge;
        },

        coupon: function(p) {

            let coupon = '';

            let text = p.find("span.s-coupon-highlight-color").html();
            if (text) {
                text = $.trim(text.replace(/[a-zA-Z&;]/g, ""));
                coupon = text;
            }
            return coupon;
        },

        reviews_nb: function(p) {

            let reviews_nb = 0;

            let text = $.trim(p.find("a[href*='customerReviews'] span").html());

            ////a[contains(@href,'customerReviews')]/span/text()

            if (!text) {
                text = $.trim(p.find(".a-size-base>font>font").html());

            }

            reviews_nb = API.Amazon.ValidFieldHelper.Reviews_nb(text);
            // if (text) {
            //     text = $.trim(text.replace("/[,.]/g", ""));
            //     if (/\d+/.test(text)) {
            //         reviews_nb = parseInt(text);
            //     }
            // }
            return reviews_nb;
        },
        price: function(marketplace_url, p) {
            let price = 0;
            marketplace_url = marketplace_url.replace("https://", "");
            let text = '';
            let ele_p = p.find("[class='a-offscreen']");
            if (ele_p.length >= 1) {
                text = ele_p.eq(0).html();
                if (text) {
                    text = text.replace(/[^0-9.,]/g, "");

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
        rating: function(p) {
            let rating = 0;
            let text = p.find("span[class='a-icon-alt']").html();
            if (text) {
                $.each(text.split(" "), function(i, item) {
                    item = item.replace(",", ".");
                    if (/\d\.\d/.test(item)) {
                        rating = parseFloat(item);
                        return false;
                    }
                });
            }
            return rating;
        },
        category: function() {
            let value = $("#searchDropdownBox option:selected").val()
            value = value.replace("search-alias=", "");
            return value == "aps" ? "" : value;
        },
        keywords: function() {
            return $("#twotabsearchtextbox").val();
        },
        tpc: function() {
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
        prime: function(p) {

            let prime = false;

            let ele_i = p.find("i.a-icon-prime");
            if (ele_i.length == 1) {
                prime = true;
            }
            if (!prime) {
                let items = p.find("div.s-align-children-center span");
                if (items.length > 1) {

                    items.each(function(i, ele) {
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
        escapeHTML: function(text) {
            return text
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    }


}();


API.Marketplace = function() {


    var market = '';


    return {


        init: function(url) {
            var uri = new URL(url);
            switch (uri.hostname) {
                case "www.amazon.ae":
                    market = { "currency": "AED", "currency_sign": "د.إ", "country_code": "AE" };
                    break;
                case "www.amazon.de":
                    market = { "currency_code": "EUR", "currency_sign": "€", "country_code": "DE" };
                    break;
                case "www.amazon.co.uk":
                    market = { "currency_code": "GBP", "currency_sign": "£", "country_code": "GB" };
                    break;
                case "www.amazon.com":
                    market = { "currency_code": "USD", "currency_sign": "$", "country_code": "US" };
                    break;
                case "www.amazon.in":
                    market = { "currency_code": "INR", "currency_sign": "&#x20B9;", "country_code": "IN" };
                    break;
                case "www.amazon.it":
                    market = { "currency_code": "EUR", "currency_sign": "€", "country_code": "IT" };
                    break;
                case "www.amazon.ca":
                    market = { "currency_code": "CAD", "currency_sign": "$", "country_code": "CA" };
                    break;
                case "www.amazon.fr":
                    market = { "currency_code": "EUR", "currency_sign": "€", "country_code": "FR" };
                    break;
                case "www.amazon.com.au":
                    market = { "currency_code": "AUD", "currency_sign": "$", "country_code": "AU" };
                    break;
                case "www.amazon.es":
                    market = { "currency_code": "EUR", "currency_sign": "€", "country_code": "ES" };
                    break;
                case "www.amazon.co.jp":
                    market = { "currency_code": "YEN", "currency_sign": "¥", "country_code": "JP" };
                    break;
                case "www.amazon.sa":
                    market = { "currency_code": "SR", "currency_sign": "﷼", "country_code": "SA" };
                    break;
                case "www.amazon.com.tr":
                    market = { "currency_code": "TRY", "currency_sign": "₺", "country_code": "TR" };
                    break;
                case "www.amazon.com.br":
                    market = { "currency_code": "BRL", "currency_sign": "R$", "country_code": "BR" };
                    break;
                case "www.amazon.sg":
                    market = { "currency_code": "SGD", "currency_sign": "S$", "country_code": "SG" };
                    break;
                case "www.amazon.com.mx":
                    market = { "currency_code": "MXP", "currency_sign": "$", "country_code": "MX" };
                    break;
                default:
                    market = { "currency_code": "USD", "currency_sign": "$", "country_code": "US" };
                    break;
            }
        },
        get: function() {
            return market;

        }
    };


}();