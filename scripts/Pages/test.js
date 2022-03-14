
const msg_container = 'id_err_message';
const task_config = 'top100_config';
const wait_text = '数据处理中,请稍后...';
API.APP.dbinit('bestsellers').then(function (instance) {
    window.db = instance;
    window.db.version(1).stores({
        items: 'id,sellerId,completed,asin',
        task: 'config,start_url,include_children'
    });
});

var global_tasks = [];

function fetch_bsr_page(url) {
    return new Promise(function (resolve, reject) {
        Helper.request
            .get(url)
            .then(function (html) {
                const uri = new URL(url);
                if (html.indexOf("captchacharacters") > -1) {
                    //display_captcha(uri, html);
                } else {
                    const domain = new URL(url).host;
                    return { 'html': html, 'domain': domain, 'url': url };
                }
            }).then(function (res) {
                let $doc = $(res.html);
                let tree = [];
                let $current_category = $doc.find("span[class*='zg-selected']");
                if ($current_category.length == 1) {
                    current_category = $current_category.html();

                    let $parents = $doc.find("div[role='treeitem'][class*='zg-browse-up'] >a")
                    $.each($parents, function (index, element) {
                        if (index > 0) {
                            tree.push({ 'url': $(element).attr('href'), "category": element.innerHTML });
                        }
                    })

                    let $group = $current_category.closest("div[role='group']");
                    if ($group.length == 1) {
                        let $parent = $group.prev("div[role='treeitem']");
                        if ($parent.length == 1) {
                            $a = $parent.find('a');
                            if ($a.length == 1) {
                                tree.push({ 'url': $a.attr('href'), "category": $a.html() });
                            }
                        }
                    }

                    tree.push({ 'url': new URL(res.url).pathname, "category": current_category });
                }


                let include_children = true;


                //下一页信息
                let next_page_url = '';
                let $next_page = $doc.find("li.a-last a[href]");
                if ($next_page.length == 1) {
                    //let tasks = [];
                    next_page_url = $next_page.attr("href");
                    if (next_page_url) {
                        global_tasks.push({
                            'tree': tree,
                            'url': "https://" + res.domain + next_page_url,
                            'include_children': include_children,
                            'page': 2
                        });
                    }
                    if (include_children) {
                        let child_items_links = $current_category.parent("div[role='treeitem']").next("div[role='group']").find("div[role='treeitem'] a");
                        $.each(child_items_links, function (i, ele) {
                            global_tasks.push({
                                'tree': tree,
                                'url': "https://" + res.domain + $(ele).attr('href'),
                                'include_children': include_children,
                                'page': 1
                            });
                        });
                    }

                }


                console.log(global_tasks)




                let items = [];

                $.each($doc.find(".zg-grid-general-faceout "), function (indexInArray, valueOfElement) {
                    let $that = $(valueOfElement);

                    let asin = "";

                    let img_url = "";
                    let title = "";
                    ele_image = $that.find('img[class*="p13n-product-image"]');

                    if (ele_image.length == 1) {
                        img_url = ele_image.attr("src");
                        title = ele_image.attr("alt");
                    }


                    let price = '0';

                    let $ele_price = $that.find("span[class*='p13n-sc-price']");
                    if ($ele_price.length == 1) {
                        price = $ele_price.html();
                    } else if ($ele_price.length == 2) {
                        price = $ele_price.eq(0).html();
                    }

                    let rank = $that.find('span.zg-bdg-text').html();

                    let ele_a = $that.find("a[href*='/product-reviews/']");
                    let rating = "0";
                    let reviews_nb = "0";

                    if (ele_a.length == 1) {
                        let href = ele_a.attr("href");
                        if (href) {
                            asin = href.split("/product-reviews/")[1].split("/")[0];
                        }
                        rating = ele_a.find("span.a-icon-alt").html();

                        reviews_nb = ele_a
                            .find("span.a-icon-alt")
                            .closest("i")
                            .next("span")
                            .html();
                    }

                    let item = {};

                    item['id'] = Helper.string.uuid();

                    item['title'] = title;
                    item['asin'] = asin;
                    item['rank'] = rank;
                    item['rating'] = rating;
                    item['reviews_nb'] = reviews_nb;
                    item['price'] = price;
                    item['img_url'] = img_url;
                    item["fba"] = false;
                    item["sponsored"] = false;
                    item["offerCount"] = 0;
                    item["coupon"] = '';
                    item["badge"] = '';
                    item["brand"] = '';

                    item["domain"] = new URL(res.url).host;
                    //item['productUrl'] = item_url;
                    item['tree'] = tree;
                    item['completed'] = 0;
                    item['qa'] = 0;
                    item['seller'] = '';
                    item['sellerId'] = '';
                    item['product_weight'] = '';
                    item['product_size'] = '';
                    item['available_date'] = '';
                    item['category'] = [];
                    item['rank_info'] = [];
                    item['createTime'] = (new Date()).valueOf();

                    items.push(item);
                });

                window.db.items.bulkPut(items).then(function () {
                    get_data_count().then(function (count) {
                        if (count > 0) {
                            let text = '请勿刷新网页,列队数量:' + global_tasks.length + ',已成功下载' + count + '条数据，<br/>正在下载:' + url;

                            Helper.functions.show_msg(msg_container, text, 'success', false);
                        }
                    });
                }).catch(Dexie.BulkError, function (e) {
                    let text = '下载失败，请联系插件开发者！';
                    Helper.functions.show_msg(msg_container, text, 'error', true);
                    console.log(e);
                });

                let token = '';
                let endpoint = '';
                let post_url = '';
                let $next_page_handle = $doc.find("div[data-acp-params]");

                if ($next_page_handle.length == 1) {
                    token = $next_page_handle.attr("data-acp-params");
                    endpoint = $next_page_handle.attr("data-acp-path");
                }

                let str_ids = $doc
                    .find("div.p13n-desktop-grid")
                    .attr("data-client-recs-list");
                if (str_ids) {
                    let obj_ids = JSON.parse(str_ids);

                    post_url = 'https://' + new URL(res.url).host + endpoint + "nextPage?"
                    return resolve(crawl(post_url, token, tree, obj_ids, 30));

                }

            });

    });
}


