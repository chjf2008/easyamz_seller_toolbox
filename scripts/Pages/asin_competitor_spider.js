window.db = null;
window.task_urls = [];
window.section_asins = {};

const item_type = ['竞品', '差异化', '类似款', '其他'];
const task_config = 'asin_competitor_config';
const msg_container = 'id_err_message';
const wait_text = '数据处理中,请稍后...';


API.APP.dbinit('asin_competitor').then(function (instance) {
    window.db = instance;
    window.db.version(1).stores({
        items: 'id,asin,completed,sellerId'
    });
});

$(document).ready(function () {
    API.APP.init_page(CONST.app_const.competitor.key).then(function (s) {
        init_modal();
        Helper.functions.display_country_select('id_marketplace', CONST.iso_countries);
        event_binder();
    }).catch(function () {
        location.href = '/pages/login.html';
    }).finally(function () {
    })
});


function init_table(task) {


    let pageIndex = $.cookie('pageIndex') ? parseInt($.cookie('pageIndex')) : 1;
    let pageSize = $.cookie('top100_pagesize') ? parseInt($.cookie('top100_pagesize')) : 30;

    let column_type = task.config.is_full_columns ? full_columns : simple_columns;


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
        Helper.functions.lazyload('img.lazy');
        tippy('[data-tippy-content]');
        $("tr[data-index]").dblclick(function (e) {
            let $input = $(e.target).closest('tr').find("input[name='btSelectItem']");
            $input.click();
        });
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
            country_zh = country_zh.replace(/[A-Za-z()]/g, '');
            if (country_code && country_zh && confirm("您选择的国家是：" + country_zh + "   确定修改吗？ 该操作不可撤销！")) {
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
        $("select[name='item_type']").change(function (e) {
            let $this = $(e.target);
            let item_type = $this.val();
            if (item_type) {
                let asin = $this.closest('tr').find("input[name='hidden_asin']").val();
                if (asin) {
                    window.db.items.where("asin").equals(asin).modify(function (value) {
                        this.value['item_type'] = item_type;
                    });
                }
            }
        });
        $(".icon.wb-trash").off('click').on('click', function (e) {
            e.preventDefault();
            let id = $(e.target).closest('tr').find("input[name='item_id']").val();
            Helper.functions.remove_one('id_table', e, [id]);
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

    });
    $("#id_table").bootstrapTable('load', task.items);

}


let simple_columns = [
    {
        title: '删除',
        align: 'center',
        width: '50px',
        checkbox: true

    },
    {


        title: '删除',
        field: 'asin',
        width: '50px',
        align: 'center',
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
                return "<img height='80' class='lazy' data-original='" + value.replace(/160/g, '400') + "'/>";

            }
            return '';
        }
    },
    {
        field: 'asin',
        title: '产品信息',
        align: 'left',
        sortable: true,
        width: '550px',
        formatter: function (value, row, index) {
            let item = row.title + "<br/><a target='_blank' href='https://" + row.domain + "/dp/" + row.asin + "'><b>" + row.asin + "</b></a>";
            if (row.fba) {
                item += "&nbsp;&nbsp;&nbsp;<i class='a-icon a-icon-prime a-icon-small'></i>";
            }
            if (row.rating) {
                item += "&nbsp;&nbsp;&nbsp;<i class=\'" + row.rating + "\'/>";

            }
            return item;
        }
    },


    {
        field: 'asin',
        title: 'ASIN',
        align: 'left',
        sortable: true,
        width: '150px',
        formatter: function (value, row, index) {
            return value;
        }
    },
    {
        field: 'price',
        title: '价格',
        align: 'left',
        sortable: true,
        width: '150px',
        formatter: function (value, row, index) {
            return value;
        }
    },


    {
        field: 'rating',
        title: '评分',
        align: 'left',
        sortable: true,
        width: '150px',
        formatter: function (value, row, index) {
            if (CONST.re_float.test(row.rating)) {
                return row.rating;
            } else {
                return "<i class=\'" + row.rating + "\'/>";
            }

        }
    },
    {
        field: 'reviews_nb',
        title: '评论数',
        align: 'left',
        sortable: true,
        width: '150px',
        formatter: function (value, row, index) {
            return Helper.number.formatToString(value);
        }
    },
    {
        field: 'badge',
        title: '勋章',
        align: 'left',
        sortable: true,
        width: '150px',
        formatter: function (value, row, index) {
            return value;
        }
    }

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
        title: '删除',
        field: 'asin',
        width: '40px',
        align: 'center',
        formatter: function (value, row, index) {
            //console.log(row)
            let asin = row.asin;
            //console.log(asin)
            return "<span title='删除' class='btn btn-sm btn-icon btn-pure btn-default on-default remove-row text-center grey-800'>" +
                "<input type='hidden' name='item_id' value='" + row.id + "'>" +
                "<i ref='popover' data-content='删除' class='icon wb-trash'></i></span>";
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
                return "<img height='140' style='max-height: 100px;' class='lazy' data-original='" + value.replace(/320/g, '400') + "'/>";
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
            let item = row.title;

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
                item += "<span class='mr-3 badge badge-round badge-dark'><a title='卖家' style='color:white;text-decoration:none;' href='https://" + row.domain + "/sp?_encoding=UTF8&seller=" + row.sellerId + "'>卖家:" + row.seller + "</a></span>";
            } else if (!row.sellerId && row.complete == true) {
                item += '无购物车或不可售';
            }
            if (row.brand) {
                let brand=Helper.string.decodeURIComponentSafe(row.brand);
                item += "<span title='品牌' class='mr-3 badge badge-round badge-success'>品牌:" + brand + "</span>";
                if (row.brand_store == true) {
                    item += "<span class='mr-3 badge badge-round badge-danger'><a class='text-white' target='_blank' href='https://" + row.domain + row.brand_store_url + "'>品牌旗舰店</a></span>";
                }

            }


            return item;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"with": "450px", "font-size": "11px"}}
        }
    },
    {
        field: 'item_type',
        title: '分类',
        align: 'center',
        sortable: true,
        visible: true,
        width: '70px',
        formatter: function (value, row, index) {

            let str = '<select name="item_type" class="form-control w-100">';

            for (let i = 0; i < item_type.length; i++) {

                if (item_type[i] == value) {

                    str += '<option value=' + value + ' selected="selected">' + value + '</option>'

                } else {
                    str += '<option value="' + item_type[i] + '">' + item_type[i] + '</option>'
                }


            }

            str += "</select>";


            return str;


            // return '<select name="item_type" class="form-control w-100">' +
            //     '<option value="竞品">竞品</option>' +
            //     '<option value="差异化">差异化</option>' +
            //     '<option value="类似款">类似款</option>' +
            //     '<option value="其他">其他</option>' +
            //     '</select>';
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },


    {
        field: 'rating',
        title: '评分',
        align: 'left',
        sortable: true,
        width: '70px',
        formatter: function (value, row, index) {
            if (CONST.re_float.test(row.rating)) {
                return row.rating;
            } else {
                return "<i class=\'" + row.rating + "\'/>";
            }
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {
        field: 'asin',
        title: 'ASIN',
        align: 'center',
        sortable: true,
        visible: false,
        width: '70px',
        formatter: function (value, row, index) {
            return value;
        },
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
        field: 'reviews_nb',
        title: '评论',
        align: 'left',
        sortable: true,
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
        field: 'rank_number',
        title: '排名',
        align: 'left',
        sortable: true,
        width: '80px',
        formatter: function (value, row, index) {
            if (value) {
                return Helper.number.formatToString(value);
            } else if (value) {
                return value;
            }
            return '';
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
        width: '220px',
        formatter: function (value, row, index) {
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
        visible: false,
        sortable: true,
        width: '100px',
        formatter: function (value, row, index) {

            if (value) {


                return value;
            } else {
                return "<input class='w-120' name='available_date' type='text' placeholder='格式：2020/03/12'>";
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
        width: '100px',
        formatter: function (value, row, index) {

            if (value) {
                return Helper.number.formatToString(Helper.date.available_date_format_to_day(value).day) + "天";
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
        sortable: true,
        width: '120px',
        formatter: function (value, row, index) {

            if (value && value.indexOf(';') > -1) {
                return value.split(';')[0];

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
        visible: false,
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
        visible: false,
        width: '70px',
        formatter: function (value, row, index) {

            if (value && value.indexOf("%") > -1) {
                value = decodeURIComponent(value);
            }
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },

    {
        field: 'brand_store',
        title: '品牌店铺',
        align: 'center',
        sortable: true,
        visible: false,
        width: '70px',
        formatter: function (value, row, index) {
            return row.brand_store == true ? "✓️" : "x️";
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },
    {
        field: 'seller',
        title: '卖家',
        align: 'left',
        visible: false,
        sortable: true,
        width: '80px',
        formatter: function (value, row, index) {
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },

    {
        field: 'country_code',
        title: '国家(地区）',
        align: 'left',
        visible: true,
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
    },
    {
        field: 'page',
        title: '位置',
        align: 'center',
        sortable: true,
        visible: false,
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
        visible: false,
        width: '70px',
        formatter: function (value, row, index) {
            return value;
        },
        cellStyle: function (value, row, index, field) {
            return {css: {"font-size": "11px"}}
        }
    },


    {
        field: 'fba',
        title: 'FBA',
        align: 'center',
        sortable: true,
        visible: false,
        width: '70px',
        formatter: function (value, row, index) {
            if (row.fba == true) {
                return "&nbsp;&nbsp;&nbsp;<i class='a-icon a-icon-prime a-icon-small'></i>";
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
        visible: false,
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

];


function sync_sellers() {

    Helper.functions.show_msg('id_err_message', wait_text, 'success', true);

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
                Helper.functions.show_msg(msg_container, '提交了' + tasks.length + '个，匹配了' + result.length + '个卖家信息！');
            } else {
                result.forEach(function (x) {
                    window.db.items.where("sellerId").equals(x.sellerId).modify({
                        'country_code': x.country_code,
                        'country_zh': x.country_zh,
                        'province_zh': x.province_zh,
                        'city_zh': x.city_zh
                    }).then(function () {
                        Helper.functions.show_msg(msg_container, '提交' + tasks.length + '个，匹配' + result.length + '个卖家信息！');

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
            Helper.functions.show_msg(msg_container, '匹配结束！');
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
        text += ":" + finished_count + "/" + item_total;
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
        Helper.functions.display_percent_text('id_progress_bar', '本地详情下载进度', finished_count, item_total);
    });
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


    $("#id_btn_apply").off('click').on("click", function (e) {
        e.preventDefault();

        Helper.functions.show_msg(msg_container, wait_text);
        fetch_items();
    });

    $("#id_btn_filter").off("click").on("click", function (e) {
        e.preventDefault();

        Helper.functions.show_msg(msg_container, wait_text);

        valid_task().then(function (task) {

            let new_task = filter(task);
            let msg = "共找到<font color='red'>" + new_task.items.length + "</font>条符合条件的数据！";
            Helper.functions.show_msg("id_err_message", msg);
            init_table(new_task);
        }).catch(function () {
            Helper.functions.show_msg('id_err_message', '无可用的数据', 'error', true);
        });
    });
    $('#id_btn_refresh').off("click").on("click", function (e) {
        e.preventDefault();
        valid_task().then(function (task) {
            init_table(task);
        }).catch(function () {
            Helper.functions.show_msg('id_err_message', '无可用的数据！', 'error', true);

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


    //

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

                Helper.functions.show_msg('id_err_message', '无可用的数据！', 'error', true);
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

    $('.icon.fa-refresh').off("click").on("click", function (e) {
        e.preventDefault();
        $(e.target).prev('h6').html('计算中...');
        refresh_local_status();
    });

    $('#id_captcha_modal').on('hidden.bs.modal', function (e) {
        $(e.target).find("form").attr('action', '');
        $(e.target).find('img').attr("src", '');
        $(e.target).find("input[name='amzn']").val('');
        $(e.target).find("input[name='amzn-r']").val('');
    });


    page_reload();

}

function fetch_items() {
    let asin = $.trim($("#id_asin").val());
    let marketplaceId = $("#id_marketplace option:checked").val();
    let domain = Helper.functions.get_domain_by_marketplaceId(CONST.iso_countries, marketplaceId);
    if (!domain || !asin || !/^(B[\dA-Z]{9}|\d{9}(X|\d))$/.test(asin)) {
        $("#id_btn_apply")
            .html("<i class='icon fa-play-circle'></i>开 始")
            .off("click").on("click", function (e) {
            $(e.target).closest('button').html("分析中...");
            fetch_items();
        });
        return;
    }
    let enhance_search = $("#id_chk_enhance").prop("checked");
    let asin_url = 'https://' + domain + '/dp/' + asin + '?th=1&psc=1';
    Helper.request.get(asin_url).then(function (html) {
        return new Promise(function (resolve, reject) {
            let uri = new URL(asin_url);
            API.Amazon.detail_page_parse(html, asin_url).then(function (res) {

                if (res.result == 1) {
                    data = res.asin_data;

                    let marketplace_code = Helper.functions.get_marketplace_code_by_marketplaceId(marketplaceId);

                    //dispay_asin_data(data);
                    let obj = {};
                    obj = {
                        "marketplaceId": marketplaceId,
                        "asin": asin,
                        'enhance_search': enhance_search,
                        'asin_data': data,
                        'marketplace_code': marketplace_code
                    };

                    Helper.functions.save_config(obj).then(function (config) {
                        let $doc = $(html);
                        let section_ids = [];
                        $doc.find("div[data-a-carousel-options]").each(function (i, item) {
                            let _section_id = $(item).attr("id");
                            //console.log(_section_id);
                            if (!_section_id && enhance_search) {
                                _section_id = '_view_also_viewed_';
                            }
                            if (_section_id) {
                                section_ids.push(_section_id);
                                window.section_asins[_section_id] = [];
                            }
                        });
                        if (!section_ids) {
                            $("#id_btn_apply").text("开始").off("click").on("click", function (e) {
                                $(e.target).text("分析中...");
                                fetch_items();
                            });
                        }
                        $.each(section_ids, function (i, section_id) {
                            let $sp_detail = $doc.find("#" + section_id);
                                if ($sp_detail.length == 1) {
                                let init_asin_data = $sp_detail.attr("data-a-carousel-options");
                                if (init_asin_data) {
                                    let obj = $.parseJSON(init_asin_data);
                                    if (obj) {
                                        let initialSeenAsins = obj.initialSeenAsins;
                                        window.section_asins[section_id] = window.section_asins[section_id].concat(initialSeenAsins);
                                        let ajax = obj.ajax;
                                        if (!ajax) {
                                            return true;
                                        }
                                        let ajax_url = ajax.url;
                                        let ajax_params = ajax.params;
                                        let set_size = obj.set_size;
                                        let total_page;
                                        let page_size = 6;
                                        if ((set_size) % page_size == 0) {
                                            total_page = (set_size) / page_size;
                                        } else {
                                            total_page = parseInt(set_size / page_size) + 1;
                                        }
                                        for (var p = 2; p <= total_page; p++) {
                                            let request_url = "https://" + domain + ajax_url + "?";
                                            let params = [];
                                            if (p == 2) {
                                                ajax_params['cc'] = 10;
                                                ajax_params['count'] = 8;
                                                ajax_params['offset'] = 10;
                                                ajax_params['pg'] = 2;
                                                ajax_params['num'] = 8;
                                                ajax_params['start'] = 10;
                                            } else {
                                                ajax_params['cc'] = page_size * p;
                                                ajax_params['count'] = page_size;
                                                ajax_params['offset'] = page_size * p;
                                                ajax_params['pg'] = p;
                                                ajax_params['num'] = page_size;
                                                ajax_params['start'] = page_size * p;

                                            }
                                            ajax_params['tot'] = set_size;
                                            for (let key of Object.keys(ajax_params)) {
                                                params.push(key + "=" + ajax_params[key]);
                                            }
                                            request_url += params.join("&");
                                            window.task_urls.push({
                                                "request_url": request_url,
                                                'section_id': section_id,
                                                'domain': domain
                                            });
                                        }
                                        //处理第一页
                                        let items = [];
                                        $sp_detail.find("li").each(function (i, row) {
                                            let _asin = $(row).find("div[data-asin]").attr('data-asin');
                                            let img_url = $(row).find("img.a-dynamic-image").attr("src");
                                            let title = $(row).find("img.a-dynamic-image").attr("alt");
                                            let text = $(row).find("span.a-size-medium.a-color-price").html();
                                            let price = API.Amazon.ValidFieldHelper.Price(text);
                                            let fba = $(row).find("i.a-icon-prime").length == 1 ? 1 : 0;
                                            text = $(row).find("i.a-icon-star").next("span").html();
                                            let reviews_nb = API.Amazon.ValidFieldHelper.Reviews_nb(text);

                                            let rating = $(row).find("i.a-icon-star").attr("class");
                                            let badge = $(row).find("span.sponsored-products-deal-badge-generic").html();
                                            let item = {
                                                'id': Helper.string.uuid(),
                                                'group': section_id,
                                                'page': 1,
                                                'position': i + 1,
                                                'asin': _asin,
                                                'img_url': img_url,
                                                'title': title,
                                                'price': price,
                                                'fba': fba,
                                                'domain': domain,
                                                'reviews_nb': reviews_nb,
                                                'rating': rating,
                                                'badge': badge ? badge : '',
                                                'qa': 0,
                                                'offerCount': 0,
                                                'coupon': '',
                                                'completed': 0,
                                                'country_code': '',
                                                'country_zh': '',
                                                'province_zh': '',
                                                'city_zh': '',
                                                'item_type': '竞品',
                                                'product_size': '',
                                                'product_weight': ''
                                            };

                                            items.push(item);

                                        });
                                        items.push({
                                            'id': Helper.string.uuid(),
                                            'group': '',
                                            'page': 0,
                                            'position': 0,
                                            'asin': data.asin,
                                            'img_url': data.image_url,
                                            'title': data.title,
                                            'price': data.price,
                                            'fba': data.fba,
                                            'domain': domain,
                                            'reviews_nb': data.reviews_nb,
                                            'rating': data.rating,
                                            'badge': '',
                                            'qa': 0,
                                            'offerCount': 0,
                                            'coupon': '',
                                            'completed': 0,
                                            'country_code': '',
                                            'country_zh': '',
                                            'province_zh': '',
                                            'city_zh': '',
                                            'item_type': '竞品',
                                            'product_size': '',
                                            'product_weight': ''
                                        });

                                        window.db.items.bulkPut(items).then(function () {
                                            window.db.items.count(function (count) {
                                                let msg = "请勿刷新网页，数据更新中... 已抓取<span class='red-600'>" + count + "</span> 条数据";
                                                Helper.functions.show_msg('id_err_message', msg);
                                            });
                                        });
                                    }
                                }
                            } else {
                                let $view_also_viewed = $doc.find("div[data-a-carousel-options]");
                                if ($view_also_viewed.length == 1) {
                                    let options = $view_also_viewed.attr("data-a-carousel-options");
                                    if (options) {
                                        let params = JSON.parse(options);

                                        let baseAsin = params.baseAsin;
                                        let name = params.name;
                                        let set_size = params.set_size;
                                        let ajax = params.ajax;
                                        if (ajax) {
                                            let ajax_url = ajax.url;
                                            let id_list = ajax.id_list;
                                            let id_param_name = ajax.id_param_name;
                                            let ajax_params = ajax.params;

                                            let request_url = "https://www.amazon." + domain + ajax_url + "?";
                                            if (ajax_params) {
                                                let p = [];
                                                for (let key of Object.keys(ajax_params)) {
                                                    p.push(key + "=" + encodeURIComponent(ajax_params[key]));
                                                }
                                                request_url += p.join("&");
                                            }
                                            request_url += "&count=14&offset=7&asins=" + encodeURIComponent(id_list);
                                            window.task_urls.push({
                                                "request_url": request_url,
                                                'section_id': section_id,
                                                'domain': domain
                                            });
                                        }
                                    }
                                }
                            }
                        });
                        resolve();
                    });


                }
            });

        }).then(function () {
            batch_exec();
        });
    }).catch(function (error) {
        if (error.status == 404) {
            Helper.functions.show_msg('id_err_message', '该商品不存在！', 'error', true);

        } else if (error.status == 503) {
            Helper.functions.show_msg('id_err_message', '操作频繁，请稍后再试！', 'error', true);
        } else if (error.status >= 500) {
            Helper.functions.show_msg('id_err_message', '未知错误，请联系插件开发者！', 'error', true);
        }
        $("#id_btn_apply").text("开始").off("click").on("click", function (e) {
            $(e.target).text("分析中...");
            $("#id_err_message").hide().html("");
            fetch_items();
        });
    });
}

function batch_exec() {
    try {
        if (window.task_urls && window.task_urls.length > 0) {
            let task = window.task_urls.shift();
            let request_url = task.request_url;
            if (task.section_id != '_view_also_viewed_') {
                request_url += "&oData=" + JSON.stringify(window.section_asins[task.section_id]);
            }
            execute(task).then(function () {
                window.db.items.count(function (count) {
                    let msg = "请勿刷新网页，数据更新中... 已抓取<span class='red-600'>" + count + "</span> 条数据";
                    Helper.functions.show_msg('id_err_message', msg);
                });
                setTimeout(function () {
                    batch_exec();
                }, 500);
            });
        } else {
            window.db.items.count(function (count) {
                let msg = " <i class='icon fa-check'></i>️恭喜，已完成！共查询到" + count + "条竞品。";
                Helper.functions.show_msg('id_err_message', msg);
            });
            $("#id_btn_apply").html("<i class='icon fa-remove'></i>开始")
                .off("click")
                .on("click", function (e) {
                    $(e.target).closest('button').text("分析中...");
                    fetch_items();
                });
        }
    } catch (e) {
        console.log(e);
    }
}


function execute(task) {
    let domain = task.domain;
    let request_url = task.request_url;
    if (task.section_id != '_view_also_viewed_') {
        request_url += "&oData=" + JSON.stringify(window.section_asins[task.section_id]);
    }
    return new Promise(function (resolve, reject) {
        $.get(request_url, function (res, status) {
            //console.log('完成：' + request_url);
            let rows = res.data;
            let page = 0;
            let match = request_url.match(/pg=(\d+)/);
            if (match) {
                if (/^\d+$/.test(match[1])) {
                    page = parseInt(match[1]);
                }
            }
            if (task.section_id == '_view_also_viewed_') {
                $.each(rows, function (i, row) {
                    let _asin = ''
                    let rating = $(row).find("span.a-icon-alt").html();
                    let reviews_nb = '0'
                    if ($(row).find("a[title]").length == 1) {
                        reviews_nb = $(row).find("a[title]").next('a').html();
                    }
                    reviews_nb = API.Amazon.ValidFieldHelper.Reviews_nb(reviews_nb);
                    let img_url = $(row).find("img.a-dynamic-image").attr("src");
                    let title = $(row).find("img.a-dynamic-image").attr("alt");
                    let text = $(row).find("span.p13n-sc-price").html();
                    let price = API.Amazon.ValidFieldHelper.Price(text);
                    let asin_link = $(row).find("a[href*='/dp/']").attr("href");
                    if (asin_link) {
                        _asin = get_asin_from_url(asin_link);
                    }
                    let item = {
                        'id': Helper.string.uuid(),
                        'group': '',
                        'page': page,
                        'position': i + 1,

                        'asin': _asin,
                        'img_url': img_url,
                        'title': title,
                        'price': price,
                        'fba': 0,
                        'domain': domain,
                        'reviews_nb': reviews_nb,
                        'rating': rating,
                        'badge': '',
                        'qa': 0,
                        'offerCount': 0,
                        'coupon': '',
                        'completed': 0,
                        'country_code': '',
                        'country_zh': '',
                        'province_zh': '',
                        'city_zh': '',
                        'item_type': '竞品',
                        'product_size': '',
                        'product_weight': ''
                    };
                    window.db.items.put(item).then(function (o) {
                    }).catch(function (error) {
                        console.log(error);
                    });
                });

            } else {
                $.each(rows, function (i, row) {
                    let asin = row.oid;
                    let content = row.content;
                    if (window.section_asins[task.section_id].indexOf(asin) == -1) {
                        window.section_asins[task.section_id].push(asin);
                    }
                    let _$doc = $(content);
                    let img_url = _$doc.find("img.a-dynamic-image").attr("src");
                    let title = _$doc.find("img.a-dynamic-image").attr("alt");
                    let text = _$doc.find("span.a-size-medium.a-color-price").html();
                    let price = API.Amazon.ValidFieldHelper.Price(text);
                    let fba = _$doc.find("i.a-icon-prime").length == 1 ? 1 : 0;
                    text = _$doc.find("i.a-icon-star").next("span").html();
                    let reviews_nb = API.Amazon.ValidFieldHelper.Reviews_nb(text);
                    let rating = _$doc.find("i.a-icon-star").attr("class");
                    let badge = _$doc.find("span.sponsored-products-deal-badge-generic").html();

                    let item = {
                        'id': Helper.string.uuid(),
                        'group': task.section_id,
                        'page': page,
                        'position': i + 1,
                        'asin': asin,
                        'img_url': img_url,
                        'title': title,
                        'price': price,
                        'fba': fba,
                        'domain': domain,

                        'reviews_nb': reviews_nb,
                        'rating': rating,
                        'badge': badge ? badge : '',
                        'qa': 0,
                        'offerCount': 0,
                        'coupon': '',
                        'completed': 0,
                        'country_code': '',
                        'country_zh': '',
                        'province_zh': '',
                        'city_zh': ''
                    };

                    window.db.items.put(item).then(function (o) {
                    }).catch(function (error) {
                        console.log(error)

                    });

                });
            }

            resolve();
        }).fail(function (error) {
            if (error.status == 413 || error.status == 414) {
                for (var i = window.task_urls.length - 1; i >= 0; i--) {
                    if (window.task_urls[i].section_id == task.section_id) {
                        window.task_urls.splice(i, 1);
                    }
                }
            }
            resolve();
        });

    });

}


function page_reload() {
    valid_task().then(function (task) {
        $('#id_err_message').hide();
        let config = task['config'];
        if (config && Object.keys(config).length > 0) {
            $('#id_view_toogle').prop('checked', task.config.is_full_columns);
            $('#id_marketplace').val(config.marketplaceId).trigger('change');
            $("#id_asin").val(config.asin);

        }
        let categories_0 = [];
        let categories_1 = [];

        task.items.forEach(function (row) {
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


        //表格
        init_table(task);


    }).catch(function (error) {
        Helper.functions.show_msg('id_err_message', '未找到如何数据！')
    }).finally(function (x) {
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


function update_process() {
    //console.log('up')
    window.db.items.where('completed').equals(0).count(function (unfinished_count) {
        if (unfinished_count == 0) {
            Helper.functions.show_msg("id_err_message", "<i class='icon fa-check'></i>️已完成明细下载！");
            $("#id_btn_get_details").text('下载产品详情').on('click', function (e) {
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