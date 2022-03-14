window.qa_tasks = [];

let task_config = 'qa_config';
API.APP.dbinit('questions_answers').then(function (instance) {
    window.db = instance;
    window.db.version(1).stores({
        questions: 'questionId,votes,question',
        answers: 'answerId,questionId,answer_content,answer_date,helpful_string,answer_profile,avatar',
        task: 'config,asin,marketplaceId'
    });
});



$(document).ready(function () {
    API.APP.init_page(CONST.app_const.qa.key).then(function () {
        Helper.functions.display_country_select('id_marketplace', CONST.iso_countries);
        $("#id_btn_apply").off('click').on('click', function (e) {
            start();
        });
        $('#id_refresh').off('click').on('click', function (e) {
            valid_results().then(function (x) {
                let questions = x.questions;
                let answers = x.answers;
                questions.forEach(function (question) {
                    let items = answers.filter(function (answer) {
                        return answer.questionId == question.questionId;
                    });
                    question['answers'] = items;
                });
                init_table(questions);
                $('#id_data_counter').html('共计 <b>' + questions.length + '</b>条提问，<b>' + answers.length + '</b>条回答！');
            });
        });
        $('#id_download').off('click').on('click', function (e) {
            valid_results().then(function (x) {
                let questions = x.questions;
                let answers = x.answers;
                questions.forEach(function (question) {
                    let items = answers.filter(function (answer) {
                        return answer.questionId == question.questionId;
                    });
                    question['answers'] = items;
                });
                download(questions);
            });
        });
        $("#id_btn_clear").off("click").on("click", function (e) {
            e.preventDefault();
            chrome.storage.sync.remove(task_config, function () {
                window.db.delete().then(() => {
                    location.href = location.href.replace('#', '');
                }).catch((err) => {
                    console.error("删除失败");
                });
            });
        });
        $("#id_clear_selected").off("click").on("click", function (e) {
            e.preventDefault();

            var selRows = $("#id_table").bootstrapTable("getSelections");
            if (selRows.length == 0) {
                return;
            }
            var questionIds = [];
            $.each(selRows, function (i) {
                questionIds.push(this.questionId);
            });
            if (!questionIds) {
                return;
            }
            remove_many(questionIds).then(function (r) {

                $("td.bs-checkbox input").each(function (i, ele) {
                    $this = $(ele);
                    if ($this.prop("checked")) {
                        $this.closest("tr").remove();
                    }
                });
                display_tips('id_err_message', '共计删除了' + r.delete_questions_count + '条提问,' + r.delete_answers_count + '条回答！', 'loading', 100);


            })
        });


    }).catch(function () {
        $("#id_download").on("click", function (e) {
            e.preventDefault();
            display_tips('id_err_message', '请登录后再操作！', 'error', 500);
        });
    }).finally(function () {
        task_init();
    });
});


function task_init() {
    valid_results().then(function (x) {
        let questions = x.questions;
        let answers = x.answers;
        questions.forEach(function (question) {
            let items = answers.filter(function (answer) {
                return answer.questionId == question.questionId;
            });
            question['answers'] = items;
        });
        chrome.storage.sync.get(task_config, function (result) {
            if (result && Object.keys(result).length > 0) {
                $('#id_asin').val(result.qa_config.asin);
                $("#id_marketplace").val(result.qa_config.marketplaceId);
            }
        });
        $('#id_data_counter').html('共计 <b>' + questions.length + '</b>条提问，<b>' + answers.length + '</b>条回答！');
        init_table(questions);
    });
}


function fetch_next_page(url, asin) {
    Helper.request.get(url).then(function (html) {
        let questions = [];
        let uri = new URL(url);
        $(html).find('div[id^="question-"]').each(function (i, ele) {
            let $that = $(ele);
            let question = $that.find('span.a-declarative').html();
            question = $.trim(question);
            let questionId = $that.attr("id").replace("question-", '');
            let votes = $that.parent('div').prev('div').find("[data-count]").attr("data-count");
            if (/^-?[1-9]\d*$/.test(votes)) {
                votes = parseInt(votes);
            }
            questions.push(
                {
                    'questionId': questionId,
                    'question': question,
                    'votes': votes,
                    'domain': uri.host,
                    'asin': asin
                });


        });
        $('#id_table').bootstrapTable('prepend', questions);
        window.db.questions.bulkPut(questions).then(function (x) {
            window.db.questions.count(function (count) {
                display_tips('id_err_message', '数据获取中，请勿刷新网页，已经下载' + count + '条提问！', 'loading', 100);
            });
            let next_page_url = '';
            let $next_page = $(html).find("li.a-last a");
            if ($next_page.length == 1) {
                next_page_url = $next_page.attr("href");
            }
            if (next_page_url) {
                let uri = new URL(url);
                setTimeout(function () {
                    fetch_next_page('https://' + uri.host + next_page_url, asin);
                }, 500);
            } else {
                let questions = [];
                let p = new Promise(function (resolve, reject) {
                    window.db.questions.each(function (question) {
                        questions.push(question);
                    }).then(function () {
                        resolve(questions);
                    });
                });
                p.then(function (questions) {
                    window.qa_tasks = questions;
                    display_tips('id_err_message', '正在下载回答信息，请稍后...', 'loading', 100);
                    fetch_answers();
                });
            }
        });
    });
}

