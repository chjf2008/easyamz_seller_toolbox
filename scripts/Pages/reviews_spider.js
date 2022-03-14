let results = [];
let R = {};

let task_config = 'reviews_config';
window.db = null;
API.APP.dbinit('reviews').then(function(instance) {
    window.db = instance;
    window.db.version(1).stores({
        items: 'reviewId'
    });
});


function begin(e) {
    //let start_url = $("#id_start_url").val();
    //let domain = $("#id_marketplace").val();
    let asin = $.trim($("#id_asin").val());
    let marketplaceId = $("#id_marketplace option:checked").val();
    let domain = Helper.functions.get_domain_by_marketplaceId(CONST.iso_countries, marketplaceId);
    //url = 'https://' + domain + "/s?k=" + encodeURIComponent(input_value) + "&ref=nb_sb_noss_1"


    if (!domain || !asin || !/^(B[\dA-Z]{9}|\d{9}(X|\d))$/.test(asin)) {
        $("#id_btn_apply")
            .html("<i class='icon fa-play-circle'></i>开始")
            .off("click").on("click", function(e) {
                $(e.target).closest('button').html("分析中...");
                begin(e);
            });
        return;
    }


    let start_url = "https://" + domain + "/product-reviews/" + asin + "/ref=cm_cr_othr_d_show_all_btm?ie=UTF8&reviewerType=all_reviews";
    if (!start_url) {
        return;
    }


    $(e.target).closest('button').html("分析中...");


    let obj = {};

    obj[task_config] = {
        "marketplaceId": marketplaceId,
        "asin": asin
    }
    chrome.storage.sync.set(obj, function(v) {
        crawl(start_url);
    });

    //
    // let task = {"config": 'config', "marketplaceId": marketplaceId, "asin": asin};
    // window.db.task.put(task).then(function (x) {
    //
    //     $("#id_counter").show();
    //     crawl(start_url);
    //
    //
    // });
}

