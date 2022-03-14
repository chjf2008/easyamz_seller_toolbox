const task_config = 'asin_keywords_config';
const msg_container = 'id_err_message';
const wait_text = '数据处理中,请稍后...';

API.APP.dbinit('asin_keywords').then(function (instance) {
    window.db = instance;
    window.db.version(1).stores({
        items: 'keywords',
        task: 'config,asin,marketplaceId'
    });
});


$(document).ready(function () {
    API.APP.init_page(CONST.app_const.asin_keywords.key).then(function () {
        Helper.functions.display_country_select('id_marketplace', CONST.iso_countries);
        $("#id_btn_apply").off('click').on('click', function (e) {
            start();
        });


    }).catch(function () {

    }).finally(function () {

    });
});


function start() {
    let asin = $("#id_asin").val();
    let domain = '';
    let marketplaceId = $("#id_marketplace option:checked").val();
    if (marketplaceId) {
        domain = Helper.functions.get_domain_by_marketplaceId(CONST.iso_countries, marketplaceId);
    }
    if (asin && domain) {
        let obj = {};
        obj[task_config] = {
            'asin': asin,
            'marketplaceId': marketplaceId,
            'domain': domain
        };

        Helper.functions.save_config(obj).then(function (config) {
            Helper.functions.show_msg(msg_container, '正在搜索，请稍后...', 'success', true);
            //init_table([]);
            $("#id_table").bootstrapTable('destroy');

            let start_link = 'https://' + domain + '/dp/' + asin + "/?th=1&psc=1";
            Helper.request.get(start_link).then(function (html) {
                let uri = new URL(start_link);
                API.Amazon.detail_page_parse(html, start_link).then(function (res) {

                    if (res.result == 1) {
                        let data = res.asin_data;
                        let asins = [];

                        let sp_data = [];
                        asins.push(asin);
                        $(html).find("div[data-a-carousel-options]").each(function (i, item) {
                            let section_id = $(item).attr("id");
                            let $sp_detail = $(html).find("#" + section_id);
                            if ($sp_detail.length == 1) {
                                let items = [];
                                $sp_detail.find("li").each(function (i, row) {
                                    sp_data.push({
                                        'asin': $(row).find("div[data-asin]").attr('data-asin'),
                                        'title': $(row).find("img.a-dynamic-image").attr("alt")
                                    });
                                });


                                /*

                                let init_asin_data = $sp_detail.attr("data-a-carousel-options");
                                if (init_asin_data) {
                                    let obj = $.parseJSON(init_asin_data);
                                    if (obj) {
                                        let initialSeenAsins = obj.initialSeenAsins;
                                        asins = asins.concat(initialSeenAsins);
                                    }
                                }
                                */

                            }
                        });


                        let variants_asins = [];

                        var re = /"dimensionValuesDisplayData" : (\{.*(?=\})\})/ig;

                        var match = html.match(re);
                        if (match) {
                            var result = $.parseJSON("{" + match[0] + "}");
                            if (result) {
                                //console.log(data.dimensionValuesDisplayData);

                                if (result.dimensionValuesDisplayData) {
                                    variants_asins = Object.keys(result.dimensionValuesDisplayData)
                                    console.log(variants_asins.length);
                                }
                            }
                        }
                        // for (let i = asins.length - 1; i >= 0; i--) {
                        //
                        //     let _asin = asins[i];
                        //     if (!_asin) {
                        //         asins.splice(i, 1);
                        //         continue;
                        //     }
                        //     if (_asin.indexOf('B') == -1) {
                        //         asins.splice(i, 1);
                        //         continue;
                        //     }
                        // }
                        let title = data.title;
                        let features = data.features;
                        if (!Helper.validator.isEmpty(data.rank_info)) {
                            let rank_links = [];
                            let rank_info = data.rank_info;
                            if (rank_info.length == 1) {
                                rank_links.push(rank_info[0].rank_link);
                                rank_links.push(rank_info[0].rank_link + "?pg=2");

                            } else if (rank_info.length == 2) {
                                rank_links.push(rank_info[0].rank_link);
                                rank_links.push(rank_info[0].rank_link + "?pg=2");
                                rank_links.push(rank_info[1].rank_link);
                                rank_links.push(rank_info[1].rank_link + "?pg=2");
                            } else if (rank_info.length == 3) {
                                rank_links.push(rank_info[0].rank_link);
                                rank_links.push(rank_info[0].rank_link + "?pg=2");
                                rank_links.push(rank_info[1].rank_link);
                                rank_links.push(rank_info[1].rank_link + "?pg=2");
                                rank_links.push(rank_info[2].rank_link);
                                rank_links.push(rank_info[2].rank_link + "?pg=2");
                            } else if (rank_info.length == 4) {
                                rank_links.push(rank_info[0].rank_link);
                                rank_links.push(rank_info[0].rank_link + "?pg=2");
                                rank_links.push(rank_info[1].rank_link);
                                rank_links.push(rank_info[1].rank_link + "?pg=2");
                                rank_links.push(rank_info[2].rank_link);
                                rank_links.push(rank_info[2].rank_link + "?pg=2");
                                rank_links.push(rank_info[3].rank_link);
                                rank_links.push(rank_info[3].rank_link + "?pg=2");
                            }
                            if (rank_links && rank_links.length > 0) {

                                let bsr_data = [];


                                brand = data.brand;
                                loop(domain, rank_links, title, brand, features, sp_data, variants_asins, bsr_data);

                                /*

                                let bsr_link_1 = 'https://' + domain + rank_link;
                                let bsr_link_2 = bsr_link_1 + "?pg=2";
                                let p1 = new Promise(function (resolve, reject) {
                                    Helper.request.get(bsr_link_1).then(function (html) {
                                        API.Amazon.top100_page_parse(html, bsr_link_1).then(function (r) {


                                            let bsr_asins = [];

                                            if (r && r.data && r.data.length > 0) {


                                                $.each(r.data, function (i, row) {
                                                    bsr_asins.push({"asin": row.asin, 'title': row.title});
                                                });

                                                resolve(bsr_asins);
                                            }
                                        });

                                    });
                                });
                                let p2 = new Promise(function (resolve, reject) {
                                    Helper.request.get(bsr_link_2).then(function (html) {
                                        API.Amazon.top100_page_parse(html, bsr_link_2).then(function (r) {
                                            let bsr_asins = [];
                                            if (r && r.data && r.data.length > 0) {
                                                $.each(r.data, function (i, row) {
                                                    bsr_asins.push({"asin": row.asin, 'title': row.title});
                                                });
                                                resolve(bsr_asins);
                                            }

                                        });

                                    });
                                });


                                Promise.all([p1, p2]).then(function (results) {

                                    let bsr_data = [];
                                    bsr_data = bsr_data.concat(results[0]);
                                    bsr_data = bsr_data.concat(results[1]);

                                    for (let i = asins.length - 1; i >= 0; i--) {

                                        let _asin = asins[i];
                                        if (!_asin) {
                                            asins.splice(i, 1);
                                            continue;
                                        }
                                        if (_asin.indexOf('B') == -1) {
                                            asins.splice(i, 1);
                                            continue;
                                        }
                                    }
                                    let data = {
                                        'title': title,
                                        'features': features,
                                        'asins': asins,
                                        'bsr_data': bsr_data
                                    };
                                    API.APP.send_command(CONST.app_const.search_asin_keywords.key, data).then(function (res) {
                                        let results = [];
                                        if (res && res.isSuccess === true) {
                                            let keywords = res.value.data;
                                            keywords.sort(function (a, b) {
                                                return a.sfr - b.sfr;
                                            });
                                            $.each(keywords, function (i, item) {
                                                console.log(item.keywords, item.sfr);
                                                results.push({'keywords': item.keywords, 'sfr': item.sfr});
                                            });
                                            init_table(results);
                                            Helper.functions.show_msg(msg_container, '共搜索到' + results.length + '个关键词', 'success', true);

                                        }
                                    }).catch(function (error) {
                                        console.log(error)

                                    });
                                });
                                */
                            }
                        }


                    }

                });
            }).catch(function (error) {
                console.log(error)
            });

        });
    }
}

