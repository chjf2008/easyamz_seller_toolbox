$(document).ready(function() {
    $('#id_phone').change(function() {
        var text = $(this).val();
        text = text.trim().toLowerCase();
        $(this).val(text);
    });
    $('#id_pwd').keypress(function(e) {
        var key = e.which;
        if (key === 13) { // the enter key code
            $('#id_btn_login').click();
        }
    });
    $('#id_btn_login').off("click").on("click", function(event) {
        event.preventDefault();


        login(event);


    });
    $('#id_btn_reg').off("click").on("click", function(e) {
        e.preventDefault();
        let reg_url = "http://www.easyamz.cn/signin/?rf_source=chrome_extension&rf_extension_id=" + chrome.runtime.id + "&rf_medium=content&rf_campaign=login&rf_content=button";
        window.open(reg_url, '_blank')
    });
    API.APP.init_page(CONST.app_const.modules.key).then(function(s) {});
});

function loginSuccess(response) {

    let templates = response.value.templates;

    window.templates = templates;


    location.href = CONST.home_url;
}

function loginFailed(e, response) {
    // $(e.target).text('登录');
    if (response &&
        response.value &&
        response.value.msg &&
        response.value.status) {
        $("#id_err_message").show().html('错误码:' + response.value.status + ", " + response.value.msg);
    } else if (!response.isSuccess) {

        $("#id_err_message").show().html("登录失败");
    }
    $("#id_pwd").val('');

    $(e.target).off("click").on("click", function(event) {
        login(event);
    }).text('登录');

}

function login(event) {

    var username = $.trim($('#id_phone').val());
    var pwd = $.trim($('#id_pwd').val());

    if (!username || !pwd || pwd.length < 8) {
        $("#id_err_message").show().html('无效的登录信息！');
        return;
    }


    var credentials = {
        credentials: {
            username: username,
            password: pwd
        }
    };

    $(event.target).off("click").text('登录中...');

    var msg = { "action": '__LOGIN__', 'value': credentials };
    chrome.runtime.sendMessage(msg, function(response) {
        if (response && response.isSuccess === true) {
            loginSuccess(response);
        } else {
            loginFailed(event, response);
        }
    });


}