$(document).ready(function() {


    API.APP.init_page(CONST.app_const.reviews.key).then(function(s) {
        $('input[type="checkbox"][name="checkall"]').off('click').on('click', function(e) {
            let $this = $(e.target);
            let checked = $this.prop('checked');
            $this.closest('.form-group').find('input[name!="checkall"]').prop('checked', checked);
        });

        $("button[type='button'][name='name_clear_words']").on("click", function(e) {
            bootbox.confirm({
                message: "确定要清除吗?",
                locale: 'zh_CN',
                callback: function(result) {
                    if (result) {
                        $("input[name='tokenfield']").tokenfield('setTokens', []);
                    }
                }
            });
        });


        $('#id_apply_filter').off('click').on('click', function(e) {


            let data_source = $("input[name='data_source']:checked").val();

            data_source = data_source ? data_source : 'any';


            let ratings = [];
            let ele_stars = $('input[name="star"]');
            ele_stars.each(function(i, ele) {
                if ($(ele).prop('checked')) {
                    let rating = $(ele).val();
                    ratings.push(rating)
                }
            });
            ratings = ratings.length == 5 ? [] : ratings;


            let ignored_words = [];
            let ele_words = $('input[name="words"]');
            ele_words.each(function(i, ele) {
                if ($(ele).prop('checked')) {
                    let word = $(ele).val();
                    ignored_words.push(word)
                }
            });


            var tokens = $("input[name='tokenfield']").tokenfield('getTokens');
            if (tokens) {
                $.each(tokens, function(i, token) {
                    if (ignored_words.indexOf(token) == -1) {
                        ignored_words.push(token.value);
                    }
                });
            }


            valid_task().then(function(task) {


                display_words_frequency_table(task.items, data_source, ratings, ignored_words)


            });


            //


        });


        $('#id_reset_filter').off('click').on('click', function(e) {
            $('input[type="checkbox"][name="words"],input[type="checkbox"][name="star"]').each(function(i, ele) {
                $(ele).prop("checked", false);
            });
            //$("input[name='checkall']").prop("checked",false);
            //$("input[type='radio']").prop('checked',false);
        });


        let $tokenfiled = $("input[name='tokenfield']");
        $tokenfiled.tokenfield({ createTokensOnBlur: true });
        $tokenfiled.tokenfield(
            'setTokens', [
                { value: "what's", label: "what's" },
                { value: "it's", label: "it's" },
                { value: "i'm", label: "i'm" },
                { value: "i'd", label: "i'd" },
                { value: "i've", label: "i've" }
            ]);
    }).catch(function(error) {

        console.log(error)

        //location.href = '/pages/login.html';

    }).finally(function() {
        Helper.functions.display_country_select('id_marketplace', CONST.iso_countries);
        $("#id_btn_apply").off("click").on("click", function(e) {
            begin(e);
        });
        $("#id_btn_clear").off("click").on("click", function(e) {
            e.preventDefault();
            clear();
        });
        $("#id_btn_filter").off("click").on("click", function(e) {


            valid_task().then(function(task) {


                let vote_min = $("#id_helpful_vote_min").val();
                let vote_max = $("#id_helpful_vote_max").val();
                let rating_min = $("#id_rating_min").val();
                let rating_max = $("#id_rating_max").val();
                // let reviews_nb_min = $("#id_reviews_nb_min").val();
                // let reviews_nb_max = $("#id_reviews_nb_max").val();
                let b_have_images = $("#id_have_images").prop("checked");
                let b_have_videos = $("#id_have_videos").prop("checked");


                let text_search_field = $("#id_txt_search_field").val();

                let text_search_field_value = $.trim($("#id_search_keywords").val());

                if (text_search_field_value) {
                    text_search_field_value = text_search_field_value.toLowerCase();
                }


                let new_data = task.items;
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
                    CONST.re_int.test(vote_min) &&
                    CONST.re_int.test(vote_max) &&
                    parseInt(vote_max) >= parseInt(vote_min)
                ) {
                    new_data = new_data.filter(item => (item.helpful_vote >= parseInt(vote_min) && item.helpful_vote <= parseInt(vote_max)));
                } else if (CONST.re_int.test(vote_min)) {
                    new_data = new_data.filter(item => item.helpful_vote >= parseInt(vote_max));
                } else if (CONST.re_int.test(vote_max)) {
                    new_data = new_data.filter(item => item.helpful_vote <= parseInt(vote_max));
                }


                if (b_have_images && b_have_videos) {
                    new_data = new_data.filter(item => (item.images && item.images.length > 0) && (item.videoes && item.videoes.length > 0));

                } else if (b_have_images) {
                    new_data = new_data.filter(item => item.images && item.images.length > 0);
                } else if (b_have_videos) {
                    new_data = new_data.filter(item => item.videoes && item.videoes.length > 0);
                }


                switch (text_search_field) {
                    case 'title':
                        if (text_search_field_value) {
                            new_data = new_data.filter(item => item.title.toLowerCase().indexOf(text_search_field_value) > -1);
                        }
                        break;
                    case 'content':
                        if (text_search_field_value) {
                            new_data = new_data.filter(item => item.content.toLowerCase().indexOf(text_search_field_value) > -1);
                        }
                        break;
                    case 'reviewer':
                        if (text_search_field_value) {
                            new_data = new_data.filter(item => item.reviewer.toLowerCase().indexOf(text_search_field_value) > -1);
                        }
                        break;
                    default:


                        new_data = new_data.filter(item =>
                            (item.title.toLowerCase().indexOf(text_search_field_value) > -1) ||
                            (item.content.toLowerCase().indexOf(text_search_field_value) > -1) ||
                            (item.reviewer.toLowerCase().indexOf(text_search_field_value) > -1)
                        );


                        break;


                }


                init_table(new_data);


            });
        });
        $("#id_download").off("click").on("click", function(e) {

            valid_task().then(function(task) {
                let fileName = Date.now() + '.csv';
                Helper.export.toCSV(fileName, Object.values(task.items));
            }).catch(function() {
                $("#id_err_message").show().html('数据源无效！');
                display_tips('id_err_message', '数据源无效', 'error', 100);
            });
        });


        valid_task().then(function(task) {
            init_table(task.items);
            if (task.asin) {
                $("#id_asin").val(task.asin);
            }
            if (task.marketplaceId) {
                $("#id_marketplace").val(task.marketplaceId).trigger("change");
            }
        }).catch(function(e) {

        });
    });
});