function fetch_answers() {
    let task = window.qa_tasks.shift();
    if (task) {
        let questionId = task.questionId;
        let domain = task.domain;
        let question_awnser_url = 'https://' + domain + '/ask/questions/' + questionId + '/ref=ask_ql_ql_al_hza';
        fetch_answer(question_awnser_url, questionId);
    } else {
        valid_results().then(function (x) {
            let questions = x.questions;
            let answers = x.answers;
            questions.forEach(function (question) {
                let items = answers.filter(function (answer) {
                    return answer.questionId == question.questionId;
                });
                question['answers'] = items;
            });
            init_table(questions);
            display_tips('id_err_message', '恭喜，QA全部下载完毕,共下载' + x.questions.length + '条提问,' + x.answers.length + '条回答！', 'loading', 100);
        });
    }
}

function fetch_answer(url, questionId) {
    Helper.request.get(url).then(function (html) {
        let result = {};
        let answers = [];
        let question_date_text = $(html).find("div[cel_widget_id='ask-post-answer-desktop']").prev("p").html();
        let question_date = '';
        if (question_date_text) {
            question_date = Helper.date.match_date(question_date_text);
        }
        window.db.questions.where("questionId").equals(questionId).modify({
            'question_date': question_date
        }).catch(function (e) {
            console.log(e);
        });
        //answer 第一页
        $(html).find('div[id^="answer-"]').each(function (i, ele) {
            let $that = $(ele);
            let answerId = $that.attr("id").replace('answer-', '');
            let helpful_string = $that.find("span[cel_widget_id='ask-vote-helpful-button-desktop']").prev('span').html();

            if (helpful_string) {
                let match = helpful_string.match(/(\d+)\s?(von|sur|of|su|de|人中)\s?(\d+)/);
                if (match) {
                    if (url.indexOf('amazon.co.jp') > -1) {
                        helpful_string = match[3] + " of " + match[1];
                    } else {
                        helpful_string = match[1] + " of " + match[3];
                    }
                } else {
                    helpful_string = '';

                }
            }
            let answer_profile = $that.find("span.a-profile-name").html();
            let answer_date_text = $that.find('a.a-profile').next('span').html();
            let answer_date = '';
            if (answer_date_text) {
                answer_date = Helper.date.match_date(answer_date_text);
            }
            let answer_content = '';
            if ($that.find("span.askLongText").length == 1) {
                answer_content = $that.find("span.askLongText").html();
            } else {
                answer_content = $that.find('span').html();
            }


            answer_content = answer_content.replace(/<\/?.+?>/g, "");


            let avatar = $that.find('div.a-profile-avatar img').attr('src');
            let item = {
                'answerId': answerId,
                'answer_content': answer_content,
                'answer_date': answer_date,
                'helpful_string': helpful_string,
                'answer_profile': answer_profile,
                'avatar': avatar,
                'questionId': questionId
            };
            answers.push(item);
        });


        window.db.answers.bulkPut(answers).then(function (x) {
            window.db.answers.count(function (count) {
                display_tips('id_err_message', '数据获取中，请勿刷新网页，已经下载' + count + '条回答！', 'loading', 100);
            });
            let next_page_url = '';
            let $next_page = $(html).find("li.a-last a");
            if ($next_page.length == 1) {
                next_page_url = $next_page.attr("href");
            }
            if (next_page_url) {
                let uri = new URL(url);
                setTimeout(function () {
                    fetch_answer('https://' + uri.host + next_page_url, questionId);
                }, 500);
            }
            fetch_answers();
        });
    });
}