function loop(domain, urls, title, brand, features, sp_data, variants_asins, bsr_data) {
    if (urls.length > 0) {
        let url = 'https://' + domain + urls.shift();
        execute(url).then(function (data) {
            for (let idx in data) {
                bsr_data.push(data[idx]);
            }
            loop(domain, urls, title, brand, features, sp_data, variants_asins, bsr_data);
        });
    } else {
        //todo submit data
        let data = {
            'title': title,
            'brand': brand,
            'features': features,
            'sp_data': sp_data,
            'variants_asins': variants_asins,
            'bsr_data': bsr_data
        };
        API.APP.send_command(CONST.app_const.search_asin_keywords.key, data).then(function (res) {
            let results = [];
            if (res && res.isSuccess === true) {
                let keywords = res.value.data;
                keywords.sort(function (a, b) {
                    return a.sfr - b.sfr;
                });
                $.each(keywords, function (i, item) {
                    console.log(item.keywords, item.sfr);
                    results.push({
                        'keywords': item.keywords,
                        'sfr': item.sfr
                    });
                });
                init_table(results);
                Helper.functions.show_msg(msg_container, '共搜索到' + results.length + '个关键词', 'success', true);

            }
        }).catch(function (error) {
            console.log(error)

        });
    }
}


function execute(url) {
    return new Promise(function (resolve, reject) {
        Helper.request.get(url).then(function (html) {
            API.Amazon.top100_page_parse(html, url).then(function (r) {
                if (r && r.data && r.data.length > 0) {
                    let data = [];
                    $.each(r.data, function (i, row) {
                        data.push({
                            "asin": row.asin,
                            'title': row.title
                        });
                    });
                    resolve(data);
                } else {
                    resolve([]);
                }
            });
        });
    });
}

