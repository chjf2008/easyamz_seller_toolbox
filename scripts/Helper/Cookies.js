Helper.cookies = (function () {
    return {
        get_cookies_page_size: function (cookies_name) {
            var pageSize =20;// Cookies.get(cookies_name);  //读取name为pageSize的值
            var regu = /^[1-9]\d*$/;//正则表达式判断是否为数字，否则默认展示5条
            if (!regu.test(pageSize)) {
                pageSize = 10;
            }
            return pageSize;
        },

        set_cookies: function (cookies_name, value, expires = 30) {

            Cookies.set(cookies_name, value, {expires: expires});

        }
    };
}());