function valid_results() {
    return new Promise(function (resolve, reject) {
        let questions = [];
        let answers = [];
        window.db.questions.each(function (question) {
            questions.push(question);
        }).then(function () {
            window.db.answers.each(function (answer) {
                answers.push(answer);
            }).then(function () {
                resolve({'questions': questions, 'answers': answers});
            });
        })
    })
}

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
        chrome.storage.sync.set(obj, function () {
            chrome.storage.sync.get(task_config, function (v) {
                var error = chrome.runtime.lastError;
                if (!error && v && Object.keys(v).length > 0) {
                    display_tips('id_err_message', '正在下载提问信息，请稍后...', 'loading', 100);
                    let start_link = 'https://' + domain + '/ask/questions/asin/' + asin + '/1/ref=ask_ql_psf_ql_hza?sort=HELPFUL';
                    Helper.request.get(start_link).then(function (html) {
                        let questions = [];
                        let uri = new URL(start_link);
                        $(html).find('div[id^="question-"]').each(function (i, ele) {
                            let $that = $(ele);
                            let questionId = $that.attr("id").replace("question-", '');
                            let votes = $that.parent('div').prev('div').find("[data-count]").attr("data-count");
                            let question = $that.find('span.a-declarative').html();
                            question = $.trim(question);
                            questions.push({
                                'questionId': questionId,
                                'question': question,
                                'votes': votes,
                                'domain': uri.host,
                                'asin': asin
                            });
                        });
                        window.db.questions.bulkPut(questions).then(function (x) {

                            window.db.questions.count(function (count) {
                                display_tips('id_err_message', '已经下载' + count + '条提问！', 'loading', 100);
                            });
                            let next_page_url = '';
                            let $next_page = $(html).find("li.a-last a");
                            if ($next_page.length == 1) {
                                next_page_url = $next_page.attr("href");
                            }
                            if (next_page_url) {
                                fetch_next_page('https://' + uri.host + next_page_url, asin);
                            } else {
                                fetch_answers();
                            }
                        });
                    }).catch(function (error) {
                        console.log(error)
                    });
                }
            });
        });
    }
}

let simple_columns = [
    {
        title: '删除',
        //field: 'asin',
        align: 'center',
        width: '50px',
        checkbox: true

    },


    {
        field: 'asin',
        title: 'ASIN',
        align: 'left',
        sortable: true,
        visible: false,
        width: '75px',
        formatter: function (value, row, index) {

            return value;
        }
    },

    {
        field: 'question_date',
        title: '提问时间',
        align: 'left',
        sortable: true,
        width: '75px',
        formatter: function (value, row, index) {

            return value;
        }
    }, {
        field: 'votes',
        title: '投票',
        align: 'left',
        sortable: true,
        width: '75px',
        formatter: function (value, row, index) {

            return value;
        }
    },

    {
        field: 'question',
        title: '问题',
        align: 'left',
        sortable: true,
        width: '650px',
        formatter: function (value, row, index) {

            return "<a target='_blank' href='https://" + row.domain + "/ask/questions/" + row.questionId + "'>" + value + '</a>';
        }
    },


    {
        field: 'answers',
        title: '回答',
        align: 'left',
        sortable: true,
        width: '650px',
        formatter: function (value, row, index) {
            //console.log(value);

            let lis = [];
            lis.push('<ul>');
            if (value && value.length > 0) {
                value.forEach(function (answer) {

                    let helpful_string = answer.helpful_string ? "(<font color='red'>" + answer.helpful_string + ")</font>" : "";

                    let answer_content = answer.answer_content;


                    answer_content = answer_content.replace(/<\/?.+?>/g, "")

                    console.log(answer.helpful_string)
                    lis.push('<li>' + helpful_string +
                        //'<span class="badge-danger mr-10">' + answer.answer_date + '</span>' +
                        '<span class="ml-5">' + answer_content + '</span>' +
                        '<span class="ml-5"><a href="#"><i data-answerId="' + answer.answerId + '" class="icon wb-trash"></i></a></span>' +
                        '</li>')
                });
            }
            lis.push('</ul>');
            return lis.join("");
        },
        events: {
            'click .wb-trash': function (e, value, row, index) {
                e.preventDefault();
                if (confirm('确定删除吗？')) {
                    let answerId = $(e.target).attr('data-answerId');
                    if (answerId) {
                        window.db.answers.bulkDelete([answerId]).then(function () {
                            $(e.target).closest('li').remove();
                        }).catch(function (error) {
                            console.log(error);
                        })
                    }
                }
            }
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
        columns: simple_columns,

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

    }).on('post-body.bs.table', function () {
    });
    $table.bootstrapTable('load', items);
}

function download(questions) {
    if (questions && questions.length > 0) {
        let fileName = Date.now() + '.csv';
        questions.forEach(function (x) {
            let answers = x.answers;
            let answer_contents = answers.map(function (a) {
                let answer_content = a.answer_content.replace(/<br>/g, ' ');
                answer_content = answer_content.replace(/\n/g, ' ');
                return answer_content;
            });
            x['answers'] = answer_contents.join(' |||| ');
        });
        Helper.export.toCSV(fileName, questions);
    }
}

function remove_many(questionIds) {
    return new Promise(function (resolve, reject) {
        let delete_questions_count = 0;
        let delete_answers_count = 0;
        window.db.transaction('rw', window.db.questions, window.db.answers, function () {
            window.db.questions.bulkDelete(questionIds).then(function () {
                delete_questions_count = questionIds.length;
            });
            window.db.answers.where("questionId").anyOf(questionIds).delete().then(function (deleteCount) {
                delete_answers_count += deleteCount;
            });
        }).then(() => {
            resolve({
                'delete_questions_count': delete_questions_count,
                'delete_answers_count': delete_answers_count
            });
        }).catch(err => {
            resolve({
                'delete_questions_count': 0,
                'delete_answers_count': 0
            });
        });
    });
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