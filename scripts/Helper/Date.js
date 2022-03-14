Helper.date = function () {



    function available_date_format_to_day(available_date) {
        let text = '';


        var created_time = new Date(available_date.replace(/\//g, '-'));

        let current_time = (new Date()).valueOf();


        let v = (current_time - created_time) / (60 * 60 * 24 * 1000);


        const year_1 = 365;

        const year_2 = year_1 * 2;
        const year_3 = year_1 * 3;
        const year_4 = year_1 * 4;
        const year_5 = year_1 * 5;
        const year_half = year_1 / 2;
        const month_1 = 30;
        const month_2 = month_1 * 2;
        const month_3 = month_1 * 3;

        const month_4 = month_1 * 4;
        const month_5 = month_1 * 5;
        const month_6 = month_1 * 6;
        const month_7 = month_1 * 7;
        const month_8 = month_1 * 8;
        const month_9 = month_1 * 9;
        const month_10 = month_1 * 10;
        const month_11 = month_1 * 11;

        if (v > year_5) {
            text = '5年以上';
        } else if (v > year_4 && v < year_5) {
            text = '4~5年';
        } else if (v > year_3 && v < year_4) {
            text = '3~4年';
        } else if (v > year_2 && v < year_3) {
            text = '2～3年';
        } else if (v > year_1 && v < year_2) {
            text = '1～2年';
        } else if (v < year_1 && v > month_11) {
            text = '11个月';
        } else if (v < month_11 && v > month_10) {
            text = '10个月';
        } else if (v < month_10 && v > month_9) {
            text = '9个月';
        } else if (v < month_9 && v > month_8) {
            text = '8个月';
        } else if (v < month_8 && v > month_7) {
            text = '7个月';
        } else if (v < month_7 && v > month_6) {
            text = '6个月';
        } else if (v < month_6 && v > month_5) {
            text = '5个月';
        } else if (v < month_5 && v > month_4) {
            text = '4个月';
        } else if (v < month_4 && v > month_3) {
            text = '3个月';
        } else if (v < month_3 && v > month_2) {
            text = '2个月';
        } else if (v < month_2 && v > month_1) {
            text = '1个月';
        } else if (v < month_1) {
            text = '1个月之内';
        } else {
            text = '未知';
        }

        let obj = {'day': v.toFixed(0), 'about': text};
        return obj;


}


    return {

        timestamp_to_date: function (timestamp, formats) {

            // formats格式包括
            // 1. Y-m-d
            // 2. Y-m-d H:i:s
            // 3. Y年m月d日
            // 4. Y年m月d日 H时i分
            formats = formats || 'Y-m-d';

            var zero = function (value) {
                if (value < 10) {
                    return '0' + value;
                }
                return value;
            };

            var myDate = timestamp ? new Date(timestamp) : new Date();

            var year = myDate.getFullYear();
            var month = zero(myDate.getMonth() + 1);
            var day = zero(myDate.getDate());

            var hour = zero(myDate.getHours());
            var minite = zero(myDate.getMinutes());
            var second = zero(myDate.getSeconds());

            return formats.replace(/Y|m|d|H|i|s/ig, function (matches) {
                return ({
                    Y: year,
                    m: month,
                    d: day,
                    H: hour,
                    i: minite,
                    s: second
                })[matches];
            });

        },


        match_date: function (text) {

            let date_formatted = '';


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

            return date_formatted;


        },


        available_date_format_to_day: available_date_format_to_day


    }


}();

/*
** 时间戳转换成指定格式日期
** eg.
** dateFormat(11111111111111, 'Y年m月d日 H时i分')
** → "2322年02月06日 03时45分"
*/
var dateFormat = function (timestamp, formats) {

};