function crawl(url, token, tree, obj_ids, pp) {
    page_size = 8;
    indexes = [];
    ids = [];
    let batch_task = obj_ids.slice(pp, pp + page_size);
    if (batch_task.length == 0) {
        return 0;
    } else {
        $.each(batch_task, function (idx, ele) {
            //let _asin = ele.id;
            let metadataMap = ele.metadataMap;
            if (metadataMap) {
                let _rank = metadataMap["render.zg.rank"];
                indexes.push(parseInt(_rank) - 1);
            }
            ids.push(JSON.stringify(ele));
        });
        if (ids && ids.length > 0) {
            data = {
                faceoutkataname: "GeneralFaceout",
                ids: ids,
                indexes: indexes,
                linkparameters: '',
                offset: '8',
                reftagprefix: 'zg_bs_11056591',
            };
            return fetch_data(url, data, tree, token).then(function () {
                return new Promise(function (resolve, reject) {
                    setTimeout(function () {
                        pp = pp + 8;
                        resolve(crawl(url, token, tree, obj_ids, pp));
                    }, 1000);
                });
            });
        }
    }
}

function fetch_data(url, data, tree, token) {
    return new Promise(function (resolve, reject) {
        Helper.request.post_json_with_cookies(url, data, token).then(function (res) {
            //console.log(res);
            if (res
                && res.products
                && res.products.length > 0) {

                let items = [];
                $.each(res.products, function (idx, product) {
                    if (product == null) {
                        return true;
                    }
                    let obj_image = product.image;
                    let obj_link = product.link;
                    let obj_marketOffers = product.marketOffers;
                    let obj_title = product.title;
                    let obj_reviews = product.reviews;

                    let item = {};

                    let img_url = obj_image.imageUri;

                    let asin = Helper.functions.get_asin_from_url(obj_link.url);
                    let price = "0";
                    if (obj_marketOffers) {
                        price = obj_marketOffers.price.displayString;
                    }
                    let rank = product.rankIndicator.rankDisplayString;
                    let rating = "0";
                    let reviews_nb = "0";
                    if (obj_reviews) {
                        rating = obj_reviews.ratingValue;
                        reviews_nb = obj_reviews.numberOfReviews;
                    }

                    let title = obj_title.titleText;

                    //console.log(rank, title);

                    item['id'] = Helper.string.uuid();

                    item['title'] = title;
                    item['asin'] = asin;
                    item['rank'] = rank;
                    item['rating'] = rating;
                    item['reviews_nb'] = reviews_nb;
                    item['price'] = price;
                    item['img_url'] = img_url;
                    item["fba"] = false;
                    item["sponsored"] = false;
                    item["offerCount"] = 0;
                    item["coupon"] = '';
                    item["badge"] = '';
                    item["brand"] = '';

                    item["domain"] = new URL(url).host;
                    //item['productUrl'] = item_url;
                    item['tree'] = tree;
                    item['completed'] = 0;
                    item['qa'] = 0;
                    item['seller'] = '';
                    item['sellerId'] = '';
                    item['product_weight'] = '';
                    item['product_size'] = '';
                    item['available_date'] = '';
                    item['category'] = [];
                    item['rank_info'] = [];
                    item['createTime'] = (new Date()).valueOf();


                    items.push(item);

                    //console.log(items);


                });

                window.db.items.bulkPut(items).then(function () {
                    get_data_count().then(function (count) {
                        if (count > 0) {
                            let text = '请勿刷新网页,列队数量:' + global_tasks.length + ',已成功下载' + count + '条数据，<br/>';

                            Helper.functions.show_msg(msg_container, text, 'success', false);
                        }
                    });
                }).catch(Dexie.BulkError, function (e) {
                    let text = '下载失败，请联系插件开发者！';
                    Helper.functions.show_msg(msg_container, text, 'error', true);
                    console.log(e);
                });
                resolve();
            }
        });


    });
}

function loop(global_tasks) {

    Helper.functions.get_config().then(function (config) {
        if (config.paused == true) {
            Helper.functions.show_msg(msg_container, '已暂停下载数据!');
        } else {
            if (global_tasks.length == 0) {
                get_data_count().then(function (count) {
                    console.log('finished');
                    let text = "<i class='icon fa-check'></i>️已完成下载！共" + count + "条数据";
                    Helper.functions.show_msg(msg_container, text);
                    $('#id_btn_stop').off('click').hide();
                    //page_reload();
                });
            } else {
                let task = global_tasks.shift();
                let page = task.page;
                let include_children = task.include_children;
                let url = task.url;




                fetch_bsr_page(url).then(function () {
                    loop(global_tasks);
                })





            }

        }
    });


}