let columns = [{
        title: '删除',
        //field: 'asin',
        align: 'center',
        width: '50px',
        checkbox: true

    },


    {
        field: 'keywords',
        title: '关键词',
        align: 'left',
        sortable: true,
        visible: true,
        width: '75px',
        formatter: function (value, row, index) {

            return value;
        }
    },

    {
        field: 'sfr',
        title: '热度',
        align: 'left',
        sortable: true,
        width: '75px',
        formatter: function (value, row, index) {

            return value;
        }
    },
    {


        title: '删除',
        align: 'center',
        width: '70px',
        formatter: function (value, row, index) {
            //console.log(row)
            let asin = row.asin;
            //console.log(asin)
            return "<a href='#' class='btn btn-sm btn-icon btn-pure btn-default on-default remove-row text-center'>" +
                "<input type='hidden' value='" + row.questionId + "'>" +
                "<i ref='popover' data-content='删除' class='icon wb-trash'></i></a>";
        },
        events: {
            'click .wb-trash': function (e, value, row, index) {
                e.preventDefault();
                if (confirm('确定删除吗？')) {
                    let questionId = row.questionId;
                    if (questionId) {
                        remove_many([questionId]).then(function (r) {
                            $(e.target).closest('tr').remove();
                        });
                    }
                }
            }
        }
    }
];

function init_table(items) {
    let $table = $("#id_table");
    $table.bootstrapTable('destroy').bootstrapTable({
        striped: true,
        cache: true,
        //toolbar: '#toolbar',
        pagination: true,
        sortable: true,
        sortOrder: "asc",
        sidePagination: "client",
        pageNumber: 1,
        pageSize: Helper.cookies.get_cookies_page_size('qa_pagesize'),
        pageList: [10, 20, 40, 60, 80, 100, 200, 500, 1000, 2000],
        minimumCountColumns: 2,
        //height: 500,
        cardView: false,
        //showRefresh:true,
        paginationVAlign: 'both',
        showColumns: true,
        detailView: false,

        silent: true,
        columns: columns,

        onLoadError: function () {
            return "";
        },
        formatLoadingMessage: function () {
            return "";
        },
        formatNoMatches: function () {
            return '无数据';
        },
        onPageChange: function (pageIndex, pageSize) {
            Helper.cookies.set_cookies('qa_pagesize', pageSize, 30);
        },

    }).on('post-body.bs.table', function () {});
    $table.bootstrapTable('load', items);
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