function valid_task() {
    return new Promise(function(resolve, reject) {
        let task = { "items": [] };
        window.db.items.each(item => {

            item.comment_count = item.comment_count ? item.comment_count : 0;
            task.items.push(item);
        }).then(function() {
            chrome.storage.sync.get(task_config, function(v) {
                if (v && v.hasOwnProperty(task_config)) {
                    task['asin'] = v[task_config].asin;
                    task['marketplaceId'] = v[task_config].marketplaceId;
                } else {
                    task['asin'] = '';
                    task['marketplaceId'] = '';
                }
                resolve(task);
            });
        });
    });
}


function crawl(start_url) {
    execute(start_url).then(function(r) {

        if (r && r.hasOwnProperty('next_page_url') && r.hasOwnProperty('data') && r.hasOwnProperty('current_page')) {
            let next_page_url = r.next_page_url;
            let page = r.current_page;
            let data = r.data;

            if (page == 1 && data && data.length > 0) {
                init_table(data);
            } else {
                $('#id_table').bootstrapTable('prepend', data);
            }


            if (!next_page_url) {
                window.db.items.count(function(count) {
                    let msg = " <i class='icon fa-check'></i>️下载完毕, 共计下载" + count + "条评论！";
                    display_tips('id_err_message', msg, 'success', 100);
                });

                $("#id_btn_apply").html('<i class="icon fa-play-circle"></i>开始').off("click").on("click", function(e) {
                    begin(e);
                });
            } else {
                window.db.items.count(function(count) {
                    let msg = "请勿刷新网页，数据更新中... 已抓取<span class='red-600'>" + count + "</span> 条数据";
                    display_tips('id_err_message', msg, 'loading', 100);
                });

                crawl(next_page_url);
            }
        } else {


            window.db.items.count(function(count) {
                let msg = " <i class='icon fa-check'></i>️下载完毕, 共计下载" + count + "条评论！";
                display_tips('id_err_message', msg, 'success', 100);
            });

            $("#id_btn_apply").html('<i class="icon fa-play-circle"></i>开始').off("click").on("click", function(e) {
                begin(e);
            });
        }
    }).catch(function(url) {
        if (url) {
            crawl(url);
        }

    });
}

function execute(url) {

    let _url = url;
    return new Promise(function(resolve, reject) {
        Helper.request.get(_url).then(function(html) {
            API.Amazon.reviews_page_parse(html, _url).then(function(result) {
                let next_page_url = result.next_page_url;
                let current_page = result.current_page;
                let data = result.data;
                if (data && data.length > 0) {
                    window.db.items.bulkPut(data).then(function() {
                        let r = { 'current_page': current_page, 'next_page_url': next_page_url, 'data': data };
                        resolve(r);
                    });
                } else {
                    resolve({})
                }
            });
        }).catch(function(error) {
            if (error.status == 404) {
                display_tips('id_err_message', '请核对ASIN是否存在', 'error', 100);
            } else if (error.status == 503) {
                display_tips('id_err_message', '抓取中断，请稍后再试！', 'error', 100);
            } else {
                display_tips('id_err_message', '无效的链接！', 'error', 100);
            }
            reject(url)
        });
    });

}