function get_data_count() {
    return new Promise(function (resolve, reject) {
        window.db.items.count(function (count) {
            resolve(count);
        });
    });
}

function init_table(task) {


    $('#id_err_message').hide();


    Helper.functions.get_config().then(function (conf) {


        let pageIndex = $.cookie('pageIndex') ? parseInt($.cookie('pageIndex')) : 1;
        let pageSize = $.cookie('top100_pagesize') ? parseInt($.cookie('top100_pagesize')) : 30;

        let is_full_columns = conf.is_full_columns;
        let column_type = is_full_columns ? full_columns : simple_columns;
        $("#id_table").bootstrapTable('destroy').bootstrapTable({
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
                return "数据加载失败";
            },
            formatLoadingMessage: function () {
                return "数据加载中...";
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
                }
            });
            $("select[name='sel_countries']").change(function (e) {

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
            $("tr[data-index]").dblclick(function (e) {
                let $input = $(e.target).closest('tr').find("input[name='btSelectItem']");
                $input.click();
            });
            $(".icon.fa-chain-broken").closest('.dropdown-item').off("click").on("click", function (e) {
                e.preventDefault();


                Helper.functions.show_msg('id_err_message', wait_text);


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
        });
        var obj = {};
        let results = task.items.reduce(function (item, next) {
            obj[next.asin] ? '' : obj[next.asin] = true && item.push(next);
            return item;
        }, []);
        $("#id_table").bootstrapTable('load', results);
    });
}


//根据cookie显示隐藏显示列
function remember(name) {
    //获取cookie的值
    var cookieVal = $.cookie(name); //读取name为visibleVal的值
    //如果没有设置cookie
    if (cookieVal == undefined) {
        //设置几个默认值
        if (name == "img_url") {
            return true;
        }
        if (name == "asin") {
            return true;
        }
        if (name == "available_date_format") {
            return true;
        }
        if (name == 'rank_number') {
            return true;
        }
        if (name == 'rank_category') {
            return true;
        }
        if (name == 'price') {
            return true;
        }
        if (name == 'reviews_nb') {
            return true;
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

function page_reload() {
    Helper.functions.show_msg(msg_container, wait_text);
    valid_task().then(function (task) {
        if (task.config.start_url) {
            $("#id_start_url").val(task.config.start_url);
        }
        if (task.config.submitted && task.config.taskId) {
            $('#id_cloud_progress_bar').show();
        }
        $('#id_view_toogle').prop('checked', task.config.is_full_columns);
        $("#id_crawl_children").prop("checked", task.config.include_children);


        if (task.config.paused == true && window.localStorage.getItem('temp_job')) {
            $('#id_btn_stop').show().text('继续').off('click').on('click', function (e) {
                e.preventDefault();
                continue_crawl();
            });
        }

        let categories_0 = [];
        let categories_1 = [];

        task.items.forEach(function (row) {
            let rank_info = row.rank_info;
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
        });

        Helper.functions.display_percent_text('id_progress_bar', '本地详情下载进度', task.completed, task.items.length);

        let $id_category_0 = $("#id_rank_category_0");
        let $id_category_1 = $("#id_rank_category_1");


        $id_category_0.empty().append('<option value="">所有类目</option>');


        $id_category_0.append('<option value="-1">大类目排名为空</option>');
        $id_category_0.append('<option value="1">大类目排名不为空</option>');


        categories_0.sort();
        categories_0.forEach(function (item) {
            $id_category_0.append('<option value="' + item + '">' + item + '</option>');
        });
        $id_category_0.selectpicker().parent('div').css('border', "1px solid #e4eaec");


        $id_category_1.empty().append('<option value="">所有类目</option>');
        categories_1.sort();
        categories_1.forEach(function (item) {
            $id_category_1.append('<option value="' + item + '">' + item + '</option>');
        });

        init_table(filter(task));
    });
}

function update_process() {
    //console.log('up')
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
                    console.log(item.sold_by_amz);
                    return !item.country_code && !item.sold_by_amz == true &&
                        item.title.indexOf('Amazon') == -1 &&
                        (item.seller ? item.seller.indexOf("Amazon") == -1 : true);
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
            });
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
                    (rank_info.length > 1 && rank_info[1].rank_category_name == rank_category_1) ||
                    (rank_info.length > 2 && rank_info[2].rank_category_name == rank_category_1) ||
                    (rank_info.length > 3 && rank_info[3].rank_category_name == rank_category_1)
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
                    (rank_info.length > 1 && rank_info[1].rank_category_number >= parseInt(rank_number_1_min) &&
                        rank_info[1].rank_category_number <= parseInt(rank_number_1_max)) ||
                    (rank_info.length > 2 && rank_info[2].rank_category_number >= parseInt(rank_number_1_min) &&
                        rank_info[2].rank_category_number <= parseInt(rank_number_1_max)) ||
                    (rank_info.length > 3 && rank_info[3].rank_category_number >= parseInt(rank_number_1_min) &&
                        rank_info[3].rank_category_number <= parseInt(rank_number_1_max))
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
                    (rank_info.length > 1 && rank_info[1].rank_category_number >= parseInt(rank_number_1_min)) ||
                    (rank_info.length > 2 && rank_info[2].rank_category_number >= parseInt(rank_number_1_min))
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
                    (rank_info.length > 1 && rank_info[1].rank_category_number <= parseInt(rank_number_1_max)) ||
                    (rank_info.length > 2 && rank_info[2].rank_category_number <= parseInt(rank_number_1_max)) ||
                    (rank_info.length > 3 && rank_info[3].rank_category_number <= parseInt(rank_number_1_max))
                );
            } else {
                return false;
            }
        });

    }


    task['items'] = new_data;
    return task;
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
        '<span>任务ID：<input id="id_task_Id" type="text" placeholder="任务ID 16位数字" style="width:200px;"/></span>' +

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


