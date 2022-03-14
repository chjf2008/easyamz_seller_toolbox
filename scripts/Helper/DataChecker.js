Helper.datachecker = function () {
    return {
        isInt: function (str) {
            return CONST.re_int.test(str);
        },

        isFloat: function (str) {
            return CONST.re_float.test(str);
        },


        toInt: function (text) {
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

        toFloat: function (text) {
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
        },

        isString: function (text) {
            return (typeof text == 'string') && text.constructor == String;
        },

        isArray: function (obj) {

            return (typeof obj == 'object') && obj.constructor == Array;

        },
    }
}();