function init_table(items) {

    try {


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
            pageSize: Helper.cookies.get_cookies_page_size('reviews_pagesize'),
            pageList: [10, 20, 40, 60, 80, 100, 200, 500, 1000, 2000],
            minimumCountColumns: 2,
            //height: 500,
            cardView: false,
            //showRefresh:true,
            paginationVAlign: 'both',
            showColumns: true,
            detailView: false,

            silent: true,
            columns: table_column,

            onLoadError: function() {
                return "";
            },
            formatLoadingMessage: function() {
                return "";
            },
            formatNoMatches: function() {
                return '无数据';
            },
            onPageChange: function(pageIndex, pageSize) {
                Helper.cookies.set_cookies('reviews_pagesize', pageSize, 30);
            },

        }).on('post-body.bs.table', function() {
            Helper.functions.lazyload('img.lazy');

            tippy('[data-tippy-content]');
            $('[data-toggle="tooltip"]').tooltip();
            $('.video-container').magnificPopup({
                delegate: 'a',
                type: 'image',
                tLoading: 'Loading image #%curr%...',
                mainClass: 'mfp-img-mobile',
                gallery: {
                    enabled: true,
                    navigateByImgClick: true,
                    preload: [0, 1] // Will preload 0 - before current, and 1 after the current image
                },
                callbacks: {
                    elementParse: function(item) {
                        item.type = 'iframe';
                    }
                },
            });
            $('.picture-container').magnificPopup({
                delegate: 'a', // child items selector, by clicking on it popup will open
                type: 'image',
                gallery: { enabled: true },
                callbacks: {
                    elementParse: function(item) {
                        item.type = 'iframe';
                        item.el[0].innerHTML = "<img src='" + item.src + "' height='20'/>";
                    }
                }
            });

            $("tr[data-index]").dblclick(function(e) {
                let $input = $(e.target).closest('tr').find("input[name='btSelectItem']");
                $input.prop("checked", !$input.prop("checked"));
            });

        });
        $table.bootstrapTable('load', items);

    } catch (e) {

        console.log(e);

    } finally {


        //init_words_frequence(items, 'title', [], [])

        display_words_frequency_table(items, 'title', [], []);
    }
}