function submit_to_cloud(e) {
    let $input = $(e.target).closest('.modal-content').find('input');
    let $err_container = $("#id_err_container");
    $input.on('focus', function (e) {
        $err_container.html('');
    });
    if ($input.length == 1) {
        let input_value = $.trim($input.val());
        if (!input_value || !/^[\u4e00-\u9fa5a-zA-Z-z0-9\s\_]+$/.test(input_value)) {
            $err_container.html('不支持的任务名！');
            return;
        }
        input_value = input_value.replace(/\s+/, " ");
        $(e.target).off('click').text('提交中...');
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
                        let taskId = config.taskId;
                        items.forEach(function (r) {
                            config['taskId'] = taskId;
                            config['_id'] = new Date().getTime();
                        });
                        let total = items.length;
                        execute(total, config, items, []);
                    } else {
                        $err_container.html('详情页已下载完毕，无需再提交！');
                        $(e.target).text('提交').on('click', function (ev) {
                            submit_to_cloud(ev);
                        });
                    }
                }).catch(function (e) {
                    console.log(e);

                })
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
                task['_id'] = Helper.string.uuid();
                tasks.push(task);
                asins.push(asin);
                console.log(task._id);
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
                let error = '未知错误，联系管理员！';
                if (res && res.isSuccess === false && res.value && res.value.message) {
                    error = res.value.message;
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
                }
            });
        });
    }
}


function send_items(config, items) {
    return new Promise(function (resolve, reject) {


        //let data = {'status': config.status, 'taskId': config.taskId, 'items': items};


        config['items'] = items;

        API.APP.send_command(CONST.app_const.bsr_tasks_submit.key, config).then(function (res) {
            if (res && res.isSuccess === true &&
                res.value &&
                res.value.data &&
                res.value.result === 1) {
                resolve()
            }
        }).catch(function (error) {

            reject(error);
        });

    })
}


function download_from_cloud(e) {


    valid_task().then(function (task) {
        if (task.config.taskId) {
            let taskId = task.config.taskId;
            let asins = [];
            let umcompleted_items = task.items.filter(function (item) {
                if (asins.indexOf(item.asin) == -1) {
                    asins.push(item.asin);
                    return item.completed == 0;
                }
            });
            asins = [];
            let total = task.items.length;
            execute_sync(total, taskId, umcompleted_items);


            let finished_count = total - umcompleted_items.length;
            // let p = (finished_count / total * 100).toFixed(2);
            // let text = finished_count + "/" + total;
            // Helper.functions.show_progress('id_cloud_local_progress_bar', p, 'ASIN详情同步进度：' + text);

            display_percent_text('id_cloud_local_progress_bar', 'ASIN详情同步进度', finished_count, total)
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


                    window.db.items.where({
                        asin: asin
                    }).modify(change);

                }


                let finished_count = total - items.length;
                // let p = (finished_count / total * 100).toFixed(2);
                // let text = finished_count + "/" + total;
                // Helper.functions.show_progress('id_cloud_local_progress_bar', p, 'ASIN详情同步进度：' + text);


                display_percent_text('id_cloud_local_progress_bar', 'ASIN详情同步进度', finished_count, total);
            }
            execute_sync(total, taskId, items);

        }).catch(function (res) {

            let error = '未知错误，联系管理员！';
            if (res && res.isSuccess === false && res.value && res.value.message) {
                error = res.value.message
            }
            $('#id_err_container').html(error);

            Helper.functions.show_msg(msg_container, error, 'error', true, 100);


        })
    } else {
        Helper.functions.show_msg("id_err_message", "<i class='icon fa-check'></i>️已完成同步！");
    }

}