const table_column = [{
        field: 'reviewer',
        title: '评论人',
        align: 'left',
        sortable: true,
        visible: true,
        width: '200px',
        formatter: function(value, row, index) {

            var imgUrl = row.avatar;
            var profile_verified = row.profile_verified;
            var profile_verified_string = "";
            if (profile_verified) {
                profile_verified_string = '<div class="ico_block"><span class="a-profile-verified-badge" ref="popover" data-container="body" data-title="已认证" data-content="该用户是亚马逊认证用户"><span class="a-profile-verified-text"></span></span></div>&nbsp;'
            }

            var reviewer_badges = row.reviewer_badges;


            var reviewer_badge_string = "";

            if (Helper.validator.isArray(reviewer_badges)) {
                $.each(reviewer_badges, function(i, _item) {
                    reviewer_badge_string += '&nbsp;<div class="badge badge-warning ico_block" ref="popover" data-title="评论人勋章" data-content="{0}">{0}</div>&nbsp;'.format(_item);
                    //console.log(reviewer_badge_string)
                });

            } else if (Helper.validator.isString(reviewer_badges)) {

                reviewer_badge_string = '&nbsp;<div class="badge badge-warning ico_block" ref="popover" data-title="评论人勋章" data-content="{0}">{0}</div>&nbsp;'.format(reviewer_badges);
                //console.log(reviewer_badge_string)
            }


            var early_reviewer_rewards = row.early_reviewer_rewards;
            var early_reviewer_rewards_string = "";
            if (early_reviewer_rewards) {
                early_reviewer_rewards_string = '&nbsp;<div class="badge badge-info ico_block" ref="popover" data-title="早期评论人计划" data-content="该评论参与了于早期评论人计划">Early Reviewer Program</div>&nbsp;'
            }


            var top_contribute_category = row.top_contribute_category;
            var top_contribute_category_string = "";
            if (top_contribute_category) {
                top_contribute_category_string = '&nbsp;<div class="badge badge-success ico_block" ref="popover" data-title="Top Contributor in {0}" data-content="该评论人对{0}类目的产品评论有杰出贡献">{0}</div>&nbsp;'.format(top_contribute_category);
            }


            let vine_voice = row.vine_voice;
            let vine_voice_string = '';
            if (vine_voice) {

                vine_voice_string = '&nbsp;<div class="badge badge-info ico_block" ref="popover" data-title="vine voice" data-content="vine voice评论">VINE VOICE</div>&nbsp;'

            }

            var returnText = "";
            var imgUrl = "";
            if (imgUrl.indexOf("grey-pixel.gif") > -1) {
                imgUrl = default_user_icon;
            } else {
                imgUrl = row.avatar;
            }


            let reviewer = $.trim(value);
            reviewer = reviewer.replace(/\'/g, "’");
            reviewer = reviewer.replace(/\"/g, "”");


            returnText = "<div class='ico_block'><a target='_blank' href='{1}'><img src='{2}' height='20' class='lazy' data-img='{2}' data-original='{2}' />&nbsp;<span data-tippy-content='{0}' style='text-overflow:ellipsis; overflow:hidden;white-space:nowrap;width:150px'>{0}</span></a><input type='hidden' value='{3}'/></div>".format(reviewer, row.reviewer_link, imgUrl, row.reviewId);


            let badges_text = [];
            $.each(row.badges, function(i, badge) {
                badges_text.push('&nbsp;<div class="badge badge-info ico_block" data-tippy-content="' + badge + '">' + badge + '</div>&nbsp;')
            });


            returnText += profile_verified_string;
            //returnText += reviewer_badge_string;
            returnText += early_reviewer_rewards_string;
            //returnText += top_contribute_category_string;
            //returnText += vine_voice_string;
            returnText += badges_text;
            return returnText;
        }
    },

    {
        field: 'asin',
        title: 'ASIN',
        align: 'left',
        sortable: true,
        visible: false,
        width: '200px',
        formatter: function(value, row, index) {


            return "<a target='_blank' href='https://" + row.host + "/dp/" + value + "'>" + value + "</a>";
        }
    },


    {
        field: 'title',
        title: '标题',
        align: 'left',
        sortable: true,
        width: '200px',
        formatter: function(value, row, index) {
            let val = $.trim(value);
            val = val.replace(/\'/g, "’");
            val = val.replace(/\"/g, "”");

            return '<div data-tippy-content="' + value + '" style="text-overflow:ellipsis; overflow:hidden;white-space:nowrap;width:200px">' + val + '</div>';
        },

        // cellStyle: {
        //     css: {"text-overflow": "ellipsis", 'overflow': 'hidden', 'white-space': 'nowrap', 'width': '150px'}
        // }

    },
    {
        field: 'content',
        title: '内容',
        align: 'left',
        sortable: true,
        width: '350px',
        formatter: function(value, row, index) {
            let content = row.content;
            if (content) {
                content = $.trim(content);
                content = content.replace(/<br>/g, "\r\n");
                content = content.replace(/\'/g, "’");
                content = content.replace(/\"/g, "”");
            }

            //
            // let content_display = content;
            //
            // if (content && content.length > 50) {
            //     content_display = content.substring(0, 50) + "...";
            // }
            return '<div data-tippy-content="' + content + '" style="text-overflow:ellipsis; overflow:hidden;white-space:nowrap;width:350px">' + content + '</div>';

            // style="text-overflow:ellipsis; overflow:hidden;white-space:nowrap;width:200px" '
        },
        cellStyle: function(value, row, index) {
            return {
                css: { "text-overflow": "ellipsis", 'overflow': 'hidden', 'white-space': 'nowrap', 'width': '150px' }
            };

        }
    },
    {
        field: 'vp',
        title: 'VP',
        align: 'left',
        sortable: true,
        width: '80px',
        formatter: function(value, row, index) {
            if (value) {
                return '✔'
            }
            return '';
        }
    },

    {
        field: 'foreign_review',
        title: '国际评论',
        align: 'left',
        sortable: true,
        width: '100px',
        formatter: function(value, row, index) {
            if (value) {
                return '✔'
            }
            return '';
        }
    },



    // {
    //     title: 'ASIN',
    //     field: 'asin',
    //     align: 'center',
    //     width: '100px',
    //     formatter: function (value, row, index) {
    //         return value;
    //     }
    // },

    // {
    //     title: '市场1',
    //     field: 'marketplace',
    //
    //     align: 'left',
    //     sortable: true,
    //     width: '80px',
    //     formatter: function (value, row, index) {
    //
    //         if (value) {
    //             if (value == 'UK') {
    //                 value = 'GB';
    //             }
    //             return value + '&nbsp;<i class="flag-icon flag-icon-' + value.toLowerCase() + '"></i>';
    //         }
    //         return '';
    //         //return value;
    //     }
    // },

    {
        field: 'buy_opotion',
        title: '购买选项',

        align: 'left',
        sortable: true,
        width: '220px',
        formatter: function(value, row, index) {


            let text = value;

            if (text) {
                text = text.replace(/\s+/g, '');
            }
            // if (text && text.length > 30) {
            //     text = text.substring(0, 30) + "...";
            // }
            return '<div data-tippy-content="' + value + '" style="text-overflow:ellipsis; overflow:hidden;white-space:nowrap;width:220px">' + value + '</div>';
            //return '<div class="simptip-position-right simptip-multiline h-20" data-tooltip="' + value + '">' + text + '</div>';
        }
    },


    {
        field: 'rating',
        title: '评分',
        align: 'left',
        sortable: true,
        width: '80px',
        formatter: function(value, row, index) {
            return value;
        }
    },
    {
        field: 'images',
        title: '图片',
        align: 'left',
        sortable: true,
        width: '100px',
        formatter: function(value, row, index) {


            let text = [];

            if (row.images) {
                text.push("<div class='picture-container'>");

                $.each(row.images, function(i, item) {
                    if (item) {
                        if (row.images.length == 1) {
                            text.push("<a target='_blank' href='" + item.replace('._SY88', '') + "'><img class='lazy' data-src='" + item + "' data-img='" + item + "' data-original='" + item + "' style='padding:1px;width:45px;max-height: 50px; overflow: hidden;'></a>");
                        } else {
                            text.push("<a class='mr-5' target='_blank' href='" + item.replace('._SY88', '') + "'><i class='icon fa-image'></i></a>")
                        }
                    }
                });
                text.push("</div>");
            }
            return text.join("");
        }
    },


    {
        field: 'videoes',
        title: '视频',
        align: 'left',
        sortable: true,
        width: '80px',
        formatter: function(value, row, index) {
            let text = [];
            if (row.videoes) {
                text.push("<div class='video-container'>");
                $.each(row.videoes, function(i, item) {
                    if (item) {
                        text.push("<a target='_blank' class='video-link' href='" + item + "'><i class='icon fa-video-camera' aria-hidden='true'></i></a>");
                    }
                });
                text.push("</div>");
            }
            return text.join("");
        }
    },


    {
        field: 'helpful_vote',
        title: '投票',
        align: 'left',
        sortable: true,
        width: '80px',
        formatter: function(value, row, index) {
            return value;
        }
    },

    {
        field: 'date_formatted',
        title: '日期',
        align: 'left',
        sortable: true,
        width: '150px',
        formatter: function(value, row, index) {
            return value;
        }
    },

    {
        field: 'comment_count',
        title: '跟评数',
        align: 'left',
        sortable: true,
        width: '100px',
        formatter: function(value, row, index) {
            return value;
        }
    }


];


function display_words_frequency_table(rows, data_source, ratings, ignored_words) {


    //action = action == "" ? 'title' : action;

    if (rows && rows.length > 0) {
        let words = [];

        for (let row of rows) {
            let word = '';

            if (data_source == "title") {
                word = row.title.replace(" & ", ' ');
            } else if (data_source == "content") {
                word = row.content;
            } else if (data_source == 'any' || data_source == '') {
                word = row.title + " " + row.content;
            }
            if (ratings && ratings.length > 0) {
                let rating = row.rating;
                if (rating && ratings.indexOf(rating.toString()) == -1) {
                    continue;
                }
            }
            words.push(word);
        }
        let long_text = Helper.string.replace_words_frequency_bad_chars(words.join(" "));
        for (let _word of ignored_words) {
            var pat = new RegExp("\\s" + _word + "\\s", "gi");
            long_text = long_text.replace(pat, " ");
        }

        let $table_1 = $(".words_table_1");
        let $table_2 = $(".words_table_2");
        let $table_3 = $(".words_table_3");
        let $table_4 = $(".words_table_4");
        let $table_5 = $(".words_table_5");

        init_words_frequency('words_table_1', long_text, 1);

        init_words_frequency('words_table_2', long_text, 2);

        init_words_frequency('words_table_3', long_text, 3);

        init_words_frequency('words_table_4', long_text, 4);

        init_words_frequency('words_table_5', long_text, 5);


    }


}

function init_words_frequency(cls_name, text, n) {


    var items = [];
    var wc = Helper.array.wordsmap(text, n);
    var words = 0;
    for (var i in wc) {
        words += wc[i][1];
    }
    var maxlines = 2000;
    wc = wc.slice(0, maxlines);

    //obj.count=wc.length;
    for (var i in wc) {
        var r = (parseInt(i) + 1).toString();
        var w = wc[i][0];
        var p = 100 * wc[i][1] / words;
        var fs = wc[i][1]
        p = p.toPrecision(Math.round(p).toString().length) + "%";

        items.push([r, w, fs, p]);
    }

    $("." + cls_name).closest('.block-container').find("h4").html(n + '个词长');

    create_words_table(cls_name, items);


    if (n < 4) {


        words = [];
        $.each(items, function(i, item) {
            words.push({ "text": item[1], "size": item[2] });
            if (words.length > 100) {
                return false;
            }
        });
        make_cloud_words('words_cloud_' + n, words);

    }
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
        "bAutoWidth": true, //自动宽度
        // "dom": ' <"search"f><"top"l>rt<"bottom"ip><"clear">',
        data: data,
        //"order": [[3, "desc"], [0, "asc"]],
        columns: [{
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
            { extend: 'csv', text: '导出' }
        ],
        initComplete: function() {
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

function clear() {
    chrome.storage.sync.remove(task_config, function() {
        db.delete().then(() => {
            location.href = location.href.replace('#', '');
        }).catch((err) => {
            console.error("删除失败");
        });
    });
}


function make_cloud_words(id, words) {


    $('#' + id).empty();
    var fill = d3.scale.category10()

    d3.layout.cloud()
        .size([1080, 350])
        .words(words)
        .rotate(0)
        .fontSize(function(d) {
            return d.size;
        })
        .on("end", draw)
        .start();

    function draw(words) {
        d3.select("#" + id).append("svg")
            .attr("width", 1080)
            .attr("height", 350)
            .attr("class", "col-md-12")
            .append("g")
            // without the transform, words words would get cutoff to the left and top, they would
            // appear outside of the SVG area
            .attr("transform", "translate(620,200)")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", function(d) {
                return d.size + "px";
            })
            .style("fill", function(d, i) {
                return fill(i);
            })
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) {
                return d.text;
            });


    }

}