function download_items(taskId, items) {

    return new Promise(function (resolve, reject) {


        let data = {
            'taskId': taskId,
            'items': items,
            'task_type': '__bestsellers__'
        };

        API.APP.send_command(CONST.app_const.download_items_from_cloud.key, data).then(function (res) {
            if (res && res.isSuccess === true &&
                res.value &&
                res.value.data &&
                res.value.result === 1) {
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



function display_percent_text(id, pre_text, finished_count, item_total) {

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


function execute_download(page, limit, taskId) {

    fetch_bsr_data(page, limit, taskId).then(function (res) {
        if (res && Object.keys(res).length > 0) {
            let data = res.data;
            let total = res.total;
            let finished = res.finished;
            let config = res.config;
            if (page == 1) {
                Helper.functions.save_config(config).then(function (conf) {
                    console.log('config saved');
                });
            }
            data.forEach(function (x) {
                x['id'] = x._id;
            });
            window.db.items.bulkPut(data).then(function (lastKey) {
                get_data_count().then(function (count) {
                    if (count > 0) {
                        display_percent_text('id_cloud_local_progress_bar', '下载进度:', count, total);
                    }
                    if (!finished) {
                        page = page + 1;
                        execute_download(page, limit, taskId);
                    } else {
                        let text = '恭喜，已完成下载，共计下载' + count + '条数据。';
                        Helper.functions.show_msg(msg_container, text, 'success', true);
                        display_percent_text('id_cloud_local_progress_bar', '下载进度:', count, total);
                    }
                });
            }).catch(Dexie.BulkError, function (e) {
                let text = '下载失败，请联系插件开发者！';
                Helper.functions.show_msg(msg_container, text, 'error', true);
                console.log(e);
            });
        }
    }).catch(function (res) {

        let error = '下载中断...，请联系插件开发者！';
        if (res && res.isSuccess === false && res.value && res.value.message) {
            error = res.value.message
        }
        Helper.functions.show_msg(msg_container, error, 'error', true, 100);
    });
}


function fetch_bsr_data(page, limit, taskId) {
    let data = {
        'page': page,
        'limit': limit,
        'taskId': taskId
    };
    return new Promise(function (resolve, reject) {
        API.APP.send_command(CONST.app_const.download_bsr_task.key, data).then(function (res) {
            if (res &&
                res.isSuccess == true &&
                res.value &&
                res.value.result == 1 &&
                res.value.data) {
                resolve(res.value.data);
            }
        }).catch(function (error) {
            reject(error)
        });

    })
}


function refresh_local_status() {

    valid_task().then(function (task) {


        let finished_count = task.items.filter(function (item) {
            return item.completed == 1;
        }).length;


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
            'task_type': '__bestsellers__'
        }).then(function (res) {
            if (res &&
                res.isSuccess == true &&
                res.value &&
                res.value.result == 1 &&
                res.value.content) {
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


function continue_crawl() {
    let job = {};
    let raw_temp_job = window.localStorage.getItem('temp_job');
    if (raw_temp_job) {
        try {
            job = JSON.parse(raw_temp_job);
        } catch (e) {}
    }
    if (job.hasOwnProperty('jobs') && job.hasOwnProperty('config')) {
        let config = job.config;
        window.global_jobs = job.jobs;
        if (config && Object.keys(config).length > 0 && window.global_jobs && window.global_jobs.length > 0) {
            Helper.functions.get_config().then(function (conf) {
                conf['paused'] = false;
                Helper.functions.save_config(conf).then(function () {
                    const top_category = config.top_category;
                    if (top_category) {
                        window.localStorage.setItem('temp_job', JSON.stringify({}));
                        $('#id_btn_stop').show().text('暂停').on('click', function (e) {
                            pause_crawl(e);
                        });
                        loop(window.global_jobs, top_category);
                    }
                });
            });
        }
    }
}

function pause_crawl(e) {
    let $button = $(e.target);
    Helper.functions.get_config().then(function (config) {
        if (config['paused'] === false) {
            config['paused'] = true;


            if (window.global_jobs.length > 0) {
                let job = {};
                job['config'] = config;
                job['jobs'] = window.global_jobs;
                window.localStorage.setItem('temp_job', JSON.stringify(job));
            }
            Helper.functions.save_config(config).then(function (conf) {
                if (conf.paused === true) {
                    $button.text('继续');
                }
            });
        } else if (config['paused'] === true) {

            return;
            Helper.functions.get_config().then(function (c) {
                let start_url = c.next_url ? c.next_url : c.url;

                c['paused'] = false;
                $button.text('停止');

                Helper.functions.save_config(c).then(function () {

                    if (c.paused === false) {
                        let job = {};
                        let raw_temp_job = window.localStorage.getItem('temp_job');
                        if (raw_temp_job) {
                            try {
                                job = JSON.parse(raw_temp_job);
                            } catch (e) {}
                        }
                        if (job.hasOwnProperty('jobs') &&
                            job.hasOwnProperty('config')) {
                            let config = job.config;
                            window.global_jobs = job.jobs;
                            if (config &&
                                Object.keys(config).length > 0 &&
                                window.global_jobs &&
                                window.global_jobs.length > 0) {

                                loop(window.global_jobs, config.top_category);
                            }
                        }

                    }
                });
            });
        }
    })

}


function sync_sellers() {

    Helper.functions.show_msg(msg_container, wait_text, 'success', true);
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

        if (sellerIds.length > 0) {
            Helper.functions.get_config().then(function (config) {
                execute_seller_sync(sellerIds, config);
            });
        } else {
            Helper.functions.show_msg(msg_container, '无可用信息匹配');
        }


    });
}

function execute_seller_sync(sellerIds, config) {
    let tasks = [];
    while (sellerIds.length > 0 && tasks.length < 100) {
        let sellerId = sellerIds.pop();
        tasks.push(sellerId);
    }
    if (tasks.length > 0) {
        let data = {
            'marketplaceId': config.marketplaceId,
            'sellerIds': tasks
        };
        batch_request_seller(data).then(function (result) {
            if (result.length == 0) {
                Helper.functions.show_msg(msg_container, new Date().Format("yyyy-MM-dd hh:mm:ss") + '提交了' + tasks.length + '个，匹配了' + result.length + '个卖家信息!');
            } else {
                result.forEach(function (x) {
                    window.db.items.where("sellerId").equals(x.sellerId).modify(function (value) {

                        this.value['country_code'] = x.country_code;
                        this.value['country_zh'] = x.country_zh;
                        this.value['province_zh'] = x.province_zh;
                        this.value['city_zh'] = x.city_zh;

                    }).catch(function (e) {
                        console.log(e);
                    });
                });
                Helper.functions.show_msg(msg_container, new Date().Format("yyyy-MM-dd hh:mm:ss") + '提交了' + tasks.length + '个，匹配了' + result.length + '个卖家信息!');
            }
            execute_seller_sync(sellerIds, config);
        }).catch(function (error) {
            Helper.functions.show_msg(msg_container, '同步失败', 'error', true);
        });
    } else {
        setTimeout(function () {
            Helper.functions.show_msg(msg_container, '匹配结束！');
        }, 2000);
    }
}

function batch_request_seller(data) {
    return new Promise(function (resolve, reject) {
        API.APP.send_command(CONST.app_const.seller_request.key, data).then(function (res) {
            if (res &&
                res.isSuccess == true &&
                res.value &&
                res.value.result == 1 &&
                res.value.data) {
                resolve(res.value.data);
            }
        }).catch(function (error) {
            reject(error)
        });
    });
}


function event_binder() {

    $("#id_start_url").on('blur', function (e) {
        let url = $(e.target).val();
        if (url) {
            const uri = new URL(url);
            let marketplaceId = Helper.functions.get_marketplaceId_by_domain(uri.host);
            if (marketplaceId) {
                Helper.functions.swich_zipcode('id_zipcode', marketplaceId);
            }
        }
    });


    $("#id_clear_selected").off("click").on('click', function (e) {
        e.preventDefault();
        if (confirm('删除所选数据？此操作不可恢复！')) {
            Helper.functions.remove_many('id_table');
        }
    });


    $("#id_btn_apply").off("click").on("click", function (e) {
        e.preventDefault();
        start_crawl();
    });
    $("#id_btn_filter").off("click").on("click", function (e) {
        e.preventDefault();

        Helper.functions.show_msg("id_err_message", wait_text);

        valid_task().then(function (task) {
            let new_task = filter(task);
            let msg = "共找到<font color='red'>" + new_task.items.length + "</font>条符合条件的数据！";
            Helper.functions.show_msg("id_err_message", msg);
            init_table(new_task);
        });
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
            if (/\d+/.test(taskId) && taskId.length == 16) {
                taskId = parseInt(taskId);
            } else {
                target.closest('.modal').find(".err_container").html("无效的任务ID!");
                return;
            }
            Helper.functions.get_config().then(function (config) {
                config['taskId'] = taskId;
                Helper.functions.save_config(config).then(function (conf) {
                    if (conf.taskId) {
                        let page = 1;
                        let limit = 500;
                        $('#task_download_modal').modal('hide');
                        display_percent_text('id_cloud_local_progress_bar', '下载进度:', 0, 0);
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


    $('.icon.fa-cloud-download').closest('a').off("click").on("click", function (e) {
        e.preventDefault();
        //Helper.functions.show_msg("id_err_message", wait_text);
        download_from_cloud(e);
    });


    $("#id_upload_json").change(function (e) {
        e.preventDefault();
        Helper.functions.show_msg("id_err_message", wait_text);
        let file = e.target.files[0];
        Helper.functions.import_cxf(file).then(function (res) {
            let msg = "恭喜，共计导入<span class='red-600'>" + res.items.length + "</span> 条数据！";
            $("#id_start_url").val(res.config.start_url ? res.config.start_url : '');
            $("#id_crawl_children").prop("checked", res.config.include_children);
            init_table({
                'items': res.items,
                'config': res.config
            });
            Helper.functions.show_msg("id_err_message", msg);
        }).catch(function (err) {
            Helper.functions.show_msg("id_err_message", err, 'error', true);
        });
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


    $('.icon.fa-refresh').closest('button').off("click").on("click", function (e) {
        e.preventDefault();
        Helper.functions.show_msg("id_err_message", wait_text);
        valid_task().then(function (task) {
            init_table(filter(task));
        });
    });

    $(".wb-trash").closest('.dropdown-item').off("click").on("click", function (e) {
        e.preventDefault();
        Helper.functions.remove_many('id_table');
    });
    $(".wb-rubber").closest('.dropdown-item').off("click").on("click", function (e) {
        e.preventDefault();
        if (confirm('清除所有数据？此操作不可恢复！')) {
            Helper.functions.db_clear();
            window.localStorage.clear();
        }
    });


    page_reload();


}

const simple_columns = [{
    title: '删除',
    //field: 'asin',
    align: 'center',
    width: '60px',
    checkbox: true

},
{

    title: '删除',
    align: 'center',
    width: '50px',
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
            return "<img width='80' class='lazy' data-original='" + value.replace(/200/g, '600') + "'/>";
        }
        return '-'

    }
},


{
    field: 'asin',
    title: '产品信息',
    align: 'left',
    sortable: true,
    width: '300px',
    formatter: function (value, row, index) {
        let item = "<span style='max-width:300px;word-break:normal; width:auto; display:block; white-space:pre-wrap;word-wrap : break-word ;overflow: hidden'>" + row.title + "</span>";
        item += "<br/><a target='_blank' href='https://" + row.domain + "/dp/" + row.asin + "'><b>" + row.asin + "</b></a>";
        if (row.fba) {
            item += "&nbsp;&nbsp;&nbsp;<i class='a-icon a-icon-prime a-icon-small'></i>";
        }
        if (row.rating > 0) {
            item += "&nbsp;&nbsp;&nbsp;评分:" + row.rating + "";
        } else {
            item += "&nbsp;&nbsp;&nbsp;<i class=\'" + row.rating + "\'/>";

        }


        if (row.tree && row.tree.length > 0) {
            let val = [];
            $.each(row.tree, function (i, item) {
                val.push("<a target='_blank' href='" + item.url + "'>" + item.category + "</a>");
            });
            //item += "<br/>" + val.join(" > ");
            item += "<br/><span style='max-width:300px;word-break:normal; width:auto; display:block; white-space:pre-wrap;word-wrap : break-word ;overflow: hidden'>路径:" + val.join(" > ") + "</span>";

        }


        return item;
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
    field: 'price',
    title: '价格',
    align: 'left',
    sortable: true,
    width: '80px',
    formatter: function (value, row, index) {
        return value;
    }
},
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
    field: 'rank',
    title: '类目排名',
    align: 'center',
    sortable: true,
    width: '70px',
    // formatter: function (value, row, index) {
    //     return (row.page-1)+row.position;
    // }
},
{
    field: 'tree',
    title: '路径',
    align: 'left',
    sortable: true,
    width: '300px',
    formatter: function (value, row, index) {

        if (value && value.length > 0) {
            let val = [];
            $.each(value, function (i, item) {
                val.push("<a target='_blank' href='" + item.url + "'>" + item.category + "</a>");
            });
            return val.join(" > ")
        } else {
            return value;
        }


    }
},
{
    field: 'createTime',
    title: '下载时间',
    align: 'left',
    sortable: true,
    width: '120px',
    formatter: function (value, row, index) {

        return Helper.date.timestamp_to_date(value, 'Y-m-d H:i:s');
    }
}
];
const full_columns = [{
    title: '删除',
    //field: 'asin',
    align: 'center',
    width: '50px',
    checkbox: true

},

{

    title: '删除',
    align: 'center',
    width: '50px',
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
    width: '120px',
    formatter: function (value, row, index) {
        if (value) {
            return "<img width='100' style='max-height: 100px;' class='lazy' data-original='" + value.replace(/320/g, '400') + "'/>";
        }
        return '-'

    }
},
{
    field: 'asin',
    title: '产品信息',
    align: 'left',
    sortable: true,
    width: '450px',
    formatter: function (value, row, index) {

        let item = "<span style='max-width:500px;word-break:normal; width:auto; display:block; white-space:pre-wrap;word-wrap : break-word ;overflow: hidden'>" + row.title + "</span>";


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


        if (row.seller && row.seller.indexOf("span") > -1) {
            //console.log(row.asin);
        }
        if (!row.seller && row.complete == true) {
            //console.log(row.asin)
        }

        item += "<input type='hidden' name='hidden_asin' value='" + row.asin + "'>";
        item += "<input type='hidden' name='hidden_sellerId' value='" + row.sellerId + "'>";


        if (row.seller && row.sellerId) {
            item += "<span class='mr-3 badge badge-round badge-dark'><a title='卖家' style='color:white;text-decoration:none;' target='_blank' href='https://" + row.domain + "/sp?_encoding=UTF8&seller=" + row.sellerId + "'>卖家:" + row.seller + "</a></span>";
        } else if (row.sold_by_amz == true) {
            item += "<span class='mr-3 badge badge-round badge-dark'>Amazon</span>";

        } else if (!row.seller && row.sellerId) {
            item += "<span class='mr-3 badge badge-round badge-dark'><a title='卖家' style='color:white;text-decoration:none;' target='_blank' href='https://" + row.domain + "/sp?_encoding=UTF8&seller=" + row.sellerId + "'>卖家:" + row.sellerId + "</a></span>";

        } else if (!row.sellerId && row.completed == true) {
            item += '无购物车或不可售';
        }
        if (row.brand) {
            let brand = Helper.string.decodeURIComponentSafe(row.brand);


            item += "<span title='品牌' class='mr-3 badge badge-round badge-success'>品牌:" + brand + "</span>";
            if (row.brand_store == true) {
                item += "<span class='mr-3 badge badge-round badge-danger'><a class='text-white' target='_blank' href='https://" + row.domain + row.brand_store_url + "'>品牌旗舰店</a></span>";
            }

        }
        if (row.tree && row.tree.length > 0) {
            let val = [];
            $.each(row.tree, function (i, item) {
                val.push("<a target='_blank' href='" + item.url + "'>" + item.category + "</a>");
            });
            //item += "<br/>路径:" + val.join(" > ");


            item += "<br/><span style='max-width:500px;word-break:normal; width:auto; display:block; white-space:pre-wrap;word-wrap : break-word ;overflow: hidden'>路径:" + val.join(" > ") + "</span>";

        }


        return item;
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "with": "450px",
                "font-size": "11px"
            }
        }
    }
},
{
    field: 'available_date_format',
    title: '上架日期',
    align: 'left',
    visible: false,
    sortable: true,
    width: '100px',
    formatter: function (value, row, index) {
        if (value) {
            return value;
        } else if (row.available_date) {
            return row.available_date;
        } else {
            return "<input name='available_date' type='text' placeholder='格式：2020/03/12'>";
        }
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px",
                "font-weight": "bold"
            }
        }
    }
},
{
    field: 'available_date',
    title: '上架天数',
    align: 'left',
    sortable: true,
    width: '100px',
    formatter: function (value, row, index) {


        value = row.available_date_format ? row.available_date_format : row.available_date;

        if (value) {
            return Helper.number.formatToString(Helper.date.available_date_format_to_day(value).day) + "天";
        }
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px",
                "font-weight": "bold"
            }
        }
    }
},


{
    field: 'rank_number',
    title: '排名',
    align: 'left',
    sortable: true,
    visible: remember('rank_number'),
    width: '80px',
    formatter: function (value, row, index) {
        if (value) {
            return Helper.number.formatToString(value);
        }
        return value;
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-weight": "bold"
            }
        }


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
        return value;
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
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
        return {
            css: {
                "font-weight": "bold"
            }
        }
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
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},


{
    field: 'rank_info',
    title: '全部排名',
    align: 'left',
    sortable: true,
    visible: false,
    width: '450px',
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
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
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
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},

{
    field: 'tree',
    title: '路径',
    align: 'left',
    sortable: true,
    visible: false,
    width: '300px',
    formatter: function (value, row, index) {

        if (value && value.length > 0) {
            let val = [];
            $.each(value, function (i, item) {
                val.push("<a target='_blank' href='" + item.url + "'>" + item.category + "</a>");
            });
            return val.join(" > ")
        } else {
            return value;
        }


    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},

{
    field: 'price',
    title: '价格',
    align: 'left',
    sortable: true,
    visible: true,
    width: '80px',
    formatter: function (value, row, index) {
        if (row.sign && value) {
            return row.sign + value;
        }
        return value;
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
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

        if (value && value.indexOf("%") > -1) {
            //value = decodeURIComponent(value);
        }
        return value;
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},
{
    field: 'seller',
    title: '卖家',
    align: 'left',
    sortable: true,
    visible: remember('seller'),
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
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},
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
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},
{
    field: 'reviews_nb',
    title: '评论数',
    align: 'left',
    sortable: true,
    width: '80px',
    visible: remember('reviews_nb'),
    formatter: function (value, row, index) {
        if (value) {
            return Helper.number.formatToString(value);
        }
        return value;
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},

{
    field: 'product_weight',
    title: '重量',
    align: 'left',
    sortable: true,
    visible: remember('product_weight'),
    width: '120px',
    formatter: function (value, row, index) {
        if (row.product_weight && row.product_weight.indexOf(';') > -1) {
            return row.product_weight.split(';')[1];

        } else if (row.product_size && row.product_size.indexOf(';') > -1) {
            return row.product_size.split(';')[1];

        } else if (row.product_weight) {
            return row.product_weight;
        } else {
            return '';
        }
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},

{
    field: 'product_size',
    title: '尺寸',
    align: 'left',
    sortable: true,
    width: '120px',
    visible: remember('product_size'),
    formatter: function (value, row, index) {

        if (row.product_size && row.product_size.indexOf(';') > -1) {
            return row.product_size.split(';')[0];

        } else if (row.product_size) {
            return row.product_size;

        } else {
            return '';
        }
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},


{
    field: 'rank',
    title: '类目排名',
    align: 'center',
    sortable: true,
    visible: remember('rank'),
    width: '70px',
    formatter: function (value, row, index) {
        if (row.rank) {
            return row.rank;
        } else {
            return '';
        }
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
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
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},

{
    field: 'fba',
    title: 'FBA',
    align: 'left',
    sortable: true,
    visible: remember('fba'),
    width: '70px',
    formatter: function (value, row, index) {
        if (value) {
            return "√️";
        }
    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
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
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},

{
    field: 'lastUpdateTime',
    title: '更新时间',
    align: 'left',
    sortable: true,
    visible: remember('lastUpdateTime'),
    width: '70px',
    formatter: function (value, row, index) {
        if (value) {
            return Helper.date.timestamp_to_date(value, 'Y-m-d H:i:s');
        }

    },
    cellStyle: function (value, row, index, field) {
        return {
            css: {
                "font-size": "11px"
            }
        }
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
        return {
            css: {
                "font-size": "11px"
            }
        }
    }
},
];



$(function () {


    API.APP.init_page(CONST.app_const.top100.key).then(function () {

        $("#id_btn_seller_request").off("click").on("click", function (e) {
            API.APP.valid_user().then(function () {
                sync_sellers();
            }).catch(function () {
                Helper.functions.show_msg(msg_container, '请登录后再操作');
            })
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
        refresh_cloud_status('id_cloud_progress_bar');



        url = "https://www.amazon.com/Best-Sellers-Health-Household/zgbs/hpc/ref=zg_bs_nav_0";
        url = 'https://www.amazon.de/gp/bestsellers/lighting/ref=zg_bs_nav_0'
        url = 'https://www.amazon.de/gp/bestsellers/lighting/3884362031/ref=zg_bs_nav_lighting_3_357666011' //3

        url = 'https://www.amazon.de/gp/bestsellers/lighting/ref=zg_bs_unv_lighting_1_357666011_2'

        fetch_bsr_page(url).then(function () {
            loop(global_tasks);
        })

     }).catch(function () {

    }).finally(function () {
        event_binder();
    });



})




